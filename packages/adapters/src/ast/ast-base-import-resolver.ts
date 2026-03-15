import {access} from "node:fs/promises"
import pathPosix from "node:path/posix"

import {FilePath} from "@codenautic/core"

import {
    AST_BASE_IMPORT_RESOLVER_ERROR_CODE,
    AstBaseImportResolverError,
    type AstBaseImportResolverErrorCode,
} from "./ast-base-import-resolver.error"
import {AstImportResolutionCache} from "./ast-import-resolution-cache"

const DEFAULT_FILE_EXTENSION_CANDIDATES = [
    ".ts",
    ".tsx",
    ".mts",
    ".cts",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".json",
] as const
const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_INITIAL_BACKOFF_MS = 50
const DEFAULT_MAX_BACKOFF_MS = 1_000
const DEFAULT_IDEMPOTENCY_CACHE_SIZE = 10_000

/**
 * Sleep function used by retry/backoff logic.
 */
export type AstBaseImportResolverSleep = (durationMs: number) => Promise<void>

/**
 * Clock function used for duration metrics.
 */
export type AstBaseImportResolverNow = () => number

/**
 * Retry decision callback for failed resolution attempts.
 */
export type AstBaseImportResolverShouldRetry = (error: unknown, attempt: number) => boolean

/**
 * File existence predicate used by resolver.
 */
export type AstBaseImportResolverPathExists = (filePath: string) => Promise<boolean>

/**
 * Retry policy for resolution attempts.
 */
export interface IAstBaseImportResolverRetryPolicy {
    /**
     * Maximum number of attempts including initial resolution.
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
    readonly shouldRetry?: AstBaseImportResolverShouldRetry
}

/**
 * Import-resolution input payload.
 */
export interface IAstBaseImportResolutionInput {
    /**
     * Repository-relative source file path that owns import statement.
     */
    readonly sourceFilePath: string

    /**
     * Raw import source from source file.
     */
    readonly importSource: string

    /**
     * Optional stable idempotency key.
     */
    readonly idempotencyKey?: string

    /**
     * Optional per-resolution retry policy override.
     */
    readonly retryPolicy?: IAstBaseImportResolverRetryPolicy
}

/**
 * Normalized non-relative resolution input passed to subclasses.
 */
export interface IAstBaseNonRelativeImportResolutionInput {
    /**
     * Repository-relative source file path.
     */
    readonly sourceFilePath: string

    /**
     * Repository-relative source directory path.
     */
    readonly sourceDirectoryPath: string

    /**
     * Normalized import source.
     */
    readonly importSource: string

    /**
     * Normalized extension candidates.
     */
    readonly fileExtensionCandidates: readonly string[]
}

/**
 * Import-resolution result payload.
 */
export interface IAstBaseImportResolutionResult {
    /**
     * Repository-relative source file path.
     */
    readonly sourceFilePath: string

    /**
     * Normalized import source.
     */
    readonly importSource: string

    /**
     * True when import source is relative.
     */
    readonly isRelativeImport: boolean

    /**
     * Candidate target paths used during resolution.
     */
    readonly candidateFilePaths: readonly string[]

    /**
     * Resolved target file path when candidate exists.
     */
    readonly resolvedFilePath: string | null

    /**
     * Attempts executed before successful completion.
     */
    readonly attempts: number

    /**
     * Resolution duration in milliseconds.
     */
    readonly durationMs: number
}

/**
 * Runtime options for base import resolver.
 */
export interface IAstBaseImportResolverOptions {
    /**
     * Optional extension candidates used for relative imports without extension.
     */
    readonly fileExtensionCandidates?: readonly string[]

    /**
     * Optional file existence predicate override.
     */
    readonly pathExists?: AstBaseImportResolverPathExists

    /**
     * Optional default retry policy.
     */
    readonly retryPolicy?: IAstBaseImportResolverRetryPolicy

    /**
     * Optional sleep override for retry/backoff.
     */
    readonly sleep?: AstBaseImportResolverSleep

    /**
     * Optional clock override for duration metrics.
     */
    readonly now?: AstBaseImportResolverNow

    /**
     * Optional bounded idempotency cache size.
     */
    readonly idempotencyCacheSize?: number
}

interface IAstBaseImportResolverNormalizedRetryPolicy {
    readonly maxAttempts: number
    readonly initialBackoffMs: number
    readonly maxBackoffMs: number
    readonly shouldRetry: AstBaseImportResolverShouldRetry
}

interface IAstBaseImportResolverNormalizedInput {
    readonly sourceFilePath: string
    readonly sourceDirectoryPath: string
    readonly importSource: string
    readonly cacheKey: string
    readonly retryPolicy: IAstBaseImportResolverNormalizedRetryPolicy
}

/**
 * Abstract base class for language-specific import resolvers.
 */
export abstract class AstBaseImportResolver {
    private readonly fileExtensionCandidates: readonly string[]
    private readonly pathExists: AstBaseImportResolverPathExists
    private readonly retryPolicy: IAstBaseImportResolverNormalizedRetryPolicy
    private readonly sleep: AstBaseImportResolverSleep
    private readonly now: AstBaseImportResolverNow
    private readonly idempotencyCacheSize: number
    private readonly importResolutionCache: AstImportResolutionCache<IAstBaseImportResolutionResult>

    /**
     * Creates base import resolver.
     *
     * @param options Optional runtime configuration.
     */
    protected constructor(options: IAstBaseImportResolverOptions = {}) {
        this.fileExtensionCandidates = normalizeFileExtensionCandidates(
            options.fileExtensionCandidates ?? DEFAULT_FILE_EXTENSION_CANDIDATES,
        )
        this.pathExists = validatePathExists(options.pathExists)
        this.retryPolicy = normalizeRetryPolicy(options.retryPolicy)
        this.sleep = options.sleep ?? sleepFor
        this.now = options.now ?? Date.now
        this.idempotencyCacheSize = validateIdempotencyCacheSize(
            options.idempotencyCacheSize ?? DEFAULT_IDEMPOTENCY_CACHE_SIZE,
        )
        this.importResolutionCache = new AstImportResolutionCache<IAstBaseImportResolutionResult>(
            this.idempotencyCacheSize,
        )
    }

    /**
     * Resolves one import to repository-relative target file path.
     *
     * @param input Resolution input payload.
     * @returns Resolution result payload.
     */
    public resolveImport(input: IAstBaseImportResolutionInput): Promise<IAstBaseImportResolutionResult> {
        const normalizedInput = this.normalizeInput(input)
        const cachedResult = this.importResolutionCache.findResolved(normalizedInput.cacheKey)

        if (cachedResult !== undefined) {
            return Promise.resolve(cachedResult)
        }

        const inFlightResult = this.importResolutionCache.findInFlight(normalizedInput.cacheKey)
        if (inFlightResult !== undefined) {
            return inFlightResult
        }

        const resolutionPromise = this.executeResolveWithRetry(normalizedInput)
        this.importResolutionCache.trackInFlight(normalizedInput.cacheKey, resolutionPromise)
        return resolutionPromise
    }

    /**
     * Resolves candidates for non-relative import source.
     *
     * @param input Normalized non-relative input.
     * @returns Candidate target paths.
     */
    protected abstract resolveNonRelativeCandidates(
        input: IAstBaseNonRelativeImportResolutionInput,
    ): Promise<readonly string[]>

    /**
     * Normalizes and validates one resolution input payload.
     *
     * @param input Raw resolution input payload.
     * @returns Normalized resolution payload.
     */
    private normalizeInput(input: IAstBaseImportResolutionInput): IAstBaseImportResolverNormalizedInput {
        const sourceFilePath = normalizeSourceFilePath(input.sourceFilePath)
        const sourceDirectoryPath = resolveDirectoryPath(sourceFilePath)
        const importSource = normalizeImportSource(input.importSource)
        const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey)
        const retryPolicy = mergeRetryPolicy(input.retryPolicy, this.retryPolicy)
        const cacheKey = this.importResolutionCache.resolveCacheKey({
            sourceFilePath,
            importSource,
            idempotencyKey,
        })

        return {
            sourceFilePath,
            sourceDirectoryPath,
            importSource,
            cacheKey,
            retryPolicy,
        }
    }

    /**
     * Executes one resolution with retry/backoff semantics.
     *
     * @param input Normalized resolution input.
     * @returns Resolution result payload.
     */
    private async executeResolveWithRetry(
        input: IAstBaseImportResolverNormalizedInput,
    ): Promise<IAstBaseImportResolutionResult> {
        const startedAtMs = this.now()
        let attempt = 0

        while (attempt < input.retryPolicy.maxAttempts) {
            attempt += 1

            try {
                const resolved = await this.resolveOnce(input, attempt, startedAtMs)
                this.importResolutionCache.cacheResolved(input.cacheKey, resolved)
                return resolved
            } catch (error: unknown) {
                if (isNonRetryableError(error)) {
                    throw error
                }

                const shouldRetry =
                    attempt < input.retryPolicy.maxAttempts &&
                    input.retryPolicy.shouldRetry(error, attempt)

                if (shouldRetry === false) {
                    throw new AstBaseImportResolverError(
                        AST_BASE_IMPORT_RESOLVER_ERROR_CODE.IMPORT_RESOLUTION_FAILED,
                        {
                            attempts: attempt,
                            reason: normalizeErrorReason(error),
                        },
                    )
                }

                const backoffDurationMs = resolveBackoffDurationMs(
                    input.retryPolicy.initialBackoffMs,
                    input.retryPolicy.maxBackoffMs,
                    attempt,
                )
                await this.sleep(backoffDurationMs)
            }
        }

        throw new AstBaseImportResolverError(
            AST_BASE_IMPORT_RESOLVER_ERROR_CODE.IMPORT_RESOLUTION_FAILED,
            {
                attempts: input.retryPolicy.maxAttempts,
                reason: "Retry attempts exhausted",
            },
        )
    }

    /**
     * Resolves one input once without retries.
     *
     * @param input Normalized resolution input.
     * @param attempt Current attempt number.
     * @param startedAtMs Resolution start timestamp.
     * @returns Resolution result.
     */
    private async resolveOnce(
        input: IAstBaseImportResolverNormalizedInput,
        attempt: number,
        startedAtMs: number,
    ): Promise<IAstBaseImportResolutionResult> {
        const isRelative = isRelativeImport(input.importSource)
        const candidateFilePaths = isRelative
            ? buildRelativeCandidates(
                  input.sourceDirectoryPath,
                  input.importSource,
                  this.fileExtensionCandidates,
              )
            : await this.resolveAndNormalizeNonRelativeCandidates(input)
        const resolvedFilePath = await this.findFirstExistingCandidate(candidateFilePaths)
        const durationMs = resolveDurationMs(startedAtMs, this.now())

        return {
            sourceFilePath: input.sourceFilePath,
            importSource: input.importSource,
            isRelativeImport: isRelative,
            candidateFilePaths,
            resolvedFilePath,
            attempts: attempt,
            durationMs,
        }
    }

    /**
     * Resolves and normalizes non-relative import candidates.
     *
     * @param input Normalized resolution input.
     * @returns Normalized candidate paths.
     */
    private async resolveAndNormalizeNonRelativeCandidates(
        input: IAstBaseImportResolverNormalizedInput,
    ): Promise<readonly string[]> {
        const candidates = await this.resolveNonRelativeCandidates({
            sourceFilePath: input.sourceFilePath,
            sourceDirectoryPath: input.sourceDirectoryPath,
            importSource: input.importSource,
            fileExtensionCandidates: this.fileExtensionCandidates,
        })

        if (Array.isArray(candidates) === false) {
            throw new AstBaseImportResolverError(
                AST_BASE_IMPORT_RESOLVER_ERROR_CODE.INVALID_RESOLVER_CANDIDATE,
                {
                    sourceFilePath: input.sourceFilePath,
                    importSource: input.importSource,
                },
            )
        }

        return normalizeResolverCandidates(candidates, input.sourceFilePath, input.importSource)
    }

    /**
     * Finds first existing candidate path.
     *
     * @param candidates Candidate file paths.
     * @returns First existing path or null.
     */
    private async findFirstExistingCandidate(candidates: readonly string[]): Promise<string | null> {
        for (const candidate of candidates) {
            const exists = await this.pathExists(candidate)

            if (exists) {
                return candidate
            }
        }

        return null
    }

}

/**
 * Validates source file path.
 *
 * @param sourceFilePath Raw source file path.
 * @returns Normalized source file path.
 */
function normalizeSourceFilePath(sourceFilePath: string): string {
    try {
        return FilePath.create(sourceFilePath).toString()
    } catch {
        throw new AstBaseImportResolverError(
            AST_BASE_IMPORT_RESOLVER_ERROR_CODE.INVALID_SOURCE_FILE_PATH,
            {
                sourceFilePath,
            },
        )
    }
}

/**
 * Resolves source directory path.
 *
 * @param sourceFilePath Normalized source file path.
 * @returns Repository-relative directory path.
 */
function resolveDirectoryPath(sourceFilePath: string): string {
    const directoryPath = pathPosix.dirname(sourceFilePath)
    return directoryPath === "." ? "" : directoryPath
}

/**
 * Validates import source.
 *
 * @param importSource Raw import source.
 * @returns Normalized import source.
 */
function normalizeImportSource(importSource: string): string {
    const normalizedImportSource = importSource.trim()

    if (normalizedImportSource.length === 0) {
        throw new AstBaseImportResolverError(
            AST_BASE_IMPORT_RESOLVER_ERROR_CODE.INVALID_IMPORT_SOURCE,
            {
                importSource,
            },
        )
    }

    return normalizedImportSource
}

/**
 * Normalizes idempotency key.
 *
 * @param idempotencyKey Optional raw idempotency key.
 * @returns Trimmed idempotency key or undefined.
 */
function normalizeIdempotencyKey(idempotencyKey: string | undefined): string | undefined {
    if (idempotencyKey === undefined) {
        return undefined
    }

    const normalizedIdempotencyKey = idempotencyKey.trim()
    return normalizedIdempotencyKey.length > 0 ? normalizedIdempotencyKey : undefined
}

/**
 * Checks whether import source is relative.
 *
 * @param importSource Normalized import source.
 * @returns True when import is relative.
 */
function isRelativeImport(importSource: string): boolean {
    return importSource.startsWith("./") || importSource.startsWith("../")
}

/**
 * Builds candidate paths for relative imports.
 *
 * @param sourceDirectoryPath Source file directory path.
 * @param importSource Relative import source.
 * @param fileExtensionCandidates Extension candidates.
 * @returns Normalized candidate paths.
 */
function buildRelativeCandidates(
    sourceDirectoryPath: string,
    importSource: string,
    fileExtensionCandidates: readonly string[],
): readonly string[] {
    const joinedPath = pathPosix.join(sourceDirectoryPath, importSource)
    const normalizedImportTarget = pathPosix.normalize(joinedPath)
    const hasExtension = pathPosix.extname(normalizedImportTarget).length > 0
    const candidates = new Set<string>()

    if (hasExtension) {
        candidates.add(normalizedImportTarget)
    } else {
        for (const extension of fileExtensionCandidates) {
            candidates.add(`${normalizedImportTarget}${extension}`)
            candidates.add(pathPosix.join(normalizedImportTarget, `index${extension}`))
        }
    }

    return normalizeResolverCandidates([...candidates], normalizedImportTarget, importSource)
}

/**
 * Normalizes subclass-provided candidate paths.
 *
 * @param candidates Raw candidates.
 * @param sourceFilePath Source file path used for error details.
 * @param importSource Import source used for error details.
 * @returns Normalized unique candidates.
 */
function normalizeResolverCandidates(
    candidates: readonly string[],
    sourceFilePath: string,
    importSource: string,
): readonly string[] {
    const normalizedCandidates = new Set<string>()

    for (const candidate of candidates) {
        const normalizedCandidate = normalizeCandidatePath(candidate, sourceFilePath, importSource)
        normalizedCandidates.add(normalizedCandidate)
    }

    return [...normalizedCandidates]
}

/**
 * Normalizes one candidate path.
 *
 * @param candidate Raw candidate path.
 * @param sourceFilePath Source file path used for error details.
 * @param importSource Import source used for error details.
 * @returns Normalized candidate path.
 */
function normalizeCandidatePath(candidate: string, sourceFilePath: string, importSource: string): string {
    if (candidate.trim().length === 0) {
        throw new AstBaseImportResolverError(
            AST_BASE_IMPORT_RESOLVER_ERROR_CODE.INVALID_RESOLVER_CANDIDATE,
            {
                sourceFilePath,
                importSource,
            },
        )
    }

    try {
        return FilePath.create(pathPosix.normalize(candidate)).toString()
    } catch {
        throw new AstBaseImportResolverError(
            AST_BASE_IMPORT_RESOLVER_ERROR_CODE.INVALID_RESOLVER_CANDIDATE,
            {
                sourceFilePath,
                importSource,
            },
        )
    }
}

/**
 * Validates extension candidate list.
 *
 * @param fileExtensionCandidates Raw extension candidates.
 * @returns Normalized extension candidates.
 */
function normalizeFileExtensionCandidates(fileExtensionCandidates: readonly string[]): readonly string[] {
    const normalizedCandidates = new Set<string>()

    for (const candidate of fileExtensionCandidates) {
        const normalizedCandidate = candidate.trim()

        if (
            normalizedCandidate.length < 2 ||
            normalizedCandidate.startsWith(".") === false ||
            normalizedCandidate.includes("/") ||
            normalizedCandidate.includes("\\")
        ) {
            throw new AstBaseImportResolverError(
                AST_BASE_IMPORT_RESOLVER_ERROR_CODE.INVALID_FILE_EXTENSION_CANDIDATE,
                {
                    fileExtensionCandidate: candidate,
                },
            )
        }

        normalizedCandidates.add(normalizedCandidate)
    }

    if (normalizedCandidates.size === 0) {
        throw new AstBaseImportResolverError(
            AST_BASE_IMPORT_RESOLVER_ERROR_CODE.INVALID_FILE_EXTENSION_CANDIDATE,
            {
                fileExtensionCandidate: "<empty>",
            },
        )
    }

    return [...normalizedCandidates]
}

/**
 * Validates path existence predicate.
 *
 * @param pathExists Optional path existence predicate.
 * @returns Validated predicate.
 */
function validatePathExists(
    pathExists: AstBaseImportResolverPathExists | undefined,
): AstBaseImportResolverPathExists {
    if (pathExists === undefined) {
        return defaultPathExists
    }

    if (typeof pathExists !== "function") {
        throw new AstBaseImportResolverError(AST_BASE_IMPORT_RESOLVER_ERROR_CODE.INVALID_PATH_EXISTS)
    }

    return pathExists
}

/**
 * Normalizes retry policy with defaults.
 *
 * @param retryPolicy Optional retry policy.
 * @returns Normalized retry policy.
 */
function normalizeRetryPolicy(
    retryPolicy: IAstBaseImportResolverRetryPolicy | undefined,
): IAstBaseImportResolverNormalizedRetryPolicy {
    const maxAttempts = validateMaxAttempts(retryPolicy?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS)
    const initialBackoffMs = validateInitialBackoffMs(
        retryPolicy?.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS,
    )
    const maxBackoffMs = validateMaxBackoffMs(retryPolicy?.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS)

    if (maxBackoffMs < initialBackoffMs) {
        throw new AstBaseImportResolverError(
            AST_BASE_IMPORT_RESOLVER_ERROR_CODE.INVALID_MAX_BACKOFF_MS,
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
    retryPolicy: IAstBaseImportResolverRetryPolicy | undefined,
    defaultRetryPolicy: IAstBaseImportResolverNormalizedRetryPolicy,
): IAstBaseImportResolverNormalizedRetryPolicy {
    if (retryPolicy === undefined) {
        return defaultRetryPolicy
    }

    return normalizeRetryPolicy(retryPolicy)
}

/**
 * Validates max attempts.
 *
 * @param maxAttempts Raw max attempts value.
 * @returns Validated max attempts value.
 */
function validateMaxAttempts(maxAttempts: number): number {
    if (Number.isSafeInteger(maxAttempts) === false || maxAttempts < 1) {
        throw new AstBaseImportResolverError(
            AST_BASE_IMPORT_RESOLVER_ERROR_CODE.INVALID_MAX_ATTEMPTS,
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
        throw new AstBaseImportResolverError(
            AST_BASE_IMPORT_RESOLVER_ERROR_CODE.INVALID_INITIAL_BACKOFF_MS,
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
        throw new AstBaseImportResolverError(
            AST_BASE_IMPORT_RESOLVER_ERROR_CODE.INVALID_MAX_BACKOFF_MS,
            {
                maxBackoffMs,
            },
        )
    }

    return maxBackoffMs
}

/**
 * Validates idempotency cache size.
 *
 * @param idempotencyCacheSize Raw idempotency cache size.
 * @returns Validated idempotency cache size.
 */
function validateIdempotencyCacheSize(idempotencyCacheSize: number): number {
    if (Number.isSafeInteger(idempotencyCacheSize) === false || idempotencyCacheSize < 1) {
        throw new AstBaseImportResolverError(
            AST_BASE_IMPORT_RESOLVER_ERROR_CODE.INVALID_IDEMPOTENCY_CACHE_SIZE,
            {
                idempotencyCacheSize,
            },
        )
    }

    return idempotencyCacheSize
}

/**
 * Checks whether one error should not be retried.
 *
 * @param error Unknown error value.
 * @returns True when error is non-retryable.
 */
function isNonRetryableError(error: unknown): boolean {
    if ((error instanceof AstBaseImportResolverError) === false) {
        return false
    }

    return NON_RETRYABLE_ERROR_CODES.has(error.code)
}

const NON_RETRYABLE_ERROR_CODES = new Set<AstBaseImportResolverErrorCode>([
    AST_BASE_IMPORT_RESOLVER_ERROR_CODE.INVALID_SOURCE_FILE_PATH,
    AST_BASE_IMPORT_RESOLVER_ERROR_CODE.INVALID_IMPORT_SOURCE,
    AST_BASE_IMPORT_RESOLVER_ERROR_CODE.INVALID_RESOLVER_CANDIDATE,
])

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
 * Resolves stable duration in milliseconds.
 *
 * @param startedAtMs Start timestamp.
 * @param finishedAtMs End timestamp.
 * @returns Non-negative duration.
 */
function resolveDurationMs(startedAtMs: number, finishedAtMs: number): number {
    return Math.max(0, Math.trunc(finishedAtMs - startedAtMs))
}

/**
 * Converts unknown error value to stable reason string.
 *
 * @param error Unknown error value.
 * @returns Stable reason string.
 */
function normalizeErrorReason(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    if (typeof error === "string") {
        return error
    }

    return "Unknown import resolution failure"
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
 * Default file existence predicate.
 *
 * @param filePath Candidate file path.
 * @returns True when file exists.
 */
async function defaultPathExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath)
        return true
    } catch {
        return false
    }
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
