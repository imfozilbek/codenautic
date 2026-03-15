import type {
    IJob,
    IJobAuditEntry,
    IJobSchedule,
    TJobAction,
    TScheduleTarget,
} from "@/lib/api/endpoints/jobs.endpoint"

/**
 * Коллекция jobs для mock API.
 *
 * Хранит in-memory данные operations jobs, audit trail и расписаний.
 * Поддерживает CRUD, действия над jobs, seed и clear.
 */
export class JobsCollection {
    /**
     * Хранилище jobs по ID.
     */
    private jobs: Map<string, IJob> = new Map()

    /**
     * Audit trail.
     */
    private audit: IJobAuditEntry[] = []

    /**
     * Расписания по target.
     */
    private schedules: Map<TScheduleTarget, IJobSchedule> = new Map()

    /**
     * Счётчик для генерации уникальных audit ID.
     */
    private auditCounter: number = 0

    /**
     * Возвращает все jobs.
     *
     * @returns Массив jobs.
     */
    public listJobs(): ReadonlyArray<IJob> {
        return Array.from(this.jobs.values())
    }

    /**
     * Возвращает job по идентификатору.
     *
     * @param id - Идентификатор job.
     * @returns Job или undefined, если не найден.
     */
    public getJobById(id: string): IJob | undefined {
        return this.jobs.get(id)
    }

    /**
     * Возвращает все audit записи.
     *
     * @returns Массив audit записей.
     */
    public listAudit(): ReadonlyArray<IJobAuditEntry> {
        return [...this.audit]
    }

    /**
     * Возвращает расписания по target.
     *
     * @returns Записи расписаний.
     */
    public getSchedules(): Readonly<Record<TScheduleTarget, IJobSchedule>> {
        const result: Record<string, IJobSchedule> = {}
        for (const [target, schedule] of this.schedules.entries()) {
            result[target] = schedule
        }
        return result as Readonly<Record<TScheduleTarget, IJobSchedule>>
    }

    /**
     * Выполняет действие над job и создаёт audit запись.
     *
     * @param jobId - Идентификатор job.
     * @param action - Действие (retry/cancel/requeue).
     * @returns Обновлённый job и audit entry, или undefined.
     */
    public performAction(
        jobId: string,
        action: TJobAction,
    ): { readonly job: IJob; readonly auditEntry: IJobAuditEntry } | undefined {
        const existing = this.jobs.get(jobId)
        if (existing === undefined) {
            return undefined
        }

        let updated: IJob
        let outcome: string

        if (action === "retry") {
            updated = {
                ...existing,
                etaLabel: "5m",
                retryCount: existing.retryCount + 1,
                status: "queued",
            }
            outcome = "Retry queued with updated attempt counter."
        } else if (action === "cancel") {
            updated = {
                ...existing,
                etaLabel: "stopped",
                status: "canceled",
            }
            outcome = "Job cancelled by operator from monitor center."
        } else {
            updated = {
                ...existing,
                etaLabel: "7m",
                status: "queued",
            }
            outcome = "Job moved back to queue for safe recovery."
        }

        this.jobs.set(jobId, updated)

        this.auditCounter += 1
        const auditEntry: IJobAuditEntry = {
            action,
            actor: "Current operator",
            id: `J-AUD-${String(this.auditCounter).padStart(3, "0")}`,
            jobId,
            occurredAt: new Date().toISOString(),
            outcome,
        }
        this.audit.unshift(auditEntry)

        return { job: updated, auditEntry }
    }

    /**
     * Обновляет расписание для target.
     *
     * @param target - Target расписания.
     * @param schedule - Новое расписание.
     */
    public updateSchedule(target: TScheduleTarget, schedule: IJobSchedule): void {
        this.schedules.set(target, schedule)
    }

    /**
     * Заполняет коллекцию начальными данными.
     *
     * @param jobs - Начальные jobs.
     * @param audit - Начальный audit trail.
     * @param schedules - Начальные расписания.
     */
    public seed(
        jobs: ReadonlyArray<IJob>,
        audit: ReadonlyArray<IJobAuditEntry>,
        schedules: Readonly<Record<TScheduleTarget, IJobSchedule>>,
    ): void {
        this.clear()

        for (const job of jobs) {
            this.jobs.set(job.id, job)
        }

        this.audit = [...audit]
        this.auditCounter = audit.length

        for (const [target, schedule] of Object.entries(schedules)) {
            this.schedules.set(target as TScheduleTarget, schedule)
        }
    }

    /**
     * Полностью очищает коллекцию.
     */
    public clear(): void {
        this.jobs.clear()
        this.audit = []
        this.auditCounter = 0
        this.schedules.clear()
    }
}
