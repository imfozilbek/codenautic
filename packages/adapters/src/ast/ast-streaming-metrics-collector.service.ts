import type {ILogger} from "@codenautic/core"

import {
    AST_STREAMING_METRICS_COLLECTOR_ERROR_CODE,
    AstStreamingMetricsCollectorError,
} from "./ast-streaming-metrics-collector.error"

const DEFAULT_LOG_EVERY_BATCHES = 5
const DEFAULT_IDEMPOTENCY_CACHE_SIZE = 10_000
const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_INITIAL_BACKOFF_MS = 50
const DEFAULT_MAX_BACKOFF_MS = 1_000
const STREAMING_METRICS_LOG_MESSAGE = "AST streaming metrics checkpoint"

/**
 * Sleep function used by retry/backoff logic.
 */
export type AstStreamingMetricsCollectorSleep = (durationMs: number) => Promise<void>

/**
 * Clock function used by timestamp fields.
 */
export type AstStreamingMetricsCollectorNow = () => number

/**
 * Retry decision callback for failed logging attempts.
 */
export type AstStreamingMetricsCollectorShouldRetry = (error: unknown, attempt: number) => boolean

/**
 * Retry policy for checkpoint logging attempts.
 */
export interface IAstStreamingMetricsCollectorRetryPolicy {
    /**
     * Maximum number of attempts including the initial attempt.
     */
    readonly maxAttempts?: number

    /**
     * Initial retry backoff in milliseconds.
     */
    readonly initialBackoffMs?: number

    /**
     * Maximum retry backoff in milliseconds.
     */
    readonly maxBackoffMs?: number

    /**
     * Optional callback to classify retryable logging failures.
     */
    readonly shouldRetry?: AstStreamingMetricsCollectorShouldRetry
}

/**
 * Input payload for one processed batch.
 */
export interface IAstStreamingMetricsCollectorInput {
    /**
     * Number of files processed in batch.
     */
    readonly filesProcessed: number

    /**
     * End-to-end batch duration in milliseconds.
     */
    readonly batchDurationMs: number

    /**
     * Optional stable key for in-flight and completed idempotency deduplication.
     */
    readonly idempotencyKey?: string

    /**
     * Optional per-batch retry policy override.
     */
    readonly retryPolicy?: IAstStreamingMetricsCollectorRetryPolicy
}

/**
 * Logged checkpoint payload emitted every configured batch window.
 */
export interface IAstStreamingMetricsCheckpoint {
    /**
     * Sequential batch count after processing current batch.
     */
    readonly batchCount: number

    /**
     * Accumulated processed file count.
     */
    readonly filesProcessed: number

    /**
     * Accumulated total processing time in milliseconds.
     */
    readonly totalProcessingTimeMs: number

    /**
     * Average processing time per file in milliseconds.
     */
    readonly avgProcessingTimeMs: number

    /**
     * Checkpoint timestamp in milliseconds since epoch.
     */
    readonly loggedAtMs: number
}

/**
 * Runtime snapshot of streaming metrics collector state.
 */
export interface IAstStreamingMetricsCollectorSnapshot {
    /**
     * Number of processed batches.
     */
    readonly batchCount: number

    /**
     * Number of processed files.
     */
    readonly filesProcessed: number

    /**
     * Accumulated total processing time in milliseconds.
     */
    readonly totalProcessingTimeMs: number

    /**
     * Average processing time per file in milliseconds.
     */
    readonly avgProcessingTimeMs: number

    /**
     * Number of emitted checkpoints.
     */
    readonly logCount: number

    /**
     * Last processed batch duration in milliseconds.
     */
    readonly lastBatchDurationMs: number | undefined

    /**
     * Last state update timestamp in milliseconds since epoch.
     */
    readonly lastRecordedAtMs: number | undefined

    /**
     * Last emitted checkpoint if present.
     */
    readonly lastCheckpoint: IAstStreamingMetricsCheckpoint | undefined
}

/**
 * Runtime options for streaming metrics collector.
 */
export interface IAstStreamingMetricsCollectorServiceOptions {
    /**
     * Optional structured logger used for periodic checkpoint logs.
     */
    readonly logger?: ILogger

    /**
     * Optional checkpoint frequency in processed batches.
     */
    readonly logEveryBatches?: number

    /**
     * Optional bounded idempotency cache size.
     */
    readonly idempotencyCacheSize?: number

    /**
     * Optional default retry policy.
     */
    readonly defaultRetryPolicy?: IAstStreamingMetricsCollectorRetryPolicy

    /**
     * Optional sleep override for retry/backoff logic.
     */
    readonly sleep?: AstStreamingMetricsCollectorSleep

    /**
     * Optional clock override used for deterministic tests.
     */
    readonly now?: AstStreamingMetricsCollectorNow
}

/**
 * Streaming metrics collector contract.
 */
export interface IAstStreamingMetricsCollectorService {
    /**
     * Records one processed batch.
     *
     * @param input Batch metrics payload.
     * @returns Updated collector snapshot.
     */
    recordBatch(
        input: IAstStreamingMetricsCollectorInput,
    ): Promise<IAstStreamingMetricsCollectorSnapshot>

    /**
     * Returns current collector snapshot.
     *
     * @returns Runtime snapshot.
     */
    getSnapshot(): IAstStreamingMetricsCollectorSnapshot

    /**
     * Returns emitted checkpoints in chronological order.
     *
     * @returns Logged checkpoints.
     */
    getCheckpoints(): readonly IAstStreamingMetricsCheckpoint[]

    /**
     * Clears counters, checkpoints and idempotency caches.
     */
    reset(): void
}

interface IAstStreamingMetricsCollectorState {
    readonly batchCount: number
    readonly filesProcessed: number
    readonly totalProcessingTimeMs: number
    readonly avgProcessingTimeMs: number
    readonly logCount: number
    readonly lastBatchDurationMs: number | undefined
    readonly lastRecordedAtMs: number | undefined
    readonly lastCheckpoint: IAstStreamingMetricsCheckpoint | undefined
}

interface IAstStreamingMetricsCollectorNormalizedRetryPolicy {
    readonly maxAttempts: number
    readonly initialBackoffMs: number
    readonly maxBackoffMs: number
    readonly shouldRetry: AstStreamingMetricsCollectorShouldRetry
}

interface IAstStreamingMetricsCollectorNormalizedInput {
    readonly filesProcessed: number
    readonly batchDurationMs: number
    readonly idempotencyKey: string | undefined
    readonly retryPolicy: IAstStreamingMetricsCollectorNormalizedRetryPolicy
}

/**
 * Tracks streaming batch metrics and logs periodic checkpoints.
 */
export class AstStreamingMetricsCollectorService implements IAstStreamingMetricsCollectorService {
    private readonly logger: ILogger | undefined
    private readonly logEveryBatches: number
    private readonly idempotencyCacheSize: number
    private readonly defaultRetryPolicy: IAstStreamingMetricsCollectorNormalizedRetryPolicy
    private readonly sleep: AstStreamingMetricsCollectorSleep
    private readonly now: AstStreamingMetricsCollectorNow
    private readonly checkpoints: IAstStreamingMetricsCheckpoint[] = []
    private readonly inFlightByIdempotencyKey = new Map<
        string,
        Promise<IAstStreamingMetricsCollectorSnapshot>
    >()
    private readonly processedIdempotencyKeys = new Set<string>()
    private readonly processedIdempotencyOrder: string[] = []
    private state: IAstStreamingMetricsCollectorState = createInitialState()

    /**
     * Creates streaming metrics collector service.
     *
     * @param options Optional runtime configuration.
     */
    public constructor(options: IAstStreamingMetricsCollectorServiceOptions = {}) {
        this.logger = validateLogger(options.logger)
        this.logEveryBatches = validateLogEveryBatches(
            options.logEveryBatches ?? DEFAULT_LOG_EVERY_BATCHES,
        )
        this.idempotencyCacheSize = validateIdempotencyCacheSize(
            options.idempotencyCacheSize ?? DEFAULT_IDEMPOTENCY_CACHE_SIZE,
        )
        this.defaultRetryPolicy = normalizeRetryPolicy(options.defaultRetryPolicy)
        this.sleep = validateSleep(options.sleep)
        this.now = validateNow(options.now)
    }

    /**
     * Records one processed batch.
     *
     * @param input Batch metrics payload.
     * @returns Updated collector snapshot.
     */
    public recordBatch(
        input: IAstStreamingMetricsCollectorInput,
    ): Promise<IAstStreamingMetricsCollectorSnapshot> {
        const normalizedInput = this.normalizeInput(input)
        const existingInFlight = this.findInFlightBatch(normalizedInput.idempotencyKey)

        if (existingInFlight !== undefined) {
            return existingInFlight
        }

        if (
            normalizedInput.idempotencyKey !== undefined &&
            this.processedIdempotencyKeys.has(normalizedInput.idempotencyKey)
        ) {
            return Promise.resolve(this.getSnapshot())
        }

        const runPromise = this.executeRecordBatch(normalizedInput)
        this.trackInFlightBatch(normalizedInput.idempotencyKey, runPromise)
        return runPromise
    }

    /**
     * Returns current collector snapshot.
     *
     * @returns Runtime snapshot.
     */
    public getSnapshot(): IAstStreamingMetricsCollectorSnapshot {
        return {
            batchCount: this.state.batchCount,
            filesProcessed: this.state.filesProcessed,
            totalProcessingTimeMs: this.state.totalProcessingTimeMs,
            avgProcessingTimeMs: this.state.avgProcessingTimeMs,
            logCount: this.state.logCount,
            lastBatchDurationMs: this.state.lastBatchDurationMs,
            lastRecordedAtMs: this.state.lastRecordedAtMs,
            lastCheckpoint: this.state.lastCheckpoint,
        }
    }

    /**
     * Returns emitted checkpoints in chronological order.
     *
     * @returns Logged checkpoints.
     */
    public getCheckpoints(): readonly IAstStreamingMetricsCheckpoint[] {
        return [...this.checkpoints]
    }

    /**
     * Clears counters, checkpoints and idempotency caches.
     */
    public reset(): void {
        this.state = createInitialState()
        this.checkpoints.length = 0
        this.inFlightByIdempotencyKey.clear()
        this.processedIdempotencyKeys.clear()
        this.processedIdempotencyOrder.length = 0
    }

    /**
     * Normalizes and validates one batch payload.
     *
     * @param input Raw batch payload.
     * @returns Normalized batch payload.
     */
    private normalizeInput(
        input: IAstStreamingMetricsCollectorInput,
    ): IAstStreamingMetricsCollectorNormalizedInput {
        return {
            filesProcessed: validateFilesProcessed(input.filesProcessed),
            batchDurationMs: validateBatchDurationMs(input.batchDurationMs),
            idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
            retryPolicy: mergeRetryPolicy(input.retryPolicy, this.defaultRetryPolicy),
        }
    }

    /**
     * Records one normalized batch payload.
     *
     * @param input Normalized batch payload.
     * @returns Updated snapshot.
     */
    private async executeRecordBatch(
        input: IAstStreamingMetricsCollectorNormalizedInput,
    ): Promise<IAstStreamingMetricsCollectorSnapshot> {
        const recordedAtMs = this.now()
        const nextState = resolveNextState(
            this.state,
            input.filesProcessed,
            input.batchDurationMs,
            recordedAtMs,
        )
        const checkpoint = resolveCheckpoint(nextState, this.logEveryBatches, recordedAtMs)

        if (checkpoint !== undefined) {
            await this.logCheckpoint(checkpoint, input.retryPolicy)
        }

        this.commitState(nextState, checkpoint)
        this.rememberIdempotencyKey(input.idempotencyKey)
        return this.getSnapshot()
    }

    /**
     * Logs one checkpoint with retry/backoff semantics.
     *
     * @param checkpoint Checkpoint payload.
     * @param retryPolicy Retry policy for logger failures.
     */
    private async logCheckpoint(
        checkpoint: IAstStreamingMetricsCheckpoint,
        retryPolicy: IAstStreamingMetricsCollectorNormalizedRetryPolicy,
    ): Promise<void> {
        if (this.logger !== undefined) {
            await this.writeCheckpointWithRetry(checkpoint, retryPolicy)
        }
    }

    /**
     * Writes one checkpoint to logger with bounded retries.
     *
     * @param checkpoint Checkpoint payload.
     * @param retryPolicy Retry policy.
     */
    private async writeCheckpointWithRetry(
        checkpoint: IAstStreamingMetricsCheckpoint,
        retryPolicy: IAstStreamingMetricsCollectorNormalizedRetryPolicy,
    ): Promise<void> {
        let attempt = 0

        while (attempt < retryPolicy.maxAttempts) {
            attempt += 1

            try {
                await this.logger?.info(
                    STREAMING_METRICS_LOG_MESSAGE,
                    checkpointToLogContext(checkpoint),
                )
                return
            } catch (error: unknown) {
                const shouldRetry =
                    attempt < retryPolicy.maxAttempts && retryPolicy.shouldRetry(error, attempt)

                if (shouldRetry === false) {
                    throw new AstStreamingMetricsCollectorError(
                        AST_STREAMING_METRICS_COLLECTOR_ERROR_CODE.LOGGING_FAILED,
                        {
                            attempts: attempt,
                            reason: normalizeErrorReason(error),
                        },
                    )
                }

                const backoffDuration = resolveBackoffDurationMs(
                    retryPolicy.initialBackoffMs,
                    retryPolicy.maxBackoffMs,
                    attempt,
                )
                await this.sleep(backoffDuration)
            }
        }
    }

    /**
     * Commits resolved state and optional checkpoint.
     *
     * @param nextState Resolved state.
     * @param checkpoint Optional checkpoint.
     */
    private commitState(
        nextState: IAstStreamingMetricsCollectorState,
        checkpoint: IAstStreamingMetricsCheckpoint | undefined,
    ): void {
        if (checkpoint !== undefined) {
            this.checkpoints.push(checkpoint)
            this.state = {
                ...nextState,
                logCount: nextState.logCount + 1,
                lastCheckpoint: checkpoint,
            }
            return
        }

        this.state = nextState
    }

    /**
     * Returns in-flight batch promise by idempotency key.
     *
     * @param idempotencyKey Optional normalized idempotency key.
     * @returns In-flight promise when present.
     */
    private findInFlightBatch(
        idempotencyKey: string | undefined,
    ): Promise<IAstStreamingMetricsCollectorSnapshot> | undefined {
        if (idempotencyKey === undefined) {
            return undefined
        }

        return this.inFlightByIdempotencyKey.get(idempotencyKey)
    }

    /**
     * Tracks in-flight batch promise by idempotency key.
     *
     * @param idempotencyKey Optional normalized idempotency key.
     * @param promise In-flight batch promise.
     */
    private trackInFlightBatch(
        idempotencyKey: string | undefined,
        promise: Promise<IAstStreamingMetricsCollectorSnapshot>,
    ): void {
        if (idempotencyKey === undefined) {
            return
        }

        this.inFlightByIdempotencyKey.set(idempotencyKey, promise)
        void promise.then(
            () => {
                this.inFlightByIdempotencyKey.delete(idempotencyKey)
            },
            () => {
                this.inFlightByIdempotencyKey.delete(idempotencyKey)
            },
        )
    }

    /**
     * Stores completed idempotency key in bounded cache.
     *
     * @param idempotencyKey Optional normalized idempotency key.
     */
    private rememberIdempotencyKey(idempotencyKey: string | undefined): void {
        if (idempotencyKey === undefined || this.processedIdempotencyKeys.has(idempotencyKey)) {
            return
        }

        this.processedIdempotencyKeys.add(idempotencyKey)
        this.processedIdempotencyOrder.push(idempotencyKey)

        while (this.processedIdempotencyOrder.length > this.idempotencyCacheSize) {
            const oldestIdempotencyKey = this.processedIdempotencyOrder.shift()

            if (oldestIdempotencyKey !== undefined) {
                this.processedIdempotencyKeys.delete(oldestIdempotencyKey)
            }
        }
    }
}

/**
 * Creates initial collector state.
 *
 * @returns Initial state.
 */
function createInitialState(): IAstStreamingMetricsCollectorState {
    return {
        batchCount: 0,
        filesProcessed: 0,
        totalProcessingTimeMs: 0,
        avgProcessingTimeMs: 0,
        logCount: 0,
        lastBatchDurationMs: undefined,
        lastRecordedAtMs: undefined,
        lastCheckpoint: undefined,
    }
}

/**
 * Resolves next collector state from previous state and one batch payload.
 *
 * @param currentState Current collector state.
 * @param filesProcessed Processed files in batch.
 * @param batchDurationMs Batch duration in milliseconds.
 * @param recordedAtMs Record timestamp.
 * @returns Next collector state.
 */
function resolveNextState(
    currentState: IAstStreamingMetricsCollectorState,
    filesProcessed: number,
    batchDurationMs: number,
    recordedAtMs: number,
): IAstStreamingMetricsCollectorState {
    const nextBatchCount = currentState.batchCount + 1
    const nextFilesProcessed = currentState.filesProcessed + filesProcessed
    const nextTotalProcessingTimeMs = currentState.totalProcessingTimeMs + batchDurationMs
    const nextAvgProcessingTimeMs =
        nextFilesProcessed === 0
            ? 0
            : roundToTwoDigits(nextTotalProcessingTimeMs / nextFilesProcessed)

    return {
        batchCount: nextBatchCount,
        filesProcessed: nextFilesProcessed,
        totalProcessingTimeMs: nextTotalProcessingTimeMs,
        avgProcessingTimeMs: nextAvgProcessingTimeMs,
        logCount: currentState.logCount,
        lastBatchDurationMs: batchDurationMs,
        lastRecordedAtMs: recordedAtMs,
        lastCheckpoint: currentState.lastCheckpoint,
    }
}

/**
 * Resolves checkpoint payload when current batch should be logged.
 *
 * @param state Next collector state.
 * @param logEveryBatches Checkpoint frequency.
 * @param loggedAtMs Log timestamp.
 * @returns Checkpoint payload when batch index matches frequency.
 */
function resolveCheckpoint(
    state: IAstStreamingMetricsCollectorState,
    logEveryBatches: number,
    loggedAtMs: number,
): IAstStreamingMetricsCheckpoint | undefined {
    if (state.batchCount % logEveryBatches !== 0) {
        return undefined
    }

    return {
        batchCount: state.batchCount,
        filesProcessed: state.filesProcessed,
        totalProcessingTimeMs: state.totalProcessingTimeMs,
        avgProcessingTimeMs: state.avgProcessingTimeMs,
        loggedAtMs,
    }
}

/**
 * Validates log frequency.
 *
 * @param logEveryBatches Raw log frequency.
 * @returns Validated log frequency.
 */
function validateLogEveryBatches(logEveryBatches: number): number {
    if (Number.isSafeInteger(logEveryBatches) === false || logEveryBatches < 1) {
        throw new AstStreamingMetricsCollectorError(
            AST_STREAMING_METRICS_COLLECTOR_ERROR_CODE.INVALID_LOG_EVERY_BATCHES,
            {
                logEveryBatches,
            },
        )
    }

    return logEveryBatches
}

/**
 * Validates idempotency cache size.
 *
 * @param idempotencyCacheSize Raw idempotency cache size.
 * @returns Validated idempotency cache size.
 */
function validateIdempotencyCacheSize(idempotencyCacheSize: number): number {
    if (Number.isSafeInteger(idempotencyCacheSize) === false || idempotencyCacheSize < 1) {
        throw new AstStreamingMetricsCollectorError(
            AST_STREAMING_METRICS_COLLECTOR_ERROR_CODE.INVALID_IDEMPOTENCY_CACHE_SIZE,
            {
                idempotencyCacheSize,
            },
        )
    }

    return idempotencyCacheSize
}

/**
 * Validates files-processed payload.
 *
 * @param filesProcessed Raw files processed value.
 * @returns Validated files processed value.
 */
function validateFilesProcessed(filesProcessed: number): number {
    if (Number.isSafeInteger(filesProcessed) === false || filesProcessed < 0) {
        throw new AstStreamingMetricsCollectorError(
            AST_STREAMING_METRICS_COLLECTOR_ERROR_CODE.INVALID_FILES_PROCESSED,
            {
                filesProcessed,
            },
        )
    }

    return filesProcessed
}

/**
 * Validates batch-duration payload.
 *
 * @param batchDurationMs Raw batch duration value.
 * @returns Validated batch duration value.
 */
function validateBatchDurationMs(batchDurationMs: number): number {
    if (Number.isSafeInteger(batchDurationMs) === false || batchDurationMs < 0) {
        throw new AstStreamingMetricsCollectorError(
            AST_STREAMING_METRICS_COLLECTOR_ERROR_CODE.INVALID_BATCH_DURATION_MS,
            {
                batchDurationMs,
            },
        )
    }

    return batchDurationMs
}

/**
 * Validates optional logger contract.
 *
 * @param logger Optional logger value.
 * @returns Normalized logger value.
 */
function validateLogger(logger: ILogger | undefined): ILogger | undefined {
    if (logger === undefined) {
        return undefined
    }

    if (isLogger(logger) === false) {
        throw new AstStreamingMetricsCollectorError(
            AST_STREAMING_METRICS_COLLECTOR_ERROR_CODE.INVALID_LOGGER,
        )
    }

    return logger
}

/**
 * Validates optional sleep function.
 *
 * @param sleep Optional sleep function.
 * @returns Normalized sleep function.
 */
function validateSleep(
    sleep: AstStreamingMetricsCollectorSleep | undefined,
): AstStreamingMetricsCollectorSleep {
    if (sleep === undefined) {
        return sleepFor
    }

    if (typeof sleep !== "function") {
        throw new AstStreamingMetricsCollectorError(
            AST_STREAMING_METRICS_COLLECTOR_ERROR_CODE.INVALID_SLEEP,
        )
    }

    return sleep
}

/**
 * Validates optional clock function.
 *
 * @param now Optional clock function.
 * @returns Normalized clock function.
 */
function validateNow(now: AstStreamingMetricsCollectorNow | undefined): AstStreamingMetricsCollectorNow {
    if (now === undefined) {
        return Date.now
    }

    if (typeof now !== "function") {
        throw new AstStreamingMetricsCollectorError(
            AST_STREAMING_METRICS_COLLECTOR_ERROR_CODE.INVALID_NOW,
        )
    }

    return now
}

/**
 * Normalizes idempotency key.
 *
 * @param idempotencyKey Optional raw idempotency key.
 * @returns Trimmed key or undefined.
 */
function normalizeIdempotencyKey(idempotencyKey: string | undefined): string | undefined {
    if (idempotencyKey === undefined) {
        return undefined
    }

    const normalized = idempotencyKey.trim()
    return normalized.length > 0 ? normalized : undefined
}

/**
 * Normalizes retry policy with defaults.
 *
 * @param retryPolicy Optional retry policy.
 * @returns Normalized retry policy.
 */
function normalizeRetryPolicy(
    retryPolicy: IAstStreamingMetricsCollectorRetryPolicy | undefined,
): IAstStreamingMetricsCollectorNormalizedRetryPolicy {
    const maxAttempts = validateMaxAttempts(retryPolicy?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS)
    const initialBackoffMs = validateInitialBackoffMs(
        retryPolicy?.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS,
    )
    const maxBackoffMs = validateMaxBackoffMs(retryPolicy?.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS)

    if (maxBackoffMs < initialBackoffMs) {
        throw new AstStreamingMetricsCollectorError(
            AST_STREAMING_METRICS_COLLECTOR_ERROR_CODE.INVALID_MAX_BACKOFF_MS,
            {
                maxBackoffMs,
            },
        )
    }

    return {
        maxAttempts,
        initialBackoffMs,
        maxBackoffMs,
        shouldRetry: retryPolicy?.shouldRetry ?? defaultShouldRetry,
    }
}

/**
 * Merges task-level retry policy with default retry policy.
 *
 * @param retryPolicy Optional task-level retry policy.
 * @param defaultRetryPolicy Default retry policy.
 * @returns Merged retry policy.
 */
function mergeRetryPolicy(
    retryPolicy: IAstStreamingMetricsCollectorRetryPolicy | undefined,
    defaultRetryPolicy: IAstStreamingMetricsCollectorNormalizedRetryPolicy,
): IAstStreamingMetricsCollectorNormalizedRetryPolicy {
    if (retryPolicy === undefined) {
        return defaultRetryPolicy
    }

    const normalizedRetryPolicy = normalizeRetryPolicy(retryPolicy)
    return {
        maxAttempts: normalizedRetryPolicy.maxAttempts,
        initialBackoffMs: normalizedRetryPolicy.initialBackoffMs,
        maxBackoffMs: normalizedRetryPolicy.maxBackoffMs,
        shouldRetry: normalizedRetryPolicy.shouldRetry,
    }
}

/**
 * Validates max attempts.
 *
 * @param maxAttempts Raw max attempts value.
 * @returns Validated max attempts value.
 */
function validateMaxAttempts(maxAttempts: number): number {
    if (Number.isSafeInteger(maxAttempts) === false || maxAttempts < 1) {
        throw new AstStreamingMetricsCollectorError(
            AST_STREAMING_METRICS_COLLECTOR_ERROR_CODE.INVALID_MAX_ATTEMPTS,
            {
                maxAttempts,
            },
        )
    }

    return maxAttempts
}

/**
 * Validates initial backoff.
 *
 * @param initialBackoffMs Raw initial backoff value.
 * @returns Validated initial backoff value.
 */
function validateInitialBackoffMs(initialBackoffMs: number): number {
    if (Number.isSafeInteger(initialBackoffMs) === false || initialBackoffMs < 0) {
        throw new AstStreamingMetricsCollectorError(
            AST_STREAMING_METRICS_COLLECTOR_ERROR_CODE.INVALID_INITIAL_BACKOFF_MS,
            {
                initialBackoffMs,
            },
        )
    }

    return initialBackoffMs
}

/**
 * Validates max backoff.
 *
 * @param maxBackoffMs Raw max backoff value.
 * @returns Validated max backoff value.
 */
function validateMaxBackoffMs(maxBackoffMs: number): number {
    if (Number.isSafeInteger(maxBackoffMs) === false || maxBackoffMs < 0) {
        throw new AstStreamingMetricsCollectorError(
            AST_STREAMING_METRICS_COLLECTOR_ERROR_CODE.INVALID_MAX_BACKOFF_MS,
            {
                maxBackoffMs,
            },
        )
    }

    return maxBackoffMs
}

/**
 * Resolves exponential backoff duration.
 *
 * @param initialBackoffMs Initial backoff duration.
 * @param maxBackoffMs Maximum backoff duration.
 * @param attempt Attempt number.
 * @returns Clamped backoff duration.
 */
function resolveBackoffDurationMs(initialBackoffMs: number, maxBackoffMs: number, attempt: number): number {
    const multiplier = Math.max(0, attempt - 1)
    const rawBackoff = initialBackoffMs * 2 ** multiplier
    return Math.min(maxBackoffMs, rawBackoff)
}

/**
 * Converts unknown failure value to stable reason string.
 *
 * @param error Unknown failure value.
 * @returns Stable reason string.
 */
function normalizeErrorReason(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    if (typeof error === "string") {
        return error
    }

    return "Unknown logging failure"
}

/**
 * Type guard for ILogger contract.
 *
 * @param logger Unknown logger candidate.
 * @returns True when value satisfies ILogger contract.
 */
function isLogger(logger: unknown): logger is ILogger {
    if (typeof logger !== "object" || logger === null) {
        return false
    }

    return REQUIRED_LOGGER_METHODS.every((methodName) => {
        return hasFunctionProperty(logger, methodName)
    })
}

const REQUIRED_LOGGER_METHODS = [
    "info",
    "warn",
    "error",
    "debug",
    "child",
] as const

/**
 * Checks that one property exists and is a function.
 *
 * @param value Candidate object.
 * @param propertyName Property name.
 * @returns True when property exists and is callable.
 */
function hasFunctionProperty(
    value: object,
    propertyName: (typeof REQUIRED_LOGGER_METHODS)[number],
): boolean {
    if (propertyName in value === false) {
        return false
    }

    const candidate = (value as Record<string, unknown>)[propertyName]
    return typeof candidate === "function"
}

/**
 * Converts checkpoint payload into logger context object.
 *
 * @param checkpoint Checkpoint payload.
 * @returns Logger context.
 */
function checkpointToLogContext(
    checkpoint: IAstStreamingMetricsCheckpoint,
): Record<string, unknown> {
    return {
        batchCount: checkpoint.batchCount,
        filesProcessed: checkpoint.filesProcessed,
        totalProcessingTimeMs: checkpoint.totalProcessingTimeMs,
        avgProcessingTimeMs: checkpoint.avgProcessingTimeMs,
        loggedAtMs: checkpoint.loggedAtMs,
    }
}

/**
 * Rounds number to two fractional digits.
 *
 * @param value Raw value.
 * @returns Rounded value.
 */
function roundToTwoDigits(value: number): number {
    return Math.round(value * 100) / 100
}

/**
 * Default retry classifier.
 *
 * @returns Always true.
 */
function defaultShouldRetry(): boolean {
    return true
}

/**
 * Sleeps for one duration in milliseconds.
 *
 * @param durationMs Duration in milliseconds.
 * @returns Promise resolved after delay.
 */
async function sleepFor(durationMs: number): Promise<void> {
    await new Promise<void>((resolve) => {
        setTimeout(resolve, durationMs)
    })
}
