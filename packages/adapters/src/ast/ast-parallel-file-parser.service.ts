import {
    FilePath,
    type IParsedSourceFileDTO,
} from "@codenautic/core"

import {
    AST_PARALLEL_FILE_PARSER_ERROR_CODE,
    AstParallelFileParserError,
} from "./ast-parallel-file-parser.error"
import {
    type IAstWorkerTaskExecutorRetryPolicy,
    type IAstWorkerTaskExecutorService,
    AstWorkerTaskExecutorService,
} from "./ast-worker-task-executor.service"

const DEFAULT_CONCURRENCY = 4

interface INormalizedParallelFileParserFile {
    readonly filePath: string
    readonly language: string
    readonly content: string
    readonly timeoutMs?: number
    readonly retryPolicy?: IAstWorkerTaskExecutorRetryPolicy
    readonly idempotencyKey?: string
}

interface INormalizedParallelFileParserInput {
    readonly files: readonly INormalizedParallelFileParserFile[]
    readonly concurrency: number
}

type ParallelFileParserExecutionItem =
    | IAstParallelFileParserSuccessItem
    | IAstParallelFileParserFailureItem

/**
 * One file input for parallel parsing.
 */
export interface IAstParallelFileParserFileInput {
    /**
     * Repository-relative file path.
     */
    readonly filePath: string

    /**
     * Source language key used by parser factory.
     */
    readonly language: string

    /**
     * Source content text.
     */
    readonly content: string

    /**
     * Optional per-file timeout override.
     */
    readonly timeoutMs?: number

    /**
     * Optional per-file retry policy override.
     */
    readonly retryPolicy?: IAstWorkerTaskExecutorRetryPolicy

    /**
     * Optional stable idempotency key.
     */
    readonly idempotencyKey?: string
}

/**
 * Runtime input for parallel file parser.
 */
export interface IAstParallelFileParserInput {
    /**
     * File collection to parse in parallel.
     */
    readonly files: readonly IAstParallelFileParserFileInput[]

    /**
     * Optional runtime concurrency override.
     */
    readonly concurrency?: number
}

/**
 * Success item for one parsed file.
 */
export interface IAstParallelFileParserSuccessItem {
    /**
     * Repository-relative file path.
     */
    readonly filePath: string

    /**
     * Source language key used during parse.
     */
    readonly language: string

    /**
     * Parsed file payload returned by worker task executor.
     */
    readonly parsedFile: IParsedSourceFileDTO

    /**
     * Worker thread identifier used for parse.
     */
    readonly workerThreadId: number

    /**
     * Number of attempts required for successful parse.
     */
    readonly attempts: number

    /**
     * Parse duration in milliseconds.
     */
    readonly durationMs: number
}

/**
 * Failure item for one file parse.
 */
export interface IAstParallelFileParserFailureItem {
    /**
     * Repository-relative file path.
     */
    readonly filePath: string

    /**
     * Source language key used for parse.
     */
    readonly language: string

    /**
     * Stable machine-readable failure code when available.
     */
    readonly errorCode: string

    /**
     * Stable human-readable failure message.
     */
    readonly message: string
}

/**
 * Summary payload for one parallel parse run.
 */
export interface IAstParallelFileParserSummary {
    /**
     * Number of requested files.
     */
    readonly totalFiles: number

    /**
     * Number of successfully parsed files.
     */
    readonly parsedFileCount: number

    /**
     * Number of failed files.
     */
    readonly failedFileCount: number

    /**
     * Effective concurrency used for run.
     */
    readonly concurrency: number

    /**
     * Sum of successful parse duration values.
     */
    readonly totalDurationMs: number

    /**
     * Maximum successful parse duration.
     */
    readonly maxDurationMs: number
}

/**
 * Result payload for one parallel parse run.
 */
export interface IAstParallelFileParserResult {
    /**
     * Successfully parsed file DTO payloads.
     */
    readonly parsedFiles: readonly IParsedSourceFileDTO[]

    /**
     * Success records in input order.
     */
    readonly successes: readonly IAstParallelFileParserSuccessItem[]

    /**
     * Failure records in input order.
     */
    readonly failures: readonly IAstParallelFileParserFailureItem[]

    /**
     * Aggregated summary for run.
     */
    readonly summary: IAstParallelFileParserSummary
}

/**
 * Runtime options for parallel file parser service.
 */
export interface IAstParallelFileParserServiceOptions {
    /**
     * Optional worker task executor override.
     */
    readonly workerTaskExecutor?: IAstWorkerTaskExecutorService

    /**
     * Optional default concurrency value.
     */
    readonly defaultConcurrency?: number
}

/**
 * Parallel file parser contract.
 */
export interface IAstParallelFileParserService {
    /**
     * Parses file collection in parallel with bounded concurrency.
     *
     * @param input Runtime parse input.
     * @returns Success/failure output with isolated per-file errors.
     */
    parseInParallel(
        input: IAstParallelFileParserInput,
    ): Promise<IAstParallelFileParserResult>
}

/**
 * Parses files in parallel via worker task executor with per-file failure isolation.
 */
export class AstParallelFileParserService
    implements IAstParallelFileParserService
{
    private readonly workerTaskExecutor: IAstWorkerTaskExecutorService
    private readonly defaultConcurrency: number

    /**
     * Creates parallel file parser service.
     *
     * @param options Optional runtime configuration.
     */
    public constructor(options: IAstParallelFileParserServiceOptions = {}) {
        this.workerTaskExecutor = validateWorkerTaskExecutor(
            options.workerTaskExecutor ?? new AstWorkerTaskExecutorService(),
        )
        this.defaultConcurrency = validatePositiveInteger(
            options.defaultConcurrency ?? DEFAULT_CONCURRENCY,
            AST_PARALLEL_FILE_PARSER_ERROR_CODE.INVALID_DEFAULT_CONCURRENCY,
        )
    }

    /**
     * Parses file collection in parallel with bounded concurrency.
     *
     * @param input Runtime parse input.
     * @returns Success/failure output with isolated per-file errors.
     */
    public async parseInParallel(
        input: IAstParallelFileParserInput,
    ): Promise<IAstParallelFileParserResult> {
        const normalizedInput = normalizeInput(input, this.defaultConcurrency)
        const effectiveConcurrency = Math.min(
            normalizedInput.concurrency,
            normalizedInput.files.length,
        )

        if (normalizedInput.files.length === 0) {
            return {
                parsedFiles: [],
                successes: [],
                failures: [],
                summary: {
                    totalFiles: 0,
                    parsedFileCount: 0,
                    failedFileCount: 0,
                    concurrency: effectiveConcurrency,
                    totalDurationMs: 0,
                    maxDurationMs: 0,
                },
            }
        }

        const executionItems: ParallelFileParserExecutionItem[] = []
        let cursor = 0
        const takeNextIndex = (): number | undefined => {
            if (cursor >= normalizedInput.files.length) {
                return undefined
            }

            const currentIndex = cursor
            cursor += 1
            return currentIndex
        }

        const workers: Promise<void>[] = []
        for (let index = 0; index < effectiveConcurrency; index += 1) {
            workers.push(
                this.runWorkerLoop(normalizedInput.files, executionItems, takeNextIndex),
            )
        }
        await Promise.all(workers)

        return buildResult(executionItems, effectiveConcurrency)
    }

    /**
     * Runs one worker loop over shared file queue.
     *
     * @param files Normalized files.
     * @param executionItems Mutable execution items collection.
     * @param takeNextIndex Shared index provider.
     * @returns Promise resolved when worker loop is complete.
     */
    private async runWorkerLoop(
        files: readonly INormalizedParallelFileParserFile[],
        executionItems: ParallelFileParserExecutionItem[],
        takeNextIndex: () => number | undefined,
    ): Promise<void> {
        while (true) {
            const currentIndex = takeNextIndex()
            if (currentIndex === undefined) {
                return
            }

            const currentFile = files[currentIndex]
            if (currentFile === undefined) {
                return
            }

            executionItems[currentIndex] = await this.parseOneFile(currentFile)
        }
    }

    /**
     * Parses one file and isolates worker execution failures.
     *
     * @param file Normalized file payload.
     * @returns Success or failure parse item.
     */
    private async parseOneFile(
        file: INormalizedParallelFileParserFile,
    ): Promise<ParallelFileParserExecutionItem> {
        try {
            const result = await this.workerTaskExecutor.execute({
                filePath: file.filePath,
                language: file.language,
                content: file.content,
                timeoutMs: file.timeoutMs,
                retryPolicy: file.retryPolicy,
                idempotencyKey: file.idempotencyKey,
            })

            return {
                filePath: file.filePath,
                language: file.language,
                parsedFile: result.parsedFile,
                workerThreadId: result.workerThreadId,
                attempts: result.attempts,
                durationMs: result.durationMs,
            }
        } catch (error) {
            return {
                filePath: file.filePath,
                language: file.language,
                errorCode: resolveFailureCode(error),
                message: resolveFailureMessage(error),
            }
        }
    }
}

/**
 * Validates worker task executor contract.
 *
 * @param workerTaskExecutor Candidate worker task executor.
 * @returns Valid worker task executor.
 */
function validateWorkerTaskExecutor(
    workerTaskExecutor: unknown,
): IAstWorkerTaskExecutorService {
    if (
        typeof workerTaskExecutor === "object" &&
        workerTaskExecutor !== null &&
        "execute" in workerTaskExecutor &&
        typeof workerTaskExecutor.execute === "function"
    ) {
        return workerTaskExecutor as IAstWorkerTaskExecutorService
    }

    throw new AstParallelFileParserError(
        AST_PARALLEL_FILE_PARSER_ERROR_CODE.INVALID_WORKER_TASK_EXECUTOR,
    )
}

/**
 * Normalizes and validates runtime input.
 *
 * @param input Raw runtime input.
 * @param defaultConcurrency Default concurrency fallback.
 * @returns Normalized runtime input.
 */
function normalizeInput(
    input: IAstParallelFileParserInput,
    defaultConcurrency: number,
): INormalizedParallelFileParserInput {
    const normalizedFiles = input.files.map((file) => normalizeFile(file))
    const concurrency = validatePositiveInteger(
        input.concurrency ?? defaultConcurrency,
        AST_PARALLEL_FILE_PARSER_ERROR_CODE.INVALID_CONCURRENCY,
    )

    return {
        files: normalizedFiles,
        concurrency,
    }
}

/**
 * Normalizes one file parse input.
 *
 * @param file Raw file input.
 * @returns Normalized file input.
 */
function normalizeFile(
    file: IAstParallelFileParserFileInput,
): INormalizedParallelFileParserFile {
    const filePath = normalizeFilePath(file.filePath)
    const language = normalizeLanguage(file.language)
    const content = normalizeContent(file.content)
    const idempotencyKey = normalizeOptionalIdempotencyKey(file.idempotencyKey)

    return {
        filePath,
        language,
        content,
        timeoutMs: file.timeoutMs,
        retryPolicy: file.retryPolicy,
        idempotencyKey,
    }
}

/**
 * Normalizes repository-relative file path.
 *
 * @param filePath Raw file path.
 * @returns Normalized file path.
 */
function normalizeFilePath(filePath: string): string {
    try {
        return FilePath.create(filePath).toString()
    } catch {
        throw new AstParallelFileParserError(
            AST_PARALLEL_FILE_PARSER_ERROR_CODE.INVALID_FILE_PATH,
            {
                filePath,
            },
        )
    }
}

/**
 * Normalizes language identifier.
 *
 * @param language Raw language identifier.
 * @returns Normalized language identifier.
 */
function normalizeLanguage(language: string): string {
    const normalizedLanguage = language.trim()
    if (normalizedLanguage.length > 0) {
        return normalizedLanguage
    }

    throw new AstParallelFileParserError(
        AST_PARALLEL_FILE_PARSER_ERROR_CODE.INVALID_LANGUAGE,
        {
            language,
        },
    )
}

/**
 * Normalizes source content.
 *
 * @param content Raw source content.
 * @returns Source content string.
 */
function normalizeContent(content: string): string {
    if (typeof content === "string") {
        return content
    }

    throw new AstParallelFileParserError(
        AST_PARALLEL_FILE_PARSER_ERROR_CODE.INVALID_CONTENT,
    )
}

/**
 * Normalizes optional idempotency key.
 *
 * @param idempotencyKey Raw idempotency key.
 * @returns Normalized idempotency key or undefined.
 */
function normalizeOptionalIdempotencyKey(
    idempotencyKey: string | undefined,
): string | undefined {
    if (idempotencyKey === undefined) {
        return undefined
    }

    const normalizedIdempotencyKey = idempotencyKey.trim()
    return normalizedIdempotencyKey.length > 0 ? normalizedIdempotencyKey : undefined
}

/**
 * Validates one positive integer configuration value.
 *
 * @param value Raw numeric value.
 * @param code Typed error code emitted on invalid value.
 * @returns Valid positive integer.
 */
function validatePositiveInteger(
    value: number,
    code:
        | typeof AST_PARALLEL_FILE_PARSER_ERROR_CODE.INVALID_DEFAULT_CONCURRENCY
        | typeof AST_PARALLEL_FILE_PARSER_ERROR_CODE.INVALID_CONCURRENCY,
): number {
    if (Number.isSafeInteger(value) && value > 0) {
        return value
    }

    throw new AstParallelFileParserError(code, {
        value,
    })
}

/**
 * Resolves stable failure code for one isolated parse failure.
 *
 * @param error Unknown failure payload.
 * @returns Stable failure code.
 */
function resolveFailureCode(error: unknown): string {
    if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof error.code === "string"
    ) {
        return error.code
    }

    return "PARSE_FAILED"
}

/**
 * Resolves stable failure message for one isolated parse failure.
 *
 * @param error Unknown failure payload.
 * @returns Stable failure message.
 */
function resolveFailureMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    return "Unknown parse failure"
}

/**
 * Builds deterministic parallel parse output payload.
 *
 * @param executionItems Ordered execution item collection.
 * @param effectiveConcurrency Effective concurrency used for run.
 * @returns Parallel parse output payload.
 */
function buildResult(
    executionItems: readonly ParallelFileParserExecutionItem[],
    effectiveConcurrency: number,
): IAstParallelFileParserResult {
    const successes: IAstParallelFileParserSuccessItem[] = []
    const failures: IAstParallelFileParserFailureItem[] = []
    let totalDurationMs = 0
    let maxDurationMs = 0

    for (const executionItem of executionItems) {
        if ("parsedFile" in executionItem) {
            successes.push(executionItem)
            totalDurationMs += executionItem.durationMs
            maxDurationMs = Math.max(maxDurationMs, executionItem.durationMs)
            continue
        }

        failures.push(executionItem)
    }

    return {
        parsedFiles: successes.map((success) => success.parsedFile),
        successes,
        failures,
        summary: {
            totalFiles: executionItems.length,
            parsedFileCount: successes.length,
            failedFileCount: failures.length,
            concurrency: effectiveConcurrency,
            totalDurationMs,
            maxDurationMs,
        },
    }
}
