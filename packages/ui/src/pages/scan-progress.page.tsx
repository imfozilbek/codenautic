import type { ReactElement } from "react"
import { useEffect, useMemo, useState } from "react"

import { Alert, Card, CardBody, CardHeader } from "@/components/ui"

const PHASES = ["queue", "clone", "analysis", "indexing", "report"] as const
const DEFAULT_JOB_ID = "scan-job-local"
const DEFAULT_SEED_EVENTS: ReadonlyArray<IScanProgressEvent> = [
    {
        etaSeconds: 240,
        log: "Подготовка пайплайна сканирования",
        message: "Проверка доступа к репозиторию",
        phase: "queue",
        percent: 5,
        phaseCompleted: false,
        timestamp: createRelativeIsoTime(-90),
    },
    {
        etaSeconds: 180,
        log: "Получен репозиторий, запуск загрузки",
        message: "Клонирование репозитория",
        phase: "clone",
        percent: 18,
        phaseCompleted: false,
        timestamp: createRelativeIsoTime(-70),
    },
    {
        etaSeconds: 120,
        log: "Найдены все целевые файлы",
        message: "Сборка графа зависимостей",
        phase: "analysis",
        percent: 42,
        phaseCompleted: false,
        timestamp: createRelativeIsoTime(-45),
    },
    {
        etaSeconds: 60,
        log: "Создан список правил и приоритетов",
        message: "Индексация",
        phase: "indexing",
        percent: 74,
        phaseCompleted: false,
        timestamp: createRelativeIsoTime(-20),
    },
]

type TScanPhase = (typeof PHASES)[number]

interface IScanProgressEvent {
    /** Название шага, который сейчас выполняется. */
    readonly phase: TScanPhase
    /** Процент выполнения всего пайплайна. */
    readonly percent: number
    /** Количество секунд до предполагаемого завершения. */
    readonly etaSeconds: number
    /** Короткий статус сообщения для пользователя. */
    readonly message: string
    /** Опциональный лог этой стадии. */
    readonly log?: string
    /** Явно завершена ли текущая фаза. */
    readonly phaseCompleted: boolean
    /** Таймштамп события. */
    readonly timestamp: string
}

interface IScanProgressPageProps {
    /** Идентификатор скана для заголовка и SSE. */
    readonly jobId?: string
    /** URL SSE-эндпоинта (например /api/v1/scan/:id/progress). */
    readonly eventSourceUrl?: string
    /** Начальные события, используемые в демо-режиме. */
    readonly seedEvents?: ReadonlyArray<IScanProgressEvent>
}

interface IUseScanProgressState {
    readonly events: ReadonlyArray<IScanProgressEvent>
    readonly errorMessage: string | undefined
    readonly isLive: boolean
}

function clampPercent(value: number): number {
    if (value < 0) {
        return 0
    }

    if (value > 100) {
        return 100
    }

    return value
}

function isValidScanPhase(value: string): value is TScanPhase {
    return (PHASES as ReadonlyArray<string>).includes(value)
}

function parseProgressPayload(data: string): IScanProgressEvent | undefined {
    let parsed: unknown
    try {
        parsed = JSON.parse(data)
    } catch {
        return undefined
    }

    if (
        typeof parsed !== "object" ||
        parsed === null ||
        typeof parsed.phase !== "string" ||
        isValidScanPhase(parsed.phase) === false
    ) {
        return undefined
    }

    if (
        typeof parsed.percent !== "number" ||
        Number.isNaN(parsed.percent) === true ||
        typeof parsed.etaSeconds !== "number" ||
        Number.isNaN(parsed.etaSeconds) === true ||
        typeof parsed.message !== "string" ||
        typeof parsed.phaseCompleted !== "boolean" ||
        typeof parsed.timestamp !== "string"
    ) {
        return undefined
    }

    return {
        phase: parsed.phase,
        percent: clampPercent(parsed.percent),
        etaSeconds: parsed.etaSeconds,
        message: parsed.message,
        phaseCompleted: parsed.phaseCompleted,
        log: typeof parsed.log === "string" ? parsed.log : undefined,
        timestamp: parsed.timestamp,
    }
}

function createRelativeIsoTime(offsetSeconds: number): string {
    const timestamp = Date.now() + offsetSeconds * 1000
    return new Date(timestamp).toISOString()
}

function mapPhaseState(
    currentPhase: TScanPhase,
    currentPercent: number,
    events: ReadonlyArray<IScanProgressEvent>,
): ReadonlyArray<{
    readonly phase: TScanPhase
    readonly isCompleted: boolean
    readonly isActive: boolean
    readonly message: string
}> {
    const currentIndex = PHASES.indexOf(currentPhase)
    const latestEvent = events.at(-1)

    return PHASES.map((phase, index): {
        isCompleted: boolean
        isActive: boolean
        message: string
        phase: TScanPhase
    } => {
        if (latestEvent === undefined) {
            return {
                isCompleted: false,
                isActive: index === 0,
                message: "Ожидание",
                phase,
            }
        }

        if (index < currentIndex) {
            return {
                isCompleted: true,
                isActive: false,
                message: "Завершено",
                phase,
            }
        }

        if (index > currentIndex) {
            return {
                isCompleted: false,
                isActive: false,
                message: "Ожидание",
                phase,
            }
        }

        const isCurrentActive = latestEvent.phaseCompleted === false
        return {
            isCompleted: latestEvent.phaseCompleted,
            isActive: isCurrentActive && currentPercent < 100,
            message: latestEvent.message,
            phase,
        }
    })
}

function buildProgressState(
    state: IUseScanProgressState,
): {
    readonly phaseStates: ReadonlyArray<{
        phase: TScanPhase
        isCompleted: boolean
        isActive: boolean
        message: string
    }>
    readonly etaSeconds: number | undefined
    readonly percent: number
    readonly isDone: boolean
    readonly currentMessage: string
} {
    const latest = state.events.at(-1)
    const percent = latest === undefined ? 0 : latest.percent
    const etaSeconds = latest?.etaSeconds
    const isDone = latest !== undefined && latest.percent >= 100

    return {
        phaseStates: latest === undefined ? [] : mapPhaseState(latest.phase, percent, state.events),
        etaSeconds,
        currentMessage: latest?.message ?? "Ожидание начала скана",
        isDone,
        percent,
    }
}

function createEventSource(
    eventSourceUrl: string,
    onEvent: (nextEvent: IScanProgressEvent) => void,
    onError: (message: string) => void,
): (() => void) | undefined {
    if (typeof EventSource !== "function") {
        onError("EventSource недоступен в этом окружении.")
        return undefined
    }

    const source = new EventSource(eventSourceUrl)
    source.onmessage = (event): void => {
        const nextEvent = parseProgressPayload(event.data)
        if (nextEvent === undefined) {
            return
        }

        onEvent(nextEvent)
    }

    source.onerror = (): void => {
        onError("Поток прогресса временно недоступен.")
    }

    return (): void => {
        source.close()
    }
}

function useScanProgressEvents(
    jobId: string,
    props: IScanProgressPageProps,
): IUseScanProgressState {
    const [events, setEvents] = useState<ReadonlyArray<IScanProgressEvent>>(props.seedEvents ?? [])
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
    const [isLive, setIsLive] = useState(props.eventSourceUrl !== undefined)

    useEffect((): (() => void) | undefined => {
        if (props.eventSourceUrl === undefined) {
            setIsLive(false)
            return
        }

        const sourceUrl = `${props.eventSourceUrl}?jobId=${jobId}`
        const closeSource = createEventSource(
            sourceUrl,
            (nextEvent): void => {
                setEvents((previous): ReadonlyArray<IScanProgressEvent> => [...previous, nextEvent])
                setErrorMessage(undefined)
            },
            (message): void => {
                setIsLive(false)
                setErrorMessage(message)
            },
        )
        if (closeSource === undefined) {
            return
        }

        setIsLive(true)
        return () => {
            closeSource()
            setIsLive(false)
        }
    }, [jobId, props.eventSourceUrl])

    return { events, errorMessage, isLive }
}

function formatSecondsToMinutes(totalSeconds: number): string {
    if (totalSeconds <= 0) {
        return "менее минуты"
    }

    const minutes = Math.max(1, Math.ceil(totalSeconds / 60))
    return `~${minutes} мин`
}

function formatLogTime(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime()) === true) {
        return "—"
    }

    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    })
}

function formatProgressLabel(percent: number): string {
    return `${percent}%`
}

/**
 * Страница отслеживания сканирования с визуальным прогрессом и логами по этапам.
 *
 * @param props Параметры страницы.
 * @returns Экран реального прогресса сканирования.
 */
export function ScanProgressPage(props: IScanProgressPageProps): ReactElement {
    const jobId = props.jobId?.trim().length === 0 ? DEFAULT_JOB_ID : props.jobId ?? DEFAULT_JOB_ID
    const state = useScanProgressEvents(jobId, {
        eventSourceUrl: props.eventSourceUrl,
        seedEvents: props.seedEvents ?? DEFAULT_SEED_EVENTS,
        jobId,
    })
    const progressState = useMemo(
        () => buildProgressState(state),
        [state],
    )
    const progressClass =
        progressState.percent < 50
            ? "bg-blue-500"
            : progressState.percent < 90
              ? "bg-emerald-500"
              : "bg-purple-500"

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">Scan Progress</h1>
            <p className="text-sm text-slate-600">
                Отслеживайте жизненный цикл скана "{jobId}" в реальном времени.
            </p>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">Текущий статус</p>
                </CardHeader>
                <CardBody className="space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="mb-2 text-sm font-semibold text-slate-700">
                            {progressState.currentMessage}
                        </p>
                        <div className="h-3 w-full rounded-full bg-slate-200">
                            <div
                                aria-label="scan progress bar"
                                aria-valuemax={100}
                                aria-valuemin={0}
                                aria-valuenow={progressState.percent}
                                className={`${progressClass} h-3 rounded-full transition-[width] duration-300`}
                                role="progressbar"
                                style={{ width: formatProgressLabel(progressState.percent) }}
                            />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                            <span>Прогресс: {formatProgressLabel(progressState.percent)}</span>
                            <span>
                                ETA: {progressState.etaSeconds === undefined
                                    ? "—"
                                    : formatSecondsToMinutes(progressState.etaSeconds)}
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-5">
                        {progressState.phaseStates.map((phase): ReactElement => (
                            <article
                                className={`rounded-lg border px-3 py-2 ${
                                    phase.isCompleted
                                        ? "border-emerald-200 bg-emerald-50"
                                        : phase.isActive
                                          ? "border-blue-200 bg-blue-50"
                                          : "border-slate-200 bg-white"
                                }`}
                                key={phase.phase}
                            >
                                <p className="text-xs uppercase tracking-wider text-slate-500">
                                    {phase.phase}
                                </p>
                                <p className="text-sm font-semibold text-slate-900">
                                    {phase.isCompleted
                                        ? "Готово"
                                        : phase.isActive
                                          ? "Выполняется"
                                          : "Ожидает"}
                                </p>
                                <p className="text-xs text-slate-600">{phase.message}</p>
                            </article>
                        ))}
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">Логи этапов</p>
                        <p
                            className={`text-xs ${progressState.isDone ? "text-emerald-700" : "text-slate-500"}`}
                        >
                            {progressState.isDone ? "Завершено" : state.isLive ? "ОБНОВЛЯЕТСЯ" : "ОЖИДАЕТ"}
                        </p>
                    </div>
                </CardHeader>
                <CardBody>
                    {state.errorMessage !== undefined ? <Alert color="danger">{state.errorMessage}</Alert> : null}

                    <ul
                        aria-label="Scan logs"
                        className="space-y-2 text-sm"
                        role="log"
                    >
                        {state.events.length === 0 ? (
                            <li className="rounded-md border border-slate-200 p-3 text-slate-500">
                                Пока нет событий сканирования.
                            </li>
                        ) : null}
                        {state.events.map((event): ReactElement => (
                            <li
                                key={`${event.timestamp}-${event.phase}-${event.message}`}
                                className="rounded-md border border-slate-200 bg-slate-50 p-3"
                            >
                                <p className="text-xs text-slate-500">{formatLogTime(event.timestamp)}</p>
                                <p>{event.message}</p>
                                {event.log === undefined ? null : (
                                    <p className="mt-1 text-xs text-slate-700">{event.log}</p>
                                )}
                            </li>
                        ))}
                    </ul>
                </CardBody>
            </Card>
        </section>
    )
}
