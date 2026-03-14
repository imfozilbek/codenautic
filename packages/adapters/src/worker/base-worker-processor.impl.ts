import type {ILogger} from "@codenautic/core"

/**
 * Worker processor job contract.
 */
export interface IWorkerProcessorJob {
    /**
     * Stable job id.
     */
    readonly id: string

    /**
     * Logical job type.
     */
    readonly type: string

    /**
     * Raw job payload.
     */
    readonly payload: unknown

    /**
     * Optional attempt number.
     */
    readonly attempt?: number
}

/**
 * Worker processor metrics contract.
 */
export interface IWorkerProcessorMetrics {
    /**
     * Increments successful processed jobs counter.
     *
     * @param jobType Job type.
     */
    incrementProcessed(jobType: string): void

    /**
     * Increments failed jobs counter.
     *
     * @param jobType Job type.
     */
    incrementFailed(jobType: string): void

    /**
     * Records processor duration.
     *
     * @param jobType Job type.
     * @param durationMs Processing duration in milliseconds.
     */
    recordDurationMs(jobType: string, durationMs: number): void
}

/**
 * Base worker processor construction options.
 */
export interface IBaseWorkerProcessorOptions {
    /**
     * Processor display name.
     */
    readonly processorName: string

    /**
     * Logger port implementation.
     */
    readonly logger: ILogger

    /**
     * Optional metrics collector.
     */
    readonly metrics?: IWorkerProcessorMetrics

    /**
     * Optional clock for deterministic tests.
     */
    readonly now?: () => number
}

/**
 * Base class for worker processors with logging and metrics hooks.
 */
export abstract class BaseWorkerProcessor {
    private readonly processorName: string
    private readonly logger: ILogger
    private readonly metrics: IWorkerProcessorMetrics | undefined
    private readonly now: () => number

    /**
     * Creates processor instance.
     *
     * @param options Processor dependencies.
     */
    public constructor(options: IBaseWorkerProcessorOptions) {
        this.processorName = normalizeProcessorName(options.processorName)
        this.logger = options.logger
        this.metrics = options.metrics
        this.now = options.now ?? defaultNow
    }

    /**
     * Executes processor flow with observability hooks.
     *
     * @param job Worker job.
     */
    public async process(job: IWorkerProcessorJob): Promise<void> {
        const normalizedJob = normalizeProcessorJob(job)
        const startedAtMs = this.now()

        await this.logger.debug("Worker processor started", {
            processorName: this.processorName,
            jobId: normalizedJob.id,
            jobType: normalizedJob.type,
            attempt: normalizedJob.attempt,
        })

        try {
            await this.handle(normalizedJob)
            const durationMs = resolveDurationMs(startedAtMs, this.now())
            this.recordSuccessMetrics(normalizedJob.type, durationMs)
            await this.logger.info("Worker processor completed", {
                processorName: this.processorName,
                jobId: normalizedJob.id,
                jobType: normalizedJob.type,
                durationMs,
                attempt: normalizedJob.attempt,
            })
        } catch (error: unknown) {
            await this.onFailed(normalizedJob, error, startedAtMs)
            throw toError(error)
        }
    }

    /**
     * Handles processor failure. Can be called directly by child classes.
     *
     * @param job Worker job.
     * @param error Failure error.
     * @param startedAtMs Optional start timestamp used to calculate duration.
     */
    public async onFailed(
        job: IWorkerProcessorJob,
        error: unknown,
        startedAtMs?: number,
    ): Promise<void> {
        const normalizedJob = normalizeProcessorJob(job)
        const resolvedError = toError(error)
        const durationMs =
            startedAtMs === undefined
                ? undefined
                : resolveDurationMs(startedAtMs, this.now())

        this.recordFailureMetrics(normalizedJob.type, durationMs)
        await this.logger.error("Worker processor failed", {
            processorName: this.processorName,
            jobId: normalizedJob.id,
            jobType: normalizedJob.type,
            attempt: normalizedJob.attempt,
            durationMs,
            errorMessage: resolvedError.message,
        })
    }

    /**
     * Processor-specific business logic.
     *
     * @param job Worker job.
     */
    protected abstract handle(job: IWorkerProcessorJob): Promise<void>

    /**
     * Records success metrics if collector is configured.
     *
     * @param jobType Job type.
     * @param durationMs Processing duration.
     */
    private recordSuccessMetrics(jobType: string, durationMs: number): void {
        if (this.metrics === undefined) {
            return
        }

        this.metrics.incrementProcessed(jobType)
        this.metrics.recordDurationMs(jobType, durationMs)
    }

    /**
     * Records failure metrics if collector is configured.
     *
     * @param jobType Job type.
     * @param durationMs Optional duration.
     */
    private recordFailureMetrics(jobType: string, durationMs: number | undefined): void {
        if (this.metrics === undefined) {
            return
        }

        this.metrics.incrementFailed(jobType)
        if (durationMs !== undefined) {
            this.metrics.recordDurationMs(jobType, durationMs)
        }
    }
}

/**
 * Validates and normalizes processor name.
 *
 * @param value Raw processor name.
 * @returns Normalized processor name.
 */
function normalizeProcessorName(value: string): string {
    if (value.trim().length === 0) {
        throw new Error("processorName must be a non-empty string")
    }

    return value.trim()
}

/**
 * Validates and normalizes worker job.
 *
 * @param job Raw job.
 * @returns Normalized job.
 */
function normalizeProcessorJob(job: IWorkerProcessorJob): IWorkerProcessorJob {
    const normalizedId = normalizeNonEmptyText(job.id, "job.id")
    const normalizedType = normalizeNonEmptyText(job.type, "job.type")

    return {
        id: normalizedId,
        type: normalizedType,
        payload: job.payload,
        attempt: job.attempt,
    }
}

/**
 * Validates non-empty text.
 *
 * @param value Raw text.
 * @param fieldName Field name.
 * @returns Trimmed text.
 */
function normalizeNonEmptyText(value: string, fieldName: string): string {
    if (value.trim().length === 0) {
        throw new Error(`${fieldName} must be a non-empty string`)
    }

    return value.trim()
}

/**
 * Resolves monotonic duration.
 *
 * @param startedAtMs Start timestamp.
 * @param finishedAtMs End timestamp.
 * @returns Non-negative duration.
 */
function resolveDurationMs(startedAtMs: number, finishedAtMs: number): number {
    return Math.max(0, Math.trunc(finishedAtMs - startedAtMs))
}

/**
 * Default clock.
 *
 * @returns Current timestamp in milliseconds.
 */
function defaultNow(): number {
    return Date.now()
}

/**
 * Converts unknown error to Error instance.
 *
 * @param value Unknown error value.
 * @returns Error instance.
 */
function toError(value: unknown): Error {
    if (value instanceof Error) {
        return value
    }

    if (typeof value === "string" && value.length > 0) {
        return new Error(value)
    }

    return new Error("Unknown processor error")
}
