import type { ReactElement } from "react"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui"
import { PAGE_LAYOUT } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"

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
    /** Идентификатор репозитория для перехода в overview. */
    readonly repositoryId?: string
    /** Список репозиториев в batch-сканировании. */
    readonly targetRepositories?: ReadonlyArray<string>
    /** Повторно открыть onboarding для повторного запуска скана. */
    readonly onRetry?: () => void
    /** Отменить текущий flow и вернуться в список репозиториев. */
    readonly onCancel?: () => void
    /** Открыть обзор репозитория после завершения скана. */
    readonly onOpenRepositoryOverview?: () => void
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

    if (typeof parsed !== "object" || parsed === null) {
        return undefined
    }

    const payload = parsed as Record<string, unknown>
    const phase = payload.phase
    const percent = payload.percent
    const etaSeconds = payload.etaSeconds
    const message = payload.message
    const phaseCompleted = payload.phaseCompleted
    const timestamp = payload.timestamp
    const log = payload.log

    if (
        typeof phase !== "string" ||
        isValidScanPhase(phase) === false ||
        typeof percent !== "number" ||
        Number.isNaN(percent) === true ||
        typeof etaSeconds !== "number" ||
        Number.isNaN(etaSeconds) === true ||
        typeof message !== "string" ||
        typeof phaseCompleted !== "boolean" ||
        typeof timestamp !== "string"
    ) {
        return undefined
    }

    return {
        phase,
        percent: clampPercent(percent),
        etaSeconds,
        message,
        phaseCompleted,
        log: typeof log === "string" ? log : undefined,
        timestamp,
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

    return PHASES.map(
        (
            phase,
            index,
        ): {
            isCompleted: boolean
            isActive: boolean
            message: string
            phase: TScanPhase
        } => {
            if (latestEvent === undefined) {
                return {
                    isCompleted: false,
                    isActive: index === 0,
                    message: "",
                    phase,
                }
            }

            if (index < currentIndex) {
                return {
                    isCompleted: true,
                    isActive: false,
                    message: "",
                    phase,
                }
            }

            if (index > currentIndex) {
                return {
                    isCompleted: false,
                    isActive: false,
                    message: "",
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
        },
    )
}

function buildProgressState(state: IUseScanProgressState): {
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
        currentMessage: latest?.message ?? "",
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
    source.onmessage = (event: MessageEvent<string>): void => {
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
        return "lessThanMinute"
    }

    const minutes = Math.max(1, Math.ceil(totalSeconds / 60))
    return String(minutes)
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
    const { t } = useTranslation(["system"])
    const jobId =
        props.jobId?.trim().length === 0 ? DEFAULT_JOB_ID : (props.jobId ?? DEFAULT_JOB_ID)
    const state = useScanProgressEvents(jobId, {
        eventSourceUrl: props.eventSourceUrl,
        seedEvents: props.seedEvents ?? DEFAULT_SEED_EVENTS,
        jobId,
    })
    const progressState = useMemo(() => buildProgressState(state), [state])
    const progressClass =
        progressState.percent < 50
            ? "bg-primary"
            : progressState.percent < 90
              ? "bg-success"
              : "bg-purple-500"
    const batchRepositoriesCount = props.targetRepositories?.length ?? 0

    const etaDisplay = useMemo((): string => {
        if (progressState.etaSeconds === undefined) {
            return t("system:scanProgress.etaDash")
        }
        const raw = formatSecondsToMinutes(progressState.etaSeconds)
        if (raw === "lessThanMinute") {
            return t("system:scanProgress.lessThanMinute")
        }
        return (t as unknown as (key: string, options: Record<string, string>) => string)(
            "system:scanProgress.etaMinutes",
            { minutes: raw },
        )
    }, [progressState.etaSeconds, t])

    return (
        <section className={PAGE_LAYOUT.standard}>
            <h1 className={TYPOGRAPHY.pageTitle}>{t("system:scanProgress.pageTitle")}</h1>
            <p className={TYPOGRAPHY.pageSubtitle}>
                {(t as unknown as (key: string, options: Record<string, string>) => string)(
                    "system:scanProgress.pageSubtitle",
                    { jobId },
                )}
            </p>
            {batchRepositoriesCount > 1 ? (
                <p className="text-sm text-muted-foreground">
                    {(t as unknown as (key: string, options: Record<string, string>) => string)(
                        "system:scanProgress.batchOnboarding",
                        { count: String(batchRepositoriesCount) },
                    )}
                </p>
            ) : null}

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.cardTitle}>
                        {t("system:scanProgress.currentStatus")}
                    </p>
                </CardHeader>
                <CardBody className="space-y-4">
                    <div className="rounded-lg border border-border bg-surface p-3">
                        <p className={`mb-2 ${TYPOGRAPHY.cardTitle}`}>
                            {progressState.currentMessage.length > 0
                                ? progressState.currentMessage
                                : t("system:scanProgress.waitingForScanStart")}
                        </p>
                        <div className="h-3 w-full rounded-full bg-surface-muted">
                            <div
                                aria-label={t("system:scanProgress.progressBarLabel")}
                                aria-valuemax={100}
                                aria-valuemin={0}
                                aria-valuenow={progressState.percent}
                                className={`${progressClass} h-3 rounded-full transition-[width] duration-300`}
                                role="progressbar"
                                style={{ width: formatProgressLabel(progressState.percent) }}
                            />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                            <span>
                                {(
                                    t as unknown as (
                                        key: string,
                                        options: Record<string, string>,
                                    ) => string
                                )("system:scanProgress.progressLabel", {
                                    percent: String(progressState.percent),
                                })}
                            </span>
                            <span>
                                {(
                                    t as unknown as (
                                        key: string,
                                        options: Record<string, string>,
                                    ) => string
                                )("system:scanProgress.etaLabel", { eta: etaDisplay })}
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-5">
                        {progressState.phaseStates.map(
                            (phase): ReactElement => (
                                <article
                                    className={`rounded-lg border px-3 py-2 ${
                                        phase.isCompleted
                                            ? "border-success/30 bg-success/10"
                                            : phase.isActive
                                              ? "border-primary/30 bg-primary/10"
                                              : "border-border bg-surface"
                                    }`}
                                    key={phase.phase}
                                >
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                        {phase.phase}
                                    </p>
                                    <p className={TYPOGRAPHY.cardTitle}>
                                        {phase.isCompleted
                                            ? t("system:scanProgress.phaseDone")
                                            : phase.isActive
                                              ? t("system:scanProgress.phaseRunning")
                                              : t("system:scanProgress.phaseWaiting")}
                                    </p>
                                    <p className={TYPOGRAPHY.captionMuted}>
                                        {phase.message.length > 0
                                            ? phase.message
                                            : phase.isCompleted
                                              ? t("system:scanProgress.phaseMessageDone")
                                              : t("system:scanProgress.phaseMessageWaiting")}
                                    </p>
                                </article>
                            ),
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button onPress={props.onRetry} size="sm" type="button" variant="light">
                            {t("system:scanProgress.retryButton")}
                        </Button>
                        <Button
                            color="danger"
                            onPress={props.onCancel}
                            size="sm"
                            type="button"
                            variant="ghost"
                        >
                            {t("system:scanProgress.cancelButton")}
                        </Button>
                        {progressState.isDone && props.repositoryId !== undefined ? (
                            <Button
                                color="success"
                                onPress={props.onOpenRepositoryOverview}
                                size="sm"
                                type="button"
                                variant="solid"
                            >
                                {t("system:scanProgress.openRepositoryOverview")}
                            </Button>
                        ) : null}
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <p className={TYPOGRAPHY.cardTitle}>
                            {t("system:scanProgress.stageLogs")}
                        </p>
                        <p
                            className={`text-xs ${progressState.isDone ? "text-success" : "text-muted-foreground"}`}
                        >
                            {progressState.isDone
                                ? t("system:scanProgress.statusDone")
                                : state.isLive
                                  ? t("system:scanProgress.statusUpdating")
                                  : t("system:scanProgress.statusWaiting")}
                        </p>
                    </div>
                </CardHeader>
                <CardBody>
                    {state.errorMessage !== undefined ? (
                        <Alert color="danger">{state.errorMessage}</Alert>
                    ) : null}

                    <ul
                        aria-label={t("system:scanProgress.scanLogsLabel")}
                        className="space-y-2 text-sm"
                        role="log"
                    >
                        {state.events.length === 0 ? (
                            <li className="rounded-md border border-border p-3 text-muted-foreground">
                                {t("system:scanProgress.noEventsYet")}
                            </li>
                        ) : null}
                        {state.events.map(
                            (event): ReactElement => (
                                <li
                                    key={`${event.timestamp}-${event.phase}-${event.message}`}
                                    className="rounded-md border border-border bg-surface p-3"
                                >
                                    <p className={TYPOGRAPHY.captionMuted}>
                                        {formatLogTime(event.timestamp)}
                                    </p>
                                    <p>{event.message}</p>
                                    {event.log === undefined ? null : (
                                        <p className="mt-1 text-xs text-foreground">{event.log}</p>
                                    )}
                                </li>
                            ),
                        )}
                    </ul>
                </CardBody>
            </Card>
        </section>
    )
}
