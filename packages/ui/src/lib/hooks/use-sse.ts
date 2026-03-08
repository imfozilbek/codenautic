import { useCallback, useEffect, useRef, useState } from "react"

/** Тип SSE-события. */
export type TSSEEventType = "message" | "progress" | "done" | "error"

/** Базовый payload SSE-сообщения. */
export interface ISSEEventPayload {
    /** Текстовое сообщение события. */
    readonly message?: string
    /** Этап/шаг для прогресса. */
    readonly stage?: string
    /** Текущее значение прогресса. */
    readonly current?: number
    /** Итоговое значение прогресса. */
    readonly total?: number
    /** Произвольные поля события. */
    readonly [key: string]: unknown
}

/** Распаршенное событие из SSE-потока. */
export interface ISSEStreamEvent {
    /** Уникальный идентификатор события в рамках текущей сессии потока. */
    readonly id: string
    /** Идентификатор типа события. */
    readonly type: TSSEEventType
    /** Данные payload. */
    readonly payload: ISSEEventPayload
}

type TConnectionState = "idle" | "connecting" | "open" | "reconnecting" | "error" | "closed"
type TSourceRef = ReturnType<typeof setTimeout>

/** Параметры SSE-хука. */
export interface IUseSSEStreamProps {
    /** URL SSE-эндпоинта. */
    readonly sourceUrl: string
    /** Автоповтор при ошибке. */
    readonly maxReconnectAttempts?: number
    /** Базовая задержка репорта в ms. */
    readonly initialReconnectDelayMs?: number
    /** Автозапуск после mount. */
    readonly autoStart?: boolean
}

/** Результат SSE-хука. */
export interface IUseSSEStreamResult {
    /** Текущее состояние потока. */
    readonly state: TConnectionState
    /** Последние события потока. */
    readonly events: ReadonlyArray<ISSEStreamEvent>
    /** Текст ошибки если есть. */
    readonly error: string | undefined
    /** Текущее значение прогресса. */
    readonly progressCurrent: number
    /** Общее значение прогресса. */
    readonly progressTotal: number
    /** Запустить поток. */
    readonly start: () => void
    /** Остановить поток. */
    readonly stop: () => void
}

const SUPPORTED_EVENT_TYPES = new Set<TSSEEventType>([
    "message",
    "progress",
    "done",
    "error",
])

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}

function clampNumber(value: number | undefined, max = Number.MAX_VALUE): number {
    if (value === undefined || Number.isNaN(value)) {
        return 0
    }

    if (value < 0) {
        return 0
    }

    if (value > max) {
        return max
    }

    return value
}

function parseSSEPayload(data: string): ISSEEventPayload {
    try {
        const parsed: unknown = JSON.parse(data)
        if (isRecord(parsed) === false) {
            return {
                message: data,
            }
        }

        const payload: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(parsed)) {
            payload[key] = value
        }

        const message =
            typeof payload.message === "string"
                ? payload.message
                : data
        const stage = typeof payload.stage === "string" ? payload.stage : undefined
        const current = typeof payload.current === "number" ? payload.current : undefined
        const total = typeof payload.total === "number" ? payload.total : undefined

        return {
            ...payload,
            message,
            stage,
            current,
            total,
        }
    } catch {
        return {
            message: data,
        }
    }
}

function normalizeEventType(value: string): TSSEEventType {
    if (SUPPORTED_EVENT_TYPES.has(value as TSSEEventType)) {
        return value as TSSEEventType
    }

    return "message"
}

function parseSSEEvent(eventType: string, data: string, eventId: string): ISSEStreamEvent {
    return {
        id: eventId,
        payload: parseSSEPayload(data),
        type: normalizeEventType(eventType),
    }
}

function createSSEEventId(sequence: { current: number }): string {
    sequence.current += 1
    return `event-${sequence.current.toString()}`
}

/**
 * useSSEStream реализует SSE с авто-подключением и авто-реконнектом.
 *
 * @param props Настройки SSE.
 * @returns Текущее состояние потока и события.
 */
export function useSSEStream(props: IUseSSEStreamProps): IUseSSEStreamResult {
    const {
        autoStart = true,
        initialReconnectDelayMs = 750,
        maxReconnectAttempts = 4,
        sourceUrl,
    } = props

    const [state, setState] = useState<TConnectionState>("idle")
    const [error, setError] = useState<string | undefined>(undefined)
    const [events, setEvents] = useState<ReadonlyArray<ISSEStreamEvent>>([])
    const [progressCurrent, setProgressCurrent] = useState(0)
    const [progressTotal, setProgressTotal] = useState(0)

    const sourceRef = useRef<EventSource | null>(null)
    const reconnectTimerRef = useRef<TSourceRef | null>(null)
    const runningRef = useRef(false)
    const reconnectCountRef = useRef(0)
    const reconnectDelayRef = useRef(initialReconnectDelayMs)
    const eventSequenceRef = useRef(0)

    const clearReconnectTimer = useCallback((): void => {
        if (reconnectTimerRef.current !== null) {
            clearTimeout(reconnectTimerRef.current)
            reconnectTimerRef.current = null
        }
    }, [])

    const closeSource = useCallback((): void => {
        clearReconnectTimer()
        if (sourceRef.current !== null) {
            sourceRef.current.close()
            sourceRef.current = null
        }
    }, [clearReconnectTimer])

    const appendEvent = useCallback((nextEvent: ISSEStreamEvent): void => {
        setEvents((previousEvents): ReadonlyArray<ISSEStreamEvent> => {
            const nextEvents = [...previousEvents, nextEvent]
            return nextEvents.slice(-100)
        })

        if (nextEvent.type === "progress") {
            setProgressCurrent(clampNumber(nextEvent.payload.current))
            setProgressTotal(clampNumber(nextEvent.payload.total))
            return
        }

        if (nextEvent.type === "done") {
            runningRef.current = false
            closeSource()
            setState("closed")
            return
        }

        if (nextEvent.type === "error") {
            setError(String(nextEvent.payload.message ?? "Stream returned an error event."))
            runningRef.current = false
            closeSource()
            setState("error")
        }
    }, [closeSource])

    const openSource = useCallback((): void => {
        if (runningRef.current === false) {
            return
        }

        closeSource()
        setState("connecting")
        setError(undefined)

        if (typeof EventSource !== "function") {
            runningRef.current = false
            setState("error")
            setError("EventSource is not available in this environment.")
            return
        }

        const normalizedSourceUrl = sourceUrl.trim()
        if (normalizedSourceUrl.length === 0) {
            runningRef.current = false
            setState("error")
            setError("SSE source URL is empty.")
            return
        }

        let source: EventSource
        try {
            source = new EventSource(normalizedSourceUrl)
        } catch (error: unknown) {
            runningRef.current = false
            setState("error")
            setError(
                error instanceof Error ? error.message : "Failed to initialize SSE connection.",
            )
            return
        }
        sourceRef.current = source

        const onOpen = (): void => {
            reconnectCountRef.current = 0
            reconnectDelayRef.current = initialReconnectDelayMs
            setState("open")
            setError(undefined)
        }

        const onConnectionError = (): void => {
            source.close()

            if (runningRef.current === false) {
                setState("closed")
                return
            }

            if (reconnectCountRef.current >= maxReconnectAttempts) {
                setState("error")
                setError("Maximum reconnect attempts reached.")
                runningRef.current = false
                return
            }

            const nextDelay = reconnectDelayRef.current
            reconnectCountRef.current += 1
            reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 8_000)
            setState("reconnecting")
            clearReconnectTimer()
            reconnectTimerRef.current = setTimeout((): void => {
                if (runningRef.current === true) {
                    openSource()
                }
            }, nextDelay)
        }

        source.addEventListener("open", onOpen)
        source.addEventListener("error", onConnectionError)
        source.addEventListener("message", (event: Event): void => {
            if (event instanceof MessageEvent === false || typeof event.data !== "string") {
                return
            }

            appendEvent(parseSSEEvent("message", event.data, createSSEEventId(eventSequenceRef)))
        })
        source.addEventListener("progress", (event: Event): void => {
            if (event instanceof MessageEvent === false || typeof event.data !== "string") {
                return
            }

            appendEvent(
                parseSSEEvent(
                    "progress",
                    event.data,
                    createSSEEventId(eventSequenceRef),
                ),
            )
        })
        source.addEventListener("done", (event: Event): void => {
            if (event instanceof MessageEvent === false || typeof event.data !== "string") {
                return
            }

            appendEvent(
                parseSSEEvent(
                    "done",
                    event.data,
                    createSSEEventId(eventSequenceRef),
                ),
            )
        })
        source.addEventListener("stream-error", (event: Event): void => {
            if (event instanceof MessageEvent === false || typeof event.data !== "string") {
                return
            }

            appendEvent(
                parseSSEEvent(
                    "error",
                    event.data,
                    createSSEEventId(eventSequenceRef),
                ),
            )
        })
    }, [
        appendEvent,
        clearReconnectTimer,
        closeSource,
        initialReconnectDelayMs,
        maxReconnectAttempts,
        sourceUrl,
    ])

    const start = useCallback((): void => {
        if (runningRef.current === true) {
            return
        }

        runningRef.current = true
        reconnectCountRef.current = 0
        reconnectDelayRef.current = initialReconnectDelayMs
        eventSequenceRef.current = 0
        setEvents([])
        setProgressCurrent(0)
        setProgressTotal(0)
        setError(undefined)
        openSource()
    }, [openSource])

    const stop = useCallback((): void => {
        runningRef.current = false
        closeSource()
        setState("closed")
    }, [closeSource])

    useEffect((): (() => void) => {
        if (autoStart) {
            start()
        }

        return (): void => {
            stop()
        }
    }, [autoStart, start, stop, sourceUrl])

    return {
        state,
        events,
        error,
        progressCurrent,
        progressTotal,
        start,
        stop,
    }
}
