import * as Sentry from "@sentry/react"

/**
 * Конфигурация browser-окружения для инициализации Sentry.
 */
export interface ISentryBrowserEnv {
    readonly MODE?: string
    readonly VITE_API_URL?: string
    readonly VITE_SENTRY_DSN?: string
    readonly VITE_SENTRY_ENVIRONMENT?: string
    readonly VITE_SENTRY_RELEASE?: string
    readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string
    readonly VITE_SENTRY_PROFILES_SAMPLE_RATE?: string
}

/**
 * Нормализованный конфиг runtime-инициализации Sentry.
 */
export interface ISentryBrowserConfig {
    readonly dsn: string
    readonly environment: string
    readonly release: string | undefined
    readonly tracesSampleRate: number
    readonly profilesSampleRate: number
    readonly tracePropagationTargets: readonly string[]
}

/**
 * Зависимости runtime-инициализации для тестируемости.
 */
export interface ISentryBrowserDependencies {
    readonly init: (options: Parameters<typeof Sentry.init>[0]) => void
    readonly createTracingIntegration: () => ReturnType<typeof Sentry.browserTracingIntegration>
    readonly locationHref: string | undefined
}

const DEFAULT_SENTRY_ENVIRONMENT = "development"
const DEFAULT_TRACES_SAMPLE_RATE = 0.2
const DEFAULT_PROFILES_SAMPLE_RATE = 0

const SENSITIVE_QUERY_PARAM_NAMES = new Set<string>([
    "access_token",
    "api_key",
    "authorization",
    "refresh_token",
    "token",
])

const SENSITIVE_HEADER_NAMES = new Set<string>([
    "authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
    "x-auth-token",
])

/**
 * Инициализирует Sentry browser SDK при наличии корректного DSN.
 *
 * @param env Vite env-конфиг frontend приложения.
 * @param dependencies Injected зависимости для тестирования.
 * @returns true, если Sentry был инициализирован.
 */
export function initializeSentryBrowser(
    env: ISentryBrowserEnv,
    dependencies: Partial<ISentryBrowserDependencies> = {},
): boolean {
    const locationHref = dependencies.locationHref ?? resolveWindowLocationHref()
    const config = createSentryBrowserConfig(env, locationHref)
    if (config === undefined) {
        return false
    }

    const init = dependencies.init ?? Sentry.init
    const createTracingIntegration =
        dependencies.createTracingIntegration ?? Sentry.browserTracingIntegration

    init({
        dsn: config.dsn,
        environment: config.environment,
        release: config.release,
        tracesSampleRate: config.tracesSampleRate,
        profilesSampleRate: config.profilesSampleRate,
        integrations: [createTracingIntegration()],
        tracePropagationTargets: [...config.tracePropagationTargets],
        beforeSend: (event) => {
            return sanitizeSentryPayload(event)
        },
    })

    return true
}

/**
 * Формирует безопасный и типизированный runtime-конфиг Sentry.
 *
 * @param env Vite env-конфиг frontend приложения.
 * @param locationHref Текущий URL страницы для trace propagation targets.
 * @returns Готовый конфиг или undefined, если DSN не задан.
 */
export function createSentryBrowserConfig(
    env: ISentryBrowserEnv,
    locationHref: string | undefined,
): ISentryBrowserConfig | undefined {
    const dsn = normalizeNonEmptyValue(env.VITE_SENTRY_DSN)
    if (dsn === undefined) {
        return undefined
    }

    return {
        dsn,
        environment: resolveSentryEnvironment(env),
        release: normalizeNonEmptyValue(env.VITE_SENTRY_RELEASE),
        tracesSampleRate: resolveSentrySampleRate(
            env.VITE_SENTRY_TRACES_SAMPLE_RATE,
            DEFAULT_TRACES_SAMPLE_RATE,
        ),
        profilesSampleRate: resolveSentrySampleRate(
            env.VITE_SENTRY_PROFILES_SAMPLE_RATE,
            DEFAULT_PROFILES_SAMPLE_RATE,
        ),
        tracePropagationTargets: buildTracePropagationTargets(env.VITE_API_URL, locationHref),
    }
}

/**
 * Разрешает итоговое окружение Sentry из Vite env.
 *
 * @param env Vite env-конфиг.
 * @returns Environment для Sentry events.
 */
export function resolveSentryEnvironment(env: ISentryBrowserEnv): string {
    const configuredEnvironment = normalizeNonEmptyValue(env.VITE_SENTRY_ENVIRONMENT)
    if (configuredEnvironment !== undefined) {
        return configuredEnvironment
    }

    const modeEnvironment = normalizeNonEmptyValue(env.MODE)
    if (modeEnvironment !== undefined) {
        return modeEnvironment
    }

    return DEFAULT_SENTRY_ENVIRONMENT
}

/**
 * Нормализует sample rate к диапазону [0, 1] с fallback на значение по умолчанию.
 *
 * @param rawValue Исходное строковое значение sample rate.
 * @param fallback Fallback для невалидного значения.
 * @returns Корректный numeric sample rate.
 */
export function resolveSentrySampleRate(rawValue: string | undefined, fallback: number): number {
    const normalizedValue = normalizeNonEmptyValue(rawValue)
    if (normalizedValue === undefined) {
        return fallback
    }

    const parsed = Number(normalizedValue)
    if (Number.isFinite(parsed) !== true) {
        return fallback
    }

    if (parsed < 0 || parsed > 1) {
        return fallback
    }

    return parsed
}

/**
 * Редактирует чувствительные query-параметры в URL перед отправкой в Sentry.
 *
 * @param url Исходный URL.
 * @returns URL с замаскированными секретами.
 */
export function sanitizeRequestUrl(url: string): string {
    try {
        const parsedUrl = new URL(url)
        redactSensitiveQueryParams(parsedUrl)
        return parsedUrl.toString()
    } catch {
        if (url.startsWith("/") !== true) {
            return url
        }

        const parsedRelativeUrl = new URL(url, "http://local.invalid")
        redactSensitiveQueryParams(parsedRelativeUrl)

        const queryString = parsedRelativeUrl.searchParams.toString()
        const querySuffix = queryString.length > 0 ? `?${queryString}` : ""

        return `${parsedRelativeUrl.pathname}${querySuffix}${parsedRelativeUrl.hash}`
    }
}

/**
 * Маскирует чувствительные заголовки перед отправкой в Sentry.
 *
 * @param headers Исходный словарь заголовков.
 * @returns Копия словаря с редактированными значениями.
 */
export function sanitizeHeaders(
    headers: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
    const sanitizedHeaders: Record<string, unknown> = {}

    for (const [headerName, headerValue] of Object.entries(headers)) {
        if (SENSITIVE_HEADER_NAMES.has(headerName.toLowerCase())) {
            sanitizedHeaders[headerName] = "[REDACTED]"
            continue
        }

        sanitizedHeaders[headerName] = headerValue
    }

    return sanitizedHeaders
}

/**
 * Маскирует чувствительные данные в Sentry payload.
 *
 * @param payload Любой payload до отправки в Sentry.
 * @returns Payload с замаскированными url/headers.
 */
export function sanitizeSentryPayload<TPayload>(payload: TPayload): TPayload {
    if (isRecord(payload) !== true) {
        return payload
    }

    const sanitizedPayload: Record<string, unknown> = {
        ...payload,
    }
    sanitizedPayload.request = sanitizeSentryRequestBlock(payload.request)
    sanitizedPayload.breadcrumbs = sanitizeBreadcrumbs(payload.breadcrumbs)

    return sanitizedPayload as TPayload
}

/**
 * Возвращает normalized location href в браузере.
 *
 * @returns URL текущей страницы или undefined.
 */
function resolveWindowLocationHref(): string | undefined {
    return window.location.href
}

/**
 * Добавляет origin текущего приложения и API в trace propagation targets.
 *
 * @param apiUrl URL backend API.
 * @param locationHref URL текущей страницы.
 * @returns Уникальный список targets.
 */
function buildTracePropagationTargets(
    apiUrl: string | undefined,
    locationHref: string | undefined,
): readonly string[] {
    const targets = new Set<string>(["localhost", "127.0.0.1"])

    const apiOrigin = resolveOrigin(apiUrl)
    if (apiOrigin !== undefined) {
        targets.add(apiOrigin)
    }

    const appOrigin = resolveOrigin(locationHref)
    if (appOrigin !== undefined) {
        targets.add(appOrigin)
    }

    return Array.from(targets)
}

/**
 * Извлекает origin из URL.
 *
 * @param rawUrl Исходный URL.
 * @returns Origin либо undefined для невалидных значений.
 */
function resolveOrigin(rawUrl: string | undefined): string | undefined {
    const normalizedUrl = normalizeNonEmptyValue(rawUrl)
    if (normalizedUrl === undefined) {
        return undefined
    }

    try {
        return new URL(normalizedUrl).origin
    } catch {
        return undefined
    }
}

/**
 * Нормализует строку и отбрасывает пустые значения.
 *
 * @param value Исходное значение.
 * @returns Trimmed строка или undefined.
 */
function normalizeNonEmptyValue(value: string | undefined): string | undefined {
    if (value === undefined) {
        return undefined
    }

    const trimmedValue = value.trim()
    if (trimmedValue.length === 0) {
        return undefined
    }

    return trimmedValue
}

/**
 * Маскирует чувствительные query-параметры в URL.
 *
 * @param url Parsed URL.
 */
function redactSensitiveQueryParams(url: URL): void {
    for (const [paramName] of url.searchParams.entries()) {
        if (SENSITIVE_QUERY_PARAM_NAMES.has(paramName.toLowerCase()) !== true) {
            continue
        }

        url.searchParams.set(paramName, "[REDACTED]")
    }
}

/**
 * Маскирует чувствительные поля `request` в Sentry payload.
 *
 * @param requestBlock Вложенный request-блок Sentry события.
 * @returns Sanitized request-блок.
 */
function sanitizeSentryRequestBlock(requestBlock: unknown): unknown {
    if (isRecord(requestBlock) !== true) {
        return requestBlock
    }

    const sanitizedRequest: Record<string, unknown> = {
        ...requestBlock,
    }

    if (typeof requestBlock.url === "string") {
        sanitizedRequest.url = sanitizeRequestUrl(requestBlock.url)
    }

    if (isRecord(requestBlock.headers)) {
        sanitizedRequest.headers = sanitizeHeaders(requestBlock.headers)
    }

    return sanitizedRequest
}

/**
 * Маскирует чувствительные поля `breadcrumbs` в Sentry payload.
 *
 * @param breadcrumbs Поле breadcrumbs из Sentry события.
 * @returns Sanitized breadcrumbs.
 */
function sanitizeBreadcrumbs(breadcrumbs: unknown): unknown {
    if (Array.isArray(breadcrumbs) !== true) {
        return breadcrumbs
    }

    return breadcrumbs.map((breadcrumb): unknown => {
        if (isRecord(breadcrumb) !== true) {
            return breadcrumb
        }

        const sanitizedBreadcrumb: Record<string, unknown> = {
            ...breadcrumb,
        }

        if (isRecord(breadcrumb.data)) {
            sanitizedBreadcrumb.data = sanitizeBreadcrumbData(breadcrumb.data)
        }

        return sanitizedBreadcrumb
    })
}

/**
 * Маскирует чувствительные поля `data` внутри breadcrumb.
 *
 * @param breadcrumbData Поле data одного breadcrumb.
 * @returns Sanitized data.
 */
function sanitizeBreadcrumbData(
    breadcrumbData: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
    const sanitizedData: Record<string, unknown> = {
        ...breadcrumbData,
    }

    if (isRecord(breadcrumbData.headers)) {
        sanitizedData.headers = sanitizeHeaders(breadcrumbData.headers)
    }

    if (typeof breadcrumbData.url === "string") {
        sanitizedData.url = sanitizeRequestUrl(breadcrumbData.url)
    }

    return sanitizedData
}

/**
 * Проверяет, что значение является plain object.
 *
 * @param value Неизвестное значение.
 * @returns true для object != null.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}
