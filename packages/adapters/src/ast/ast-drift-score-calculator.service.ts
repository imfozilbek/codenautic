import {FilePath} from "@codenautic/core"

import {
    AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE,
    AstDriftScoreCalculatorError,
} from "./ast-drift-score-calculator.error"

const DEFAULT_MAX_LOAD_ATTEMPTS = 2
const DEFAULT_RETRY_BACKOFF_MS = 15
const DEFAULT_CACHE_TTL_MS = 15000
const DRIFT_SCORE_PRECISION = 6
const STABLE_TREND_EPSILON = 0.000001

/**
 * Drift trend direction based on the latest two points.
 */
export const AST_DRIFT_TREND_DIRECTION = {
    DOWN: "DOWN",
    STABLE: "STABLE",
    UP: "UP",
} as const

/**
 * Drift trend direction literal.
 */
export type AstDriftTrendDirection =
    (typeof AST_DRIFT_TREND_DIRECTION)[keyof typeof AST_DRIFT_TREND_DIRECTION]

interface INormalizedCalculatorInput {
    readonly imports: readonly IAstDriftImportInput[]
    readonly violations: readonly IAstDriftViolationInput[]
    readonly history: readonly IAstDriftHistoryPointInput[]
    readonly commit?: IAstDriftCommitRef
}

interface IResultCacheEntry {
    readonly expiresAt: number
    readonly value: IAstDriftScoreCalculatorResult
}

interface IHistoryCacheEntry {
    readonly expiresAt: number
    readonly value: readonly IAstDriftHistoryPointInput[]
}

/**
 * One normalized import edge used by drift score calculator.
 */
export interface IAstDriftImportInput {
    /**
     * Source file path.
     */
    readonly sourcePath: string

    /**
     * Source layer name.
     */
    readonly sourceLayer: string

    /**
     * Source module name.
     */
    readonly sourceModule: string

    /**
     * Target file path.
     */
    readonly targetPath: string

    /**
     * Target layer name.
     */
    readonly targetLayer: string

    /**
     * Target module name.
     */
    readonly targetModule: string
}

/**
 * One normalized violation edge used by drift score calculator.
 */
export interface IAstDriftViolationInput {
    /**
     * Source file path.
     */
    readonly sourcePath: string

    /**
     * Source module name.
     */
    readonly sourceModule: string

    /**
     * Target file path.
     */
    readonly targetPath: string

    /**
     * Target module name.
     */
    readonly targetModule: string
}

/**
 * Commit reference for current drift point.
 */
export interface IAstDriftCommitRef {
    /**
     * Commit SHA.
     */
    readonly sha: string

    /**
     * Commit timestamp in ISO format.
     */
    readonly committedAt: string
}

/**
 * One historical drift point input.
 */
export interface IAstDriftHistoryPointInput {
    /**
     * Commit SHA.
     */
    readonly commitSha: string

    /**
     * Commit timestamp in ISO format.
     */
    readonly committedAt: string

    /**
     * Drift score ratio in [0..1].
     */
    readonly driftScore: number
}

/**
 * One module-level drift breakdown item.
 */
export interface IAstDriftModuleBreakdownItem {
    /**
     * Module name.
     */
    readonly moduleName: string

    /**
     * Number of outbound imports for module.
     */
    readonly importCount: number

    /**
     * Number of violating outbound imports for module.
     */
    readonly violationCount: number

    /**
     * Module drift score ratio in [0..1].
     */
    readonly driftScore: number
}

/**
 * One drift trend point.
 */
export interface IAstDriftTrendPoint {
    /**
     * Commit SHA.
     */
    readonly commitSha: string

    /**
     * Commit timestamp in ISO format.
     */
    readonly committedAt: string

    /**
     * Drift score ratio in [0..1].
     */
    readonly driftScore: number
}

/**
 * Summary payload for drift score calculator.
 */
export interface IAstDriftScoreCalculatorSummary {
    /**
     * Number of imports in current snapshot.
     */
    readonly totalImportCount: number

    /**
     * Number of violating imports in current snapshot.
     */
    readonly violationCount: number

    /**
     * Global drift score ratio in [0..1].
     */
    readonly driftScore: number

    /**
     * Global drift score in percent.
     */
    readonly driftPercent: number

    /**
     * Number of modules present in breakdown.
     */
    readonly moduleCount: number

    /**
     * Number of points in resulting trend timeline.
     */
    readonly trendPointCount: number

    /**
     * Trend direction computed from latest two points.
     */
    readonly trendDirection: AstDriftTrendDirection

    /**
     * Trend delta between latest and previous point.
     */
    readonly trendDelta: number

    /**
     * ISO timestamp when result was generated.
     */
    readonly generatedAt: string
}

/**
 * Drift score calculator output payload.
 */
export interface IAstDriftScoreCalculatorResult {
    /**
     * Module-level drift breakdown.
     */
    readonly modules: readonly IAstDriftModuleBreakdownItem[]

    /**
     * Historical trend including current point.
     */
    readonly trend: readonly IAstDriftTrendPoint[]

    /**
     * Aggregate summary.
     */
    readonly summary: IAstDriftScoreCalculatorSummary
}

/**
 * History loader callback when history input is omitted.
 */
export type AstDriftScoreCalculatorLoadHistory = () => Promise<readonly IAstDriftHistoryPointInput[]>

/**
 * Deterministic clock callback.
 */
export type AstDriftScoreCalculatorNow = () => number

/**
 * Sleep callback used by retry logic.
 */
export type AstDriftScoreCalculatorSleep = (milliseconds: number) => Promise<void>

/**
 * Input payload for drift score calculator.
 */
export interface IAstDriftScoreCalculatorInput {
    /**
     * Current import edges.
     */
    readonly imports: readonly IAstDriftImportInput[]

    /**
     * Current violating import edges.
     */
    readonly violations: readonly IAstDriftViolationInput[]

    /**
     * Optional historical drift points.
     */
    readonly history?: readonly IAstDriftHistoryPointInput[]

    /**
     * Optional commit reference for current point.
     */
    readonly commit?: IAstDriftCommitRef
}

/**
 * Runtime options for drift score calculator.
 */
export interface IAstDriftScoreCalculatorServiceOptions {
    /**
     * Optional history loader callback.
     */
    readonly loadHistory?: AstDriftScoreCalculatorLoadHistory

    /**
     * Optional max load attempts for history loading.
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
    readonly now?: AstDriftScoreCalculatorNow

    /**
     * Optional sleep callback for retry backoff.
     */
    readonly sleep?: AstDriftScoreCalculatorSleep
}

/**
 * Drift score calculator contract.
 */
export interface IAstDriftScoreCalculatorService {
    /**
     * Calculates drift score, module breakdown, and trend timeline.
     *
     * @param input Drift score calculator input payload.
     * @returns Drift score calculator result.
     */
    calculate(input: IAstDriftScoreCalculatorInput): Promise<IAstDriftScoreCalculatorResult>
}

/**
 * Calculates architecture drift score with module breakdown and commit trend.
 */
export class AstDriftScoreCalculatorService implements IAstDriftScoreCalculatorService {
    private readonly loadHistory?: AstDriftScoreCalculatorLoadHistory
    private readonly maxLoadAttempts: number
    private readonly retryBackoffMs: number
    private readonly cacheTtlMs: number
    private readonly now: AstDriftScoreCalculatorNow
    private readonly sleep: AstDriftScoreCalculatorSleep
    private readonly inFlight = new Map<string, Promise<IAstDriftScoreCalculatorResult>>()
    private readonly cache = new Map<string, IResultCacheEntry>()
    private readonly historyInFlight = new Map<string, Promise<readonly IAstDriftHistoryPointInput[]>>()
    private readonly historyCache = new Map<string, IHistoryCacheEntry>()

    /**
     * Creates AST drift score calculator service.
     *
     * @param options Optional runtime overrides.
     */
    public constructor(options: IAstDriftScoreCalculatorServiceOptions = {}) {
        this.loadHistory = validateOptionalLoadHistory(options.loadHistory)
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
     * Calculates drift score, module breakdown, and trend timeline.
     *
     * @param input Drift score calculator input payload.
     * @returns Drift score calculator result.
     */
    public async calculate(
        input: IAstDriftScoreCalculatorInput,
    ): Promise<IAstDriftScoreCalculatorResult> {
        const normalizedInput = await this.normalizeInput(input)
        const requestKey = createRequestKey(normalizedInput)
        const now = this.now()
        this.pruneExpiredCache(now)
        this.pruneExpiredHistoryCache(now)

        const cached = this.cache.get(requestKey)
        if (cached !== undefined && cached.expiresAt > now) {
            return cloneResult(cached.value)
        }

        const existingInFlight = this.inFlight.get(requestKey)
        if (existingInFlight !== undefined) {
            return existingInFlight
        }

        const operation = Promise.resolve(this.calculateFresh(normalizedInput, requestKey))
        this.inFlight.set(requestKey, operation)

        try {
            return await operation
        } finally {
            this.inFlight.delete(requestKey)
        }
    }

    /**
     * Resolves and normalizes calculator input.
     *
     * @param input Raw calculator input.
     * @returns Normalized calculator input.
     */
    private async normalizeInput(
        input: IAstDriftScoreCalculatorInput,
    ): Promise<INormalizedCalculatorInput> {
        const imports = normalizeImports(input.imports)
        const violations = normalizeViolations(input.violations, imports)
        const commit = normalizeOptionalCommit(input.commit)
        const history = input.history === undefined ? await this.loadHistoryWithRetry() : normalizeHistory(input.history)

        return {
            imports,
            violations,
            history,
            commit,
        }
    }

    /**
     * Calculates fresh drift score result and caches it.
     *
     * @param input Normalized calculator input.
     * @param requestKey Stable request key.
     * @returns Drift score calculator result.
     */
    private calculateFresh(
        input: INormalizedCalculatorInput,
        requestKey: string,
    ): IAstDriftScoreCalculatorResult {
        const totalImportCount = input.imports.length
        const violationCount = input.violations.length
        const driftScore = roundScore(violationCount / totalImportCount)
        const moduleBreakdown = buildModuleBreakdown(input.imports, input.violations)
        const trend = buildTrend(input.history, input.commit, driftScore, this.now)
        const trendStats = buildTrendStats(trend)
        const result: IAstDriftScoreCalculatorResult = {
            modules: moduleBreakdown,
            trend,
            summary: {
                totalImportCount,
                violationCount,
                driftScore,
                driftPercent: roundScore(driftScore * 100),
                moduleCount: moduleBreakdown.length,
                trendPointCount: trend.length,
                trendDirection: trendStats.direction,
                trendDelta: trendStats.delta,
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
     * Loads history with retry/backoff and idempotency cache.
     *
     * @returns Loaded normalized history.
     */
    private async loadHistoryWithRetry(): Promise<readonly IAstDriftHistoryPointInput[]> {
        const cacheKey = "*"
        const now = this.now()
        this.pruneExpiredHistoryCache(now)

        const cached = this.historyCache.get(cacheKey)
        if (cached !== undefined && cached.expiresAt > now) {
            return cloneHistory(cached.value)
        }

        const existingInFlight = this.historyInFlight.get(cacheKey)
        if (existingInFlight !== undefined) {
            return existingInFlight
        }

        const operation = this.loadHistoryWithRetryFresh(cacheKey)
        this.historyInFlight.set(cacheKey, operation)

        try {
            return await operation
        } finally {
            this.historyInFlight.delete(cacheKey)
        }
    }

    /**
     * Loads history with retry/backoff and stores history cache.
     *
     * @param cacheKey Stable history cache key.
     * @returns Loaded normalized history.
     */
    private async loadHistoryWithRetryFresh(
        cacheKey: string,
    ): Promise<readonly IAstDriftHistoryPointInput[]> {
        const loader = ensureLoadHistory(this.loadHistory)
        let lastCauseMessage = "<unknown>"

        for (let attempt = 1; attempt <= this.maxLoadAttempts; attempt += 1) {
            try {
                const loadedHistory = normalizeHistory(await loader())
                const cloned = cloneHistory(loadedHistory)

                this.historyCache.set(cacheKey, {
                    value: cloned,
                    expiresAt: this.now() + this.cacheTtlMs,
                })

                return cloneHistory(cloned)
            } catch (error) {
                lastCauseMessage = error instanceof Error ? error.message : String(error)
                if (attempt >= this.maxLoadAttempts) {
                    throw new AstDriftScoreCalculatorError(
                        AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.RETRY_EXHAUSTED,
                        {
                            attempt,
                            maxLoadAttempts: this.maxLoadAttempts,
                            retryBackoffMs: this.retryBackoffMs,
                            causeMessage: lastCauseMessage,
                        },
                    )
                }

                if (this.retryBackoffMs > 0) {
                    await this.sleep(this.retryBackoffMs)
                }
            }
        }

        throw new AstDriftScoreCalculatorError(
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.RETRY_EXHAUSTED,
            {
                maxLoadAttempts: this.maxLoadAttempts,
                retryBackoffMs: this.retryBackoffMs,
                causeMessage: lastCauseMessage,
            },
        )
    }

    /**
     * Removes expired entries from result cache.
     *
     * @param now Current timestamp.
     */
    private pruneExpiredCache(now: number): void {
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiresAt <= now) {
                this.cache.delete(key)
            }
        }
    }

    /**
     * Removes expired entries from history cache.
     *
     * @param now Current timestamp.
     */
    private pruneExpiredHistoryCache(now: number): void {
        for (const [key, entry] of this.historyCache.entries()) {
            if (entry.expiresAt <= now) {
                this.historyCache.delete(key)
            }
        }
    }
}

interface ITrendStats {
    readonly direction: AstDriftTrendDirection
    readonly delta: number
}

/**
 * Builds module drift breakdown from current imports and violations.
 *
 * @param imports Normalized imports.
 * @param violations Normalized violations.
 * @returns Deterministic module breakdown.
 */
function buildModuleBreakdown(
    imports: readonly IAstDriftImportInput[],
    violations: readonly IAstDriftViolationInput[],
): readonly IAstDriftModuleBreakdownItem[] {
    const importCountByModule = new Map<string, number>()
    const violationCountByModule = new Map<string, number>()

    for (const importEdge of imports) {
        importCountByModule.set(
            importEdge.sourceModule,
            (importCountByModule.get(importEdge.sourceModule) ?? 0) + 1,
        )
    }

    for (const violation of violations) {
        violationCountByModule.set(
            violation.sourceModule,
            (violationCountByModule.get(violation.sourceModule) ?? 0) + 1,
        )
    }

    const moduleNames = Array.from(importCountByModule.keys()).sort((left, right) =>
        left.localeCompare(right),
    )
    return moduleNames.map((moduleName): IAstDriftModuleBreakdownItem => {
        const importCount = importCountByModule.get(moduleName) ?? 0
        const violationCount = violationCountByModule.get(moduleName) ?? 0

        return {
            moduleName,
            importCount,
            violationCount,
            driftScore: importCount === 0 ? 0 : roundScore(violationCount / importCount),
        }
    })
}

/**
 * Builds trend points from history and optional current commit.
 *
 * @param history Historical drift points.
 * @param commit Optional current commit ref.
 * @param driftScore Current drift score.
 * @param now Deterministic clock callback.
 * @returns Deterministic trend points.
 */
function buildTrend(
    history: readonly IAstDriftHistoryPointInput[],
    commit: IAstDriftCommitRef | undefined,
    driftScore: number,
    now: AstDriftScoreCalculatorNow,
): readonly IAstDriftTrendPoint[] {
    const trendPoints = history.map((point): IAstDriftTrendPoint => ({
        commitSha: point.commitSha,
        committedAt: point.committedAt,
        driftScore: roundScore(point.driftScore),
    }))

    const currentPoint: IAstDriftTrendPoint = {
        commitSha: commit?.sha ?? "current",
        committedAt: commit?.committedAt ?? new Date(now()).toISOString(),
        driftScore,
    }
    trendPoints.push(currentPoint)

    trendPoints.sort((left, right) => {
        const dateCompare =
            Date.parse(left.committedAt) - Date.parse(right.committedAt)
        if (dateCompare !== 0) {
            return dateCompare
        }

        return left.commitSha.localeCompare(right.commitSha)
    })

    return trendPoints
}

/**
 * Builds trend direction and delta from trend points.
 *
 * @param trend Trend points.
 * @returns Trend stats.
 */
function buildTrendStats(trend: readonly IAstDriftTrendPoint[]): ITrendStats {
    if (trend.length < 2) {
        return {
            direction: AST_DRIFT_TREND_DIRECTION.STABLE,
            delta: 0,
        }
    }

    const latest = trend[trend.length - 1]
    const previous = trend[trend.length - 2]
    if (latest === undefined || previous === undefined) {
        return {
            direction: AST_DRIFT_TREND_DIRECTION.STABLE,
            delta: 0,
        }
    }

    const delta = roundScore(latest.driftScore - previous.driftScore)
    if (Math.abs(delta) <= STABLE_TREND_EPSILON) {
        return {
            direction: AST_DRIFT_TREND_DIRECTION.STABLE,
            delta: 0,
        }
    }

    if (delta > 0) {
        return {
            direction: AST_DRIFT_TREND_DIRECTION.UP,
            delta,
        }
    }

    return {
        direction: AST_DRIFT_TREND_DIRECTION.DOWN,
        delta,
    }
}

/**
 * Normalizes and validates current imports.
 *
 * @param imports Raw import list.
 * @returns Normalized import list.
 */
function normalizeImports(imports: readonly IAstDriftImportInput[]): readonly IAstDriftImportInput[] {
    const candidateImports: unknown = imports
    if (Array.isArray(candidateImports) === false) {
        throw new AstDriftScoreCalculatorError(
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_IMPORTS,
        )
    }

    if (imports.length === 0) {
        throw new AstDriftScoreCalculatorError(
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.EMPTY_IMPORTS,
        )
    }

    return imports.map((importEdge) => normalizeImport(importEdge))
}

/**
 * Normalizes and validates current violations.
 *
 * @param violations Raw violation list.
 * @param imports Normalized imports for mismatch checks.
 * @returns Normalized violations.
 */
function normalizeViolations(
    violations: readonly IAstDriftViolationInput[],
    imports: readonly IAstDriftImportInput[],
): readonly IAstDriftViolationInput[] {
    const candidateViolations: unknown = violations
    if (Array.isArray(candidateViolations) === false) {
        throw new AstDriftScoreCalculatorError(
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_VIOLATIONS,
        )
    }

    const importKeySet = new Set<string>(
        imports.map((importEdge) => createImportEdgeKey(importEdge.sourcePath, importEdge.targetPath)),
    )
    return violations.map((violation) => normalizeViolation(violation, importKeySet))
}

/**
 * Normalizes and validates one import edge.
 *
 * @param importEdge Raw import edge.
 * @returns Normalized import edge.
 */
function normalizeImport(importEdge: IAstDriftImportInput): IAstDriftImportInput {
    const sourcePath = normalizeFilePath(
        importEdge.sourcePath,
        AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_IMPORT_PATH,
        "source",
    )
    const targetPath = normalizeFilePath(
        importEdge.targetPath,
        AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_IMPORT_PATH,
        "target",
    )

    return {
        sourcePath,
        sourceLayer: normalizeLayer(importEdge.sourceLayer),
        sourceModule: normalizeModule(
            importEdge.sourceModule,
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_IMPORT_MODULE,
        ),
        targetPath,
        targetLayer: normalizeLayer(importEdge.targetLayer),
        targetModule: normalizeModule(
            importEdge.targetModule,
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_IMPORT_MODULE,
        ),
    }
}

/**
 * Normalizes and validates one violation edge.
 *
 * @param violation Raw violation edge.
 * @param importKeySet Set of import-edge keys for mismatch checks.
 * @returns Normalized violation edge.
 */
function normalizeViolation(
    violation: IAstDriftViolationInput,
    importKeySet: ReadonlySet<string>,
): IAstDriftViolationInput {
    const sourcePath = normalizeFilePath(
        violation.sourcePath,
        AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_VIOLATION_PATH,
        "source",
    )
    const targetPath = normalizeFilePath(
        violation.targetPath,
        AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_VIOLATION_PATH,
        "target",
    )
    const importEdgeKey = createImportEdgeKey(sourcePath, targetPath)
    if (importKeySet.has(importEdgeKey) === false) {
        throw new AstDriftScoreCalculatorError(
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.VIOLATION_IMPORT_MISMATCH,
            {
                sourcePath,
                targetPath,
            },
        )
    }

    return {
        sourcePath,
        sourceModule: normalizeModule(
            violation.sourceModule,
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_VIOLATION_MODULE,
        ),
        targetPath,
        targetModule: normalizeModule(
            violation.targetModule,
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_VIOLATION_MODULE,
        ),
    }
}

/**
 * Normalizes and validates optional commit reference.
 *
 * @param commit Raw commit reference.
 * @returns Normalized commit reference.
 */
function normalizeOptionalCommit(commit: IAstDriftCommitRef | undefined): IAstDriftCommitRef | undefined {
    if (commit === undefined) {
        return undefined
    }

    const sha = normalizeCommitSha(
        commit.sha,
        AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_COMMIT_SHA,
    )
    const committedAt = normalizeCommitDate(
        commit.committedAt,
        AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_COMMIT_DATE,
    )

    return {
        sha,
        committedAt,
    }
}

/**
 * Normalizes and validates history list.
 *
 * @param history Raw history list.
 * @returns Normalized history list.
 */
function normalizeHistory(
    history: readonly IAstDriftHistoryPointInput[],
): readonly IAstDriftHistoryPointInput[] {
    const candidateHistory: unknown = history
    if (Array.isArray(candidateHistory) === false) {
        throw new AstDriftScoreCalculatorError(
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_HISTORY,
        )
    }

    const normalized = history.map((historyPoint): IAstDriftHistoryPointInput => ({
        commitSha: normalizeCommitSha(
            historyPoint.commitSha,
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_HISTORY_COMMIT_SHA,
        ),
        committedAt: normalizeCommitDate(
            historyPoint.committedAt,
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_HISTORY_COMMIT_DATE,
        ),
        driftScore: normalizeDriftScore(
            historyPoint.driftScore,
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_HISTORY_DRIFT_SCORE,
        ),
    }))

    normalized.sort((left, right) => {
        const dateCompare =
            Date.parse(left.committedAt) - Date.parse(right.committedAt)
        if (dateCompare !== 0) {
            return dateCompare
        }

        return left.commitSha.localeCompare(right.commitSha)
    })

    return normalized
}

/**
 * Creates stable idempotency key from normalized input.
 *
 * @param input Normalized input.
 * @returns Stable idempotency key.
 */
function createRequestKey(input: INormalizedCalculatorInput): string {
    return JSON.stringify({
        imports: input.imports,
        violations: input.violations,
        history: input.history,
        commit: input.commit,
    })
}

/**
 * Creates deterministic import-edge key.
 *
 * @param sourcePath Source path.
 * @param targetPath Target path.
 * @returns Import-edge key.
 */
function createImportEdgeKey(sourcePath: string, targetPath: string): string {
    return `${sourcePath}|${targetPath}`
}

/**
 * Creates deep clone of calculator result.
 *
 * @param result Calculator result.
 * @returns Cloned calculator result.
 */
function cloneResult(result: IAstDriftScoreCalculatorResult): IAstDriftScoreCalculatorResult {
    return {
        modules: result.modules.map((moduleItem): IAstDriftModuleBreakdownItem => ({
            moduleName: moduleItem.moduleName,
            importCount: moduleItem.importCount,
            violationCount: moduleItem.violationCount,
            driftScore: moduleItem.driftScore,
        })),
        trend: result.trend.map((trendPoint): IAstDriftTrendPoint => ({
            commitSha: trendPoint.commitSha,
            committedAt: trendPoint.committedAt,
            driftScore: trendPoint.driftScore,
        })),
        summary: {
            totalImportCount: result.summary.totalImportCount,
            violationCount: result.summary.violationCount,
            driftScore: result.summary.driftScore,
            driftPercent: result.summary.driftPercent,
            moduleCount: result.summary.moduleCount,
            trendPointCount: result.summary.trendPointCount,
            trendDirection: result.summary.trendDirection,
            trendDelta: result.summary.trendDelta,
            generatedAt: result.summary.generatedAt,
        },
    }
}

/**
 * Creates deep clone of history list.
 *
 * @param history History list.
 * @returns Cloned history list.
 */
function cloneHistory(
    history: readonly IAstDriftHistoryPointInput[],
): readonly IAstDriftHistoryPointInput[] {
    return history.map((historyPoint): IAstDriftHistoryPointInput => ({
        commitSha: historyPoint.commitSha,
        committedAt: historyPoint.committedAt,
        driftScore: historyPoint.driftScore,
    }))
}

/**
 * Rounds score value to stable precision.
 *
 * @param value Raw score value.
 * @returns Rounded score value.
 */
function roundScore(value: number): number {
    return Number(value.toFixed(DRIFT_SCORE_PRECISION))
}

/**
 * Normalizes and validates file path.
 *
 * @param filePath Raw file path.
 * @param code Typed error code.
 * @param side Source/target side for metadata.
 * @returns Normalized file path.
 */
function normalizeFilePath(
    filePath: string,
    code:
        | "INVALID_IMPORT_PATH"
        | "INVALID_VIOLATION_PATH",
    side: "source" | "target",
): string {
    if (typeof filePath !== "string") {
        throw new AstDriftScoreCalculatorError(AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE[code], {
            sourcePath: side === "source" ? String(filePath) : undefined,
            targetPath: side === "target" ? String(filePath) : undefined,
        })
    }

    try {
        return FilePath.create(filePath).toString()
    } catch (error) {
        throw new AstDriftScoreCalculatorError(AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE[code], {
            sourcePath: side === "source" ? filePath : undefined,
            targetPath: side === "target" ? filePath : undefined,
            causeMessage: error instanceof Error ? error.message : String(error),
        })
    }
}

/**
 * Normalizes and validates layer name.
 *
 * @param layerName Raw layer name.
 * @returns Normalized layer name.
 */
function normalizeLayer(layerName: string): string {
    if (typeof layerName !== "string" || layerName.trim().length === 0) {
        throw new AstDriftScoreCalculatorError(
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_IMPORT_LAYER,
            {
                moduleName: typeof layerName === "string" ? layerName : String(layerName),
            },
        )
    }

    return layerName.trim()
}

/**
 * Normalizes and validates module name.
 *
 * @param moduleName Raw module name.
 * @param code Typed error code.
 * @returns Normalized module name.
 */
function normalizeModule(
    moduleName: string,
    code: "INVALID_IMPORT_MODULE" | "INVALID_VIOLATION_MODULE",
): string {
    if (typeof moduleName !== "string" || moduleName.trim().length === 0) {
        throw new AstDriftScoreCalculatorError(AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE[code], {
            moduleName: typeof moduleName === "string" ? moduleName : String(moduleName),
        })
    }

    return moduleName.trim()
}

/**
 * Normalizes and validates commit SHA.
 *
 * @param commitSha Raw commit SHA.
 * @param code Typed error code.
 * @returns Normalized commit SHA.
 */
function normalizeCommitSha(
    commitSha: string,
    code: "INVALID_COMMIT_SHA" | "INVALID_HISTORY_COMMIT_SHA",
): string {
    if (typeof commitSha !== "string" || commitSha.trim().length === 0) {
        throw new AstDriftScoreCalculatorError(AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE[code], {
            commitSha: typeof commitSha === "string" ? commitSha : String(commitSha),
        })
    }

    return commitSha.trim()
}

/**
 * Normalizes and validates commit date.
 *
 * @param committedAt Raw commit date.
 * @param code Typed error code.
 * @returns Normalized commit date.
 */
function normalizeCommitDate(
    committedAt: string,
    code: "INVALID_COMMIT_DATE" | "INVALID_HISTORY_COMMIT_DATE",
): string {
    if (typeof committedAt !== "string" || committedAt.trim().length === 0) {
        throw new AstDriftScoreCalculatorError(AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE[code], {
            committedAt: typeof committedAt === "string" ? committedAt : String(committedAt),
        })
    }

    const normalized = committedAt.trim()
    if (Number.isNaN(Date.parse(normalized))) {
        throw new AstDriftScoreCalculatorError(AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE[code], {
            committedAt: normalized,
        })
    }

    return normalized
}

/**
 * Normalizes and validates drift score in [0..1].
 *
 * @param driftScore Raw drift score.
 * @param code Typed error code.
 * @returns Normalized drift score.
 */
function normalizeDriftScore(
    driftScore: number,
    code: "INVALID_HISTORY_DRIFT_SCORE",
): number {
    if (Number.isFinite(driftScore) === false || driftScore < 0 || driftScore > 1) {
        throw new AstDriftScoreCalculatorError(AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE[code], {
            driftScore,
        })
    }

    return roundScore(driftScore)
}

/**
 * Validates optional loadHistory callback.
 *
 * @param loadHistory Optional loadHistory callback.
 * @returns Validated loadHistory callback.
 */
function validateOptionalLoadHistory(
    loadHistory: AstDriftScoreCalculatorLoadHistory | undefined,
): AstDriftScoreCalculatorLoadHistory | undefined {
    if (loadHistory !== undefined && typeof loadHistory !== "function") {
        throw new AstDriftScoreCalculatorError(
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_LOAD_HISTORY,
        )
    }

    return loadHistory
}

/**
 * Ensures loadHistory callback exists.
 *
 * @param loadHistory Optional loadHistory callback.
 * @returns loadHistory callback.
 */
function ensureLoadHistory(
    loadHistory: AstDriftScoreCalculatorLoadHistory | undefined,
): AstDriftScoreCalculatorLoadHistory {
    if (loadHistory === undefined) {
        throw new AstDriftScoreCalculatorError(
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_LOAD_HISTORY,
        )
    }

    return loadHistory
}

/**
 * Validates max load attempts option.
 *
 * @param maxLoadAttempts Raw max load attempts value.
 * @returns Validated max load attempts.
 */
function validateMaxLoadAttempts(maxLoadAttempts: number): number {
    if (Number.isInteger(maxLoadAttempts) === false || maxLoadAttempts <= 0) {
        throw new AstDriftScoreCalculatorError(
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_MAX_LOAD_ATTEMPTS,
            {
                maxLoadAttempts,
            },
        )
    }

    return maxLoadAttempts
}

/**
 * Validates retry backoff option.
 *
 * @param retryBackoffMs Raw retry backoff value.
 * @returns Validated retry backoff.
 */
function validateRetryBackoffMs(retryBackoffMs: number): number {
    if (Number.isFinite(retryBackoffMs) === false || retryBackoffMs < 0) {
        throw new AstDriftScoreCalculatorError(
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_RETRY_BACKOFF_MS,
            {
                retryBackoffMs,
            },
        )
    }

    return retryBackoffMs
}

/**
 * Validates cache TTL option.
 *
 * @param cacheTtlMs Raw cache TTL value.
 * @returns Validated cache TTL.
 */
function validateCacheTtlMs(cacheTtlMs: number): number {
    if (Number.isFinite(cacheTtlMs) === false || cacheTtlMs < 0) {
        throw new AstDriftScoreCalculatorError(
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_CACHE_TTL_MS,
            {
                cacheTtlMs,
            },
        )
    }

    return cacheTtlMs
}

/**
 * Validates sleep callback option.
 *
 * @param sleep Raw sleep callback.
 * @returns Validated sleep callback.
 */
function validateSleep(sleep: AstDriftScoreCalculatorSleep): AstDriftScoreCalculatorSleep {
    if (typeof sleep !== "function") {
        throw new AstDriftScoreCalculatorError(
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_SLEEP,
        )
    }

    return sleep
}

/**
 * Default sleep callback for retry backoff.
 *
 * @param milliseconds Sleep duration.
 * @returns Promise resolved after provided timeout.
 */
async function defaultSleep(milliseconds: number): Promise<void> {
    await new Promise<void>((resolve) => {
        setTimeout(resolve, milliseconds)
    })
}
