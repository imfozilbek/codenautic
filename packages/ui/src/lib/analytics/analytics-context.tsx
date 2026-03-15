import {
    createContext,
    type ReactElement,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react"

import { loadPersistedAuthSession } from "@/lib/auth/auth-session"
import {
    ANALYTICS_EVENT_NAMES,
    type IAnalyticsDropOffPayload,
    type IAnalyticsFunnelStepPayload,
    type IAnalyticsKeyActionPayload,
    type IAnalyticsPayloadByName,
    type IAnalyticsTimeToFirstValuePayload,
    type TAnalyticsConsent,
    type TAnalyticsEventName,
} from "./analytics-types"
import { createAnalyticsSdk, sanitizeAnalyticsPayload } from "./analytics-sdk"
import type { IAnalyticsSdkRuntimeOptions } from "./analytics-sdk"

/** Конфигурация AnalyticsProvider. */
export interface IAnalyticsProviderProps {
    /** Дочерние компоненты приложения. */
    readonly children: ReactNode
    /** Tenant идентификатор из окружения/сессии. */
    readonly tenantId?: string
    /** User идентификатор. */
    readonly userId?: string
    /** Принудительный sessionId (например, для E2E). */
    readonly sessionId?: string
    /** Дефолтное consent состояние. */
    readonly defaultConsent?: TAnalyticsConsent
    /** storage для очереди и сессии. */
    readonly storage?: Storage
    /** Блок runtime options для SDK. */
    readonly options?: IAnalyticsSdkRuntimeOptions
    /** Отправка запроса. */
    readonly sendRequest?: (url: string, init: RequestInit) => Promise<Response>
    /** Флаг онлайн/оффлайн. */
    readonly isOnline?: () => boolean
    /** Callback изменения длины очереди. */
    readonly onQueueStateChange?: (pending: number) => void
}

type TAnalyticsTrackPayload<TName extends TAnalyticsEventName> = IAnalyticsPayloadByName[TName]

type TAnalyticsHookState = {
    /** Consent для трекинга. */
    readonly consent: TAnalyticsConsent
    /** Очередь событий в памяти SDK. */
    readonly pendingEventsCount: number
    /** Установка consent (granted/denied/pending). */
    readonly setConsent: (next: TAnalyticsConsent) => void
    /** Отследить событие произвольного типа. */
    readonly track: <TName extends TAnalyticsEventName>(
        name: TName,
        payload: TAnalyticsTrackPayload<TName>,
    ) => boolean
    /** Отследить key action событие. */
    readonly trackKeyAction: (payload: IAnalyticsKeyActionPayload) => boolean
    /** Отследить funnel step событие. */
    readonly trackFunnelStep: (payload: IAnalyticsFunnelStepPayload) => boolean
    /** Отследить drop-off событие. */
    readonly trackDropOff: (payload: IAnalyticsDropOffPayload) => boolean
    /** Отследить time-to-first-value событие. */
    readonly trackTimeToFirstValue: (payload: IAnalyticsTimeToFirstValuePayload) => boolean
    /** Форсированный flush очереди. */
    readonly flush: () => Promise<void>
    /** Текущий sessionId. */
    readonly sessionId: string
}

const AnalyticsContext = createContext<TAnalyticsHookState | undefined>(undefined)
const DEFAULT_ANALYTICS_ENDPOINT = "/api/v1/analytics/events"
const DEFAULT_QUEUE_STORAGE_KEY = "codenautic:ui:analytics:queue"
const DEFAULT_SESSION_STORAGE_KEY = "codenautic:ui:analytics:session-id"

/**
 * Провайдер с централизованным analytics SDK.
 *
 * @param props Настройки провайдера.
 * @returns React node.
 */
export function AnalyticsProvider(props: IAnalyticsProviderProps): ReactElement {
    const {
        tenantId,
        userId: explicitUserId,
        sessionId,
        defaultConsent = "pending",
        storage: providedStorage,
        options,
        sendRequest,
        isOnline,
        onQueueStateChange,
    } = props

    const storage = providedStorage ?? resolveStorage()
    const [consent, setConsentState] = useState<TAnalyticsConsent>(defaultConsent)
    const [pendingEventsCount, setPendingEventsCount] = useState(0)

    const queueStateChangeHandler = useCallback(
        (pending: number): void => {
            setPendingEventsCount(pending)
            onQueueStateChange?.(pending)
        },
        [onQueueStateChange],
    )

    const sdkRuntime = useMemo(
        () =>
            createSdkRuntime({
                options,
                sendRequest,
                isOnline,
            }),
        [options, sendRequest, isOnline],
    )
    const resolvedUserId = resolveAnalyticsUserId(explicitUserId, storage)
    const sdk = useMemo(
        () =>
            createAnalyticsSdk({
                tenantId,
                userId: resolvedUserId,
                sessionId,
                storage,
                isOnline: sdkRuntime.isOnline,
                sendRequest: sdkRuntime.sendRequest,
                onQueueStateChange: queueStateChangeHandler,
                consent: defaultConsent,
                options: sdkRuntime.options,
            }),
        [
            sessionId,
            storage,
            sdkRuntime.isOnline,
            sdkRuntime.options,
            sdkRuntime.sendRequest,
            queueStateChangeHandler,
            resolvedUserId,
            tenantId,
            defaultConsent,
        ],
    )

    useEffect((): void => {
        sdk.setConsent(consent)
    }, [consent, sdk])

    useEffect((): (() => void) => {
        return (): void => {
            sdk.dispose()
        }
    }, [sdk])

    const setConsent = useCallback((next: TAnalyticsConsent): void => {
        setConsentState(next)
    }, [])

    const track = useCallback(
        <TName extends TAnalyticsEventName>(
            name: TName,
            payload: TAnalyticsTrackPayload<TName>,
        ): boolean => {
            return sdk.track(name, sanitizePayload(payload))
        },
        [sdk],
    )

    const trackKeyAction = useCallback(
        (payload: IAnalyticsKeyActionPayload): boolean => {
            return track(ANALYTICS_EVENT_NAMES.keyAction, sanitizePayload(payload))
        },
        [track],
    )
    const trackFunnelStep = useCallback(
        (payload: IAnalyticsFunnelStepPayload): boolean => {
            return track(ANALYTICS_EVENT_NAMES.funnelStep, sanitizePayload(payload))
        },
        [track],
    )
    const trackDropOff = useCallback(
        (payload: IAnalyticsDropOffPayload): boolean => {
            return track(ANALYTICS_EVENT_NAMES.dropOff, sanitizePayload(payload))
        },
        [track],
    )
    const trackTimeToFirstValue = useCallback(
        (payload: IAnalyticsTimeToFirstValuePayload): boolean => {
            return track(ANALYTICS_EVENT_NAMES.timeToFirstValue, sanitizePayload(payload))
        },
        [track],
    )

    const contextValue = useMemo(
        () => ({
            consent,
            pendingEventsCount,
            setConsent,
            track,
            trackKeyAction,
            trackFunnelStep,
            trackDropOff,
            trackTimeToFirstValue,
            flush: (): Promise<void> => sdk.flush(),
            sessionId: sdk.getSessionId(),
        }),
        [
            consent,
            pendingEventsCount,
            setConsent,
            track,
            trackDropOff,
            trackFunnelStep,
            trackKeyAction,
            trackTimeToFirstValue,
            sdk,
        ],
    )

    return (
        <AnalyticsContext.Provider value={contextValue}>{props.children}</AnalyticsContext.Provider>
    )
}

/**
 * Хук для интеграции событий analytics в компонентах.
 */
export function useAnalytics(): TAnalyticsHookState {
    const context = useContext(AnalyticsContext)
    if (context === undefined) {
        throw new Error("useAnalytics must be used inside AnalyticsProvider")
    }
    return context
}

function resolveAnalyticsUserId(userId: string | undefined, storage: Storage): string | undefined {
    if (userId !== undefined) {
        return userId
    }

    const session = loadPersistedAuthSession(storage)
    return session?.user.id
}

function resolveStorage(): Storage {
    try {
        return window.localStorage
    } catch {
        return createInMemoryStorage()
    }
}

function createInMemoryStorage(): Storage {
    const data = new Map<string, string>()

    return {
        get length(): number {
            return data.size
        },
        clear(): void {
            data.clear()
        },
        getItem(key: string): string | null {
            return data.get(key) ?? null
        },
        key(index: number): string | null {
            return Array.from(data.keys())[index] ?? null
        },
        removeItem(key: string): void {
            data.delete(key)
        },
        setItem(key: string, value: string): void {
            data.set(key, value)
        },
    }
}

function createSdkRuntime(args: {
    readonly options?: IAnalyticsSdkRuntimeOptions
    readonly sendRequest?: (url: string, init: RequestInit) => Promise<Response>
    readonly isOnline?: () => boolean
}): {
    readonly sendRequest: (url: string, init: RequestInit) => Promise<Response>
    readonly isOnline: () => boolean
    readonly options: IAnalyticsSdkRuntimeOptions
} {
    const queueStorageKey = args.options?.queueStorageKey ?? DEFAULT_QUEUE_STORAGE_KEY
    const sessionStorageKey = args.options?.sessionStorageKey ?? DEFAULT_SESSION_STORAGE_KEY

    const optionsBase: IAnalyticsSdkRuntimeOptions = {
        ...args.options,
        queueStorageKey,
        sessionStorageKey,
    }
    const options: IAnalyticsSdkRuntimeOptions =
        args.options?.endpoint === undefined
            ? {
                  ...optionsBase,
                  endpoint: DEFAULT_ANALYTICS_ENDPOINT,
              }
            : optionsBase

    return {
        sendRequest: args.sendRequest ?? ((url, init): Promise<Response> => fetch(url, init)),
        isOnline:
            args.isOnline ??
            (() => {
                if (typeof navigator === "undefined") {
                    return true
                }
                return navigator.onLine !== false
            }),
        options,
    }
}

function sanitizePayload<TPayload extends object>(payload: TPayload): TPayload {
    return sanitizeAnalyticsPayload(payload as Record<string, unknown>) as unknown as TPayload
}

export { type TAnalyticsHookState as IAnalyticsContextState }
