import {
    AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE,
    AstGarbageCollectionTriggerError,
} from "./ast-garbage-collection-trigger.error"

const DEFAULT_THRESHOLD_PERCENT = 70
const DEFAULT_CHECK_INTERVAL_MS = 10_000
const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_INITIAL_BACKOFF_MS = 50
const DEFAULT_MAX_BACKOFF_MS = 1_000

/**
 * Sleep function used by retry/backoff logic.
 */
export type AstGarbageCollectionTriggerSleep = (durationMs: number) => Promise<void>

/**
 * Clock function used for deterministic timestamps.
 */
export type AstGarbageCollectionTriggerNow = () => Date

/**
 * Retry decision callback for failed provider and GC calls.
 */
export type AstGarbageCollectionTriggerShouldRetry = (error: unknown, attempt: number) => boolean

/**
 * Interval scheduler function.
 */
export type AstGarbageCollectionTriggerSetInterval = (
    handler: () => void,
    intervalMs: number,
) => unknown

/**
 * Interval cancellation function.
 */
export type AstGarbageCollectionTriggerClearInterval = (timerHandle: unknown) => void

/**
 * Raw memory usage sample used for GC threshold checks.
 */
export interface IAstGarbageCollectionMemorySample {
    /**
     * Used memory bytes.
     */
    readonly usedBytes: number

    /**
     * Total available memory bytes.
     */
    readonly totalBytes: number

    /**
     * Optional stable idempotency sample key.
     */
    readonly sampleId?: string

    /**
     * Optional sample timestamp.
     */
    readonly sampledAt?: Date
}

/**
 * Snapshot provider contract.
 */
export type AstGarbageCollectionSnapshotProvider = () => Promise<IAstGarbageCollectionMemorySample>

/**
 * GC invocation function.
 */
export type AstGarbageCollectionInvoker = () => Promise<void>

/**
 * Retry policy for provider and GC invocation.
 */
export interface IAstGarbageCollectionTriggerRetryPolicy {
    /**
     * Maximum number of attempts including initial execution.
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
     * Optional callback to classify retryable errors.
     */
    readonly shouldRetry?: AstGarbageCollectionTriggerShouldRetry
}

/**
 * Runtime status snapshot for garbage collection trigger.
 */
export interface IAstGarbageCollectionTriggerStatus {
    /**
     * True when periodic scheduler is active.
     */
    readonly isRunning: boolean

    /**
     * Trigger threshold in memory utilization percent.
     */
    readonly thresholdPercent: number

    /**
     * Interval check cadence in milliseconds.
     */
    readonly checkIntervalMs: number

    /**
     * Last observed memory utilization in percent.
     */
    readonly utilizationPercent: number

    /**
     * Last processed sample timestamp.
     */
    readonly lastSampleAt: Date | null

    /**
     * Last accepted sample id.
     */
    readonly lastSampleId: string | null

    /**
     * Last GC trigger timestamp.
     */
    readonly lastTriggeredAt: Date | null

    /**
     * Number of successful GC triggers.
     */
    readonly triggerCount: number

    /**
     * Last check timestamp.
     */
    readonly lastCheckAt: Date | null

    /**
     * Last provider or GC failure reason.
     */
    readonly lastFailure: string | null
}

/**
 * Runtime options for garbage collection trigger service.
 */
export interface IAstGarbageCollectionTriggerServiceOptions {
    /**
     * Utilization threshold in percent that triggers GC.
     */
    readonly thresholdPercent?: number

    /**
     * Check cadence in milliseconds.
     */
    readonly checkIntervalMs?: number

    /**
     * Optional snapshot provider override.
     */
    readonly snapshotProvider?: AstGarbageCollectionSnapshotProvider

    /**
     * Optional GC invocation override.
     */
    readonly gcInvoker?: AstGarbageCollectionInvoker

    /**
     * Optional default retry policy.
     */
    readonly retryPolicy?: IAstGarbageCollectionTriggerRetryPolicy

    /**
     * Optional sleep override for retry/backoff.
     */
    readonly sleep?: AstGarbageCollectionTriggerSleep

    /**
     * Optional clock override.
     */
    readonly now?: AstGarbageCollectionTriggerNow

    /**
     * Optional interval scheduling function.
     */
    readonly setIntervalFn?: AstGarbageCollectionTriggerSetInterval

    /**
     * Optional interval cancellation function.
     */
    readonly clearIntervalFn?: AstGarbageCollectionTriggerClearInterval
}

/**
 * Garbage collection trigger contract.
 */
export interface IAstGarbageCollectionTriggerService {
    /**
     * Starts periodic threshold checks.
     */
    start(): void

    /**
     * Stops periodic threshold checks.
     */
    stop(): void

    /**
     * Performs one immediate threshold check.
     *
     * @returns Updated status snapshot.
     */
    checkNow(): Promise<IAstGarbageCollectionTriggerStatus>

    /**
     * Returns current runtime status.
     *
     * @returns Current status snapshot.
     */
    getStatus(): IAstGarbageCollectionTriggerStatus
}

interface IAstGarbageCollectionNormalizedSample {
    readonly usedBytes: number
    readonly totalBytes: number
    readonly sampleId: string | undefined
    readonly sampledAt: Date
}

interface IAstGarbageCollectionNormalizedRetryPolicy {
    readonly maxAttempts: number
    readonly initialBackoffMs: number
    readonly maxBackoffMs: number
    readonly shouldRetry: AstGarbageCollectionTriggerShouldRetry
}

/**
 * Triggers GC when memory utilization crosses configured threshold.
 */
export class AstGarbageCollectionTriggerService implements IAstGarbageCollectionTriggerService {
    private readonly thresholdPercent: number
    private readonly checkIntervalMs: number
    private readonly snapshotProvider: AstGarbageCollectionSnapshotProvider
    private readonly gcInvoker: AstGarbageCollectionInvoker
    private readonly retryPolicy: IAstGarbageCollectionNormalizedRetryPolicy
    private readonly sleep: AstGarbageCollectionTriggerSleep
    private readonly now: AstGarbageCollectionTriggerNow
    private readonly setIntervalFn: AstGarbageCollectionTriggerSetInterval
    private readonly clearIntervalFn: AstGarbageCollectionTriggerClearInterval
    private timerHandle: unknown
    private inFlightCheck: Promise<IAstGarbageCollectionTriggerStatus> | undefined
    private utilizationPercent = 0
    private lastSampleAt: Date | null = null
    private lastSampleId: string | null = null
    private lastTriggeredAt: Date | null = null
    private triggerCount = 0
    private lastCheckAt: Date | null = null
    private lastFailure: string | null = null

    /**
     * Creates garbage collection trigger service.
     *
     * @param options Optional runtime configuration.
     */
    public constructor(options: IAstGarbageCollectionTriggerServiceOptions = {}) {
        this.thresholdPercent = validateThresholdPercent(
            options.thresholdPercent ?? DEFAULT_THRESHOLD_PERCENT,
        )
        this.checkIntervalMs = validateCheckIntervalMs(
            options.checkIntervalMs ?? DEFAULT_CHECK_INTERVAL_MS,
        )
        this.snapshotProvider = validateSnapshotProvider(
            options.snapshotProvider ?? defaultSnapshotProvider,
        )
        this.gcInvoker = validateGcInvoker(options.gcInvoker ?? defaultGcInvoker)
        this.retryPolicy = normalizeRetryPolicy(options.retryPolicy)
        this.sleep = validateSleep(options.sleep)
        this.now = validateNow(options.now)
        this.setIntervalFn = validateSetIntervalFn(options.setIntervalFn)
        this.clearIntervalFn = validateClearIntervalFn(options.clearIntervalFn)
    }

    /**
     * Starts periodic threshold checks.
     */
    public start(): void {
        if (this.timerHandle !== undefined) {
            return
        }

        this.timerHandle = this.setIntervalFn(() => {
            void this.checkNow().catch(() => undefined)
        }, this.checkIntervalMs)
    }

    /**
     * Stops periodic threshold checks.
     */
    public stop(): void {
        if (this.timerHandle === undefined) {
            return
        }

        this.clearIntervalFn(this.timerHandle)
        this.timerHandle = undefined
    }

    /**
     * Performs one immediate threshold check.
     *
     * @returns Updated status snapshot.
     */
    public checkNow(): Promise<IAstGarbageCollectionTriggerStatus> {
        if (this.inFlightCheck !== undefined) {
            return this.inFlightCheck
        }

        const checkPromise = this.executeCheck()
        this.inFlightCheck = checkPromise
        void checkPromise.then(
            () => {
                this.inFlightCheck = undefined
            },
            () => {
                this.inFlightCheck = undefined
            },
        )
        return checkPromise
    }

    /**
     * Returns current runtime status.
     *
     * @returns Current status snapshot.
     */
    public getStatus(): IAstGarbageCollectionTriggerStatus {
        return {
            isRunning: this.timerHandle !== undefined,
            thresholdPercent: this.thresholdPercent,
            checkIntervalMs: this.checkIntervalMs,
            utilizationPercent: this.utilizationPercent,
            lastSampleAt: this.lastSampleAt,
            lastSampleId: this.lastSampleId,
            lastTriggeredAt: this.lastTriggeredAt,
            triggerCount: this.triggerCount,
            lastCheckAt: this.lastCheckAt,
            lastFailure: this.lastFailure,
        }
    }

    /**
     * Executes one threshold check.
     *
     * @returns Updated status snapshot.
     */
    private async executeCheck(): Promise<IAstGarbageCollectionTriggerStatus> {
        const sample = await this.readSampleWithRetry()
        this.lastCheckAt = this.now()

        if (isDuplicateSample(sample.sampleId, this.lastSampleId)) {
            return this.getStatus()
        }

        const utilizationPercent = calculateUtilizationPercent(sample.usedBytes, sample.totalBytes)
        this.utilizationPercent = utilizationPercent
        this.lastSampleAt = sample.sampledAt
        this.lastSampleId = sample.sampleId ?? null
        this.lastFailure = null

        if (utilizationPercent >= this.thresholdPercent) {
            await this.triggerGcWithRetry()
            this.triggerCount += 1
            this.lastTriggeredAt = this.now()
        }

        return this.getStatus()
    }

    /**
     * Reads one memory sample with retry/backoff semantics.
     *
     * @returns Normalized memory sample.
     */
    private async readSampleWithRetry(): Promise<IAstGarbageCollectionNormalizedSample> {
        let attempt = 0

        while (attempt < this.retryPolicy.maxAttempts) {
            attempt += 1

            try {
                const sample = await this.snapshotProvider()
                return normalizeSample(sample, this.now)
            } catch (error: unknown) {
                if (isSampleValidationError(error)) {
                    this.lastFailure = normalizeErrorReason(error)
                    throw error
                }

                const shouldRetry =
                    attempt < this.retryPolicy.maxAttempts &&
                    this.retryPolicy.shouldRetry(error, attempt)

                if (shouldRetry === false) {
                    const reason = normalizeErrorReason(error)
                    this.lastFailure = reason
                    throw new AstGarbageCollectionTriggerError(
                        AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.SNAPSHOT_PROVIDER_FAILED,
                        {
                            attempts: attempt,
                            reason,
                        },
                    )
                }

                const backoffDuration = resolveBackoffDurationMs(
                    this.retryPolicy.initialBackoffMs,
                    this.retryPolicy.maxBackoffMs,
                    attempt,
                )
                await this.sleep(backoffDuration)
            }
        }

        throw new AstGarbageCollectionTriggerError(
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.SNAPSHOT_PROVIDER_FAILED,
            {
                attempts: this.retryPolicy.maxAttempts,
                reason: "Retry attempts exhausted",
            },
        )
    }

    /**
     * Triggers GC with retry/backoff semantics.
     */
    private async triggerGcWithRetry(): Promise<void> {
        let attempt = 0

        while (attempt < this.retryPolicy.maxAttempts) {
            attempt += 1

            try {
                await this.gcInvoker()
                return
            } catch (error: unknown) {
                const shouldRetry =
                    attempt < this.retryPolicy.maxAttempts &&
                    this.retryPolicy.shouldRetry(error, attempt)

                if (shouldRetry === false) {
                    const reason = normalizeErrorReason(error)
                    this.lastFailure = reason
                    throw new AstGarbageCollectionTriggerError(
                        AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.GC_TRIGGER_FAILED,
                        {
                            attempts: attempt,
                            reason,
                        },
                    )
                }

                const backoffDuration = resolveBackoffDurationMs(
                    this.retryPolicy.initialBackoffMs,
                    this.retryPolicy.maxBackoffMs,
                    attempt,
                )
                await this.sleep(backoffDuration)
            }
        }
    }
}

/**
 * Validates threshold percent.
 *
 * @param thresholdPercent Raw threshold value.
 * @returns Validated threshold value.
 */
function validateThresholdPercent(thresholdPercent: number): number {
    if (
        Number.isSafeInteger(thresholdPercent) === false ||
        thresholdPercent < 1 ||
        thresholdPercent > 100
    ) {
        throw new AstGarbageCollectionTriggerError(
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.INVALID_THRESHOLD_PERCENT,
            {
                thresholdPercent,
            },
        )
    }

    return thresholdPercent
}

/**
 * Validates interval check duration.
 *
 * @param checkIntervalMs Raw interval duration.
 * @returns Validated interval duration.
 */
function validateCheckIntervalMs(checkIntervalMs: number): number {
    if (Number.isSafeInteger(checkIntervalMs) === false || checkIntervalMs < 1) {
        throw new AstGarbageCollectionTriggerError(
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.INVALID_CHECK_INTERVAL_MS,
            {
                checkIntervalMs,
            },
        )
    }

    return checkIntervalMs
}

/**
 * Validates snapshot provider function.
 *
 * @param snapshotProvider Raw snapshot provider.
 * @returns Validated snapshot provider.
 */
function validateSnapshotProvider(
    snapshotProvider: AstGarbageCollectionSnapshotProvider,
): AstGarbageCollectionSnapshotProvider {
    if (typeof snapshotProvider !== "function") {
        throw new AstGarbageCollectionTriggerError(
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.INVALID_SNAPSHOT_PROVIDER,
        )
    }

    return snapshotProvider
}

/**
 * Validates GC invoker function.
 *
 * @param gcInvoker Raw GC invoker.
 * @returns Validated GC invoker.
 */
function validateGcInvoker(gcInvoker: AstGarbageCollectionInvoker): AstGarbageCollectionInvoker {
    if (typeof gcInvoker !== "function") {
        throw new AstGarbageCollectionTriggerError(
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.INVALID_GC_INVOKER,
        )
    }

    return gcInvoker
}

/**
 * Validates sleep function.
 *
 * @param sleep Optional sleep function.
 * @returns Validated sleep function.
 */
function validateSleep(
    sleep: AstGarbageCollectionTriggerSleep | undefined,
): AstGarbageCollectionTriggerSleep {
    if (sleep === undefined) {
        return sleepFor
    }

    if (typeof sleep !== "function") {
        throw new AstGarbageCollectionTriggerError(
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.INVALID_SLEEP,
        )
    }

    return sleep
}

/**
 * Validates clock function.
 *
 * @param now Optional clock function.
 * @returns Validated clock function.
 */
function validateNow(now: AstGarbageCollectionTriggerNow | undefined): AstGarbageCollectionTriggerNow {
    if (now === undefined) {
        return () => new Date()
    }

    if (typeof now !== "function") {
        throw new AstGarbageCollectionTriggerError(
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.INVALID_NOW,
        )
    }

    return now
}

/**
 * Validates setInterval function override.
 *
 * @param setIntervalFn Optional scheduler function.
 * @returns Validated scheduler function.
 */
function validateSetIntervalFn(
    setIntervalFn: AstGarbageCollectionTriggerSetInterval | undefined,
): AstGarbageCollectionTriggerSetInterval {
    if (setIntervalFn === undefined) {
        return (handler, intervalMs) => {
            return setInterval(handler, intervalMs)
        }
    }

    if (typeof setIntervalFn !== "function") {
        throw new AstGarbageCollectionTriggerError(
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.INVALID_SET_INTERVAL,
        )
    }

    return setIntervalFn
}

/**
 * Validates clearInterval function override.
 *
 * @param clearIntervalFn Optional cancellation function.
 * @returns Validated cancellation function.
 */
function validateClearIntervalFn(
    clearIntervalFn: AstGarbageCollectionTriggerClearInterval | undefined,
): AstGarbageCollectionTriggerClearInterval {
    if (clearIntervalFn === undefined) {
        return (timerHandle) => {
            clearInterval(timerHandle as NodeJS.Timeout)
        }
    }

    if (typeof clearIntervalFn !== "function") {
        throw new AstGarbageCollectionTriggerError(
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.INVALID_CLEAR_INTERVAL,
        )
    }

    return clearIntervalFn
}

/**
 * Normalizes retry policy with defaults.
 *
 * @param retryPolicy Optional retry policy.
 * @returns Normalized retry policy.
 */
function normalizeRetryPolicy(
    retryPolicy: IAstGarbageCollectionTriggerRetryPolicy | undefined,
): IAstGarbageCollectionNormalizedRetryPolicy {
    const maxAttempts = validateMaxAttempts(retryPolicy?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS)
    const initialBackoffMs = validateInitialBackoffMs(
        retryPolicy?.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS,
    )
    const maxBackoffMs = validateMaxBackoffMs(retryPolicy?.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS)

    if (maxBackoffMs < initialBackoffMs) {
        throw new AstGarbageCollectionTriggerError(
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.INVALID_MAX_BACKOFF_MS,
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
 * Validates max attempts.
 *
 * @param maxAttempts Raw max attempts value.
 * @returns Validated max attempts.
 */
function validateMaxAttempts(maxAttempts: number): number {
    if (Number.isSafeInteger(maxAttempts) === false || maxAttempts < 1) {
        throw new AstGarbageCollectionTriggerError(
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.INVALID_MAX_ATTEMPTS,
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
 * @returns Validated initial backoff.
 */
function validateInitialBackoffMs(initialBackoffMs: number): number {
    if (Number.isSafeInteger(initialBackoffMs) === false || initialBackoffMs < 0) {
        throw new AstGarbageCollectionTriggerError(
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.INVALID_INITIAL_BACKOFF_MS,
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
 * @returns Validated max backoff.
 */
function validateMaxBackoffMs(maxBackoffMs: number): number {
    if (Number.isSafeInteger(maxBackoffMs) === false || maxBackoffMs < 0) {
        throw new AstGarbageCollectionTriggerError(
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.INVALID_MAX_BACKOFF_MS,
            {
                maxBackoffMs,
            },
        )
    }

    return maxBackoffMs
}

/**
 * Normalizes one memory sample.
 *
 * @param sample Raw memory sample.
 * @param now Clock function for fallback timestamp.
 * @returns Normalized memory sample.
 */
function normalizeSample(
    sample: IAstGarbageCollectionMemorySample,
    now: AstGarbageCollectionTriggerNow,
): IAstGarbageCollectionNormalizedSample {
    const usedBytes = validateUsedBytes(sample.usedBytes)
    const totalBytes = validateTotalBytes(sample.totalBytes)

    if (usedBytes > totalBytes) {
        throw new AstGarbageCollectionTriggerError(
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.INVALID_USED_BYTES,
            {
                usedBytes,
            },
        )
    }

    return {
        usedBytes,
        totalBytes,
        sampleId: normalizeSampleId(sample.sampleId),
        sampledAt: sample.sampledAt ?? now(),
    }
}

/**
 * Validates used bytes value.
 *
 * @param usedBytes Raw used bytes value.
 * @returns Validated used bytes value.
 */
function validateUsedBytes(usedBytes: number): number {
    if (Number.isSafeInteger(usedBytes) === false || usedBytes < 0) {
        throw new AstGarbageCollectionTriggerError(
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.INVALID_USED_BYTES,
            {
                usedBytes,
            },
        )
    }

    return usedBytes
}

/**
 * Validates total bytes value.
 *
 * @param totalBytes Raw total bytes value.
 * @returns Validated total bytes value.
 */
function validateTotalBytes(totalBytes: number): number {
    if (Number.isSafeInteger(totalBytes) === false || totalBytes < 1) {
        throw new AstGarbageCollectionTriggerError(
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.INVALID_TOTAL_BYTES,
            {
                totalBytes,
            },
        )
    }

    return totalBytes
}

/**
 * Normalizes sample id.
 *
 * @param sampleId Optional sample id.
 * @returns Trimmed sample id or undefined.
 */
function normalizeSampleId(sampleId: string | undefined): string | undefined {
    if (sampleId === undefined) {
        return undefined
    }

    const normalized = sampleId.trim()
    return normalized.length > 0 ? normalized : undefined
}

/**
 * Checks whether sample id is duplicated against last accepted sample id.
 *
 * @param sampleId Current sample id.
 * @param lastSampleId Last accepted sample id.
 * @returns True when sample id is duplicate.
 */
function isDuplicateSample(sampleId: string | undefined, lastSampleId: string | null): boolean {
    return sampleId !== undefined && sampleId === lastSampleId
}

/**
 * Calculates memory utilization percent.
 *
 * @param usedBytes Used bytes.
 * @param totalBytes Total bytes.
 * @returns Utilization percent rounded to two digits.
 */
function calculateUtilizationPercent(usedBytes: number, totalBytes: number): number {
    const rawPercent = (usedBytes / totalBytes) * 100
    return Math.round(rawPercent * 100) / 100
}

/**
 * Resolves exponential backoff duration.
 *
 * @param initialBackoffMs Initial backoff in milliseconds.
 * @param maxBackoffMs Max backoff in milliseconds.
 * @param attempt Attempt number.
 * @returns Backoff duration in milliseconds.
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

    return "Unknown garbage collection trigger failure"
}

/**
 * Checks whether error represents sample validation failure.
 *
 * @param error Unknown failure value.
 * @returns True when error is a sample validation error.
 */
function isSampleValidationError(error: unknown): boolean {
    if ((error instanceof AstGarbageCollectionTriggerError) === false) {
        return false
    }

    return (
        error.code === AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.INVALID_USED_BYTES ||
        error.code === AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.INVALID_TOTAL_BYTES
    )
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
 * Reads process memory snapshot.
 *
 * @returns Memory usage sample.
 */
function defaultSnapshotProvider(): Promise<IAstGarbageCollectionMemorySample> {
    const usage = process.memoryUsage()
    return Promise.resolve({
        usedBytes: usage.heapUsed,
        totalBytes: usage.heapTotal,
    })
}

/**
 * Invokes runtime garbage collector.
 *
 * @returns Promise resolved after GC invocation.
 */
function defaultGcInvoker(): Promise<void> {
    if (typeof globalThis.gc !== "function") {
        return Promise.reject(new Error("globalThis.gc is not available"))
    }

    globalThis.gc()
    return Promise.resolve()
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
