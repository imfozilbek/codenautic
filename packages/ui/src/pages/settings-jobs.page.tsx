import { type ReactElement, useMemo, useState } from "react"

import { Alert, Button, Card, CardBody, CardHeader, Chip } from "@/components/ui"
import { SystemStateCard } from "@/components/infrastructure/system-state-card"
import { showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

type TJobKind = "analytics" | "review" | "scan"
type TJobStatus = "canceled" | "completed" | "failed" | "paused" | "queued" | "running" | "stuck"
type TJobAction = "cancel" | "requeue" | "retry"
type TScheduleTarget = "report" | "rescan"
type TScheduleMode = "hourly" | "weekly"
type TTimezoneOption = "America/New_York" | "Asia/Tashkent" | "Europe/Berlin" | "UTC"
type TOrgTimezoneOverride = TTimezoneOption | "inherit-user"

interface IScheduleDraft {
    /** Режим расписания: hourly или weekly. */
    readonly mode: TScheduleMode
    /** Интервал в часах для hourly. */
    readonly intervalHours: number
    /** День недели для weekly (0=Sunday ... 6=Saturday). */
    readonly weekday: number
    /** Час запуска. */
    readonly hour: number
    /** Минута запуска. */
    readonly minute: number
}

interface IOperationJob {
    /** Уникальный идентификатор job. */
    readonly id: string
    /** Репозиторий или область применения. */
    readonly scope: string
    /** Тип длительной операции. */
    readonly kind: TJobKind
    /** Текущий статус выполнения. */
    readonly status: TJobStatus
    /** Текущее количество попыток. */
    readonly retryCount: number
    /** Максимально допустимое число попыток. */
    readonly retryLimit: number
    /** ETA до завершения. */
    readonly etaLabel: string
    /** Детали ошибки для drill-down. */
    readonly errorDetails?: string
}

interface IJobAuditEntry {
    /** Идентификатор audit события. */
    readonly id: string
    /** Пользователь или система, инициировавшие действие. */
    readonly actor: string
    /** Применённое действие. */
    readonly action: TJobAction
    /** Job id. */
    readonly jobId: string
    /** Результат операции. */
    readonly outcome: string
    /** Время события. */
    readonly occurredAt: string
}

const INITIAL_JOBS: ReadonlyArray<IOperationJob> = [
    {
        etaLabel: "2m",
        id: "JOB-4101",
        kind: "review",
        retryCount: 0,
        retryLimit: 3,
        scope: "acme/review-pipeline",
        status: "running",
    },
    {
        errorDetails: "Queue connection timeout in scan-worker. Last heartbeat was 4m ago.",
        etaLabel: "unknown",
        id: "JOB-4102",
        kind: "scan",
        retryCount: 2,
        retryLimit: 3,
        scope: "acme/api-gateway",
        status: "stuck",
    },
    {
        errorDetails: "Analytics aggregation failed due to malformed payload from provider.",
        etaLabel: "unknown",
        id: "JOB-4103",
        kind: "analytics",
        retryCount: 1,
        retryLimit: 2,
        scope: "acme/platform-insights",
        status: "failed",
    },
    {
        etaLabel: "9m",
        id: "JOB-4104",
        kind: "review",
        retryCount: 0,
        retryLimit: 3,
        scope: "acme/ui-dashboard",
        status: "queued",
    },
]

const INITIAL_AUDIT: ReadonlyArray<IJobAuditEntry> = [
    {
        action: "retry",
        actor: "Nika Saryeva",
        id: "J-AUD-001",
        jobId: "JOB-4055",
        occurredAt: "2026-03-04T08:55:00Z",
        outcome: "Retry accepted by queue worker.",
    },
]

const WEEKDAY_OPTIONS: ReadonlyArray<{ readonly label: string; readonly value: number }> = [
    { label: "Sunday", value: 0 },
    { label: "Monday", value: 1 },
    { label: "Tuesday", value: 2 },
    { label: "Wednesday", value: 3 },
    { label: "Thursday", value: 4 },
    { label: "Friday", value: 5 },
    { label: "Saturday", value: 6 },
]

const TIMEZONE_OPTIONS: ReadonlyArray<TTimezoneOption> = [
    "UTC",
    "Asia/Tashkent",
    "Europe/Berlin",
    "America/New_York",
]

const INITIAL_SCHEDULES: Readonly<Record<TScheduleTarget, IScheduleDraft>> = {
    report: {
        hour: 18,
        intervalHours: 12,
        minute: 0,
        mode: "weekly",
        weekday: 1,
    },
    rescan: {
        hour: 9,
        intervalHours: 6,
        minute: 0,
        mode: "hourly",
        weekday: 1,
    },
}

function formatTimestamp(rawValue: string): string {
    const date = new Date(rawValue)
    if (Number.isNaN(date.getTime())) {
        return "—"
    }

    return date.toLocaleString([], {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
    })
}

function mapStatusColor(
    status: TJobStatus,
): "danger" | "default" | "primary" | "success" | "warning" {
    if (status === "running") {
        return "primary"
    }

    if (status === "completed") {
        return "success"
    }

    if (status === "stuck" || status === "failed" || status === "canceled") {
        return "danger"
    }

    if (status === "paused") {
        return "warning"
    }

    return "default"
}

function canRetryJob(job: IOperationJob): boolean {
    return (job.status === "stuck" || job.status === "failed") && job.retryCount < job.retryLimit
}

function canCancelJob(job: IOperationJob): boolean {
    return job.status === "running" || job.status === "queued"
}

function canRequeueJob(job: IOperationJob): boolean {
    return job.status === "canceled" || job.status === "paused" || job.status === "failed"
}

function formatRelativeTime(targetDate: Date): string {
    const diffMs = targetDate.getTime() - Date.now()
    if (diffMs <= 0) {
        return "now"
    }

    const totalMinutes = Math.floor(diffMs / 60_000)
    if (totalMinutes < 60) {
        return `in ${String(totalMinutes)}m`
    }

    const totalHours = Math.floor(totalMinutes / 60)
    const restMinutes = totalMinutes % 60
    if (totalHours < 24) {
        if (restMinutes === 0) {
            return `in ${String(totalHours)}h`
        }
        return `in ${String(totalHours)}h ${String(restMinutes)}m`
    }

    const days = Math.floor(totalHours / 24)
    const restHours = totalHours % 24
    if (restHours === 0) {
        return `in ${String(days)}d`
    }
    return `in ${String(days)}d ${String(restHours)}h`
}

function formatTimezoneDate(targetDate: Date, timezone: TTimezoneOption): string {
    return targetDate.toLocaleString([], {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
        timeZone: timezone,
        timeZoneName: "short",
        year: "numeric",
    })
}

function buildHourlyPreview(
    schedule: IScheduleDraft,
    previewCount: number,
    now: Date,
): ReadonlyArray<Date> {
    const safeInterval = Math.max(1, schedule.intervalHours)
    const result: Date[] = []
    for (let index = 1; index <= previewCount; index += 1) {
        result.push(new Date(now.getTime() + index * safeInterval * 60 * 60 * 1000))
    }
    return result
}

function buildWeeklyPreview(
    schedule: IScheduleDraft,
    previewCount: number,
    now: Date,
): ReadonlyArray<Date> {
    const result: Date[] = []
    let cursor = new Date(now)
    cursor.setSeconds(0, 0)

    while (result.length < previewCount) {
        cursor = new Date(cursor.getTime() + 60_000)
        if (cursor.getDay() !== schedule.weekday) {
            continue
        }
        if (cursor.getHours() !== schedule.hour) {
            continue
        }
        if (cursor.getMinutes() !== schedule.minute) {
            continue
        }
        result.push(new Date(cursor))
    }

    return result
}

function buildSchedulePreview(schedule: IScheduleDraft, previewCount: number): ReadonlyArray<Date> {
    const now = new Date()
    if (schedule.mode === "weekly") {
        return buildWeeklyPreview(schedule, previewCount, now)
    }
    return buildHourlyPreview(schedule, previewCount, now)
}

function describeSchedule(schedule: IScheduleDraft, target: TScheduleTarget): string {
    if (schedule.mode === "hourly") {
        return `${target} runs every ${String(schedule.intervalHours)}h`
    }

    const weekdayLabel =
        WEEKDAY_OPTIONS.find((option): boolean => {
            return option.value === schedule.weekday
        })?.label ?? "Unknown day"
    const hourLabel = String(schedule.hour).padStart(2, "0")
    const minuteLabel = String(schedule.minute).padStart(2, "0")
    return `${target} runs weekly on ${weekdayLabel} at ${hourLabel}:${minuteLabel}`
}

/**
 * Экран operations monitor для долгоживущих jobs.
 *
 * @returns Статусы, recovery actions, audit trail и error drill-down.
 */
export function SettingsJobsPage(): ReactElement {
    const [jobs, setJobs] = useState<ReadonlyArray<IOperationJob>>(INITIAL_JOBS)
    const [audit, setAudit] = useState<ReadonlyArray<IJobAuditEntry>>(INITIAL_AUDIT)
    const [activeJobId, setActiveJobId] = useState<string>(INITIAL_JOBS[0]?.id ?? "")
    const [scheduleTarget, setScheduleTarget] = useState<TScheduleTarget>("rescan")
    const [userTimezone, setUserTimezone] = useState<TTimezoneOption>("Asia/Tashkent")
    const [orgTimezoneOverride, setOrgTimezoneOverride] =
        useState<TOrgTimezoneOverride>("inherit-user")
    const [schedules, setSchedules] =
        useState<Readonly<Record<TScheduleTarget, IScheduleDraft>>>(INITIAL_SCHEDULES)
    const [scheduleSaveMessage, setScheduleSaveMessage] = useState<string>("")

    const activeJob = useMemo((): IOperationJob | undefined => {
        return jobs.find((job): boolean => job.id === activeJobId)
    }, [activeJobId, jobs])

    const activeSchedule = schedules[scheduleTarget]
    const effectiveTimezone: TTimezoneOption =
        orgTimezoneOverride === "inherit-user" ? userTimezone : orgTimezoneOverride
    const schedulePreview = useMemo((): ReadonlyArray<Date> => {
        return buildSchedulePreview(activeSchedule, 5)
    }, [activeSchedule])
    const scheduleDescription = useMemo((): string => {
        return describeSchedule(activeSchedule, scheduleTarget)
    }, [activeSchedule, scheduleTarget])

    const statusSummary = useMemo(() => {
        return {
            failedOrStuck: jobs.filter((job): boolean => {
                return job.status === "failed" || job.status === "stuck"
            }).length,
            queuedOrRunning: jobs.filter((job): boolean => {
                return job.status === "queued" || job.status === "running"
            }).length,
            total: jobs.length,
        }
    }, [jobs])

    const updateActiveSchedule = (updater: (value: IScheduleDraft) => IScheduleDraft): void => {
        setSchedules((previous): Readonly<Record<TScheduleTarget, IScheduleDraft>> => {
            const currentSchedule = previous[scheduleTarget]
            return {
                ...previous,
                [scheduleTarget]: updater(currentSchedule),
            }
        })
    }

    const handleScheduleModeChange = (mode: TScheduleMode): void => {
        updateActiveSchedule(
            (previous): IScheduleDraft => ({
                ...previous,
                mode,
            }),
        )
    }

    const handleIntervalChange = (rawInterval: string): void => {
        const parsedInterval = Number.parseInt(rawInterval, 10)
        if (Number.isNaN(parsedInterval)) {
            return
        }

        updateActiveSchedule(
            (previous): IScheduleDraft => ({
                ...previous,
                intervalHours: Math.max(1, Math.min(parsedInterval, 24)),
            }),
        )
    }

    const handleWeekdayChange = (rawWeekday: string): void => {
        const parsedWeekday = Number.parseInt(rawWeekday, 10)
        if (Number.isNaN(parsedWeekday)) {
            return
        }

        updateActiveSchedule(
            (previous): IScheduleDraft => ({
                ...previous,
                weekday: Math.max(0, Math.min(parsedWeekday, 6)),
            }),
        )
    }

    const handleHourChange = (rawHour: string): void => {
        const parsedHour = Number.parseInt(rawHour, 10)
        if (Number.isNaN(parsedHour)) {
            return
        }

        updateActiveSchedule(
            (previous): IScheduleDraft => ({
                ...previous,
                hour: Math.max(0, Math.min(parsedHour, 23)),
            }),
        )
    }

    const handleMinuteChange = (rawMinute: string): void => {
        const parsedMinute = Number.parseInt(rawMinute, 10)
        if (Number.isNaN(parsedMinute)) {
            return
        }

        updateActiveSchedule(
            (previous): IScheduleDraft => ({
                ...previous,
                minute: Math.max(0, Math.min(parsedMinute, 59)),
            }),
        )
    }

    const handleSaveSchedule = (): void => {
        setScheduleSaveMessage(`Saved ${scheduleDescription} in timezone ${effectiveTimezone}.`)
        showToastSuccess("Schedule saved.")
    }

    const appendAuditEntry = (action: TJobAction, jobId: string, outcome: string): void => {
        setAudit(
            (previous): ReadonlyArray<IJobAuditEntry> => [
                {
                    action,
                    actor: "Current operator",
                    id: `J-AUD-${Date.now().toString(36)}`,
                    jobId,
                    occurredAt: new Date().toISOString(),
                    outcome,
                },
                ...previous,
            ],
        )
    }

    const handleRetryJob = (jobId: string): void => {
        setJobs(
            (previous): ReadonlyArray<IOperationJob> =>
                previous.map((job): IOperationJob => {
                    if (job.id !== jobId || canRetryJob(job) !== true) {
                        return job
                    }

                    return {
                        ...job,
                        etaLabel: "5m",
                        retryCount: job.retryCount + 1,
                        status: "queued",
                    }
                }),
        )
        appendAuditEntry("retry", jobId, "Retry queued with updated attempt counter.")
        showToastSuccess("Retry queued.")
    }

    const handleCancelJob = (jobId: string): void => {
        setJobs(
            (previous): ReadonlyArray<IOperationJob> =>
                previous.map((job): IOperationJob => {
                    if (job.id !== jobId || canCancelJob(job) !== true) {
                        return job
                    }

                    return {
                        ...job,
                        etaLabel: "stopped",
                        status: "canceled",
                    }
                }),
        )
        appendAuditEntry("cancel", jobId, "Job cancelled by operator from monitor center.")
        showToastInfo("Job canceled.")
    }

    const handleRequeueJob = (jobId: string): void => {
        setJobs(
            (previous): ReadonlyArray<IOperationJob> =>
                previous.map((job): IOperationJob => {
                    if (job.id !== jobId || canRequeueJob(job) !== true) {
                        return job
                    }

                    return {
                        ...job,
                        etaLabel: "7m",
                        status: "queued",
                    }
                }),
        )
        appendAuditEntry("requeue", jobId, "Job moved back to queue for safe recovery.")
        showToastSuccess("Job requeued.")
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-foreground">Operations jobs monitor</h1>
            <p className="text-sm text-foreground/70">
                Track review, scan and analytics jobs with ETA, retries, paused/stuck states,
                operator recovery actions and audit history.
            </p>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-foreground">Live summary</p>
                </CardHeader>
                <CardBody className="flex flex-wrap gap-2">
                    <Chip size="sm" variant="flat">
                        Total: {statusSummary.total}
                    </Chip>
                    <Chip size="sm" variant="flat">
                        Active queue: {statusSummary.queuedOrRunning}
                    </Chip>
                    <Chip color="danger" size="sm" variant="flat">
                        Failed/Stuck: {statusSummary.failedOrStuck}
                    </Chip>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-foreground">
                        Timezone + schedule preview
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <label className="flex flex-col gap-1 text-sm text-foreground/80">
                            Schedule target
                            <select
                                aria-label="Schedule target"
                                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                                value={scheduleTarget}
                                onChange={(event): void => {
                                    const value = event.currentTarget.value
                                    if (value === "rescan" || value === "report") {
                                        setScheduleTarget(value)
                                    }
                                }}
                            >
                                <option value="rescan">Rescan schedule</option>
                                <option value="report">Report schedule</option>
                            </select>
                        </label>
                        <label className="flex flex-col gap-1 text-sm text-foreground/80">
                            User timezone
                            <select
                                aria-label="User timezone"
                                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                                value={userTimezone}
                                onChange={(event): void => {
                                    const value = event.currentTarget.value
                                    if (
                                        value === "UTC" ||
                                        value === "Asia/Tashkent" ||
                                        value === "Europe/Berlin" ||
                                        value === "America/New_York"
                                    ) {
                                        setUserTimezone(value)
                                    }
                                }}
                            >
                                {TIMEZONE_OPTIONS.map(
                                    (timezone): ReactElement => (
                                        <option key={timezone} value={timezone}>
                                            {timezone}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>
                        <label className="flex flex-col gap-1 text-sm text-foreground/80">
                            Org timezone override
                            <select
                                aria-label="Organization timezone override"
                                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                                value={orgTimezoneOverride}
                                onChange={(event): void => {
                                    const value = event.currentTarget.value
                                    if (value === "inherit-user") {
                                        setOrgTimezoneOverride("inherit-user")
                                        return
                                    }
                                    if (
                                        value === "UTC" ||
                                        value === "Asia/Tashkent" ||
                                        value === "Europe/Berlin" ||
                                        value === "America/New_York"
                                    ) {
                                        setOrgTimezoneOverride(value)
                                    }
                                }}
                            >
                                <option value="inherit-user">inherit user timezone</option>
                                {TIMEZONE_OPTIONS.map(
                                    (timezone): ReactElement => (
                                        <option key={`org-${timezone}`} value={timezone}>
                                            {timezone}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>
                        <label className="flex flex-col gap-1 text-sm text-foreground/80">
                            Schedule frequency
                            <select
                                aria-label="Schedule frequency"
                                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                                value={activeSchedule.mode}
                                onChange={(event): void => {
                                    const value = event.currentTarget.value
                                    if (value === "hourly" || value === "weekly") {
                                        handleScheduleModeChange(value)
                                    }
                                }}
                            >
                                <option value="hourly">hourly</option>
                                <option value="weekly">weekly</option>
                            </select>
                        </label>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                        {activeSchedule.mode === "hourly" ? (
                            <label className="flex flex-col gap-1 text-sm text-foreground/80">
                                Interval hours
                                <select
                                    aria-label="Interval hours"
                                    className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                                    value={String(activeSchedule.intervalHours)}
                                    onChange={(event): void => {
                                        handleIntervalChange(event.currentTarget.value)
                                    }}
                                >
                                    <option value="1">1h</option>
                                    <option value="2">2h</option>
                                    <option value="6">6h</option>
                                    <option value="12">12h</option>
                                    <option value="24">24h</option>
                                </select>
                            </label>
                        ) : (
                            <label className="flex flex-col gap-1 text-sm text-foreground/80">
                                Weekday
                                <select
                                    aria-label="Schedule weekday"
                                    className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                                    value={String(activeSchedule.weekday)}
                                    onChange={(event): void => {
                                        handleWeekdayChange(event.currentTarget.value)
                                    }}
                                >
                                    {WEEKDAY_OPTIONS.map(
                                        (option): ReactElement => (
                                            <option
                                                key={`weekday-${String(option.value)}`}
                                                value={String(option.value)}
                                            >
                                                {option.label}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>
                        )}
                        <label className="flex flex-col gap-1 text-sm text-foreground/80">
                            Hour
                            <select
                                aria-label="Schedule hour"
                                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                                value={String(activeSchedule.hour)}
                                onChange={(event): void => {
                                    handleHourChange(event.currentTarget.value)
                                }}
                            >
                                {Array.from({ length: 24 }).map(
                                    (_entry, hour): ReactElement => (
                                        <option key={`hour-${String(hour)}`} value={String(hour)}>
                                            {String(hour).padStart(2, "0")}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>
                        <label className="flex flex-col gap-1 text-sm text-foreground/80">
                            Minute
                            <select
                                aria-label="Schedule minute"
                                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                                value={String(activeSchedule.minute)}
                                onChange={(event): void => {
                                    handleMinuteChange(event.currentTarget.value)
                                }}
                            >
                                {["0", "5", "10", "15", "30", "45"].map(
                                    (minute): ReactElement => (
                                        <option key={`minute-${minute}`} value={minute}>
                                            {minute.padStart(2, "0")}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>
                    </div>

                    <Alert color="warning" title="Timezone application boundary" variant="flat">
                        {`Schedule is evaluated on server timezone: ${effectiveTimezone}. Relative preview is shown for user context and absolute times include timezone abbreviation.`}
                    </Alert>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-foreground/80">{scheduleDescription}</p>
                        <Button size="sm" variant="flat" onPress={handleSaveSchedule}>
                            Save schedule
                        </Button>
                    </div>

                    {scheduleSaveMessage.length > 0 ? (
                        <Alert color="primary" title="Schedule saved" variant="flat">
                            {scheduleSaveMessage}
                        </Alert>
                    ) : null}

                    <ul aria-label="Schedule preview list" className="space-y-2">
                        {schedulePreview.map(
                            (nextRun, index): ReactElement => (
                                <li
                                    className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                                    key={`preview-${scheduleTarget}-${String(index)}`}
                                >
                                    <p className="font-semibold">
                                        {formatTimezoneDate(nextRun, effectiveTimezone)}
                                    </p>
                                    <p className="text-xs text-foreground/70">
                                        {formatRelativeTime(nextRun)}
                                    </p>
                                </li>
                            ),
                        )}
                    </ul>
                </CardBody>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
                <Card>
                    <CardHeader>
                        <p className="text-base font-semibold text-foreground">Jobs</p>
                    </CardHeader>
                    <CardBody className="space-y-2">
                        <ul aria-label="Operations jobs list" className="space-y-2">
                            {jobs.map(
                                (job): ReactElement => (
                                    <li
                                        className="rounded-lg border border-border bg-surface p-3"
                                        key={job.id}
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <button
                                                aria-label={`Open ${job.id} details`}
                                                className="text-left"
                                                type="button"
                                                onClick={(): void => {
                                                    setActiveJobId(job.id)
                                                }}
                                            >
                                                <p className="text-sm font-semibold text-foreground">
                                                    {job.id} · {job.kind}
                                                </p>
                                                <p className="text-xs text-foreground/70">
                                                    {job.scope}
                                                </p>
                                            </button>
                                            <Chip
                                                color={mapStatusColor(job.status)}
                                                size="sm"
                                                variant="flat"
                                            >
                                                {job.status}
                                            </Chip>
                                        </div>
                                        <p className="mt-1 text-xs text-foreground/70">
                                            ETA: {job.etaLabel} · retries {job.retryCount}/
                                            {job.retryLimit}
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <Button
                                                isDisabled={canRetryJob(job) !== true}
                                                size="sm"
                                                variant="flat"
                                                onPress={(): void => {
                                                    handleRetryJob(job.id)
                                                }}
                                            >
                                                Retry
                                            </Button>
                                            <Button
                                                isDisabled={canCancelJob(job) !== true}
                                                size="sm"
                                                variant="flat"
                                                onPress={(): void => {
                                                    handleCancelJob(job.id)
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                isDisabled={canRequeueJob(job) !== true}
                                                size="sm"
                                                variant="flat"
                                                onPress={(): void => {
                                                    handleRequeueJob(job.id)
                                                }}
                                            >
                                                Requeue
                                            </Button>
                                        </div>
                                    </li>
                                ),
                            )}
                        </ul>
                    </CardBody>
                </Card>

                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <p className="text-base font-semibold text-foreground">
                                Error drill-down
                            </p>
                        </CardHeader>
                        <CardBody className="space-y-2">
                            {activeJob === undefined ? (
                                <SystemStateCard
                                    description="Select a job to inspect diagnostics and open runbook links."
                                    title="No job selected"
                                    variant="empty"
                                />
                            ) : (
                                <>
                                    <p className="text-sm text-foreground">
                                        Active: <strong>{activeJob.id}</strong> ({activeJob.kind})
                                    </p>
                                    <p className="text-xs text-foreground/70">
                                        Scope: {activeJob.scope}
                                    </p>
                                    {activeJob.errorDetails === undefined ? (
                                        <Alert
                                            color="success"
                                            title="No blocking error for selected job"
                                            variant="flat"
                                        >
                                            Diagnostics are healthy for this operation.
                                        </Alert>
                                    ) : (
                                        <Alert
                                            color="danger"
                                            title="Latest error trace"
                                            variant="flat"
                                        >
                                            {activeJob.errorDetails}
                                        </Alert>
                                    )}
                                </>
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <p className="text-base font-semibold text-foreground">
                                Recovery audit trail
                            </p>
                        </CardHeader>
                        <CardBody className="space-y-2">
                            <ul aria-label="Jobs audit trail list" className="space-y-2">
                                {audit.map(
                                    (entry): ReactElement => (
                                        <li
                                            className="rounded-lg border border-border bg-surface p-3 text-xs"
                                            key={entry.id}
                                        >
                                            <p className="font-semibold text-foreground">
                                                {entry.jobId} · {entry.action} · {entry.actor}
                                            </p>
                                            <p className="text-foreground/80">{entry.outcome}</p>
                                            <p className="text-foreground/70">
                                                {formatTimestamp(entry.occurredAt)}
                                            </p>
                                        </li>
                                    ),
                                )}
                            </ul>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </section>
    )
}
