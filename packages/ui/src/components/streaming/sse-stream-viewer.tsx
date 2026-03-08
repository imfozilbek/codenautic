import { type ReactElement, useMemo } from "react"

import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui"
import { type ISSEStreamEvent, type TSSEEventType, useSSEStream } from "@/lib/hooks/use-sse"

/** Пропсы для SSE viewer-а. */
interface ISSEStreamViewerProps {
    /** URL SSE-эндпоинта. */
    readonly eventSourceUrl: string
    /** Заголовок блока. */
    readonly title: string
    /** Автозапуск потока после mount. */
    readonly autoStart?: boolean
    /** Лимит событий для списка. */
    readonly maxEvents?: number
    /** Количество попыток reconnect. */
    readonly maxReconnectAttempts?: number
    /** Базовая задержка reconnect в ms. */
    readonly initialReconnectDelayMs?: number
}

type TSSEStreamConnectionState =
    | "idle"
    | "connecting"
    | "open"
    | "reconnecting"
    | "error"
    | "closed"

function formatProgressLabel(current: number, total: number): string {
    if (total <= 0) {
        return `${current}`
    }

    const percent = Math.round((current / total) * 100)
    const safePercent = Math.max(0, Math.min(100, percent))
    return `${current}/${total} (${safePercent}%)`
}

function buildStateText(state: TSSEStreamConnectionState): string {
    if (state === "open") {
        return "Live"
    }

    if (state === "connecting") {
        return "Connecting"
    }

    if (state === "reconnecting") {
        return "Reconnecting"
    }

    if (state === "closed") {
        return "Closed"
    }

    if (state === "error") {
        return "Error"
    }

    return "Idle"
}

function buildEventLabel(event: ISSEStreamEvent): string {
    if (event.type === "error") {
        return `Error: ${String(event.payload.message ?? "stream error")}`
    }

    if (event.type === "done") {
        return String(event.payload.message ?? "Stream completed")
    }

    if (event.type === "progress") {
        const message =
            typeof event.payload.message === "string" ? event.payload.message : "Progress update"
        const stage = typeof event.payload.stage === "string" ? ` · ${event.payload.stage}` : ""
        return `${message}${stage}`
    }

    const message = event.payload.message
    if (typeof message === "string") {
        return message
    }

    return JSON.stringify(event.payload)
}

function createEventItemKey(event: ISSEStreamEvent): string {
    return event.id
}

function getStatusLabel(type: TSSEEventType): string {
    if (type === "done") {
        return "Done"
    }

    if (type === "error") {
        return "Error"
    }

    if (type === "progress") {
        return "Progress"
    }

    return "Message"
}

/** SSE-панель с прогрессом и логом событий. */
export function SseStreamViewer(props: ISSEStreamViewerProps): ReactElement {
    const {
        autoStart,
        eventSourceUrl,
        initialReconnectDelayMs,
        maxEvents = 12,
        maxReconnectAttempts,
        title,
    } = props
    const { error, events, progressCurrent, progressTotal, start, state, stop } = useSSEStream({
        autoStart,
        initialReconnectDelayMs,
        maxReconnectAttempts,
        sourceUrl: eventSourceUrl,
    })

    const isProgressVisible = progressTotal > 0
    const progressPercent = isProgressVisible === true ? (progressCurrent / progressTotal) * 100 : 0
    const clampedProgressPercent = isProgressVisible
        ? Math.max(0, Math.min(100, progressPercent))
        : 0
    const recentEvents = useMemo((): ReadonlyArray<ISSEStreamEvent> => {
        return events.slice(-maxEvents)
    }, [events, maxEvents])

    const stateText = buildStateText(state)
    const statusClass = state === "error" ? "text-danger" : "text-foreground"

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-foreground">{title}</p>
                        <p className={`text-xs ${statusClass}`}>Статус: {stateText}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onPress={start}
                            radius="sm"
                            size="sm"
                            disabled={
                                state === "open" ||
                                state === "connecting" ||
                                state === "reconnecting"
                            }
                        >
                            Start
                        </Button>
                        <Button
                            onPress={stop}
                            radius="sm"
                            color="danger"
                            size="sm"
                            variant="light"
                            disabled={state === "idle" || state === "closed"}
                        >
                            Stop
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardBody className="space-y-3">
                {error === undefined ? null : <Alert color="danger">{error}</Alert>}

                {isProgressVisible === false ? (
                    <p className="text-sm text-muted-foreground">Нет данных о прогрессе.</p>
                ) : (
                    <div className="space-y-2">
                        <p className="text-sm text-foreground">
                            Progress: {formatProgressLabel(progressCurrent, progressTotal)}
                        </p>
                        <div className="h-2 rounded-full bg-slate-200">
                            <div
                                aria-label="Stream progress"
                                aria-valuemax={100}
                                aria-valuemin={0}
                                aria-valuenow={clampedProgressPercent}
                                className="h-2 rounded-full bg-primary transition-[width]"
                                role="progressbar"
                                style={{ width: `${clampedProgressPercent}%` }}
                            />
                        </div>
                    </div>
                )}

                <div>
                    <p className="mb-2 text-sm text-foreground">Event log</p>
                    <ul aria-label="stream events" className="space-y-2" role="log">
                        {recentEvents.length === 0 ? (
                            <li className="text-sm text-muted-foreground">Ожидание событий</li>
                        ) : null}
                        {recentEvents.map(
                            (event): ReactElement => (
                                <li
                                    className="rounded-md border border-border bg-surface p-2 text-sm text-foreground"
                                    key={createEventItemKey(event)}
                                >
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                        {getStatusLabel(event.type)}
                                    </p>
                                    <p>{buildEventLabel(event)}</p>
                                </li>
                            ),
                        )}
                    </ul>
                </div>
            </CardBody>
        </Card>
    )
}
