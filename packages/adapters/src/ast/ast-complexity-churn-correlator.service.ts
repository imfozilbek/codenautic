import {FilePath} from "@codenautic/core"

import {
    AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE,
    AstComplexityChurnCorrelatorError,
} from "./ast-complexity-churn-correlator.error"

const DEFAULT_HIGH_COMPLEXITY_PERCENTILE = 0.75
const DEFAULT_HIGH_CHURN_PERCENTILE = 0.75
const DEFAULT_MAX_LOAD_ATTEMPTS = 2
const DEFAULT_RETRY_BACKOFF_MS = 25
const DEFAULT_CACHE_TTL_MS = 15000
const CORRELATOR_PRECISION = 6

/**
 * Correlation strength categories for complexity-churn analysis.
 */
export const AST_COMPLEXITY_CHURN_CORRELATION_STRENGTH = {
    STRONG_NEGATIVE: "STRONG_NEGATIVE",
    MODERATE_NEGATIVE: "MODERATE_NEGATIVE",
    WEAK_OR_NONE: "WEAK_OR_NONE",
    MODERATE_POSITIVE: "MODERATE_POSITIVE",
    STRONG_POSITIVE: "STRONG_POSITIVE",
} as const

/**
 * Correlation strength literal.
 */
export type AstComplexityChurnCorrelationStrength =
    (typeof AST_COMPLEXITY_CHURN_CORRELATION_STRENGTH)[keyof typeof AST_COMPLEXITY_CHURN_CORRELATION_STRENGTH]

interface INormalizedComplexityChurnPoint {
    readonly filePath: string
    readonly complexity: number
    readonly churn: number
}

interface IResolvedCorrelatorInput {
    readonly filePaths: readonly string[]
    readonly points: readonly INormalizedComplexityChurnPoint[]
    readonly highComplexityPercentile: number
    readonly highChurnPercentile: number
}

interface ICorrelatorResultCacheEntry {
    readonly expiresAt: number
    readonly value: IAstComplexityChurnCorrelatorResult
}

interface ILoadedPointsCacheEntry {
    readonly expiresAt: number
    readonly value: readonly IAstComplexityChurnPointInput[]
}

/**
 * Input point payload for complexity-churn correlation.
 */
export interface IAstComplexityChurnPointInput {
    /**
     * Repository-relative file path.
     */
    readonly filePath: string

    /**
     * Cyclomatic complexity value.
     */
    readonly complexity: number

    /**
     * Churn value.
     */
    readonly churn: number
}

/**
 * Scatter point payload returned by correlator.
 */
export interface IAstComplexityChurnScatterPoint {
    /**
     * Repository-relative file path.
     */
    readonly filePath: string

    /**
     * Complexity value for point.
     */
    readonly complexity: number

    /**
     * Churn value for point.
     */
    readonly churn: number

    /**
     * Min-max normalized complexity in [0..1].
     */
    readonly normalizedComplexity: number

    /**
     * Min-max normalized churn in [0..1].
     */
    readonly normalizedChurn: number

    /**
     * Whether point is above high complexity threshold.
     */
    readonly isHighComplexity: boolean

    /**
     * Whether point is above high churn threshold.
     */
    readonly isHighChurn: boolean

    /**
     * Whether point is in high-complexity/high-churn hotspot quadrant.
     */
    readonly isHotSpot: boolean
}

/**
 * Summary payload for complexity-churn correlation.
 */
export interface IAstComplexityChurnCorrelatorSummary {
    /**
     * Number of points included in correlation.
     */
    readonly pointCount: number

    /**
     * Number of high-complexity/high-churn hotspots.
     */
    readonly hotSpotCount: number

    /**
     * Mean complexity across points.
     */
    readonly meanComplexity: number

    /**
     * Mean churn across points.
     */
    readonly meanChurn: number

    /**
     * Pearson correlation coefficient between complexity and churn.
     */
    readonly correlationCoefficient: number

    /**
     * Correlation strength category.
     */
    readonly correlationStrength: AstComplexityChurnCorrelationStrength

    /**
     * Threshold value used for high complexity classification.
     */
    readonly highComplexityThreshold: number

    /**
     * Threshold value used for high churn classification.
     */
    readonly highChurnThreshold: number

    /**
     * Configured high complexity percentile.
     */
    readonly highComplexityPercentile: number

    /**
     * Configured high churn percentile.
     */
    readonly highChurnPercentile: number

    /**
     * ISO timestamp when correlation was generated.
     */
    readonly generatedAt: string
}

/**
 * Complexity-churn correlation output payload.
 */
export interface IAstComplexityChurnCorrelatorResult {
    /**
     * Scatter points sorted by file path.
     */
    readonly points: readonly IAstComplexityChurnScatterPoint[]

    /**
     * Hotspot subset derived from scatter points.
     */
    readonly hotSpots: readonly IAstComplexityChurnScatterPoint[]

    /**
     * Correlation summary payload.
     */
    readonly summary: IAstComplexityChurnCorrelatorSummary
}

/**
 * Optional loader callback for complexity-churn input points.
 */
export type AstComplexityChurnCorrelatorLoadPoints = (
    filePaths: readonly string[],
) => Promise<readonly IAstComplexityChurnPointInput[]>

/**
 * Deterministic clock callback.
 */
export type AstComplexityChurnCorrelatorNow = () => number

/**
 * Sleep callback used by retry logic.
 */
export type AstComplexityChurnCorrelatorSleep = (milliseconds: number) => Promise<void>

/**
 * Input payload for complexity-churn correlator.
 */
export interface IAstComplexityChurnCorrelatorInput {
    /**
     * Optional explicit points payload.
     */
    readonly points?: readonly IAstComplexityChurnPointInput[]

    /**
     * Optional file path filter.
     */
    readonly filePaths?: readonly string[]

    /**
     * Optional high complexity percentile.
     */
    readonly highComplexityPercentile?: number

    /**
     * Optional high churn percentile.
     */
    readonly highChurnPercentile?: number
}

/**
 * Runtime options for complexity-churn correlator.
 */
export interface IAstComplexityChurnCorrelatorServiceOptions {
    /**
     * Optional point loader callback.
     */
    readonly loadPoints?: AstComplexityChurnCorrelatorLoadPoints

    /**
     * Optional default high complexity percentile.
     */
    readonly defaultHighComplexityPercentile?: number

    /**
     * Optional default high churn percentile.
     */
    readonly defaultHighChurnPercentile?: number

    /**
     * Optional max attempts for point loading.
     */
    readonly maxLoadAttempts?: number

    /**
     * Optional retry backoff in milliseconds.
     */
    readonly retryBackoffMs?: number

    /**
     * Optional TTL for idempotency cache.
     */
    readonly cacheTtlMs?: number

    /**
     * Optional deterministic clock callback.
     */
    readonly now?: AstComplexityChurnCorrelatorNow

    /**
     * Optional sleep callback for retry backoff.
     */
    readonly sleep?: AstComplexityChurnCorrelatorSleep
}

/**
 * Complexity-churn correlator contract.
 */
export interface IAstComplexityChurnCorrelatorService {
    /**
     * Calculates complexity-churn scatter and correlation summary.
     *
     * @param input Correlator input payload.
     * @returns Correlation result.
     */
    calculate(input: IAstComplexityChurnCorrelatorInput): Promise<IAstComplexityChurnCorrelatorResult>
}

/**
 * Correlates complexity and churn values to identify high-risk hotspots.
 */
export class AstComplexityChurnCorrelatorService implements IAstComplexityChurnCorrelatorService {
    private readonly loadPoints?: AstComplexityChurnCorrelatorLoadPoints
    private readonly defaultHighComplexityPercentile: number
    private readonly defaultHighChurnPercentile: number
    private readonly maxLoadAttempts: number
    private readonly retryBackoffMs: number
    private readonly cacheTtlMs: number
    private readonly now: AstComplexityChurnCorrelatorNow
    private readonly sleep: AstComplexityChurnCorrelatorSleep
    private readonly inFlight = new Map<string, Promise<IAstComplexityChurnCorrelatorResult>>()
    private readonly cache = new Map<string, ICorrelatorResultCacheEntry>()
    private readonly loadedPointsInFlight = new Map<string, Promise<readonly IAstComplexityChurnPointInput[]>>()
    private readonly loadedPointsCache = new Map<string, ILoadedPointsCacheEntry>()

    /**
     * Creates AST complexity-churn correlator service.
     *
     * @param options Optional runtime overrides.
     */
    public constructor(options: IAstComplexityChurnCorrelatorServiceOptions = {}) {
        this.loadPoints = validateOptionalLoadPoints(options.loadPoints)
        this.defaultHighComplexityPercentile = validateHighComplexityPercentile(
            options.defaultHighComplexityPercentile ?? DEFAULT_HIGH_COMPLEXITY_PERCENTILE,
        )
        this.defaultHighChurnPercentile = validateHighChurnPercentile(
            options.defaultHighChurnPercentile ?? DEFAULT_HIGH_CHURN_PERCENTILE,
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
     * Calculates correlation result for provided points or loaded data source.
     *
     * @param input Correlator input payload.
     * @returns Correlation result.
     */
    public async calculate(
        input: IAstComplexityChurnCorrelatorInput,
    ): Promise<IAstComplexityChurnCorrelatorResult> {
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
     * Resolves and normalizes input payload.
     *
     * @param input Raw correlator input.
     * @returns Resolved normalized input.
     */
    private async resolveInput(
        input: IAstComplexityChurnCorrelatorInput,
    ): Promise<IResolvedCorrelatorInput> {
        const filePaths = normalizeOptionalFilePaths(input.filePaths)
        const highComplexityPercentile = validateHighComplexityPercentile(
            input.highComplexityPercentile ?? this.defaultHighComplexityPercentile,
        )
        const highChurnPercentile = validateHighChurnPercentile(
            input.highChurnPercentile ?? this.defaultHighChurnPercentile,
        )

        if (input.points !== undefined) {
            const points = normalizePoints(input.points, filePaths)

            return {
                filePaths: resolveFilePaths(filePaths, points),
                points,
                highComplexityPercentile,
                highChurnPercentile,
            }
        }

        const requiredFilePaths = resolveRequiredFilePaths(filePaths)
        const loadedPoints = await this.loadPointsWithRetry(requiredFilePaths)
        const points = normalizePoints(loadedPoints, requiredFilePaths)

        return {
            filePaths: requiredFilePaths,
            points,
            highComplexityPercentile,
            highChurnPercentile,
        }
    }

    /**
     * Calculates correlation from resolved normalized input.
     *
     * @param input Resolved normalized input.
     * @param requestKey Stable cache key.
     * @returns Correlation result.
     */
    private calculateFresh(
        input: IResolvedCorrelatorInput,
        requestKey: string,
    ): IAstComplexityChurnCorrelatorResult {
        const sortedPoints = input.points
            .filter((point) => input.filePaths.includes(point.filePath))
            .sort((left, right) => left.filePath.localeCompare(right.filePath))

        const complexityValues = sortedPoints.map((point) => point.complexity)
        const churnValues = sortedPoints.map((point) => point.churn)
        const highComplexityThreshold = percentile(complexityValues, input.highComplexityPercentile)
        const highChurnThreshold = percentile(churnValues, input.highChurnPercentile)
        const minComplexity = Math.min(...complexityValues)
        const maxComplexity = Math.max(...complexityValues)
        const minChurn = Math.min(...churnValues)
        const maxChurn = Math.max(...churnValues)

        const scatterPoints = sortedPoints.map((point): IAstComplexityChurnScatterPoint => {
            const normalizedComplexity = normalizeRangeValue(
                point.complexity,
                minComplexity,
                maxComplexity,
            )
            const normalizedChurn = normalizeRangeValue(point.churn, minChurn, maxChurn)
            const isHighComplexity = point.complexity >= highComplexityThreshold
            const isHighChurn = point.churn >= highChurnThreshold

            return {
                filePath: point.filePath,
                complexity: point.complexity,
                churn: point.churn,
                normalizedComplexity,
                normalizedChurn,
                isHighComplexity,
                isHighChurn,
                isHotSpot: isHighComplexity && isHighChurn,
            }
        })

        const hotSpots = scatterPoints.filter((point) => point.isHotSpot)
        const correlationCoefficient = pearsonCorrelation(complexityValues, churnValues)
        const result: IAstComplexityChurnCorrelatorResult = {
            points: scatterPoints,
            hotSpots,
            summary: {
                pointCount: scatterPoints.length,
                hotSpotCount: hotSpots.length,
                meanComplexity: roundNumber(mean(complexityValues)),
                meanChurn: roundNumber(mean(churnValues)),
                correlationCoefficient,
                correlationStrength: correlationStrength(correlationCoefficient),
                highComplexityThreshold: roundNumber(highComplexityThreshold),
                highChurnThreshold: roundNumber(highChurnThreshold),
                highComplexityPercentile: input.highComplexityPercentile,
                highChurnPercentile: input.highChurnPercentile,
                generatedAt: new Date(this.now()).toISOString(),
            },
        }
        const cloned = cloneResult(result)

        this.cache.set(requestKey, {
            value: cloned,
            expiresAt: this.now() + this.cacheTtlMs,
        })

        return cloneResult(cloned)
    }

    /**
     * Loads points with cache and in-flight deduplication.
     *
     * @param filePaths Required file path list.
     * @returns Loaded points payload.
     */
    private async loadPointsWithRetry(
        filePaths: readonly string[],
    ): Promise<readonly IAstComplexityChurnPointInput[]> {
        const cacheKey = filePaths.join("|")
        const now = this.now()
        this.pruneExpiredLoadedPointsCache(now)

        const cached = this.loadedPointsCache.get(cacheKey)
        if (cached !== undefined && cached.expiresAt > now) {
            return cloneInputPoints(cached.value)
        }

        const existingInFlight = this.loadedPointsInFlight.get(cacheKey)
        if (existingInFlight !== undefined) {
            return existingInFlight
        }

        const operation = this.loadPointsWithRetryFresh(filePaths, cacheKey)
        this.loadedPointsInFlight.set(cacheKey, operation)

        try {
            return await operation
        } finally {
            this.loadedPointsInFlight.delete(cacheKey)
        }
    }

    /**
     * Loads points from callback with bounded retries.
     *
     * @param filePaths Required file path list.
     * @param cacheKey File-path cache key.
     * @returns Loaded points payload.
     */
    private async loadPointsWithRetryFresh(
        filePaths: readonly string[],
        cacheKey: string,
    ): Promise<readonly IAstComplexityChurnPointInput[]> {
        const loadPoints = validateLoadPoints(this.loadPoints)
        let attempt = 0
        let lastError: unknown = undefined

        while (attempt < this.maxLoadAttempts) {
            attempt += 1

            try {
                const loadedPoints = await loadPoints(filePaths)
                const clonedPoints = cloneInputPoints(loadedPoints)

                this.loadedPointsCache.set(cacheKey, {
                    value: clonedPoints,
                    expiresAt: this.now() + this.cacheTtlMs,
                })

                return cloneInputPoints(clonedPoints)
            } catch (error) {
                lastError = error
            }

            if (attempt < this.maxLoadAttempts && this.retryBackoffMs > 0) {
                await this.sleepOrThrow(attempt, lastError)
            }
        }

        if (this.maxLoadAttempts === 1) {
            throw new AstComplexityChurnCorrelatorError(
                AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.LOAD_POINTS_FAILED,
                {
                    attempt,
                    maxLoadAttempts: this.maxLoadAttempts,
                    causeMessage: resolveUnknownErrorMessage(lastError),
                },
            )
        }

        throw new AstComplexityChurnCorrelatorError(
            AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.RETRY_EXHAUSTED,
            {
                attempt,
                maxLoadAttempts: this.maxLoadAttempts,
                causeMessage: resolveUnknownErrorMessage(lastError),
            },
        )
    }

    /**
     * Sleeps between retries with typed error wrapping.
     *
     * @param attempt Failed attempt number.
     * @param lastError Last error payload.
     * @returns Promise resolved after sleep.
     */
    private async sleepOrThrow(attempt: number, lastError: unknown): Promise<void> {
        try {
            await this.sleep(this.retryBackoffMs)
        } catch (error) {
            throw new AstComplexityChurnCorrelatorError(
                AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.LOAD_POINTS_FAILED,
                {
                    attempt,
                    maxLoadAttempts: this.maxLoadAttempts,
                    causeMessage: resolveUnknownErrorMessage(error ?? lastError),
                },
            )
        }
    }

    /**
     * Removes expired correlation result cache entries.
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
     * Removes expired loaded points cache entries.
     *
     * @param now Current timestamp in milliseconds.
     */
    private pruneExpiredLoadedPointsCache(now: number): void {
        for (const [key, entry] of this.loadedPointsCache.entries()) {
            if (entry.expiresAt <= now) {
                this.loadedPointsCache.delete(key)
            }
        }
    }
}

/**
 * Validates optional file path filter.
 *
 * @param filePaths Optional file path list.
 * @returns Normalized file paths or undefined.
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
 * @param filePaths Optional file path list.
 * @returns Required normalized file path list.
 */
function resolveRequiredFilePaths(
    filePaths: readonly string[] | undefined,
): readonly string[] {
    if (filePaths !== undefined) {
        return normalizeRequiredFilePaths(filePaths)
    }

    throw new AstComplexityChurnCorrelatorError(
        AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.EMPTY_FILE_PATHS,
    )
}

/**
 * Validates required file path list and enforces deterministic order.
 *
 * @param filePaths Raw file path list.
 * @returns Sorted unique normalized file paths.
 */
function normalizeRequiredFilePaths(filePaths: readonly string[]): readonly string[] {
    if (filePaths.length === 0) {
        throw new AstComplexityChurnCorrelatorError(
            AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.EMPTY_FILE_PATHS,
        )
    }

    const normalizedPaths = new Set<string>()
    for (const filePath of filePaths) {
        const normalizedFilePath = normalizeFilePath(filePath)
        if (normalizedPaths.has(normalizedFilePath)) {
            throw new AstComplexityChurnCorrelatorError(
                AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.DUPLICATE_FILE_PATH,
                {filePath: normalizedFilePath},
            )
        }

        normalizedPaths.add(normalizedFilePath)
    }

    return [...normalizedPaths].sort((left, right) => left.localeCompare(right))
}

/**
 * Normalizes and validates one file path.
 *
 * @param filePath Raw file path.
 * @returns Normalized file path.
 */
function normalizeFilePath(filePath: string): string {
    try {
        return FilePath.create(filePath).toString()
    } catch {
        throw new AstComplexityChurnCorrelatorError(
            AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.INVALID_FILE_PATH,
            {filePath},
        )
    }
}

/**
 * Normalizes and validates complexity-churn points.
 *
 * @param points Raw point payload.
 * @param allowedFilePaths Optional allowed file paths.
 * @returns Sorted normalized points.
 */
function normalizePoints(
    points: readonly IAstComplexityChurnPointInput[],
    allowedFilePaths: readonly string[] | undefined,
): readonly INormalizedComplexityChurnPoint[] {
    if (points.length === 0) {
        throw new AstComplexityChurnCorrelatorError(
            AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.EMPTY_POINTS,
        )
    }

    const allowedSet = allowedFilePaths !== undefined ? new Set<string>(allowedFilePaths) : undefined
    const normalizedPoints: INormalizedComplexityChurnPoint[] = []

    for (const point of points) {
        const filePath = normalizeFilePath(point.filePath)
        if (allowedSet !== undefined && !allowedSet.has(filePath)) {
            continue
        }

        const complexity = normalizeComplexity(point.complexity, filePath)
        const churn = normalizeChurn(point.churn, filePath)
        normalizedPoints.push({
            filePath,
            complexity,
            churn,
        })
    }

    if (normalizedPoints.length === 0) {
        throw new AstComplexityChurnCorrelatorError(
            AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.EMPTY_POINTS,
        )
    }

    return normalizedPoints.sort((left, right) => left.filePath.localeCompare(right.filePath))
}

/**
 * Resolves file path list from explicit filter or points payload.
 *
 * @param explicitFilePaths Optional explicit file path filter.
 * @param points Normalized points.
 * @returns Sorted unique file path list.
 */
function resolveFilePaths(
    explicitFilePaths: readonly string[] | undefined,
    points: readonly INormalizedComplexityChurnPoint[],
): readonly string[] {
    if (explicitFilePaths !== undefined) {
        return explicitFilePaths
    }

    const filePaths = new Set<string>()
    for (const point of points) {
        filePaths.add(point.filePath)
    }

    return [...filePaths].sort((left, right) => left.localeCompare(right))
}

/**
 * Validates complexity numeric value.
 *
 * @param complexity Raw complexity value.
 * @param filePath File path for diagnostics.
 * @returns Valid complexity value.
 */
function normalizeComplexity(complexity: number, filePath: string): number {
    if (Number.isFinite(complexity) && complexity >= 0) {
        return complexity
    }

    throw new AstComplexityChurnCorrelatorError(
        AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.INVALID_COMPLEXITY,
        {
            filePath,
            complexity,
        },
    )
}

/**
 * Validates churn numeric value.
 *
 * @param churn Raw churn value.
 * @param filePath File path for diagnostics.
 * @returns Valid churn value.
 */
function normalizeChurn(churn: number, filePath: string): number {
    if (Number.isFinite(churn) && churn >= 0) {
        return churn
    }

    throw new AstComplexityChurnCorrelatorError(
        AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.INVALID_CHURN,
        {
            filePath,
            churn,
        },
    )
}

/**
 * Validates optional load points callback.
 *
 * @param loadPoints Optional callback.
 * @returns Valid callback or undefined.
 */
function validateOptionalLoadPoints(
    loadPoints: AstComplexityChurnCorrelatorLoadPoints | undefined,
): AstComplexityChurnCorrelatorLoadPoints | undefined {
    if (loadPoints === undefined || typeof loadPoints === "function") {
        return loadPoints
    }

    throw new AstComplexityChurnCorrelatorError(
        AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.INVALID_LOAD_POINTS,
    )
}

/**
 * Validates required load points callback.
 *
 * @param loadPoints Optional callback.
 * @returns Required callback.
 */
function validateLoadPoints(
    loadPoints: AstComplexityChurnCorrelatorLoadPoints | undefined,
): AstComplexityChurnCorrelatorLoadPoints {
    if (typeof loadPoints === "function") {
        return loadPoints
    }

    throw new AstComplexityChurnCorrelatorError(
        AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.INVALID_LOAD_POINTS,
    )
}

/**
 * Validates high complexity percentile in [0..1].
 *
 * @param percentile Raw percentile value.
 * @returns Valid percentile.
 */
function validateHighComplexityPercentile(percentile: number): number {
    if (Number.isFinite(percentile) && percentile >= 0 && percentile <= 1) {
        return percentile
    }

    throw new AstComplexityChurnCorrelatorError(
        AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.INVALID_HIGH_COMPLEXITY_PERCENTILE,
        {percentile},
    )
}

/**
 * Validates high churn percentile in [0..1].
 *
 * @param percentile Raw percentile value.
 * @returns Valid percentile.
 */
function validateHighChurnPercentile(percentile: number): number {
    if (Number.isFinite(percentile) && percentile >= 0 && percentile <= 1) {
        return percentile
    }

    throw new AstComplexityChurnCorrelatorError(
        AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.INVALID_HIGH_CHURN_PERCENTILE,
        {percentile},
    )
}

/**
 * Validates max load attempts value.
 *
 * @param maxLoadAttempts Raw max attempts.
 * @returns Valid positive integer attempts.
 */
function validateMaxLoadAttempts(maxLoadAttempts: number): number {
    if (Number.isSafeInteger(maxLoadAttempts) && maxLoadAttempts > 0) {
        return maxLoadAttempts
    }

    throw new AstComplexityChurnCorrelatorError(
        AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.INVALID_MAX_LOAD_ATTEMPTS,
        {maxLoadAttempts},
    )
}

/**
 * Validates retry backoff in milliseconds.
 *
 * @param retryBackoffMs Raw retry backoff value.
 * @returns Valid non-negative retry backoff.
 */
function validateRetryBackoffMs(retryBackoffMs: number): number {
    if (Number.isSafeInteger(retryBackoffMs) && retryBackoffMs >= 0) {
        return retryBackoffMs
    }

    throw new AstComplexityChurnCorrelatorError(
        AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.INVALID_RETRY_BACKOFF_MS,
        {retryBackoffMs},
    )
}

/**
 * Validates cache TTL in milliseconds.
 *
 * @param cacheTtlMs Raw cache TTL.
 * @returns Valid non-negative cache TTL.
 */
function validateCacheTtlMs(cacheTtlMs: number): number {
    if (Number.isSafeInteger(cacheTtlMs) && cacheTtlMs >= 0) {
        return cacheTtlMs
    }

    throw new AstComplexityChurnCorrelatorError(
        AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.INVALID_CACHE_TTL_MS,
        {cacheTtlMs},
    )
}

/**
 * Validates sleep callback.
 *
 * @param sleep Candidate sleep callback.
 * @returns Valid sleep callback.
 */
function validateSleep(
    sleep: AstComplexityChurnCorrelatorSleep,
): AstComplexityChurnCorrelatorSleep {
    if (typeof sleep === "function") {
        return sleep
    }

    throw new AstComplexityChurnCorrelatorError(
        AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.INVALID_SLEEP,
    )
}

/**
 * Calculates percentile for numeric values.
 *
 * @param values Numeric values.
 * @param percentile Percentile in [0..1].
 * @returns Percentile value.
 */
function percentile(values: readonly number[], percentile: number): number {
    if (values.length === 0) {
        return 0
    }

    const sorted = [...values].sort((left, right) => left - right)
    const index = percentile * (sorted.length - 1)
    const lowerIndex = Math.floor(index)
    const upperIndex = Math.ceil(index)
    const lower = sorted[lowerIndex] ?? 0
    const upper = sorted[upperIndex] ?? 0

    if (lowerIndex === upperIndex) {
        return lower
    }

    const weight = index - lowerIndex
    return lower + (upper - lower) * weight
}

/**
 * Calculates mean for numeric values.
 *
 * @param values Numeric values.
 * @returns Mean value.
 */
function mean(values: readonly number[]): number {
    if (values.length === 0) {
        return 0
    }

    const total = values.reduce((sum, value) => sum + value, 0)
    return total / values.length
}

/**
 * Calculates Pearson correlation coefficient between two numeric vectors.
 *
 * @param xValues First vector.
 * @param yValues Second vector.
 * @returns Correlation coefficient in [-1..1].
 */
function pearsonCorrelation(
    xValues: readonly number[],
    yValues: readonly number[],
): number {
    if (xValues.length !== yValues.length || xValues.length < 2) {
        return 0
    }

    const meanX = mean(xValues)
    const meanY = mean(yValues)

    let numerator = 0
    let sumSquaredX = 0
    let sumSquaredY = 0

    for (let index = 0; index < xValues.length; index += 1) {
        const x = xValues[index] ?? 0
        const y = yValues[index] ?? 0
        const deltaX = x - meanX
        const deltaY = y - meanY

        numerator += deltaX * deltaY
        sumSquaredX += deltaX * deltaX
        sumSquaredY += deltaY * deltaY
    }

    const denominator = Math.sqrt(sumSquaredX * sumSquaredY)
    if (denominator === 0) {
        return 0
    }

    return roundNumber(numerator / denominator)
}

/**
 * Resolves correlation strength bucket from coefficient.
 *
 * @param coefficient Pearson correlation coefficient.
 * @returns Correlation strength category.
 */
function correlationStrength(
    coefficient: number,
): AstComplexityChurnCorrelationStrength {
    if (coefficient >= 0.7) {
        return AST_COMPLEXITY_CHURN_CORRELATION_STRENGTH.STRONG_POSITIVE
    }
    if (coefficient >= 0.3) {
        return AST_COMPLEXITY_CHURN_CORRELATION_STRENGTH.MODERATE_POSITIVE
    }
    if (coefficient <= -0.7) {
        return AST_COMPLEXITY_CHURN_CORRELATION_STRENGTH.STRONG_NEGATIVE
    }
    if (coefficient <= -0.3) {
        return AST_COMPLEXITY_CHURN_CORRELATION_STRENGTH.MODERATE_NEGATIVE
    }

    return AST_COMPLEXITY_CHURN_CORRELATION_STRENGTH.WEAK_OR_NONE
}

/**
 * Normalizes value into [0..1] based on min-max range.
 *
 * @param value Raw value.
 * @param min Minimum range value.
 * @param max Maximum range value.
 * @returns Normalized range value.
 */
function normalizeRangeValue(value: number, min: number, max: number): number {
    if (max === min) {
        return 0
    }

    return roundNumber((value - min) / (max - min))
}

/**
 * Rounds numeric values to stable precision.
 *
 * @param value Raw numeric value.
 * @returns Rounded numeric value.
 */
function roundNumber(value: number): number {
    return Number(value.toFixed(CORRELATOR_PRECISION))
}

/**
 * Creates stable request key from resolved normalized input.
 *
 * @param input Resolved normalized input.
 * @returns Stable deterministic request key.
 */
function createRequestKey(input: IResolvedCorrelatorInput): string {
    const pointKey = input.points
        .map((point) => `${point.filePath}:${point.complexity}:${point.churn}`)
        .join("|")

    return [
        input.filePaths.join(","),
        input.highComplexityPercentile,
        input.highChurnPercentile,
        pointKey,
    ].join("::")
}

/**
 * Clones correlator result payload.
 *
 * @param result Correlator result.
 * @returns Deep-cloned correlator result.
 */
function cloneResult(
    result: IAstComplexityChurnCorrelatorResult,
): IAstComplexityChurnCorrelatorResult {
    const points = result.points.map((point): IAstComplexityChurnScatterPoint => {
        return {
            filePath: point.filePath,
            complexity: point.complexity,
            churn: point.churn,
            normalizedComplexity: point.normalizedComplexity,
            normalizedChurn: point.normalizedChurn,
            isHighComplexity: point.isHighComplexity,
            isHighChurn: point.isHighChurn,
            isHotSpot: point.isHotSpot,
        }
    })
    const hotSpots = points.filter((point) => point.isHotSpot)

    return {
        points,
        hotSpots,
        summary: {
            pointCount: result.summary.pointCount,
            hotSpotCount: result.summary.hotSpotCount,
            meanComplexity: result.summary.meanComplexity,
            meanChurn: result.summary.meanChurn,
            correlationCoefficient: result.summary.correlationCoefficient,
            correlationStrength: result.summary.correlationStrength,
            highComplexityThreshold: result.summary.highComplexityThreshold,
            highChurnThreshold: result.summary.highChurnThreshold,
            highComplexityPercentile: result.summary.highComplexityPercentile,
            highChurnPercentile: result.summary.highChurnPercentile,
            generatedAt: result.summary.generatedAt,
        },
    }
}

/**
 * Clones input points payload.
 *
 * @param points Input points payload.
 * @returns Deep-cloned input points payload.
 */
function cloneInputPoints(
    points: readonly IAstComplexityChurnPointInput[],
): readonly IAstComplexityChurnPointInput[] {
    return points.map((point): IAstComplexityChurnPointInput => {
        return {
            filePath: point.filePath,
            complexity: point.complexity,
            churn: point.churn,
        }
    })
}

/**
 * Default sleep implementation.
 *
 * @param milliseconds Sleep duration.
 * @returns Promise resolved after timeout.
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
