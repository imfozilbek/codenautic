import { type ReactElement, useMemo, useState } from "react"

import { Alert, Button, Card, CardBody, CardHeader, Chip } from "@/components/ui"
import { showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

type TJobKind = "analytics" | "review" | "scan"
type TJobStatus = "canceled" | "completed" | "failed" | "paused" | "queued" | "running" | "stuck"
type TJobAction = "cancel" | "requeue" | "retry"

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
        errorDetails:
            "Queue connection timeout in scan-worker. Last heartbeat was 4m ago.",
        etaLabel: "unknown",
        id: "JOB-4102",
        kind: "scan",
        retryCount: 2,
        retryLimit: 3,
        scope: "acme/api-gateway",
        status: "stuck",
    },
    {
        errorDetails:
            "Analytics aggregation failed due to malformed payload from provider.",
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

function mapStatusColor(status: TJobStatus): "danger" | "default" | "primary" | "success" | "warning" {
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

/**
 * Экран operations monitor для долгоживущих jobs.
 *
 * @returns Статусы, recovery actions, audit trail и error drill-down.
 */
export function SettingsJobsPage(): ReactElement {
    const [jobs, setJobs] = useState<ReadonlyArray<IOperationJob>>(INITIAL_JOBS)
    const [audit, setAudit] = useState<ReadonlyArray<IJobAuditEntry>>(INITIAL_AUDIT)
    const [activeJobId, setActiveJobId] = useState<string>(INITIAL_JOBS[0]?.id ?? "")

    const activeJob = useMemo((): IOperationJob | undefined => {
        return jobs.find((job): boolean => job.id === activeJobId)
    }, [activeJobId, jobs])

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

    const appendAuditEntry = (action: TJobAction, jobId: string, outcome: string): void => {
        setAudit((previous): ReadonlyArray<IJobAuditEntry> => [
            {
                action,
                actor: "Current operator",
                id: `J-AUD-${Date.now().toString(36)}`,
                jobId,
                occurredAt: new Date().toISOString(),
                outcome,
            },
            ...previous,
        ])
    }

    const handleRetryJob = (jobId: string): void => {
        setJobs((previous): ReadonlyArray<IOperationJob> =>
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
        setJobs((previous): ReadonlyArray<IOperationJob> =>
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
        setJobs((previous): ReadonlyArray<IOperationJob> =>
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
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">Operations jobs monitor</h1>
            <p className="text-sm text-[var(--foreground)]/70">
                Track review, scan and analytics jobs with ETA, retries, paused/stuck states,
                operator recovery actions and audit history.
            </p>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">Live summary</p>
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

            <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
                <Card>
                    <CardHeader>
                        <p className="text-base font-semibold text-[var(--foreground)]">Jobs</p>
                    </CardHeader>
                    <CardBody className="space-y-2">
                        <ul aria-label="Operations jobs list" className="space-y-2">
                            {jobs.map((job): ReactElement => (
                                <li
                                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
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
                                            <p className="text-sm font-semibold text-[var(--foreground)]">
                                                {job.id} · {job.kind}
                                            </p>
                                            <p className="text-xs text-[var(--foreground)]/70">
                                                {job.scope}
                                            </p>
                                        </button>
                                        <Chip color={mapStatusColor(job.status)} size="sm" variant="flat">
                                            {job.status}
                                        </Chip>
                                    </div>
                                    <p className="mt-1 text-xs text-[var(--foreground)]/70">
                                        ETA: {job.etaLabel} · retries {job.retryCount}/{job.retryLimit}
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
                            ))}
                        </ul>
                    </CardBody>
                </Card>

                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <p className="text-base font-semibold text-[var(--foreground)]">
                                Error drill-down
                            </p>
                        </CardHeader>
                        <CardBody className="space-y-2">
                            {activeJob === undefined ? (
                                <Alert color="warning" title="No job selected" variant="flat">
                                    Select a job to inspect diagnostics.
                                </Alert>
                            ) : (
                                <>
                                    <p className="text-sm text-[var(--foreground)]">
                                        Active: <strong>{activeJob.id}</strong> ({activeJob.kind})
                                    </p>
                                    <p className="text-xs text-[var(--foreground)]/70">
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
                                        <Alert color="danger" title="Latest error trace" variant="flat">
                                            {activeJob.errorDetails}
                                        </Alert>
                                    )}
                                </>
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <p className="text-base font-semibold text-[var(--foreground)]">
                                Recovery audit trail
                            </p>
                        </CardHeader>
                        <CardBody className="space-y-2">
                            <ul aria-label="Jobs audit trail list" className="space-y-2">
                                {audit.map((entry): ReactElement => (
                                    <li
                                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-xs"
                                        key={entry.id}
                                    >
                                        <p className="font-semibold text-[var(--foreground)]">
                                            {entry.jobId} · {entry.action} · {entry.actor}
                                        </p>
                                        <p className="text-[var(--foreground)]/80">{entry.outcome}</p>
                                        <p className="text-[var(--foreground)]/70">
                                            {formatTimestamp(entry.occurredAt)}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </section>
    )
}
