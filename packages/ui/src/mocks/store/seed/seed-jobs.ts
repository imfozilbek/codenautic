import type { IJob, IJobAuditEntry, IJobSchedule, TScheduleTarget } from "@/lib/api/endpoints/jobs.endpoint"

import type { JobsCollection } from "../collections/jobs-collection"

/**
 * Начальный набор jobs для mock API.
 */
const SEED_JOBS: ReadonlyArray<IJob> = [
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

/**
 * Начальный audit trail для mock API.
 */
const SEED_AUDIT: ReadonlyArray<IJobAuditEntry> = [
    {
        action: "retry",
        actor: "Morpheus",
        id: "J-AUD-001",
        jobId: "JOB-4055",
        occurredAt: "2026-03-04T08:55:00Z",
        outcome: "Retry accepted by queue worker.",
    },
]

/**
 * Начальные расписания для mock API.
 */
const SEED_SCHEDULES: Readonly<Record<TScheduleTarget, IJobSchedule>> = {
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

/**
 * Заполняет jobs-коллекцию начальным набором данных.
 *
 * @param jobs - Коллекция jobs для заполнения.
 */
export function seedJobs(jobs: JobsCollection): void {
    jobs.seed(SEED_JOBS, SEED_AUDIT, SEED_SCHEDULES)
}
