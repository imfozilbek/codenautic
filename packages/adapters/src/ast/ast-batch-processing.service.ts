import {availableParallelism, cpus} from "node:os"

import {
    AST_BATCH_PROCESSING_ERROR_CODE,
    AstBatchProcessingError,
} from "./ast-batch-processing.error"

const DEFAULT_SMALL_INPUT_THRESHOLD = 1_000
const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_INITIAL_BACKOFF_MS = 50
const DEFAULT_MAX_BACKOFF_MS = 1_000
const DEFAULT_FAST_DURATION_PER_ITEM_MS = 2
const DEFAULT_SLOW_DURATION_PER_ITEM_MS = 10
const DEFAULT_GROWTH_FACTOR = 1.5
const DEFAULT_SHRINK_FACTOR = 0.5

/**
 * Sleep function used by retry/backoff logic.
 */
export type AstBatchProcessingSleep = (durationMs: number) => Promise<void>

/**
 * Clock function used by adaptive sizing metrics.
 */
export type AstBatchProcessingNow = () => number

/**
 * Retry decision callback for one failed batch attempt.
 */
export type AstBatchProcessingShouldRetry = (error: unknown, attempt: number) => boolean

/**
 * Retry policy for batch execution.
 */
export interface IAstBatchProcessingRetryPolicy {
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
     * Optional callback to classify retryable failures.
     */
    readonly shouldRetry?: AstBatchProcessingShouldRetry
}

/**
 * Input payload for adaptive batch processing.
 */
export interface IAstBatchProcessingInput<TItem, TResult> {
    /**
     * Ordered items to process.
     */
    readonly items: readonly TItem[]

    /**
     * Batch processor callback.
     */
    readonly processor: (
        batch: readonly TItem[],
        batchIndex: number,
    ) => Promise<readonly TResult[]>

    /**
     * Optional stable key for in-flight idempotency deduplication.
     */
    readonly idempotencyKey?: string

    /**
     * Optional per-run retry policy override.
     */
    readonly retryPolicy?: IAstBatchProcessingRetryPolicy
}

/**
 * Runtime summary of one adaptive batch processing run.
 */
export interface IAstBatchProcessingSummary {
    /**
     * Number of items provided in input.
     */
    readonly totalItemCount: number

    /**
     * Number of processed items.
     */
    readonly processedItemCount: number

    /**
     * Number of executed batches.
     */
    readonly batchCount: number

    /**
     * Initial configured batch size.
     */
    readonly initialBatchSize: number

    /**
     * Final planned batch size after adaptive adjustments.
     */
    readonly finalBatchSize: number

    /**
     * Maximum executed batch size.
     */
    readonly maxBatchSizeUsed: number

    /**
     * Minimum executed batch size.
     */
    readonly minBatchSizeUsed: number

    /**
     * Number of times adaptive sizing increased batch size.
     */
    readonly increasedBatchCount: number

    /**
     * Number of times adaptive sizing decreased batch size.
     */
    readonly decreasedBatchCount: number

    /**
     * Total number of retry attempts across all batches.
     */
    readonly retriedBatchCount: number

    /**
     * Total processing duration in milliseconds.
     */
    readonly totalDurationMs: number
}

/**
 * Result payload for adaptive batch processing.
 */
export interface IAstBatchProcessingResult<TResult> {
    /**
     * Flattened batch processor outputs.
     */
    readonly results: readonly TResult[]

    /**
     * Aggregated runtime summary.
     */
    readonly summary: IAstBatchProcessingSummary
}

/**
 * Runtime options for adaptive batch processing service.
 */
export interface IAstBatchProcessingServiceOptions {
    /**
     * Optional CPU count override.
     */
    readonly cpuCount?: number

    /**
     * Optional threshold considered "small" input.
     */
    readonly smallInputThreshold?: number

    /**
     * Optional minimum adaptive batch size.
     */
    readonly minBatchSize?: number

    /**
     * Optional maximum adaptive batch size.
     */
    readonly maxBatchSize?: number

    /**
     * Optional fast duration threshold in milliseconds per item.
     */
    readonly fastDurationPerItemMs?: number

    /**
     * Optional slow duration threshold in milliseconds per item.
     */
    readonly slowDurationPerItemMs?: number

    /**
     * Optional flag enabling adaptive sizing.
     */
    readonly enableAdaptiveSizing?: boolean

    /**
     * Optional default retry policy.
     */
    readonly defaultRetryPolicy?: IAstBatchProcessingRetryPolicy

    /**
     * Optional sleep override for retry/backoff.
     */
    readonly sleep?: AstBatchProcessingSleep

    /**
     * Optional clock override for deterministic timing.
     */
    readonly now?: AstBatchProcessingNow
}

/**
 * Adaptive batch processing contract.
 */
export interface IAstBatchProcessingService {
    /**
     * Processes ordered items in adaptive batches.
     *
     * @param input Batch processing input.
     * @returns Flattened results and runtime summary.
     */
    process<TItem, TResult>(
        input: IAstBatchProcessingInput<TItem, TResult>,
    ): Promise<IAstBatchProcessingResult<TResult>>
}

interface IAstBatchProcessingNormalizedRetryPolicy {
    readonly maxAttempts: number
    readonly initialBackoffMs: number
    readonly maxBackoffMs: number
    readonly shouldRetry: AstBatchProcessingShouldRetry
}

interface IAstBatchExecutionResult<TResult> {
    readonly results: readonly TResult[]
    readonly retryCount: number
}

interface IResolvedAstBatchProcessingServiceConfig {
    readonly cpuCount: number
    readonly smallInputThreshold: number
    readonly minBatchSize: number
    readonly maxBatchSize: number
    readonly fastDurationPerItemMs: number
    readonly slowDurationPerItemMs: number
    readonly enableAdaptiveSizing: boolean
    readonly defaultRetryPolicy: IAstBatchProcessingNormalizedRetryPolicy
    readonly sleep: AstBatchProcessingSleep
    readonly now: AstBatchProcessingNow
}

/**
 * Implements adaptive batch sizing for AST worker infrastructure.
 */
export class AstBatchProcessingService implements IAstBatchProcessingService {
    private readonly cpuCount: number
    private readonly smallInputThreshold: number
    private readonly minBatchSize: number
    private readonly maxBatchSize: number
    private readonly fastDurationPerItemMs: number
    private readonly slowDurationPerItemMs: number
    private readonly enableAdaptiveSizing: boolean
    private readonly defaultRetryPolicy: IAstBatchProcessingNormalizedRetryPolicy
    private readonly sleep: AstBatchProcessingSleep
    private readonly now: AstBatchProcessingNow
    private readonly inFlightByIdempotencyKey = new Map<string, Promise<unknown>>()

    /**
     * Creates adaptive batch processing service.
     *
     * @param options Optional runtime configuration.
     */
    public constructor(options: IAstBatchProcessingServiceOptions = {}) {
        const config = resolveAstBatchProcessingServiceConfig(options)

        this.cpuCount = config.cpuCount
        this.smallInputThreshold = config.smallInputThreshold
        this.minBatchSize = config.minBatchSize
        this.maxBatchSize = config.maxBatchSize
        this.fastDurationPerItemMs = config.fastDurationPerItemMs
        this.slowDurationPerItemMs = config.slowDurationPerItemMs
        this.enableAdaptiveSizing = config.enableAdaptiveSizing
        this.defaultRetryPolicy = config.defaultRetryPolicy
        this.sleep = config.sleep
        this.now = config.now
    }

    /**
     * Processes ordered items in adaptive batches.
     *
     * @param input Batch processing input.
     * @returns Flattened results and runtime summary.
     */
    public process<TItem, TResult>(
        input: IAstBatchProcessingInput<TItem, TResult>,
    ): Promise<IAstBatchProcessingResult<TResult>> {
        if (input.items.length === 0) {
            throw new AstBatchProcessingError(AST_BATCH_PROCESSING_ERROR_CODE.EMPTY_ITEMS)
        }

        if (typeof input.processor !== "function") {
            throw new AstBatchProcessingError(
                AST_BATCH_PROCESSING_ERROR_CODE.INVALID_PROCESSOR,
            )
        }

        const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey)
        const existingRun = this.findInFlightRun<TResult>(idempotencyKey)

        if (existingRun !== undefined) {
            return existingRun
        }

        const retryPolicy = mergeRetryPolicy(input.retryPolicy, this.defaultRetryPolicy)
        const runPromise = this.executeRun(input.items, input.processor, retryPolicy)
        this.trackInFlightRun(idempotencyKey, runPromise)
        return runPromise
    }

    /**
     * Executes one adaptive batch-processing run.
     *
     * @param items Ordered items.
     * @param processor Batch processor callback.
     * @param retryPolicy Normalized retry policy.
     * @returns Flattened results and summary.
     */
    private async executeRun<TItem, TResult>(
        items: readonly TItem[],
        processor: (
            batch: readonly TItem[],
            batchIndex: number,
        ) => Promise<readonly TResult[]>,
        retryPolicy: IAstBatchProcessingNormalizedRetryPolicy,
    ): Promise<IAstBatchProcessingResult<TResult>> {
        const totalStartedAt = this.now()
        const collectedResults: TResult[] = []
        let cursor = 0
        let batchIndex = 0
        let increasedBatchCount = 0
        let decreasedBatchCount = 0
        let retriedBatchCount = 0
        let batchSize = this.resolveInitialBatchSize(items.length)
        let maxBatchSizeUsed = 0
        let minBatchSizeUsed = Number.MAX_SAFE_INTEGER

        while (cursor < items.length) {
            const batchItems = items.slice(cursor, cursor + batchSize)
            const batchStartedAt = this.now()
            const batchExecution = await this.executeBatchWithRetry(
                batchItems,
                batchIndex,
                processor,
                retryPolicy,
            )
            const durationMs = Math.max(0, this.now() - batchStartedAt)

            retriedBatchCount += batchExecution.retryCount
            collectedResults.push(...batchExecution.results)
            maxBatchSizeUsed = Math.max(maxBatchSizeUsed, batchItems.length)
            minBatchSizeUsed = Math.min(minBatchSizeUsed, batchItems.length)

            cursor += batchItems.length
            batchIndex += 1

            if (cursor < items.length && this.enableAdaptiveSizing) {
                const nextBatchSize = this.resolveAdaptiveBatchSize(batchSize, batchItems.length, durationMs)

                if (nextBatchSize > batchSize) {
                    increasedBatchCount += 1
                } else if (nextBatchSize < batchSize) {
                    decreasedBatchCount += 1
                }

                batchSize = nextBatchSize
            }
        }

        return {
            results: collectedResults,
            summary: {
                totalItemCount: items.length,
                processedItemCount: cursor,
                batchCount: batchIndex,
                initialBatchSize: this.resolveInitialBatchSize(items.length),
                finalBatchSize: batchSize,
                maxBatchSizeUsed,
                minBatchSizeUsed: minBatchSizeUsed === Number.MAX_SAFE_INTEGER ? 0 : minBatchSizeUsed,
                increasedBatchCount,
                decreasedBatchCount,
                retriedBatchCount,
                totalDurationMs: Math.max(0, this.now() - totalStartedAt),
            },
        }
    }

    /**
     * Executes one batch with bounded retry/backoff.
     *
     * @param batchItems Batch items.
     * @param batchIndex Zero-based batch index.
     * @param processor Batch processor callback.
     * @param retryPolicy Normalized retry policy.
     * @returns Batch execution result and retry count.
     */
    private async executeBatchWithRetry<TItem, TResult>(
        batchItems: readonly TItem[],
        batchIndex: number,
        processor: (
            batch: readonly TItem[],
            batchIndex: number,
        ) => Promise<readonly TResult[]>,
        retryPolicy: IAstBatchProcessingNormalizedRetryPolicy,
    ): Promise<IAstBatchExecutionResult<TResult>> {
        let attempt = 1
        let retryCount = 0

        while (attempt <= retryPolicy.maxAttempts) {
            try {
                const batchResults = await processor(batchItems, batchIndex)

                if (Array.isArray(batchResults) === false) {
                    throw new Error("Batch processor must return an array result")
                }

                return {
                    results: batchResults,
                    retryCount,
                }
            } catch (error) {
                const shouldRetry =
                    attempt < retryPolicy.maxAttempts &&
                    retryPolicy.shouldRetry(error, attempt)

                if (shouldRetry === false) {
                    throw new AstBatchProcessingError(
                        AST_BATCH_PROCESSING_ERROR_CODE.BATCH_PROCESSING_FAILED,
                        {
                            attempts: attempt,
                            batchIndex,
                            reason: normalizeErrorReason(error),
                        },
                    )
                }

                retryCount += 1
                await this.sleep(
                    computeBackoffDuration(
                        attempt,
                        retryPolicy.initialBackoffMs,
                        retryPolicy.maxBackoffMs,
                    ),
                )
                attempt += 1
            }
        }

        throw new AstBatchProcessingError(AST_BATCH_PROCESSING_ERROR_CODE.BATCH_PROCESSING_FAILED, {
            attempts: retryPolicy.maxAttempts,
            batchIndex,
            reason: "Retry loop exhausted unexpectedly",
        })
    }

    /**
     * Resolves initial batch size for one run.
     *
     * @param itemCount Total item count.
     * @returns Initial batch size.
     */
    private resolveInitialBatchSize(itemCount: number): number {
        const seedSize = itemCount < this.smallInputThreshold ? this.cpuCount * 2 : this.cpuCount
        return clampBatchSize(seedSize, this.minBatchSize, this.maxBatchSize)
    }

    /**
     * Resolves next batch size according to execution speed.
     *
     * @param currentBatchSize Current planned batch size.
     * @param processedBatchSize Processed batch size.
     * @param durationMs Batch execution duration.
     * @returns Next planned batch size.
     */
    private resolveAdaptiveBatchSize(
        currentBatchSize: number,
        processedBatchSize: number,
        durationMs: number,
    ): number {
        if (processedBatchSize === 0) {
            return currentBatchSize
        }

        const durationPerItem = durationMs / processedBatchSize

        if (durationPerItem <= this.fastDurationPerItemMs) {
            return clampBatchSize(
                Math.floor(currentBatchSize * DEFAULT_GROWTH_FACTOR),
                this.minBatchSize,
                this.maxBatchSize,
            )
        }

        if (durationPerItem >= this.slowDurationPerItemMs) {
            return clampBatchSize(
                Math.floor(currentBatchSize * DEFAULT_SHRINK_FACTOR),
                this.minBatchSize,
                this.maxBatchSize,
            )
        }

        return currentBatchSize
    }

    /**
     * Registers in-flight idempotency mapping.
     *
     * @param idempotencyKey Optional idempotency key.
     * @param runPromise In-flight run promise.
     */
    private trackInFlightRun<TResult>(
        idempotencyKey: string | undefined,
        runPromise: Promise<IAstBatchProcessingResult<TResult>>,
    ): void {
        if (idempotencyKey === undefined) {
            return
        }

        this.inFlightByIdempotencyKey.set(idempotencyKey, runPromise)
        void runPromise.finally(() => {
            const inFlightRun = this.inFlightByIdempotencyKey.get(idempotencyKey)

            if (inFlightRun === runPromise) {
                this.inFlightByIdempotencyKey.delete(idempotencyKey)
            }
        })
    }

    /**
     * Looks up in-flight run by idempotency key.
     *
     * @param idempotencyKey Optional idempotency key.
     * @returns Existing in-flight run promise.
     */
    private findInFlightRun<TResult>(
        idempotencyKey: string | undefined,
    ): Promise<IAstBatchProcessingResult<TResult>> | undefined {
        if (idempotencyKey === undefined) {
            return undefined
        }

        const existingRun = this.inFlightByIdempotencyKey.get(idempotencyKey)

        if (existingRun === undefined) {
            return undefined
        }

        return existingRun as Promise<IAstBatchProcessingResult<TResult>>
    }
}

/**
 * Resolves CPU count from local runtime.
 *
 * @returns Runtime CPU count.
 */
function detectCpuCount(): number {
    try {
        return availableParallelism()
    } catch {
        return cpus().length
    }
}

/**
 * Resolves validated service configuration from raw options.
 *
 * @param options Raw service options.
 * @returns Validated service configuration.
 */
function resolveAstBatchProcessingServiceConfig(
    options: IAstBatchProcessingServiceOptions,
): IResolvedAstBatchProcessingServiceConfig {
    const cpuCount = validateCpuCount(options.cpuCount ?? detectCpuCount())
    const smallInputThreshold = validateSmallInputThreshold(
        options.smallInputThreshold ?? DEFAULT_SMALL_INPUT_THRESHOLD,
    )
    const minBatchSize = validateMinBatchSize(options.minBatchSize ?? cpuCount)
    const maxBatchSize = validateMaxBatchSize(options.maxBatchSize ?? cpuCount * 8, minBatchSize)
    const fastDurationPerItemMs = validateFastDurationPerItemMs(
        options.fastDurationPerItemMs ?? DEFAULT_FAST_DURATION_PER_ITEM_MS,
    )
    const slowDurationPerItemMs = validateSlowDurationPerItemMs(
        options.slowDurationPerItemMs ?? DEFAULT_SLOW_DURATION_PER_ITEM_MS,
        fastDurationPerItemMs,
    )

    return {
        cpuCount,
        smallInputThreshold,
        minBatchSize,
        maxBatchSize,
        fastDurationPerItemMs,
        slowDurationPerItemMs,
        enableAdaptiveSizing: options.enableAdaptiveSizing ?? true,
        defaultRetryPolicy: normalizeRetryPolicy(options.defaultRetryPolicy),
        sleep: options.sleep ?? sleepFor,
        now: options.now ?? Date.now,
    }
}

/**
 * Validates CPU count input.
 *
 * @param cpuCount Raw CPU count.
 * @returns Validated CPU count.
 */
function validateCpuCount(cpuCount: number): number {
    if (Number.isSafeInteger(cpuCount) === false || cpuCount < 1) {
        throw new AstBatchProcessingError(AST_BATCH_PROCESSING_ERROR_CODE.INVALID_CPU_COUNT, {
            cpuCount,
        })
    }

    return cpuCount
}

/**
 * Validates small-input threshold.
 *
 * @param smallInputThreshold Raw small-input threshold.
 * @returns Validated threshold.
 */
function validateSmallInputThreshold(smallInputThreshold: number): number {
    if (Number.isSafeInteger(smallInputThreshold) === false || smallInputThreshold < 1) {
        throw new AstBatchProcessingError(
            AST_BATCH_PROCESSING_ERROR_CODE.INVALID_SMALL_INPUT_THRESHOLD,
            {
                smallInputThreshold,
            },
        )
    }

    return smallInputThreshold
}

/**
 * Validates minimum batch size.
 *
 * @param minBatchSize Raw min batch size.
 * @returns Validated min batch size.
 */
function validateMinBatchSize(minBatchSize: number): number {
    if (Number.isSafeInteger(minBatchSize) === false || minBatchSize < 1) {
        throw new AstBatchProcessingError(
            AST_BATCH_PROCESSING_ERROR_CODE.INVALID_MIN_BATCH_SIZE,
            {
                minBatchSize,
            },
        )
    }

    return minBatchSize
}

/**
 * Validates maximum batch size.
 *
 * @param maxBatchSize Raw max batch size.
 * @param minBatchSize Validated minimum batch size.
 * @returns Validated max batch size.
 */
function validateMaxBatchSize(maxBatchSize: number, minBatchSize: number): number {
    if (Number.isSafeInteger(maxBatchSize) === false || maxBatchSize < minBatchSize) {
        throw new AstBatchProcessingError(
            AST_BATCH_PROCESSING_ERROR_CODE.INVALID_MAX_BATCH_SIZE,
            {
                maxBatchSize,
            },
        )
    }

    return maxBatchSize
}

/**
 * Validates fast-duration threshold.
 *
 * @param fastDurationPerItemMs Raw fast threshold.
 * @returns Validated fast threshold.
 */
function validateFastDurationPerItemMs(fastDurationPerItemMs: number): number {
    if (Number.isFinite(fastDurationPerItemMs) === false || fastDurationPerItemMs < 0) {
        throw new AstBatchProcessingError(
            AST_BATCH_PROCESSING_ERROR_CODE.INVALID_FAST_DURATION_PER_ITEM_MS,
            {
                fastDurationPerItemMs,
            },
        )
    }

    return fastDurationPerItemMs
}

/**
 * Validates slow-duration threshold.
 *
 * @param slowDurationPerItemMs Raw slow threshold.
 * @param fastDurationPerItemMs Validated fast threshold.
 * @returns Validated slow threshold.
 */
function validateSlowDurationPerItemMs(
    slowDurationPerItemMs: number,
    fastDurationPerItemMs: number,
): number {
    if (
        Number.isFinite(slowDurationPerItemMs) === false ||
        slowDurationPerItemMs < fastDurationPerItemMs
    ) {
        throw new AstBatchProcessingError(
            AST_BATCH_PROCESSING_ERROR_CODE.INVALID_SLOW_DURATION_PER_ITEM_MS,
            {
                slowDurationPerItemMs,
            },
        )
    }

    return slowDurationPerItemMs
}

/**
 * Normalizes retry policy with defaults.
 *
 * @param retryPolicy Optional retry policy.
 * @returns Normalized retry policy.
 */
function normalizeRetryPolicy(
    retryPolicy: IAstBatchProcessingRetryPolicy | undefined,
): IAstBatchProcessingNormalizedRetryPolicy {
    const maxAttempts = validateMaxAttempts(retryPolicy?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS)
    const initialBackoffMs = validateInitialBackoffMs(
        retryPolicy?.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS,
    )
    const maxBackoffMs = validateMaxBackoffMs(retryPolicy?.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS)

    if (maxBackoffMs < initialBackoffMs) {
        throw new AstBatchProcessingError(
            AST_BATCH_PROCESSING_ERROR_CODE.INVALID_MAX_BACKOFF_MS,
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
 * Merges run-level retry policy with service defaults.
 *
 * @param override Optional run-level retry policy.
 * @param fallback Service default policy.
 * @returns Normalized retry policy.
 */
function mergeRetryPolicy(
    override: IAstBatchProcessingRetryPolicy | undefined,
    fallback: IAstBatchProcessingNormalizedRetryPolicy,
): IAstBatchProcessingNormalizedRetryPolicy {
    if (override === undefined) {
        return fallback
    }

    return normalizeRetryPolicy({
        maxAttempts: override.maxAttempts ?? fallback.maxAttempts,
        initialBackoffMs: override.initialBackoffMs ?? fallback.initialBackoffMs,
        maxBackoffMs: override.maxBackoffMs ?? fallback.maxBackoffMs,
        shouldRetry: override.shouldRetry ?? fallback.shouldRetry,
    })
}

/**
 * Validates max-attempt value.
 *
 * @param maxAttempts Raw max-attempt value.
 * @returns Validated max-attempt value.
 */
function validateMaxAttempts(maxAttempts: number): number {
    if (Number.isSafeInteger(maxAttempts) === false || maxAttempts < 1) {
        throw new AstBatchProcessingError(AST_BATCH_PROCESSING_ERROR_CODE.INVALID_MAX_ATTEMPTS, {
            maxAttempts,
        })
    }

    return maxAttempts
}

/**
 * Validates initial-backoff value.
 *
 * @param initialBackoffMs Raw initial-backoff value.
 * @returns Validated initial-backoff value.
 */
function validateInitialBackoffMs(initialBackoffMs: number): number {
    if (Number.isSafeInteger(initialBackoffMs) === false || initialBackoffMs < 0) {
        throw new AstBatchProcessingError(
            AST_BATCH_PROCESSING_ERROR_CODE.INVALID_INITIAL_BACKOFF_MS,
            {
                initialBackoffMs,
            },
        )
    }

    return initialBackoffMs
}

/**
 * Validates max-backoff value.
 *
 * @param maxBackoffMs Raw max-backoff value.
 * @returns Validated max-backoff value.
 */
function validateMaxBackoffMs(maxBackoffMs: number): number {
    if (Number.isSafeInteger(maxBackoffMs) === false || maxBackoffMs < 0) {
        throw new AstBatchProcessingError(
            AST_BATCH_PROCESSING_ERROR_CODE.INVALID_MAX_BACKOFF_MS,
            {
                maxBackoffMs,
            },
        )
    }

    return maxBackoffMs
}

/**
 * Computes exponential backoff duration.
 *
 * @param attempt Current attempt number.
 * @param initialBackoffMs Initial backoff.
 * @param maxBackoffMs Max backoff.
 * @returns Backoff duration in milliseconds.
 */
function computeBackoffDuration(
    attempt: number,
    initialBackoffMs: number,
    maxBackoffMs: number,
): number {
    const exponent = Math.max(0, attempt - 1)
    const scaledBackoff = initialBackoffMs * 2 ** exponent
    return Math.min(maxBackoffMs, scaledBackoff)
}

/**
 * Clamps batch size into configured boundaries.
 *
 * @param batchSize Raw batch size.
 * @param minBatchSize Minimum allowed batch size.
 * @param maxBatchSize Maximum allowed batch size.
 * @returns Clamped batch size.
 */
function clampBatchSize(batchSize: number, minBatchSize: number, maxBatchSize: number): number {
    return Math.min(maxBatchSize, Math.max(minBatchSize, batchSize))
}

/**
 * Normalizes optional idempotency key.
 *
 * @param idempotencyKey Optional key.
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
 * Normalizes unknown error into stable reason string.
 *
 * @param error Unknown thrown value.
 * @returns Stable reason string.
 */
function normalizeErrorReason(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    if (typeof error === "string") {
        return error
    }

    return "Unknown error"
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
