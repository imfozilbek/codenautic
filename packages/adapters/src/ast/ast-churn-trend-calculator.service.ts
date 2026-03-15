import {FilePath} from "@codenautic/core"

import {
    AST_CHURN_TREND_CALCULATOR_ERROR_CODE,
    AstChurnTrendCalculatorError,
} from "./ast-churn-trend-calculator.error"

const DEFAULT_WINDOW_SIZES: readonly number[] = [3, 5, 8]
const DEFAULT_ACCELERATION_THRESHOLD = 0.15
const DEFAULT_DECELERATION_THRESHOLD = -0.15
const DEFAULT_MAX_LOAD_ATTEMPTS = 2
const DEFAULT_RETRY_BACKOFF_MS = 25
const DEFAULT_CACHE_TTL_MS = 15000
const TREND_RATIO_PRECISION = 6

/**
 * Churn trend direction labels.
 */
export const AST_CHURN_TREND_DIRECTION = {
    ACCELERATING: "ACCELERATING",
    DECELERATING: "DECELERATING",
    STABLE: "STABLE",
} as const

/**
 * Churn trend direction literal.
 */
export type AstChurnTrendDirection =
    (typeof AST_CHURN_TREND_DIRECTION)[keyof typeof AST_CHURN_TREND_DIRECTION]

interface INormalizedChurnTrendSample {
    readonly filePath: string
    readonly churn: number
    readonly observedAt: string
    readonly observedAtMs: number
}

interface IResolvedChurnTrendInput {
    readonly filePaths: readonly string[]
    readonly samples: readonly INormalizedChurnTrendSample[]
    readonly windowSizes: readonly number[]
    readonly accelerationThreshold: number
    readonly decelerationThreshold: number
}

interface IChurnTrendCacheEntry {
    readonly expiresAt: number
    readonly value: IAstChurnTrendCalculatorResult
}

interface ILoadedSamplesCacheEntry {
    readonly expiresAt: number
    readonly value: readonly IAstChurnTrendSample[]
}

/**
 * Source sample payload used by churn trend calculator.
 */
export interface IAstChurnTrendSample {
    /**
     * Repository-relative file path.
     */
    readonly filePath: string

    /**
     * Churn value for one observation.
     */
    readonly churn: number

    /**
     * Observation timestamp in ISO 8601 format.
     */
    readonly observedAt: string
}

/**
 * Rolling average metric for one configured window.
 */
export interface IAstChurnRollingAverage {
    /**
     * Rolling window size in observations.
     */
    readonly windowSize: number

    /**
     * Number of samples used for this average.
     */
    readonly sampleCount: number

    /**
     * Rolling average value.
     */
    readonly average: number
}

/**
 * Trend payload for one file path.
 */
export interface IAstChurnFileTrend {
    /**
     * Repository-relative file path.
     */
    readonly filePath: string

    /**
     * Number of normalized samples for the file.
     */
    readonly sampleCount: number

    /**
     * Latest churn value for the file.
     */
    readonly latestChurn: number

    /**
     * Average churn in shortest configured window.
     */
    readonly shortWindowAverage: number

    /**
     * Average churn in longest configured window.
     */
    readonly longWindowAverage: number

    /**
     * Absolute change between short and long window averages.
     */
    readonly changeDelta: number

    /**
     * Relative change ratio used to classify trend direction.
     */
    readonly changeRatio: number

    /**
     * Classified trend direction for file churn.
     */
    readonly direction: AstChurnTrendDirection

    /**
     * Rolling average metrics by configured windows.
     */
    readonly rollingAverages: readonly IAstChurnRollingAverage[]
}

/**
 * Churn trend summary payload.
 */
export interface IAstChurnTrendCalculatorSummary {
    /**
     * Number of processed files.
     */
    readonly fileCount: number

    /**
     * Number of accelerating files.
     */
    readonly acceleratingCount: number

    /**
     * Number of decelerating files.
     */
    readonly deceleratingCount: number

    /**
     * Number of stable files.
     */
    readonly stableCount: number

    /**
     * Average absolute delta between short and long windows.
     */
    readonly averageChangeDelta: number

    /**
     * Average relative ratio between short and long windows.
     */
    readonly averageChangeRatio: number

    /**
     * Configured rolling window sizes.
     */
    readonly windowSizes: readonly number[]

    /**
     * Configured acceleration threshold.
     */
    readonly accelerationThreshold: number

    /**
     * Configured deceleration threshold.
     */
    readonly decelerationThreshold: number

    /**
     * ISO timestamp when summary was generated.
     */
    readonly generatedAt: string
}

/**
 * Output payload for churn trend calculation.
 */
export interface IAstChurnTrendCalculatorResult {
    /**
     * File-level trend items.
     */
    readonly items: readonly IAstChurnFileTrend[]

    /**
     * Aggregated trend summary.
     */
    readonly summary: IAstChurnTrendCalculatorSummary
}

/**
 * Optional loader callback for churn trend samples.
 */
export type AstChurnTrendCalculatorLoadSamples = (
    filePaths: readonly string[],
) => Promise<readonly IAstChurnTrendSample[]>

/**
 * Deterministic clock callback.
 */
export type AstChurnTrendCalculatorNow = () => number

/**
 * Sleep callback used by retry backoff.
 */
export type AstChurnTrendCalculatorSleep = (milliseconds: number) => Promise<void>

/**
 * Input payload for churn trend calculation.
 */
export interface IAstChurnTrendCalculatorInput {
    /**
     * Explicit sample payload. When omitted, `loadSamples` callback is used.
     */
    readonly samples?: readonly IAstChurnTrendSample[]

    /**
     * Optional file path filter used to limit trend calculation.
     */
    readonly filePaths?: readonly string[]

    /**
     * Optional custom rolling windows.
     */
    readonly windowSizes?: readonly number[]

    /**
     * Optional custom acceleration threshold.
     */
    readonly accelerationThreshold?: number

    /**
     * Optional custom deceleration threshold.
     */
    readonly decelerationThreshold?: number
}

/**
 * Runtime options for churn trend calculator.
 */
export interface IAstChurnTrendCalculatorServiceOptions {
    /**
     * Optional source sample loader callback.
     */
    readonly loadSamples?: AstChurnTrendCalculatorLoadSamples

    /**
     * Optional default rolling windows.
     */
    readonly defaultWindowSizes?: readonly number[]

    /**
     * Optional default acceleration threshold.
     */
    readonly defaultAccelerationThreshold?: number

    /**
     * Optional default deceleration threshold.
     */
    readonly defaultDecelerationThreshold?: number

    /**
     * Optional maximum attempts for `loadSamples`.
     */
    readonly maxLoadAttempts?: number

    /**
     * Optional retry backoff in milliseconds.
     */
    readonly retryBackoffMs?: number

    /**
     * Optional idempotency cache TTL in milliseconds.
     */
    readonly cacheTtlMs?: number

    /**
     * Optional deterministic clock callback.
     */
    readonly now?: AstChurnTrendCalculatorNow

    /**
     * Optional sleep callback for retry backoff.
     */
    readonly sleep?: AstChurnTrendCalculatorSleep
}

/**
 * Churn trend calculator contract.
 */
export interface IAstChurnTrendCalculatorService {
    /**
     * Calculates rolling churn trends and classifies direction per file.
     *
     * @param input Churn trend input payload.
     * @returns Churn trend result.
     */
    calculate(input: IAstChurnTrendCalculatorInput): Promise<IAstChurnTrendCalculatorResult>
}

/**
 * Calculates churn trends by comparing short and long rolling windows.
 */
export class AstChurnTrendCalculatorService implements IAstChurnTrendCalculatorService {
    private readonly loadSamples?: AstChurnTrendCalculatorLoadSamples
    private readonly defaultWindowSizes: readonly number[]
    private readonly defaultAccelerationThreshold: number
    private readonly defaultDecelerationThreshold: number
    private readonly maxLoadAttempts: number
    private readonly retryBackoffMs: number
    private readonly cacheTtlMs: number
    private readonly now: AstChurnTrendCalculatorNow
    private readonly sleep: AstChurnTrendCalculatorSleep
    private readonly inFlight = new Map<string, Promise<IAstChurnTrendCalculatorResult>>()
    private readonly cache = new Map<string, IChurnTrendCacheEntry>()
    private readonly loadedSamplesInFlight = new Map<
        string,
        Promise<readonly IAstChurnTrendSample[]>
    >()
    private readonly loadedSamplesCache = new Map<string, ILoadedSamplesCacheEntry>()

    /**
     * Creates AST churn trend calculator service.
     *
     * @param options Optional runtime overrides.
     */
    public constructor(options: IAstChurnTrendCalculatorServiceOptions = {}) {
        this.loadSamples = validateOptionalLoadSamples(options.loadSamples)
        this.defaultWindowSizes = normalizeWindowSizes(
            options.defaultWindowSizes ?? DEFAULT_WINDOW_SIZES,
        )
        this.defaultAccelerationThreshold = validateAccelerationThreshold(
            options.defaultAccelerationThreshold ?? DEFAULT_ACCELERATION_THRESHOLD,
        )
        this.defaultDecelerationThreshold = validateDecelerationThreshold(
            options.defaultDecelerationThreshold ?? DEFAULT_DECELERATION_THRESHOLD,
        )
        validateThresholdRelation(
            this.defaultAccelerationThreshold,
            this.defaultDecelerationThreshold,
        )
        this.maxLoadAttempts = validateMaxLoadAttempts(
            options.maxLoadAttempts ?? DEFAULT_MAX_LOAD_ATTEMPTS,
        )
        this.retryBackoffMs = validateRetryBackoffMs(
            options.retryBackoffMs ?? DEFAULT_RETRY_BACKOFF_MS,
        )
        this.cacheTtlMs = validateCacheTtlMs(options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS)
        this.now = options.now ?? Date.now
        this.sleep = validateSleep(options.sleep ?? defaultSleep)
    }

    /**
     * Calculates churn trends for provided samples or loaded sample source.
     *
     * @param input Churn trend input payload.
     * @returns Churn trend result.
     */
    public async calculate(
        input: IAstChurnTrendCalculatorInput,
    ): Promise<IAstChurnTrendCalculatorResult> {
        const resolvedInput = await this.resolveInput(input)
        const requestKey = createRequestKey(resolvedInput)
        const now = this.now()
        this.pruneExpiredCache(now)

        const cached = this.cache.get(requestKey)
        if (cached !== undefined && cached.expiresAt > now) {
            return cloneResult(cached.value)
        }

        const existingInFlight = this.inFlight.get(requestKey)
        if (existingInFlight !== undefined) {
            return existingInFlight
        }

        const operation = Promise.resolve(this.calculateFresh(resolvedInput, requestKey))
        this.inFlight.set(requestKey, operation)

        try {
            return await operation
        } finally {
            this.inFlight.delete(requestKey)
        }
    }

    /**
     * Resolves samples and normalizes input payload.
     *
     * @param input Raw churn trend input.
     * @returns Resolved normalized input.
     */
    private async resolveInput(
        input: IAstChurnTrendCalculatorInput,
    ): Promise<IResolvedChurnTrendInput> {
        const filePaths = normalizeOptionalFilePaths(input.filePaths)
        const windowSizes = normalizeWindowSizes(input.windowSizes ?? this.defaultWindowSizes)
        const accelerationThreshold = validateAccelerationThreshold(
            input.accelerationThreshold ?? this.defaultAccelerationThreshold,
        )
        const decelerationThreshold = validateDecelerationThreshold(
            input.decelerationThreshold ?? this.defaultDecelerationThreshold,
        )
        validateThresholdRelation(accelerationThreshold, decelerationThreshold)

        if (input.samples !== undefined) {
            const samples = normalizeSamples(input.samples, filePaths)
            return {
                filePaths: resolveInputFilePaths(filePaths, samples),
                samples,
                windowSizes,
                accelerationThreshold,
                decelerationThreshold,
            }
        }

        const requiredFilePaths = resolveRequiredFilePaths(filePaths)
        const loadedSamples = await this.loadSamplesWithRetry(requiredFilePaths)
        const samples = normalizeSamples(loadedSamples, requiredFilePaths)

        return {
            filePaths: requiredFilePaths,
            samples,
            windowSizes,
            accelerationThreshold,
            decelerationThreshold,
        }
    }

    /**
     * Calculates churn trends from resolved normalized input.
     *
     * @param input Resolved normalized input.
     * @param requestKey Stable cache key.
     * @returns Churn trend result.
     */
    private calculateFresh(
        input: IResolvedChurnTrendInput,
        requestKey: string,
    ): IAstChurnTrendCalculatorResult {
        const groupedSamples = groupSamplesByFilePath(input.samples, input.filePaths)
        const items = input.filePaths.map((filePath): IAstChurnFileTrend => {
            const fileSamples = groupedSamples.get(filePath) ?? []
            return buildFileTrend(
                filePath,
                fileSamples,
                input.windowSizes,
                input.accelerationThreshold,
                input.decelerationThreshold,
            )
        })

        const result: IAstChurnTrendCalculatorResult = {
            items,
            summary: buildSummary(
                items,
                input.windowSizes,
                input.accelerationThreshold,
                input.decelerationThreshold,
                this.now(),
            ),
        }
        const cloned = cloneResult(result)

        this.cache.set(requestKey, {
            value: cloned,
            expiresAt: this.now() + this.cacheTtlMs,
        })

        return cloneResult(cloned)
    }

    /**
     * Loads samples through callback with retry and fixed backoff.
     *
     * @param filePaths Required normalized file paths.
     * @returns Loaded sample payload.
     */
    private async loadSamplesWithRetry(
        filePaths: readonly string[],
    ): Promise<readonly IAstChurnTrendSample[]> {
        const cacheKey = filePaths.join("|")
        const now = this.now()
        this.pruneExpiredLoadedSamplesCache(now)

        const cached = this.loadedSamplesCache.get(cacheKey)
        if (cached !== undefined && cached.expiresAt > now) {
            return cloneSamples(cached.value)
        }

        const existingInFlight = this.loadedSamplesInFlight.get(cacheKey)
        if (existingInFlight !== undefined) {
            return existingInFlight
        }

        const operation = this.loadSamplesWithRetryFresh(filePaths, cacheKey)
        this.loadedSamplesInFlight.set(cacheKey, operation)

        try {
            return await operation
        } finally {
            this.loadedSamplesInFlight.delete(cacheKey)
        }
    }

    /**
     * Loads samples from callback with retry without source cache short-circuit.
     *
     * @param filePaths Required normalized file paths.
     * @param cacheKey Stable file-path cache key.
     * @returns Loaded sample payload.
     */
    private async loadSamplesWithRetryFresh(
        filePaths: readonly string[],
        cacheKey: string,
    ): Promise<readonly IAstChurnTrendSample[]> {
        const loadSamples = validateLoadSamples(this.loadSamples)
        let attempt = 0
        let lastError: unknown = undefined

        while (attempt < this.maxLoadAttempts) {
            attempt += 1

            try {
                const loadedSamples = await loadSamples(filePaths)
                const normalizedLoadedSamples = cloneSamples(loadedSamples)

                this.loadedSamplesCache.set(cacheKey, {
                    value: normalizedLoadedSamples,
                    expiresAt: this.now() + this.cacheTtlMs,
                })

                return cloneSamples(normalizedLoadedSamples)
            } catch (error) {
                lastError = error
            }

            if (attempt < this.maxLoadAttempts && this.retryBackoffMs > 0) {
                await this.sleepOrThrow(attempt, lastError)
            }
        }

        if (this.maxLoadAttempts === 1) {
            throw new AstChurnTrendCalculatorError(
                AST_CHURN_TREND_CALCULATOR_ERROR_CODE.LOAD_SAMPLES_FAILED,
                {
                    attempt,
                    maxLoadAttempts: this.maxLoadAttempts,
                    causeMessage: resolveUnknownErrorMessage(lastError),
                },
            )
        }

        throw new AstChurnTrendCalculatorError(
            AST_CHURN_TREND_CALCULATOR_ERROR_CODE.RETRY_EXHAUSTED,
            {
                attempt,
                maxLoadAttempts: this.maxLoadAttempts,
                causeMessage: resolveUnknownErrorMessage(lastError),
            },
        )
    }

    /**
     * Sleeps between retry attempts with typed error wrapping.
     *
     * @param attempt Current failed attempt.
     * @param lastError Last load error payload.
     * @returns Promise resolved after sleep.
     */
    private async sleepOrThrow(attempt: number, lastError: unknown): Promise<void> {
        try {
            await this.sleep(this.retryBackoffMs)
        } catch (error) {
            throw new AstChurnTrendCalculatorError(
                AST_CHURN_TREND_CALCULATOR_ERROR_CODE.LOAD_SAMPLES_FAILED,
                {
                    attempt,
                    maxLoadAttempts: this.maxLoadAttempts,
                    causeMessage: resolveUnknownErrorMessage(error ?? lastError),
                },
            )
        }
    }

    /**
     * Removes expired cache entries.
     *
     * @param now Current timestamp in milliseconds.
     */
    private pruneExpiredCache(now: number): void {
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiresAt <= now) {
                this.cache.delete(key)
            }
        }
    }

    /**
     * Removes expired source sample cache entries.
     *
     * @param now Current timestamp in milliseconds.
     */
    private pruneExpiredLoadedSamplesCache(now: number): void {
        for (const [key, entry] of this.loadedSamplesCache.entries()) {
            if (entry.expiresAt <= now) {
                this.loadedSamplesCache.delete(key)
            }
        }
    }
}

/**
 * Normalizes optional file path list.
 *
 * @param filePaths Optional raw file path list.
 * @returns Sorted unique normalized file paths or undefined.
 */
function normalizeOptionalFilePaths(
    filePaths: readonly string[] | undefined,
): readonly string[] | undefined {
    if (filePaths === undefined) {
        return undefined
    }

    return normalizeRequiredFilePaths(filePaths)
}

/**
 * Resolves required file paths from optional file path payload.
 *
 * @param filePaths Optional normalized file paths.
 * @returns Required normalized file paths.
 */
function resolveRequiredFilePaths(
    filePaths: readonly string[] | undefined,
): readonly string[] {
    if (filePaths !== undefined) {
        return normalizeRequiredFilePaths(filePaths)
    }

    throw new AstChurnTrendCalculatorError(
        AST_CHURN_TREND_CALCULATOR_ERROR_CODE.EMPTY_FILE_PATHS,
    )
}

/**
 * Normalizes and validates required file path list.
 *
 * @param filePaths Raw file path list.
 * @returns Sorted unique normalized file paths.
 */
function normalizeRequiredFilePaths(filePaths: readonly string[]): readonly string[] {
    if (filePaths.length === 0) {
        throw new AstChurnTrendCalculatorError(
            AST_CHURN_TREND_CALCULATOR_ERROR_CODE.EMPTY_FILE_PATHS,
        )
    }

    const normalized = new Set<string>()
    for (const filePath of filePaths) {
        const normalizedFilePath = normalizeFilePath(filePath)
        if (normalized.has(normalizedFilePath)) {
            throw new AstChurnTrendCalculatorError(
                AST_CHURN_TREND_CALCULATOR_ERROR_CODE.DUPLICATE_FILE_PATH,
                {filePath: normalizedFilePath},
            )
        }

        normalized.add(normalizedFilePath)
    }

    return [...normalized].sort((left, right) => left.localeCompare(right))
}

/**
 * Normalizes one repository-relative file path.
 *
 * @param filePath Raw file path.
 * @returns Normalized file path.
 */
function normalizeFilePath(filePath: string): string {
    try {
        return FilePath.create(filePath).toString()
    } catch {
        throw new AstChurnTrendCalculatorError(
            AST_CHURN_TREND_CALCULATOR_ERROR_CODE.INVALID_SAMPLE_FILE_PATH,
            {filePath},
        )
    }
}

/**
 * Normalizes and validates source samples.
 *
 * @param samples Raw samples payload.
 * @param allowedFilePaths Optional allowed file path list.
 * @returns Sorted normalized sample payload.
 */
function normalizeSamples(
    samples: readonly IAstChurnTrendSample[],
    allowedFilePaths: readonly string[] | undefined,
): readonly INormalizedChurnTrendSample[] {
    if (samples.length === 0) {
        throw new AstChurnTrendCalculatorError(
            AST_CHURN_TREND_CALCULATOR_ERROR_CODE.EMPTY_SAMPLES,
        )
    }

    const allowedSet = allowedFilePaths !== undefined ? new Set<string>(allowedFilePaths) : undefined
    const normalizedSamples: INormalizedChurnTrendSample[] = []

    for (const sample of samples) {
        const filePath = normalizeFilePath(sample.filePath)
        if (allowedSet !== undefined && !allowedSet.has(filePath)) {
            continue
        }

        const churn = normalizeChurn(sample.churn, filePath)
        const observedAt = normalizeObservedAt(sample.observedAt, filePath)

        normalizedSamples.push({
            filePath,
            churn,
            observedAt: observedAt.iso,
            observedAtMs: observedAt.timestamp,
        })
    }

    if (normalizedSamples.length === 0) {
        throw new AstChurnTrendCalculatorError(
            AST_CHURN_TREND_CALCULATOR_ERROR_CODE.EMPTY_SAMPLES,
        )
    }

    return normalizedSamples.sort(compareSamples)
}

/**
 * Compares normalized samples deterministically.
 *
 * @param left Left sample.
 * @param right Right sample.
 * @returns Negative when left should go first.
 */
function compareSamples(
    left: INormalizedChurnTrendSample,
    right: INormalizedChurnTrendSample,
): number {
    if (left.filePath !== right.filePath) {
        return left.filePath.localeCompare(right.filePath)
    }

    if (left.observedAtMs !== right.observedAtMs) {
        return left.observedAtMs - right.observedAtMs
    }

    return left.churn - right.churn
}

/**
 * Normalizes churn numeric value.
 *
 * @param churn Raw churn value.
 * @param filePath File path for diagnostics.
 * @returns Valid normalized churn value.
 */
function normalizeChurn(churn: number, filePath: string): number {
    if (Number.isFinite(churn) && churn >= 0) {
        return churn
    }

    throw new AstChurnTrendCalculatorError(
        AST_CHURN_TREND_CALCULATOR_ERROR_CODE.INVALID_CHURN_VALUE,
        {
            filePath,
            churn,
        },
    )
}

/**
 * Normalizes observedAt timestamp.
 *
 * @param observedAt Raw observedAt payload.
 * @param filePath File path for diagnostics.
 * @returns Normalized observedAt timestamp data.
 */
function normalizeObservedAt(
    observedAt: string,
    filePath: string,
): {
    readonly iso: string
    readonly timestamp: number
} {
    const normalizedObservedAt = observedAt.trim()
    const timestamp = Date.parse(normalizedObservedAt)
    if (!Number.isNaN(timestamp)) {
        return {
            iso: new Date(timestamp).toISOString(),
            timestamp,
        }
    }

    throw new AstChurnTrendCalculatorError(
        AST_CHURN_TREND_CALCULATOR_ERROR_CODE.INVALID_OBSERVED_AT,
        {
            filePath,
            observedAt,
        },
    )
}

/**
 * Resolves input file paths from explicit filter or sample payload.
 *
 * @param explicitFilePaths Optional explicit file path filter.
 * @param samples Normalized samples.
 * @returns Sorted unique file path list.
 */
function resolveInputFilePaths(
    explicitFilePaths: readonly string[] | undefined,
    samples: readonly INormalizedChurnTrendSample[],
): readonly string[] {
    if (explicitFilePaths !== undefined) {
        return explicitFilePaths
    }

    const filePaths = new Set<string>()
    for (const sample of samples) {
        filePaths.add(sample.filePath)
    }

    return [...filePaths].sort((left, right) => left.localeCompare(right))
}

/**
 * Normalizes and validates rolling window sizes.
 *
 * @param windowSizes Raw window size list.
 * @returns Sorted unique window sizes.
 */
function normalizeWindowSizes(windowSizes: readonly number[]): readonly number[] {
    if (windowSizes.length === 0) {
        throw new AstChurnTrendCalculatorError(
            AST_CHURN_TREND_CALCULATOR_ERROR_CODE.INVALID_WINDOW_SIZE,
        )
    }

    const normalizedWindowSizes = new Set<number>()
    for (const windowSize of windowSizes) {
        if (Number.isSafeInteger(windowSize) && windowSize > 0) {
            normalizedWindowSizes.add(windowSize)
            continue
        }

        throw new AstChurnTrendCalculatorError(
            AST_CHURN_TREND_CALCULATOR_ERROR_CODE.INVALID_WINDOW_SIZE,
            {windowSize},
        )
    }

    return [...normalizedWindowSizes].sort((left, right) => left - right)
}

/**
 * Validates acceleration threshold.
 *
 * @param threshold Raw threshold value.
 * @returns Valid acceleration threshold.
 */
function validateAccelerationThreshold(threshold: number): number {
    if (Number.isFinite(threshold) && threshold >= 0) {
        return threshold
    }

    throw new AstChurnTrendCalculatorError(
        AST_CHURN_TREND_CALCULATOR_ERROR_CODE.INVALID_ACCELERATION_THRESHOLD,
        {threshold},
    )
}

/**
 * Validates deceleration threshold.
 *
 * @param threshold Raw threshold value.
 * @returns Valid deceleration threshold.
 */
function validateDecelerationThreshold(threshold: number): number {
    if (Number.isFinite(threshold) && threshold <= 0) {
        return threshold
    }

    throw new AstChurnTrendCalculatorError(
        AST_CHURN_TREND_CALCULATOR_ERROR_CODE.INVALID_DECELERATION_THRESHOLD,
        {threshold},
    )
}

/**
 * Validates threshold relation between acceleration and deceleration values.
 *
 * @param accelerationThreshold Acceleration threshold.
 * @param decelerationThreshold Deceleration threshold.
 */
function validateThresholdRelation(
    accelerationThreshold: number,
    decelerationThreshold: number,
): void {
    if (accelerationThreshold >= decelerationThreshold) {
        return
    }

    throw new AstChurnTrendCalculatorError(
        AST_CHURN_TREND_CALCULATOR_ERROR_CODE.INVALID_THRESHOLD_RELATION,
        {threshold: accelerationThreshold},
    )
}

/**
 * Validates max load attempts option.
 *
 * @param maxLoadAttempts Raw max load attempts.
 * @returns Valid positive integer max attempts.
 */
function validateMaxLoadAttempts(maxLoadAttempts: number): number {
    if (Number.isSafeInteger(maxLoadAttempts) && maxLoadAttempts > 0) {
        return maxLoadAttempts
    }

    throw new AstChurnTrendCalculatorError(
        AST_CHURN_TREND_CALCULATOR_ERROR_CODE.INVALID_MAX_LOAD_ATTEMPTS,
        {maxLoadAttempts},
    )
}

/**
 * Validates retry backoff value.
 *
 * @param retryBackoffMs Raw retry backoff.
 * @returns Valid non-negative integer backoff.
 */
function validateRetryBackoffMs(retryBackoffMs: number): number {
    if (Number.isSafeInteger(retryBackoffMs) && retryBackoffMs >= 0) {
        return retryBackoffMs
    }

    throw new AstChurnTrendCalculatorError(
        AST_CHURN_TREND_CALCULATOR_ERROR_CODE.INVALID_RETRY_BACKOFF_MS,
        {retryBackoffMs},
    )
}

/**
 * Validates cache TTL value.
 *
 * @param cacheTtlMs Raw cache TTL.
 * @returns Valid non-negative integer cache TTL.
 */
function validateCacheTtlMs(cacheTtlMs: number): number {
    if (Number.isSafeInteger(cacheTtlMs) && cacheTtlMs >= 0) {
        return cacheTtlMs
    }

    throw new AstChurnTrendCalculatorError(
        AST_CHURN_TREND_CALCULATOR_ERROR_CODE.INVALID_CACHE_TTL_MS,
        {cacheTtlMs},
    )
}

/**
 * Validates optional loadSamples callback.
 *
 * @param loadSamples Optional callback.
 * @returns Valid callback or undefined.
 */
function validateOptionalLoadSamples(
    loadSamples: AstChurnTrendCalculatorLoadSamples | undefined,
): AstChurnTrendCalculatorLoadSamples | undefined {
    if (loadSamples === undefined || typeof loadSamples === "function") {
        return loadSamples
    }

    throw new AstChurnTrendCalculatorError(
        AST_CHURN_TREND_CALCULATOR_ERROR_CODE.INVALID_LOAD_SAMPLES,
    )
}

/**
 * Validates required loadSamples callback.
 *
 * @param loadSamples Optional callback.
 * @returns Required callback.
 */
function validateLoadSamples(
    loadSamples: AstChurnTrendCalculatorLoadSamples | undefined,
): AstChurnTrendCalculatorLoadSamples {
    if (typeof loadSamples === "function") {
        return loadSamples
    }

    throw new AstChurnTrendCalculatorError(
        AST_CHURN_TREND_CALCULATOR_ERROR_CODE.INVALID_LOAD_SAMPLES,
    )
}

/**
 * Validates sleep callback.
 *
 * @param sleep Candidate sleep callback.
 * @returns Valid sleep callback.
 */
function validateSleep(
    sleep: AstChurnTrendCalculatorSleep,
): AstChurnTrendCalculatorSleep {
    if (typeof sleep === "function") {
        return sleep
    }

    throw new AstChurnTrendCalculatorError(
        AST_CHURN_TREND_CALCULATOR_ERROR_CODE.INVALID_SLEEP,
    )
}

/**
 * Groups normalized samples by file path.
 *
 * @param samples Normalized sample payload.
 * @param filePaths Deterministic file path order.
 * @returns Samples grouped by file path.
 */
function groupSamplesByFilePath(
    samples: readonly INormalizedChurnTrendSample[],
    filePaths: readonly string[],
): ReadonlyMap<string, readonly INormalizedChurnTrendSample[]> {
    const grouped = new Map<string, INormalizedChurnTrendSample[]>()
    const filePathSet = new Set<string>(filePaths)

    for (const sample of samples) {
        if (!filePathSet.has(sample.filePath)) {
            continue
        }

        const existing = grouped.get(sample.filePath)
        if (existing !== undefined) {
            existing.push(sample)
            continue
        }

        grouped.set(sample.filePath, [sample])
    }

    for (const filePath of filePaths) {
        if (!grouped.has(filePath)) {
            grouped.set(filePath, [])
        }
    }

    return grouped
}

/**
 * Builds one file-level churn trend item.
 *
 * @param filePath File path.
 * @param samples File-level sample payload.
 * @param windowSizes Sorted rolling window sizes.
 * @param accelerationThreshold Acceleration threshold.
 * @param decelerationThreshold Deceleration threshold.
 * @returns File-level churn trend item.
 */
function buildFileTrend(
    filePath: string,
    samples: readonly INormalizedChurnTrendSample[],
    windowSizes: readonly number[],
    accelerationThreshold: number,
    decelerationThreshold: number,
): IAstChurnFileTrend {
    if (samples.length === 0) {
        const emptyRollingAverages = windowSizes.map((windowSize): IAstChurnRollingAverage => ({
            windowSize,
            sampleCount: 0,
            average: 0,
        }))

        return {
            filePath,
            sampleCount: 0,
            latestChurn: 0,
            shortWindowAverage: 0,
            longWindowAverage: 0,
            changeDelta: 0,
            changeRatio: 0,
            direction: AST_CHURN_TREND_DIRECTION.STABLE,
            rollingAverages: emptyRollingAverages,
        }
    }

    const sortedSamples = [...samples].sort((left, right) => left.observedAtMs - right.observedAtMs)
    const rollingAverages = windowSizes.map((windowSize): IAstChurnRollingAverage => {
        const sampleCount = Math.min(windowSize, sortedSamples.length)
        const relevantSamples = sortedSamples.slice(sortedSamples.length - sampleCount)
        const totalChurn = relevantSamples.reduce((sum, sample) => sum + sample.churn, 0)

        return {
            windowSize,
            sampleCount,
            average: roundTrendNumber(totalChurn / sampleCount),
        }
    })

    const shortWindowAverage = rollingAverages[0]?.average ?? 0
    const longWindowAverage = rollingAverages.at(-1)?.average ?? 0
    const changeDelta = roundTrendNumber(shortWindowAverage - longWindowAverage)
    const denominator = Math.abs(longWindowAverage) > 0 ? Math.abs(longWindowAverage) : 1
    const changeRatio = roundTrendNumber(changeDelta / denominator)
    const direction = resolveTrendDirection(
        changeRatio,
        accelerationThreshold,
        decelerationThreshold,
    )

    return {
        filePath,
        sampleCount: sortedSamples.length,
        latestChurn: sortedSamples.at(-1)?.churn ?? 0,
        shortWindowAverage,
        longWindowAverage,
        changeDelta,
        changeRatio,
        direction,
        rollingAverages,
    }
}

/**
 * Resolves trend direction from relative change ratio.
 *
 * @param changeRatio Relative change ratio.
 * @param accelerationThreshold Acceleration threshold.
 * @param decelerationThreshold Deceleration threshold.
 * @returns Trend direction literal.
 */
function resolveTrendDirection(
    changeRatio: number,
    accelerationThreshold: number,
    decelerationThreshold: number,
): AstChurnTrendDirection {
    if (changeRatio >= accelerationThreshold) {
        return AST_CHURN_TREND_DIRECTION.ACCELERATING
    }

    if (changeRatio <= decelerationThreshold) {
        return AST_CHURN_TREND_DIRECTION.DECELERATING
    }

    return AST_CHURN_TREND_DIRECTION.STABLE
}

/**
 * Builds churn trend summary from file-level items.
 *
 * @param items File-level trend items.
 * @param windowSizes Rolling window sizes.
 * @param accelerationThreshold Acceleration threshold.
 * @param decelerationThreshold Deceleration threshold.
 * @param now Current timestamp in milliseconds.
 * @returns Churn trend summary.
 */
function buildSummary(
    items: readonly IAstChurnFileTrend[],
    windowSizes: readonly number[],
    accelerationThreshold: number,
    decelerationThreshold: number,
    now: number,
): IAstChurnTrendCalculatorSummary {
    let acceleratingCount = 0
    let deceleratingCount = 0
    let stableCount = 0
    let totalChangeDelta = 0
    let totalChangeRatio = 0

    for (const item of items) {
        totalChangeDelta += item.changeDelta
        totalChangeRatio += item.changeRatio

        if (item.direction === AST_CHURN_TREND_DIRECTION.ACCELERATING) {
            acceleratingCount += 1
            continue
        }
        if (item.direction === AST_CHURN_TREND_DIRECTION.DECELERATING) {
            deceleratingCount += 1
            continue
        }

        stableCount += 1
    }

    return {
        fileCount: items.length,
        acceleratingCount,
        deceleratingCount,
        stableCount,
        averageChangeDelta:
            items.length > 0 ? roundTrendNumber(totalChangeDelta / items.length) : 0,
        averageChangeRatio:
            items.length > 0 ? roundTrendNumber(totalChangeRatio / items.length) : 0,
        windowSizes,
        accelerationThreshold,
        decelerationThreshold,
        generatedAt: new Date(now).toISOString(),
    }
}

/**
 * Rounds trend metrics to stable precision.
 *
 * @param value Raw trend numeric value.
 * @returns Rounded trend value.
 */
function roundTrendNumber(value: number): number {
    return Number(value.toFixed(TREND_RATIO_PRECISION))
}

/**
 * Creates stable cache key for resolved normalized input.
 *
 * @param input Resolved normalized input.
 * @returns Stable deterministic key.
 */
function createRequestKey(input: IResolvedChurnTrendInput): string {
    const sampleKey = input.samples
        .map((sample) => `${sample.filePath}@${sample.observedAt}:${sample.churn}`)
        .join("|")
    const windowKey = input.windowSizes.join(",")

    return [
        input.filePaths.join(","),
        windowKey,
        input.accelerationThreshold,
        input.decelerationThreshold,
        sampleKey,
    ].join("::")
}

/**
 * Clones churn trend result payload.
 *
 * @param result Churn trend result.
 * @returns Deep clone of trend result.
 */
function cloneResult(result: IAstChurnTrendCalculatorResult): IAstChurnTrendCalculatorResult {
    return {
        items: result.items.map((item): IAstChurnFileTrend => {
            return {
                filePath: item.filePath,
                sampleCount: item.sampleCount,
                latestChurn: item.latestChurn,
                shortWindowAverage: item.shortWindowAverage,
                longWindowAverage: item.longWindowAverage,
                changeDelta: item.changeDelta,
                changeRatio: item.changeRatio,
                direction: item.direction,
                rollingAverages: item.rollingAverages.map(
                    (rollingAverage): IAstChurnRollingAverage => ({
                        windowSize: rollingAverage.windowSize,
                        sampleCount: rollingAverage.sampleCount,
                        average: rollingAverage.average,
                    }),
                ),
            }
        }),
        summary: {
            fileCount: result.summary.fileCount,
            acceleratingCount: result.summary.acceleratingCount,
            deceleratingCount: result.summary.deceleratingCount,
            stableCount: result.summary.stableCount,
            averageChangeDelta: result.summary.averageChangeDelta,
            averageChangeRatio: result.summary.averageChangeRatio,
            windowSizes: [...result.summary.windowSizes],
            accelerationThreshold: result.summary.accelerationThreshold,
            decelerationThreshold: result.summary.decelerationThreshold,
            generatedAt: result.summary.generatedAt,
        },
    }
}

/**
 * Clones source sample payload to protect sample cache from external mutations.
 *
 * @param samples Source sample payload.
 * @returns Cloned sample payload.
 */
function cloneSamples(
    samples: readonly IAstChurnTrendSample[],
): readonly IAstChurnTrendSample[] {
    return samples.map((sample): IAstChurnTrendSample => {
        return {
            filePath: sample.filePath,
            churn: sample.churn,
            observedAt: sample.observedAt,
        }
    })
}

/**
 * Default sleep implementation for retry backoff.
 *
 * @param milliseconds Sleep duration.
 * @returns Promise resolved after duration.
 */
async function defaultSleep(milliseconds: number): Promise<void> {
    await new Promise<void>((resolve) => {
        setTimeout(resolve, milliseconds)
    })
}

/**
 * Resolves unknown error payload to stable message.
 *
 * @param error Unknown error payload.
 * @returns Stable error message.
 */
function resolveUnknownErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    return "Unknown error"
}
