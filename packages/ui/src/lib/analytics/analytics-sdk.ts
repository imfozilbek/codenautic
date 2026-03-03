import type {
    IAnalyticsBatchRequest,
    IAnalyticsEvent,
    IAnalyticsEventPayload,
    IAnalyticsPayloadByName,
    TAnalyticsConsent,
    TAnalyticsEventName,
} from "./analytics-types"

export interface IAnalyticsSdkOptions {
    /** Базовый endpoint для отправки батчей. */
    readonly endpoint: string
    /** Идентификатор tenant/организации. */
    readonly tenantId?: string
    /** Идентификатор пользователя. */
    readonly userId?: string
    /** Предпочтительный session ID. */
    readonly sessionId?: string
    /** Размер батча в одном запросе. */
    readonly maxBatchSize: number
    /** Интервал автопосылки в ms. */
    readonly flushIntervalMs: number
    /** Вероятность отправки событий [0..1]. */
    readonly samplingRate: number
    /** Источник времени для детерминированности в тестах. */
    readonly now: () => number
    /** Fetch-обертка для моков и прод-среды. */
    readonly sendRequest: (url: string, init: RequestInit) => Promise<Response>
    /** Storage для устойчивой очереди. */
    readonly storage: Storage
    /** Ключ storage для очереди событий. */
    readonly queueStorageKey: string
    /** Ключ storage для sessionId. */
    readonly sessionStorageKey: string
    /** Callback изменения состояния очереди. */
    readonly onQueueStateChange: (pending: number) => void
    /** Флаг онлайн/оффлайн. */
    readonly isOnline: () => boolean
    /** Инициализация согласия на трекинг. */
    readonly consent?: TAnalyticsConsent
}

interface IAnalyticsSdkState {
    readonly consent: TAnalyticsConsent
}

interface ISerializedQueue {
    readonly events: ReadonlyArray<IAnalyticsEvent>
    readonly sessionId: string
}

const DEFAULT_SCHEMA_VERSION = 1
const DEFAULT_QUEUE_STORAGE_KEY = "codenautic:ui:analytics:queue"
const DEFAULT_SESSION_STORAGE_KEY = "codenautic:ui:analytics:session-id"
const DEFAULT_MAX_BATCH_SIZE = 20
const DEFAULT_FLUSH_INTERVAL_MS = 4_000
const DEFAULT_SAMPLING_RATE = 1
const DEFAULT_SESSION_ID_LENGTH = 20
const MAX_QUEUE_SIZE = 250
const SAMPLE_MULTIPLIER = 10_000

/**
 * OSS-ориентированный SDK для batch/queue analytics в UI.
 *
 * Выполняет redaction, batch отправку, offline-очередь и dedupe при retries.
 */
export class AnalyticsSdk {
    private readonly options: IAnalyticsSdkOptions
    private readonly sessionId: string
    private readonly pendingEvents: IAnalyticsEvent[]
    private consent: TAnalyticsConsent
    private isFlushing = false
    private isDisposed = false
    private readonly inFlight: Set<string> = new Set<string>()
    private flushTimeout: ReturnType<typeof setTimeout> | null = null
    private onlineUnsubscribe?: () => void
    private sequence = 0

    public constructor(options: IAnalyticsSdkOptions) {
        this.options = options
        this.sessionId = options.sessionId ?? this.readOrCreateSessionId()
        this.consent = options.consent ?? "pending"
        this.pendingEvents = this.loadQueueFromStorage(this.sessionId)

        this.options.onQueueStateChange(this.pendingEvents.length)
        this.onlineUnsubscribe = this.bindOnlineListener()
        this.startAutoFlushTimer()
    }

    /** Изменение статуса согласия на трассировку. */
    public setConsent(next: TAnalyticsConsent): void {
        this.consent = next

        if (next !== "granted") {
            this.clearQueue()
            return
        }

        void this.flush()
    }

    /** Отслеживает любое событие по типизированному контракту. */
    public track<TName extends TAnalyticsEventName>(
        name: TName,
        payload: IAnalyticsPayloadByName[TName],
    ): boolean {
        if (this.consent !== "granted") {
            return false
        }

        if (this.shouldSample(name, payload) !== true) {
            return false
        }

        const event = this.buildEvent(name, payload)
        this.pendingEvents.push(event)
        this.persistQueue()

        if (this.pendingEvents.length > MAX_QUEUE_SIZE) {
            this.pendingEvents.splice(0, this.pendingEvents.length - MAX_QUEUE_SIZE)
            this.persistQueue()
        }

        this.options.onQueueStateChange(this.pendingEvents.length)
        void this.flush()
        return true
    }

    /** Принудительно отправляет очередь (включая повторные retry). */
    public async flush(): Promise<void> {
        if (this.isDisposed) {
            return
        }

        if (this.consent !== "granted") {
            return
        }

        if (this.isFlushing === true) {
            return
        }

        if (this.options.isOnline() !== true) {
            return
        }

        const pendingEvents = this.pendingEvents.filter((event): boolean => {
            return this.inFlight.has(event.id) !== true
        })
        if (pendingEvents.length === 0) {
            return
        }

        const batchToSend = pendingEvents.slice(0, this.options.maxBatchSize)
        this.isFlushing = true

        for (const event of batchToSend) {
            this.inFlight.add(event.id)
        }

        try {
            const response = await this.options.sendRequest(this.options.endpoint, this.createBatchRequest(batchToSend))

            if (response.ok !== true) {
                return
            }

            this.removeEventsById(batchToSend)
            this.persistQueue()
            this.options.onQueueStateChange(this.pendingEvents.length)
        } catch {
            return
        } finally {
            for (const event of batchToSend) {
                this.inFlight.delete(event.id)
            }
            this.isFlushing = false
            this.startAutoFlushTimer()
        }
    }

    /** Возвращает количество ожидающих событий в локальной очереди. */
    public getPendingEventsCount(): number {
        return this.pendingEvents.length
    }

    /** Возвращает текущий sessionId сессии. */
    public getSessionId(): string {
        return this.sessionId
    }

    /** Возвращает текущее состояние consent для внешнего чтения/диагностики. */
    public getConsent(): TAnalyticsConsent {
        return this.consent
    }

    /** Возвращает конфигурационные состояние SDK. */
    public getState(): IAnalyticsSdkState {
        return {
            consent: this.consent,
        }
    }

    /** Закрывает SDK, очищает таймеры и listeners. */
    public dispose(): void {
        if (this.isDisposed === true) {
            return
        }

        this.isDisposed = true
        this.onlineUnsubscribe?.()
        this.onlineUnsubscribe = undefined
        this.inFlight.clear()

        if (this.flushTimeout !== null) {
            clearTimeout(this.flushTimeout)
            this.flushTimeout = null
        }
    }

    private buildEvent<TName extends TAnalyticsEventName>(
        name: TName,
        payload: IAnalyticsPayloadByName[TName],
    ): IAnalyticsEvent {
        this.sequence += 1
        const occurredAt = this.options.now()
        const redactedPayload = sanitizeAnalyticsPayload(payload)

        return {
            id: createEventId({
                name,
                payload: redactedPayload,
                occurredAt,
                sequence: this.sequence,
                sessionId: this.sessionId,
            }),
            name,
            occurredAt,
            schemaVersion: DEFAULT_SCHEMA_VERSION,
            correlation: {
                tenantId: this.options.tenantId,
                userId: this.options.userId,
                sessionId: this.sessionId,
                correlationId: this.createCorrelationId(redactedPayload),
            },
            payload: redactedPayload as IAnalyticsEventPayload,
        }
    }

    private createBatchRequest(batchToSend: ReadonlyArray<IAnalyticsEvent>): RequestInit {
        const body: IAnalyticsBatchRequest = {
            events: batchToSend,
            sentAt: this.options.now(),
        }

        return {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            keepalive: true,
        }
    }

    private createCorrelationId(payload: Readonly<Record<string, unknown>>): string {
        const seed = `${this.sessionId}-${stableSerialize(payload)}`
        return createDeterministicHash(seed).toString(36).slice(0, 12)
    }

    private shouldSample<TName extends TAnalyticsEventName>(
        name: TName,
        payload: IAnalyticsPayloadByName[TName],
    ): boolean {
        if (this.options.samplingRate >= 1) {
            return true
        }

        if (this.options.samplingRate <= 0) {
            return false
        }

        const seed = `${name}:${this.options.tenantId ?? ""}:${this.options.userId ?? ""}:${stableSerialize(
            payload,
        )}`
        const bucket = (createDeterministicHash(seed) % SAMPLE_MULTIPLIER) / SAMPLE_MULTIPLIER

        return bucket < this.options.samplingRate
    }

    private bindOnlineListener(): () => void {
        if (typeof window === "undefined") {
            return () => undefined
        }

        const onOnline = (): void => {
            void this.flush()
        }
        window.addEventListener("online", onOnline)

        return (): void => {
            window.removeEventListener("online", onOnline)
        }
    }

    private startAutoFlushTimer(): void {
        if (this.isDisposed) {
            return
        }

        if (this.flushTimeout !== null) {
            clearTimeout(this.flushTimeout)
            this.flushTimeout = null
        }

        if (this.consent !== "granted") {
            return
        }

        if (this.options.flushIntervalMs <= 0) {
            return
        }

        if (this.pendingEvents.length === 0) {
            return
        }

        if (this.options.isOnline() !== true) {
            return
        }

        if (this.isFlushing) {
            return
        }

        this.flushTimeout = setTimeout((): void => {
            this.flushTimeout = null
            void this.flush()
        }, this.options.flushIntervalMs)
    }

    private persistQueue(): void {
        try {
            const queue: ISerializedQueue = {
                events: this.pendingEvents,
                sessionId: this.sessionId,
            }
            this.options.storage.setItem(this.options.queueStorageKey, JSON.stringify(queue))
        } catch {
            return
        }
    }

    private loadQueueFromStorage(sessionId: string): IAnalyticsEvent[] {
        let serializedQueue: unknown

        try {
            const rawPayload = this.options.storage.getItem(this.options.queueStorageKey)
            if (rawPayload === null) {
                return []
            }

            serializedQueue = parseJsonSafe(rawPayload)
        } catch {
            return []
        }

        if (isSerializedQueue(serializedQueue) !== true) {
            return []
        }

        if (serializedQueue.sessionId !== sessionId) {
            return []
        }

        if (serializedQueue.events.length <= MAX_QUEUE_SIZE) {
            return [...serializedQueue.events]
        }

        return serializedQueue.events.slice(-MAX_QUEUE_SIZE)
    }

    private readOrCreateSessionId(): string {
        try {
            const existing = this.options.storage.getItem(this.options.sessionStorageKey)
            if (existing !== null && existing.length > 0) {
                return existing
            }
        } catch {
            return createSessionId()
        }

        const sessionId = createSessionId()

        try {
            this.options.storage.setItem(this.options.sessionStorageKey, sessionId)
        } catch {
            return sessionId
        }

        return sessionId
    }

    private clearQueue(): void {
        this.pendingEvents.length = 0
        this.persistQueue()
        this.options.onQueueStateChange(this.pendingEvents.length)
    }

    private removeEventsById(events: ReadonlyArray<IAnalyticsEvent>): void {
        if (events.length === 0) {
            return
        }

        const toDelete = new Set<string>(events.map((event): string => event.id))

        for (let index = this.pendingEvents.length - 1; index >= 0; index -= 1) {
            const event = this.pendingEvents[index]
            if (toDelete.has(event.id)) {
                this.pendingEvents.splice(index, 1)
            }
        }
    }
}

/**
 * Очищает и редактирует payload для безопасной отправки без PII/code.
 *
 * @param payload Исходный payload.
 * @returns Очищенный payload.
 */
export function sanitizeAnalyticsPayload<TPayload extends Record<string, unknown>>(
    payload: TPayload,
): Readonly<Record<string, unknown>> {
    return sanitizeValue(payload) as Record<string, unknown>
}

/**
 * Создает детерминированный event-id для dedupe и идемпотентности retries.
 */
function createEventId(args: {
    readonly name: TAnalyticsEventName
    readonly payload: Readonly<Record<string, unknown>>
    readonly occurredAt: number
    readonly sequence: number
    readonly sessionId: string
}): string {
    const seed = `${args.name}|${args.sessionId}|${args.occurredAt}|${args.sequence}|${createDeterministicHash(
        stableSerialize(args.payload),
    )}`

    return `evt_${createDeterministicHash(seed).toString(36).slice(0, 24)}`
}

function createSessionId(): string {
    const randomSeed = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}-${
        Math.floor(Math.random() * 1_000_000).toString(16)
    }`

    return `s_${createDeterministicHash(randomSeed).toString(16).slice(0, DEFAULT_SESSION_ID_LENGTH)}`
}

function createDeterministicHash(input: string): number {
    let hash = 2_166_136_261

    for (let index = 0; index < input.length; index += 1) {
        const code = input.charCodeAt(index)
        hash ^= code
        hash +=
            (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
    }

    return hash >>> 0
}

function parseJsonSafe(value: string): unknown {
    try {
        return JSON.parse(value)
    } catch {
        return undefined
    }
}

function stableSerialize(value: unknown): string {
    return JSON.stringify(stabilizeValue(value))
}

function stabilizeValue(value: unknown): unknown {
    if (value === null || value === undefined) {
        return value
    }

    if (typeof value !== "object") {
        return value
    }

    if (Array.isArray(value) === true) {
        return value.map((item): unknown => stabilizeValue(item))
    }

    const keys = Object.keys(value)
    const result: Record<string, unknown> = {}

    for (const key of keys.sort()) {
        result[key] = sanitizeValue((value as Record<string, unknown>)[key])
    }

    return result
}

function sanitizeValue(value: unknown): unknown {
    if (value === null || value === undefined) {
        return value
    }

    if (typeof value === "string") {
        return isLikelyPII(value) === true ? "[REDACTED]" : value
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return value
    }

    if (Array.isArray(value) === true) {
        return value.map((item): unknown => sanitizeValue(item))
    }

    if (typeof value !== "object") {
        return value
    }

    const result: Record<string, unknown> = {}
    const source = value as Record<string, unknown>

    for (const [key, rawValue] of Object.entries(source)) {
        if (isSensitiveKey(key) === true) {
            result[key] = "[REDACTED]"
            continue
        }

        result[key] = sanitizeValue(rawValue)
    }

    return result
}

function isSensitiveKey(key: string): boolean {
    const normalizedKey = key.trim().toLowerCase()
    const sensitiveKeys = new Set<string>([
        "password",
        "token",
        "authorization",
        "api_key",
        "api-key",
        "secret",
        "access_token",
        "refresh_token",
        "cookie",
        "set-cookie",
        "session",
        "user",
        "email",
        "phone",
        "ip",
        "code",
        "snippet",
        "patch",
        "diff",
    ])

    return sensitiveKeys.has(normalizedKey)
}

function isLikelyPII(value: string): boolean {
    const trimmedValue = value.trim()
    if (trimmedValue.length === 0) {
        return false
    }

    return /\S+@\S+\.\S+/.test(trimmedValue)
}

function isSerializedQueue(value: unknown): value is ISerializedQueue {
    if (isRecord(value) !== true) {
        return false
    }

    if (typeof value.sessionId !== "string") {
        return false
    }

    if (Array.isArray(value.events) !== true) {
        return false
    }

    return true
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}

/** Опции фабрики `createDefaultAnalyticsSdkOptions`. */
export interface IAnalyticsDefaultOptions {
    /** ID текущего пользователя/сессии tenant. */
    readonly tenantId?: string
    /** Идентификатор пользователя. */
    readonly userId?: string
    /** Предпочтительный session ID (для синхронизации в multi-tab). */
    readonly sessionId?: string
    /** Коллбеки / окружение для SDK. */
    readonly storage: Storage
    /** Флаг online. */
    readonly isOnline: () => boolean
    /** Обработчик изменения очереди. */
    readonly onQueueStateChange: (pending: number) => void
    /** Fetch API обертка. */
    readonly sendRequest: (url: string, init: RequestInit) => Promise<Response>
    /** Опциональный consent по умолчанию. */
    readonly consent?: TAnalyticsConsent
}

/** Полная матрица настроек SDK. */
export type IAnalyticsSdkRuntimeOptions = {
    /** Переопределения endpoint. */
    readonly endpoint?: string
    /** Переопределение размера батча. */
    readonly maxBatchSize?: number
    /** Переопределение интервала автопосылки. */
    readonly flushIntervalMs?: number
    /** Переопределение sampling rate. */
    readonly samplingRate?: number
    /** Переопределение ключей storage. */
    readonly queueStorageKey?: string
    /** Переопределение session key в storage. */
    readonly sessionStorageKey?: string
}

/**
 * Создает опции SDK с безопасными дефолтами.
 *
 * @param overrides Базовые зависимости окружения.
 * @returns Заполненный объект опций.
 */
export function createDefaultAnalyticsSdkOptions(overrides: IAnalyticsDefaultOptions): IAnalyticsSdkOptions {
    return {
        endpoint: "/api/v1/analytics/events",
        maxBatchSize: DEFAULT_MAX_BATCH_SIZE,
        flushIntervalMs: DEFAULT_FLUSH_INTERVAL_MS,
        samplingRate: DEFAULT_SAMPLING_RATE,
        now: (): number => Date.now(),
        tenantId: overrides.tenantId,
        userId: overrides.userId,
        sessionId: overrides.sessionId,
        queueStorageKey: DEFAULT_QUEUE_STORAGE_KEY,
        sessionStorageKey: DEFAULT_SESSION_STORAGE_KEY,
        onQueueStateChange: overrides.onQueueStateChange,
        storage: overrides.storage,
        isOnline: overrides.isOnline,
        sendRequest: overrides.sendRequest,
        consent: overrides.consent,
    }
}

/**
 * Создает настроенный AnalyticsSdk с безопасными дефолтами.
 *
 * @param overrides Параметры среды и переопределения.
 */
export function createAnalyticsSdk(overrides: IAnalyticsDefaultOptions & {
    readonly options?: IAnalyticsSdkRuntimeOptions
}): AnalyticsSdk {
    const defaultOptions = createDefaultAnalyticsSdkOptions(overrides)
    const options = overrides.options

    const maxBatchSize = normalizeIntWithinRange(
        options?.maxBatchSize,
        DEFAULT_MAX_BATCH_SIZE,
        1,
        200,
    )
    const flushIntervalMs = normalizeIntWithinRange(
        options?.flushIntervalMs,
        DEFAULT_FLUSH_INTERVAL_MS,
        0,
        60_000,
    )
    const samplingRate = normalizeSamplingRate(options?.samplingRate)

    const analyticsOptions: IAnalyticsSdkOptions = {
        ...defaultOptions,
        maxBatchSize,
        flushIntervalMs,
        samplingRate,
        consent: defaultOptions.consent,
        queueStorageKey: options?.queueStorageKey ?? defaultOptions.queueStorageKey,
        sessionStorageKey: options?.sessionStorageKey ?? defaultOptions.sessionStorageKey,
    }

    if (options?.endpoint !== undefined) {
        analyticsOptions.endpoint = options.endpoint
    }

    return new AnalyticsSdk(analyticsOptions)
}

function normalizeIntWithinRange(
    value: number | undefined,
    defaultValue: number,
    minValue: number,
    maxValue: number,
): number {
    if (value === undefined || Number.isNaN(value) === true) {
        return defaultValue
    }

    const clamped = Math.round(value)
    if (clamped < minValue) {
        return minValue
    }

    if (clamped > maxValue) {
        return maxValue
    }

    return clamped
}

function normalizeSamplingRate(value: number | undefined): number {
    if (value === undefined || Number.isNaN(value) === true) {
        return DEFAULT_SAMPLING_RATE
    }

    if (value < 0) {
        return 0
    }

    if (value > 1) {
        return 1
    }

    return value
}
