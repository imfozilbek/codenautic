import {FilePath} from "@codenautic/core"

import {
    AST_SERVICE_RESULT_CACHING_ERROR_CODE,
    AstServiceResultCachingError,
    type AstServiceResultCachingErrorCode,
} from "./ast-service-result-caching.error"
import {
    AstServiceClientLibrary,
    type IAstGetCodeGraphInput,
    type IAstGetCodeGraphResult,
    type IAstGetFileMetricsInput,
    type IAstGetFileMetricsResult,
    type IAstRepositoryScanStatusInput,
    type IAstRepositoryScanStatusResult,
    type IAstServiceClientLibrary,
} from "./ast-service-client-library.service"

const DEFAULT_CACHE_TTL_MS = 300_000
const DEFAULT_MAX_CACHE_ENTRIES = 2_000
const DEFAULT_RETRY_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_INITIAL_BACKOFF_MS = 40
const DEFAULT_RETRY_MAX_BACKOFF_MS = 400

/**
 * Sleep callback used by result caching retry/backoff handling.
 */
export type AstServiceResultCachingSleep = (durationMs: number) => Promise<void>

/**
 * Clock callback used by result caching service.
 */
export type AstServiceResultCachingNow = () => number

/**
 * Retry classifier callback for client fetch failures.
 */
export type AstServiceResultCachingShouldRetry = (error: unknown, attempt: number) => boolean

/**
 * Retry policy input for result fetching.
 */
export interface IAstServiceResultCachingRetryPolicyInput {
    /**
     * Maximum number of attempts including first execution.
     */
    readonly maxAttempts?: number

    /**
     * Initial exponential backoff in milliseconds.
     */
    readonly initialBackoffMs?: number

    /**
     * Maximum capped backoff in milliseconds.
     */
    readonly maxBackoffMs?: number
}

/**
 * Base input payload for cached reads.
 */
export interface IAstServiceResultCachingBaseInput {
    /**
     * Optional cache TTL override in milliseconds.
     */
    readonly cacheTtlMs?: number

    /**
     * Forces refresh from source and bypasses cached entry.
     */
    readonly forceRefresh?: boolean

    /**
     * Optional idempotency key for in-flight deduplication.
     */
    readonly idempotencyKey?: string

    /**
     * Optional retry policy override.
     */
    readonly retryPolicy?: IAstServiceResultCachingRetryPolicyInput
}

/**
 * Input payload for cached code graph retrieval.
 */
export interface IAstServiceCachedCodeGraphInput extends IAstServiceResultCachingBaseInput {
    /**
     * Repository identifier.
     */
    readonly repositoryId: string

    /**
     * Optional branch name.
     */
    readonly branch?: string
}

/**
 * Input payload for cached file metrics retrieval.
 */
export interface IAstServiceCachedFileMetricsInput extends IAstServiceResultCachingBaseInput {
    /**
     * Repository identifier.
     */
    readonly repositoryId: string

    /**
     * Commit sha snapshot.
     */
    readonly commitSha: string

    /**
     * Optional file path filter.
     */
    readonly filePaths?: readonly string[]
}

/**
 * Input payload for cached scan status retrieval.
 */
export interface IAstServiceCachedScanStatusInput extends IAstServiceResultCachingBaseInput {
    /**
     * Scan request identifier.
     */
    readonly requestId: string
}

/**
 * Generic cached fetch response.
 */
export interface IAstServiceCachedFetchResult<TResult> {
    /**
     * Fetched value payload.
     */
    readonly value: TResult

    /**
     * Indicates whether result comes from cache.
     */
    readonly fromCache: boolean

    /**
     * Stable cache key.
     */
    readonly cacheKey: string

    /**
     * Cache entry creation timestamp.
     */
    readonly cachedAtUnixMs: number

    /**
     * Cache entry expiration timestamp.
     */
    readonly expiresAtUnixMs: number

    /**
     * Attempts used to fetch source value.
     */
    readonly attempts: number
}

/**
 * Runtime options for AST result caching service.
 */
export interface IAstServiceResultCachingServiceOptions {
    /**
     * Optional AST service client library dependency.
     */
    readonly client?: IAstServiceClientLibrary

    /**
     * Optional default cache TTL in milliseconds.
     */
    readonly defaultCacheTtlMs?: number

    /**
     * Optional maximum cache entries bound.
     */
    readonly maxCacheEntries?: number

    /**
     * Optional default retry policy.
     */
    readonly defaultRetryPolicy?: IAstServiceResultCachingRetryPolicyInput

    /**
     * Optional sleep callback for retry/backoff behavior.
     */
    readonly sleep?: AstServiceResultCachingSleep

    /**
     * Optional clock callback.
     */
    readonly now?: AstServiceResultCachingNow

    /**
     * Optional retry classifier callback.
     */
    readonly shouldRetry?: AstServiceResultCachingShouldRetry
}

/**
 * AST result caching layer contract.
 */
export interface IAstServiceResultCachingService {
    /**
     * Returns cached or fresh code graph.
     *
     * @param input Code graph cache input.
     * @returns Cached fetch result.
     */
    getCodeGraph(
        input: IAstServiceCachedCodeGraphInput,
    ): Promise<IAstServiceCachedFetchResult<IAstGetCodeGraphResult>>

    /**
     * Returns cached or fresh file metrics.
     *
     * @param input File metrics cache input.
     * @returns Cached fetch result.
     */
    getFileMetrics(
        input: IAstServiceCachedFileMetricsInput,
    ): Promise<IAstServiceCachedFetchResult<IAstGetFileMetricsResult>>

    /**
     * Returns cached or fresh scan status.
     *
     * @param input Scan status cache input.
     * @returns Cached fetch result.
     */
    getRepositoryScanStatus(
        input: IAstServiceCachedScanStatusInput,
    ): Promise<IAstServiceCachedFetchResult<IAstRepositoryScanStatusResult>>

    /**
     * Invalidates cache entries for repository.
     *
     * @param repositoryId Repository identifier.
     * @returns Number of removed entries.
     */
    invalidateRepository(repositoryId: string): number

    /**
     * Invalidates cache entry for request identifier.
     *
     * @param requestId Scan request identifier.
     * @returns Number of removed entries.
     */
    invalidateRequest(requestId: string): number

    /**
     * Clears all cached and in-flight entries.
     */
    clear(): void
}

interface IResolvedRetryPolicy {
    readonly maxAttempts: number
    readonly initialBackoffMs: number
    readonly maxBackoffMs: number
}

interface ICachedEntry<TResult> {
    readonly value: TResult
    readonly cacheKey: string
    readonly methodName: string
    readonly repositoryId?: string
    readonly requestId?: string
    readonly cachedAtUnixMs: number
    readonly expiresAtUnixMs: number
}

interface IResolvedFetchInput<TResult> {
    readonly methodName: string
    readonly cacheKey: string
    readonly repositoryId?: string
    readonly requestId?: string
    readonly forceRefresh: boolean
    readonly cacheTtlMs: number
    readonly retryPolicy: IResolvedRetryPolicy
    readonly idempotencyKey?: string
    readonly fetch: () => Promise<TResult>
}

interface IFetchWithRetryResult<TResult> {
    readonly value: TResult
    readonly attempts: number
}

/**
 * AST result caching layer with TTL, in-flight deduplication and retry/backoff.
 */
export class AstServiceResultCachingService implements IAstServiceResultCachingService {
    private readonly client: IAstServiceClientLibrary
    private readonly defaultCacheTtlMs: number
    private readonly maxCacheEntries: number
    private readonly defaultRetryPolicy?: IAstServiceResultCachingRetryPolicyInput
    private readonly sleep: AstServiceResultCachingSleep
    private readonly now: AstServiceResultCachingNow
    private readonly shouldRetry: AstServiceResultCachingShouldRetry
    private readonly cache = new Map<string, ICachedEntry<unknown>>()
    private readonly inFlightByKey = new Map<string, Promise<IAstServiceCachedFetchResult<unknown>>>()

    /**
     * Creates AST result caching service.
     *
     * @param options Optional runtime overrides.
     */
    public constructor(options: IAstServiceResultCachingServiceOptions = {}) {
        this.client = options.client ?? new AstServiceClientLibrary()
        this.defaultCacheTtlMs = validatePositiveInteger(
            options.defaultCacheTtlMs ?? DEFAULT_CACHE_TTL_MS,
            AST_SERVICE_RESULT_CACHING_ERROR_CODE.INVALID_CACHE_TTL_MS,
        )
        this.maxCacheEntries = validatePositiveInteger(
            options.maxCacheEntries ?? DEFAULT_MAX_CACHE_ENTRIES,
            AST_SERVICE_RESULT_CACHING_ERROR_CODE.INVALID_MAX_CACHE_ENTRIES,
        )
        this.defaultRetryPolicy = options.defaultRetryPolicy
        this.sleep = options.sleep ?? sleepFor
        this.now = options.now ?? Date.now
        this.shouldRetry = options.shouldRetry ?? defaultShouldRetry
    }

    /**
     * Returns cached or fresh code graph.
     *
     * @param input Code graph cache input.
     * @returns Cached fetch result.
     */
    public getCodeGraph(
        input: IAstServiceCachedCodeGraphInput,
    ): Promise<IAstServiceCachedFetchResult<IAstGetCodeGraphResult>> {
        const repositoryId = normalizeRepositoryId(input.repositoryId)
        const branch = normalizeOptionalToken(input.branch)
        const fetchInput: IResolvedFetchInput<IAstGetCodeGraphResult> = {
            methodName: "GetCodeGraph",
            cacheKey: resolveCacheKey({
                methodName: "GetCodeGraph",
                repositoryId,
                branch,
            }),
            repositoryId,
            requestId: undefined,
            forceRefresh: input.forceRefresh === true,
            cacheTtlMs: validatePositiveInteger(
                input.cacheTtlMs ?? this.defaultCacheTtlMs,
                AST_SERVICE_RESULT_CACHING_ERROR_CODE.INVALID_CACHE_TTL_MS,
            ),
            retryPolicy: resolveRetryPolicy(input.retryPolicy, this.defaultRetryPolicy),
            idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
            fetch: async () =>
                this.client.getCodeGraph({
                    repositoryId,
                    ...(branch !== undefined ? {branch} : {}),
                } satisfies IAstGetCodeGraphInput),
        }

        return this.resolveCachedOrFetch(fetchInput)
    }

    /**
     * Returns cached or fresh file metrics.
     *
     * @param input File metrics cache input.
     * @returns Cached fetch result.
     */
    public getFileMetrics(
        input: IAstServiceCachedFileMetricsInput,
    ): Promise<IAstServiceCachedFetchResult<IAstGetFileMetricsResult>> {
        const repositoryId = normalizeRepositoryId(input.repositoryId)
        const commitSha = normalizeCommitSha(input.commitSha)
        const filePaths = normalizeFilePaths(input.filePaths)
        const fetchInput: IResolvedFetchInput<IAstGetFileMetricsResult> = {
            methodName: "GetFileMetrics",
            cacheKey: resolveCacheKey({
                methodName: "GetFileMetrics",
                repositoryId,
                commitSha,
                filePaths,
            }),
            repositoryId,
            requestId: undefined,
            forceRefresh: input.forceRefresh === true,
            cacheTtlMs: validatePositiveInteger(
                input.cacheTtlMs ?? this.defaultCacheTtlMs,
                AST_SERVICE_RESULT_CACHING_ERROR_CODE.INVALID_CACHE_TTL_MS,
            ),
            retryPolicy: resolveRetryPolicy(input.retryPolicy, this.defaultRetryPolicy),
            idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
            fetch: async () =>
                this.client.getFileMetrics({
                    repositoryId,
                    commitSha,
                    filePaths,
                } satisfies IAstGetFileMetricsInput),
        }

        return this.resolveCachedOrFetch(fetchInput)
    }

    /**
     * Returns cached or fresh scan status.
     *
     * @param input Scan status cache input.
     * @returns Cached fetch result.
     */
    public getRepositoryScanStatus(
        input: IAstServiceCachedScanStatusInput,
    ): Promise<IAstServiceCachedFetchResult<IAstRepositoryScanStatusResult>> {
        const requestId = normalizeRequestId(input.requestId)
        const fetchInput: IResolvedFetchInput<IAstRepositoryScanStatusResult> = {
            methodName: "GetRepositoryScanStatus",
            cacheKey: resolveCacheKey({
                methodName: "GetRepositoryScanStatus",
                requestId,
            }),
            repositoryId: undefined,
            requestId,
            forceRefresh: input.forceRefresh === true,
            cacheTtlMs: validatePositiveInteger(
                input.cacheTtlMs ?? this.defaultCacheTtlMs,
                AST_SERVICE_RESULT_CACHING_ERROR_CODE.INVALID_CACHE_TTL_MS,
            ),
            retryPolicy: resolveRetryPolicy(input.retryPolicy, this.defaultRetryPolicy),
            idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
            fetch: async () =>
                this.client.getRepositoryScanStatus({
                    requestId,
                } satisfies IAstRepositoryScanStatusInput),
        }

        return this.resolveCachedOrFetch(fetchInput)
    }

    /**
     * Invalidates cache entries for repository.
     *
     * @param repositoryId Repository identifier.
     * @returns Number of removed entries.
     */
    public invalidateRepository(repositoryId: string): number {
        const normalizedRepositoryId = normalizeRepositoryId(repositoryId)
        let removed = 0

        for (const [cacheKey, entry] of this.cache.entries()) {
            if (entry.repositoryId !== normalizedRepositoryId) {
                continue
            }

            this.cache.delete(cacheKey)
            removed += 1
        }

        return removed
    }

    /**
     * Invalidates cache entry for request identifier.
     *
     * @param requestId Scan request identifier.
     * @returns Number of removed entries.
     */
    public invalidateRequest(requestId: string): number {
        const normalizedRequestId = normalizeRequestId(requestId)
        let removed = 0

        for (const [cacheKey, entry] of this.cache.entries()) {
            if (entry.requestId !== normalizedRequestId) {
                continue
            }

            this.cache.delete(cacheKey)
            removed += 1
        }

        return removed
    }

    /**
     * Clears all cached and in-flight entries.
     */
    public clear(): void {
        this.cache.clear()
        this.inFlightByKey.clear()
    }

    /**
     * Resolves result from cache or source with in-flight deduplication.
     *
     * @param input Resolved fetch input.
     * @returns Cached fetch result.
     */
    private async resolveCachedOrFetch<TResult>(
        input: IResolvedFetchInput<TResult>,
    ): Promise<IAstServiceCachedFetchResult<TResult>> {
        const now = this.now()
        if (input.forceRefresh === false) {
            const cached = this.resolveCachedEntry<TResult>(input.cacheKey, now)
            if (cached !== undefined) {
                return {
                    value: cached.value,
                    fromCache: true,
                    cacheKey: cached.cacheKey,
                    cachedAtUnixMs: cached.cachedAtUnixMs,
                    expiresAtUnixMs: cached.expiresAtUnixMs,
                    attempts: 0,
                }
            }
        }

        const inFlightKey = input.idempotencyKey ?? input.cacheKey
        const existingInFlight = this.inFlightByKey.get(inFlightKey)
        if (existingInFlight !== undefined) {
            const existingResult = await existingInFlight
            return existingResult as IAstServiceCachedFetchResult<TResult>
        }

        const fetchPromise = this.fetchAndCache<TResult>(inFlightKey, input)
        this.inFlightByKey.set(
            inFlightKey,
            fetchPromise as Promise<IAstServiceCachedFetchResult<unknown>>,
        )

        try {
            return await fetchPromise
        } finally {
            this.inFlightByKey.delete(inFlightKey)
        }
    }

    /**
     * Fetches fresh value, persists cache entry and returns fetch payload.
     *
     * @param inFlightKey In-flight deduplication key.
     * @param input Resolved fetch input.
     * @returns Cached fetch result.
     */
    private async fetchAndCache<TResult>(
        inFlightKey: string,
        input: IResolvedFetchInput<TResult>,
    ): Promise<IAstServiceCachedFetchResult<TResult>> {
        const fetchResult = await this.fetchWithRetry(input.methodName, input.retryPolicy, input.fetch)
        const cachedAtUnixMs = this.now()
        const entry: ICachedEntry<TResult> = {
            value: fetchResult.value,
            cacheKey: input.cacheKey,
            methodName: input.methodName,
            repositoryId: input.repositoryId,
            requestId: input.requestId,
            cachedAtUnixMs,
            expiresAtUnixMs: cachedAtUnixMs + input.cacheTtlMs,
        }

        this.persistCacheEntry(input.cacheKey, entry, inFlightKey)
        return {
            value: fetchResult.value,
            fromCache: false,
            cacheKey: input.cacheKey,
            cachedAtUnixMs: entry.cachedAtUnixMs,
            expiresAtUnixMs: entry.expiresAtUnixMs,
            attempts: fetchResult.attempts,
        }
    }

    /**
     * Fetches value with retry/backoff policy.
     *
     * @param methodName Source method name.
     * @param retryPolicy Resolved retry policy.
     * @param fetch Fetch callback.
     * @returns Value and attempts count.
     */
    private async fetchWithRetry<TResult>(
        methodName: string,
        retryPolicy: IResolvedRetryPolicy,
        fetch: () => Promise<TResult>,
    ): Promise<IFetchWithRetryResult<TResult>> {
        let attempt = 0
        let lastError: unknown

        while (attempt < retryPolicy.maxAttempts) {
            attempt += 1

            try {
                return {
                    value: await fetch(),
                    attempts: attempt,
                }
            } catch (error) {
                lastError = error
                const canRetry = attempt < retryPolicy.maxAttempts && this.shouldRetry(error, attempt)
                if (canRetry) {
                    await this.sleep(resolveBackoffMs(attempt, retryPolicy))
                    continue
                }

                if (attempt >= retryPolicy.maxAttempts) {
                    throw new AstServiceResultCachingError(
                        AST_SERVICE_RESULT_CACHING_ERROR_CODE.RETRY_EXHAUSTED,
                        {
                            methodName,
                            attempts: attempt,
                            causeMessage: resolveUnknownErrorMessage(error),
                        },
                    )
                }

                throw new AstServiceResultCachingError(
                    AST_SERVICE_RESULT_CACHING_ERROR_CODE.RESULT_FETCH_FAILED,
                    {
                        methodName,
                        causeMessage: resolveUnknownErrorMessage(error),
                    },
                )
            }
        }

        throw new AstServiceResultCachingError(
            AST_SERVICE_RESULT_CACHING_ERROR_CODE.RETRY_EXHAUSTED,
            {
                methodName,
                attempts: retryPolicy.maxAttempts,
                causeMessage: resolveUnknownErrorMessage(lastError),
            },
        )
    }

    /**
     * Resolves cached entry and evicts expired records.
     *
     * @param cacheKey Stable cache key.
     * @param now Current timestamp.
     * @returns Cached entry when valid.
     */
    private resolveCachedEntry<TResult>(
        cacheKey: string,
        now: number,
    ): ICachedEntry<TResult> | undefined {
        const entry = this.cache.get(cacheKey)
        if (entry === undefined) {
            return undefined
        }

        if (entry.expiresAtUnixMs > now) {
            return entry as ICachedEntry<TResult>
        }

        this.cache.delete(cacheKey)
        return undefined
    }

    /**
     * Persists cache entry in bounded map.
     *
     * @param cacheKey Stable cache key.
     * @param entry Cache entry.
     * @param inFlightKey In-flight deduplication key.
     */
    private persistCacheEntry<TResult>(
        cacheKey: string,
        entry: ICachedEntry<TResult>,
        inFlightKey: string,
    ): void {
        if (cacheKey.length === 0 || inFlightKey.length === 0) {
            throw new AstServiceResultCachingError(
                AST_SERVICE_RESULT_CACHING_ERROR_CODE.CACHE_KEY_RESOLUTION_FAILED,
                {
                    methodName: entry.methodName,
                },
            )
        }

        if (this.cache.size >= this.maxCacheEntries && this.cache.has(cacheKey) === false) {
            const firstKey = this.cache.keys().next().value
            if (firstKey !== undefined) {
                this.cache.delete(firstKey)
            }
        }

        this.cache.set(cacheKey, entry as ICachedEntry<unknown>)
    }
}

interface IResolveCacheKeyInput {
    readonly methodName: string
    readonly repositoryId?: string
    readonly commitSha?: string
    readonly requestId?: string
    readonly branch?: string
    readonly filePaths?: readonly string[]
}

/**
 * Resolves stable deterministic cache key from normalized input values.
 *
 * @param input Normalized key input.
 * @returns Stable cache key.
 */
function resolveCacheKey(input: IResolveCacheKeyInput): string {
    return [
        `method:${input.methodName}`,
        `repo:${input.repositoryId ?? ""}`,
        `commit:${input.commitSha ?? ""}`,
        `request:${input.requestId ?? ""}`,
        `branch:${input.branch ?? ""}`,
        `paths:${(input.filePaths ?? []).join(",")}`,
    ].join("|")
}

/**
 * Resolves and validates retry policy.
 *
 * @param retryPolicy Optional request-level retry policy.
 * @param defaultRetryPolicy Optional service-level retry policy.
 * @returns Resolved retry policy.
 */
function resolveRetryPolicy(
    retryPolicy: IAstServiceResultCachingRetryPolicyInput | undefined,
    defaultRetryPolicy: IAstServiceResultCachingRetryPolicyInput | undefined,
): IResolvedRetryPolicy {
    const source = retryPolicy ?? defaultRetryPolicy
    const maxAttempts = validatePositiveInteger(
        source?.maxAttempts ?? DEFAULT_RETRY_MAX_ATTEMPTS,
        AST_SERVICE_RESULT_CACHING_ERROR_CODE.INVALID_RETRY_MAX_ATTEMPTS,
    )
    const initialBackoffMs = validatePositiveInteger(
        source?.initialBackoffMs ?? DEFAULT_RETRY_INITIAL_BACKOFF_MS,
        AST_SERVICE_RESULT_CACHING_ERROR_CODE.INVALID_RETRY_INITIAL_BACKOFF_MS,
    )
    const maxBackoffMs = validatePositiveInteger(
        source?.maxBackoffMs ?? DEFAULT_RETRY_MAX_BACKOFF_MS,
        AST_SERVICE_RESULT_CACHING_ERROR_CODE.INVALID_RETRY_MAX_BACKOFF_MS,
    )

    if (maxBackoffMs < initialBackoffMs) {
        throw new AstServiceResultCachingError(
            AST_SERVICE_RESULT_CACHING_ERROR_CODE.INVALID_RETRY_MAX_BACKOFF_MS,
            {
                value: maxBackoffMs,
            },
        )
    }

    return {
        maxAttempts,
        initialBackoffMs,
        maxBackoffMs,
    }
}

/**
 * Normalizes repository id.
 *
 * @param repositoryId Raw repository id.
 * @returns Normalized repository id.
 */
function normalizeRepositoryId(repositoryId: string): string {
    const normalizedRepositoryId = repositoryId.trim()
    if (normalizedRepositoryId.length > 0) {
        return normalizedRepositoryId
    }

    throw new AstServiceResultCachingError(
        AST_SERVICE_RESULT_CACHING_ERROR_CODE.INVALID_REPOSITORY_ID,
        {
            repositoryId,
        },
    )
}

/**
 * Normalizes commit sha.
 *
 * @param commitSha Raw commit sha.
 * @returns Normalized commit sha.
 */
function normalizeCommitSha(commitSha: string): string {
    const normalizedCommitSha = commitSha.trim()
    const commitShaPattern = /^[a-f0-9]{7,64}$/i

    if (commitShaPattern.test(normalizedCommitSha)) {
        return normalizedCommitSha
    }

    throw new AstServiceResultCachingError(
        AST_SERVICE_RESULT_CACHING_ERROR_CODE.INVALID_COMMIT_SHA,
        {
            commitSha,
        },
    )
}

/**
 * Normalizes request id.
 *
 * @param requestId Raw request id.
 * @returns Normalized request id.
 */
function normalizeRequestId(requestId: string): string {
    const normalizedRequestId = requestId.trim()
    if (normalizedRequestId.length > 0) {
        return normalizedRequestId
    }

    throw new AstServiceResultCachingError(
        AST_SERVICE_RESULT_CACHING_ERROR_CODE.INVALID_REQUEST_ID,
        {
            requestId,
        },
    )
}

/**
 * Normalizes optional idempotency key.
 *
 * @param idempotencyKey Optional idempotency key.
 * @returns Normalized idempotency key.
 */
function normalizeIdempotencyKey(idempotencyKey: string | undefined): string | undefined {
    if (idempotencyKey === undefined) {
        return undefined
    }

    const normalizedIdempotencyKey = idempotencyKey.trim()
    if (normalizedIdempotencyKey.length > 0) {
        return normalizedIdempotencyKey
    }

    throw new AstServiceResultCachingError(
        AST_SERVICE_RESULT_CACHING_ERROR_CODE.INVALID_IDEMPOTENCY_KEY,
        {
            idempotencyKey,
        },
    )
}

/**
 * Normalizes optional token value.
 *
 * @param value Optional raw token.
 * @returns Normalized token or undefined.
 */
function normalizeOptionalToken(value: string | undefined): string | undefined {
    if (value === undefined) {
        return undefined
    }

    const normalizedValue = value.trim()
    if (normalizedValue.length > 0) {
        return normalizedValue
    }

    return undefined
}

/**
 * Normalizes optional file path list.
 *
 * @param filePaths Optional file path list.
 * @returns Sorted unique normalized file paths.
 */
function normalizeFilePaths(filePaths: readonly string[] | undefined): readonly string[] {
    if (filePaths === undefined) {
        return []
    }

    const normalized = new Set<string>()
    for (const filePath of filePaths) {
        try {
            normalized.add(FilePath.create(filePath).toString())
        } catch {
            throw new AstServiceResultCachingError(
                AST_SERVICE_RESULT_CACHING_ERROR_CODE.INVALID_FILE_PATH,
                {
                    filePath,
                },
            )
        }
    }

    return [...normalized].sort((left, right) => left.localeCompare(right))
}

/**
 * Validates positive integer values.
 *
 * @param value Raw numeric value.
 * @param errorCode Typed error code.
 * @returns Validated value.
 */
function validatePositiveInteger(
    value: number,
    errorCode: AstServiceResultCachingErrorCode,
): number {
    if (Number.isSafeInteger(value) && value > 0) {
        return value
    }

    throw new AstServiceResultCachingError(errorCode, {value})
}

/**
 * Resolves bounded exponential backoff delay.
 *
 * @param attempt Current attempt number.
 * @param retryPolicy Resolved retry policy.
 * @returns Backoff delay.
 */
function resolveBackoffMs(attempt: number, retryPolicy: IResolvedRetryPolicy): number {
    const exponent = Math.max(0, attempt - 1)
    const backoffMs = retryPolicy.initialBackoffMs * 2 ** exponent
    return Math.min(retryPolicy.maxBackoffMs, backoffMs)
}

/**
 * Default retry classifier.
 *
 * @param error Unknown failure payload.
 * @returns `true` when retry should continue.
 */
function defaultShouldRetry(error: unknown): boolean {
    if (typeof error !== "object" || error === null) {
        return true
    }

    const retryable = (error as {readonly retryable?: unknown}).retryable
    if (typeof retryable === "boolean") {
        return retryable
    }

    return true
}

/**
 * Default sleep callback.
 *
 * @param durationMs Sleep duration in milliseconds.
 * @returns Promise resolved after delay.
 */
function sleepFor(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, durationMs)
    })
}

/**
 * Resolves unknown error into stable message.
 *
 * @param error Unknown error payload.
 * @returns Stable message.
 */
function resolveUnknownErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    return "Unknown error"
}
