import {Worker} from "node:worker_threads"

import {
    FilePath,
    type IParsedSourceFileDTO,
    type ISourceCodeParseRequest,
} from "@codenautic/core"

import {
    AST_WORKER_TASK_EXECUTOR_ERROR_CODE,
    AstWorkerTaskExecutorError,
} from "./ast-worker-task-executor.error"

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_INITIAL_BACKOFF_MS = 50
const DEFAULT_MAX_BACKOFF_MS = 1_000

/**
 * Sleep function used by retry/backoff logic.
 */
export type AstWorkerTaskExecutorSleep = (durationMs: number) => Promise<void>

/**
 * Clock function used by duration metrics.
 */
export type AstWorkerTaskExecutorNow = () => number

/**
 * Retry decision callback for failed worker attempts.
 */
export type AstWorkerTaskExecutorShouldRetry = (error: unknown, attempt: number) => boolean

/**
 * Retry policy for worker execution attempts.
 */
export interface IAstWorkerTaskExecutorRetryPolicy {
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
    readonly shouldRetry?: AstWorkerTaskExecutorShouldRetry
}

/**
 * Worker task input for parsing one file in worker thread.
 */
export interface IAstWorkerTaskExecutorInput extends ISourceCodeParseRequest {
    /**
     * Fine-grained language used for parser resolution.
     */
    readonly language: string

    /**
     * Optional stable idempotency key for in-flight deduplication.
     */
    readonly idempotencyKey?: string

    /**
     * Optional per-task timeout in milliseconds.
     */
    readonly timeoutMs?: number

    /**
     * Optional per-task retry policy.
     */
    readonly retryPolicy?: IAstWorkerTaskExecutorRetryPolicy
}

/**
 * Result payload for one worker-executed parse task.
 */
export interface IAstWorkerTaskExecutorResult {
    /**
     * Parsed source-file snapshot produced by parser.
     */
    readonly parsedFile: IParsedSourceFileDTO

    /**
     * Worker thread identifier that executed parse task.
     */
    readonly workerThreadId: number

    /**
     * Number of attempts used before success.
     */
    readonly attempts: number

    /**
     * Total execution duration in milliseconds.
     */
    readonly durationMs: number
}

interface IAstWorkerTaskExecutorNormalizedRetryPolicy {
    readonly maxAttempts: number
    readonly initialBackoffMs: number
    readonly maxBackoffMs: number
    readonly shouldRetry: AstWorkerTaskExecutorShouldRetry
}

interface IAstWorkerTaskExecutorTask {
    readonly filePath: string
    readonly content: string
    readonly language: string
    readonly timeoutMs: number
    readonly idempotencyKey?: string
    readonly retryPolicy: IAstWorkerTaskExecutorNormalizedRetryPolicy
}

interface IAstWorkerTaskExecutorWorkerResult {
    readonly parsedFile: IParsedSourceFileDTO
    readonly workerThreadId: number
}

interface IAstWorkerTaskExecutorWorkerSuccessMessage {
    readonly ok: true
    readonly workerThreadId: number
    readonly parsedFile: unknown
}

interface IAstWorkerTaskExecutorWorkerFailureMessage {
    readonly ok: false
    readonly reason: string
}

const PARSED_FILE_ARRAY_FIELDS = [
    "imports",
    "typeAliases",
    "interfaces",
    "enums",
    "classes",
    "functions",
    "calls",
] as const

/**
 * Worker runner contract used by task executor service.
 */
export type AstWorkerTaskExecutorRunner = (
    task: IAstWorkerTaskExecutorTask,
) => Promise<IAstWorkerTaskExecutorWorkerResult>

/**
 * Runtime options for AST worker task executor service.
 */
export interface IAstWorkerTaskExecutorServiceOptions {
    /**
     * Optional worker runner override.
     */
    readonly runner?: AstWorkerTaskExecutorRunner

    /**
     * Optional worker script URL used by default runner.
     */
    readonly workerScriptUrl?: URL

    /**
     * Optional default timeout in milliseconds.
     */
    readonly defaultTimeoutMs?: number

    /**
     * Optional default retry policy.
     */
    readonly defaultRetryPolicy?: IAstWorkerTaskExecutorRetryPolicy

    /**
     * Optional sleep override for retry/backoff logic.
     */
    readonly sleep?: AstWorkerTaskExecutorSleep

    /**
     * Optional clock override used for duration metrics.
     */
    readonly now?: AstWorkerTaskExecutorNow
}

/**
 * Worker task executor contract.
 */
export interface IAstWorkerTaskExecutorService {
    /**
     * Executes parse task in worker thread and returns parsed file analysis.
     *
     * @param input Worker task input.
     * @returns Parsed file analysis payload.
     */
    execute(input: IAstWorkerTaskExecutorInput): Promise<IAstWorkerTaskExecutorResult>
}

/**
 * Executes parse tasks in worker threads with retry/backoff and idempotency.
 */
export class AstWorkerTaskExecutorService implements IAstWorkerTaskExecutorService {
    private readonly runner: AstWorkerTaskExecutorRunner
    private readonly defaultTimeoutMs: number
    private readonly defaultRetryPolicy: IAstWorkerTaskExecutorNormalizedRetryPolicy
    private readonly sleep: AstWorkerTaskExecutorSleep
    private readonly now: AstWorkerTaskExecutorNow
    private readonly inFlightByIdempotencyKey = new Map<string, Promise<IAstWorkerTaskExecutorResult>>()

    /**
     * Creates worker task executor service.
     *
     * @param options Optional runtime configuration.
     */
    public constructor(options: IAstWorkerTaskExecutorServiceOptions = {}) {
        this.defaultTimeoutMs = validateTimeoutMs(options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS)
        this.defaultRetryPolicy = normalizeRetryPolicy(options.defaultRetryPolicy)
        this.sleep = options.sleep ?? sleepFor
        this.now = options.now ?? Date.now
        this.runner = resolveRunner(options.runner, options.workerScriptUrl)
    }

    /**
     * Executes parse task in worker thread and returns parsed file analysis.
     *
     * @param input Worker task input.
     * @returns Parsed file analysis payload.
     */
    public execute(input: IAstWorkerTaskExecutorInput): Promise<IAstWorkerTaskExecutorResult> {
        const task = this.normalizeTask(input)
        const existingTask = this.findInFlightTask(task.idempotencyKey)

        if (existingTask !== undefined) {
            return existingTask
        }

        const taskPromise = this.executeWithRetry(task)
        this.trackInFlightTask(task.idempotencyKey, taskPromise)
        return taskPromise
    }

    /**
     * Executes one normalized task with retry/backoff.
     *
     * @param task Normalized task.
     * @returns Worker execution result.
     */
    private async executeWithRetry(
        task: IAstWorkerTaskExecutorTask,
    ): Promise<IAstWorkerTaskExecutorResult> {
        const startedAtMs = this.now()
        let attempt = 1

        while (attempt <= task.retryPolicy.maxAttempts) {
            try {
                const workerResult = await this.runner(task)
                return {
                    parsedFile: workerResult.parsedFile,
                    workerThreadId: workerResult.workerThreadId,
                    attempts: attempt,
                    durationMs: resolveDurationMs(startedAtMs, this.now()),
                }
            } catch (error) {
                const shouldRetry =
                    attempt < task.retryPolicy.maxAttempts &&
                    task.retryPolicy.shouldRetry(error, attempt)

                if (shouldRetry === false) {
                    throw createExecutionFailureError(error, attempt)
                }

                await this.sleep(
                    computeBackoffDuration(
                        attempt,
                        task.retryPolicy.initialBackoffMs,
                        task.retryPolicy.maxBackoffMs,
                    ),
                )
                attempt += 1
            }
        }

        throw createExecutionFailureError(
            new Error("Retry loop exhausted unexpectedly"),
            task.retryPolicy.maxAttempts,
        )
    }

    /**
     * Normalizes and validates runtime task input.
     *
     * @param input Raw task input.
     * @returns Normalized task.
     */
    private normalizeTask(input: IAstWorkerTaskExecutorInput): IAstWorkerTaskExecutorTask {
        return {
            filePath: normalizeFilePath(input.filePath),
            content: normalizeContent(input.content),
            language: normalizeLanguage(input.language),
            timeoutMs: validateTimeoutMs(input.timeoutMs ?? this.defaultTimeoutMs),
            idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
            retryPolicy: mergeRetryPolicy(input.retryPolicy, this.defaultRetryPolicy),
        }
    }

    /**
     * Finds in-flight task by idempotency key.
     *
     * @param idempotencyKey Optional idempotency key.
     * @returns Existing in-flight task promise.
     */
    private findInFlightTask(
        idempotencyKey: string | undefined,
    ): Promise<IAstWorkerTaskExecutorResult> | undefined {
        if (idempotencyKey === undefined) {
            return undefined
        }

        return this.inFlightByIdempotencyKey.get(idempotencyKey)
    }

    /**
     * Tracks in-flight task by idempotency key.
     *
     * @param idempotencyKey Optional idempotency key.
     * @param taskPromise In-flight task promise.
     */
    private trackInFlightTask(
        idempotencyKey: string | undefined,
        taskPromise: Promise<IAstWorkerTaskExecutorResult>,
    ): void {
        if (idempotencyKey === undefined) {
            return
        }

        this.inFlightByIdempotencyKey.set(idempotencyKey, taskPromise)
        void taskPromise.finally(() => {
            const currentTask = this.inFlightByIdempotencyKey.get(idempotencyKey)

            if (currentTask === taskPromise) {
                this.inFlightByIdempotencyKey.delete(idempotencyKey)
            }
        })
    }
}

/**
 * Resolves worker runner from user options or default worker-thread runner.
 *
 * @param runner Optional runner override.
 * @param workerScriptUrl Optional worker script URL.
 * @returns Worker runner.
 */
function resolveRunner(
    runner: AstWorkerTaskExecutorRunner | undefined,
    workerScriptUrl: URL | undefined,
): AstWorkerTaskExecutorRunner {
    if (runner !== undefined && typeof runner !== "function") {
        throw new AstWorkerTaskExecutorError(
            AST_WORKER_TASK_EXECUTOR_ERROR_CODE.INVALID_RUNNER,
        )
    }

    if (runner !== undefined) {
        return runner
    }

    const scriptUrl = resolveWorkerScriptUrl(workerScriptUrl)
    return async (task: IAstWorkerTaskExecutorTask): Promise<IAstWorkerTaskExecutorWorkerResult> => {
        return runTaskInWorkerThread(task, scriptUrl)
    }
}

/**
 * Resolves worker script URL with validation.
 *
 * @param workerScriptUrl Optional worker script URL.
 * @returns Validated worker script URL.
 */
function resolveWorkerScriptUrl(workerScriptUrl: URL | undefined): URL {
    const resolvedUrl =
        workerScriptUrl ?? new URL("./ast-worker-task-executor.worker.ts", import.meta.url)

    if (resolvedUrl instanceof URL === false) {
        throw new AstWorkerTaskExecutorError(
            AST_WORKER_TASK_EXECUTOR_ERROR_CODE.INVALID_WORKER_SCRIPT_URL,
        )
    }

    return resolvedUrl
}

/**
 * Executes one task in a dedicated worker thread.
 *
 * @param task Normalized worker task.
 * @param workerScriptUrl Worker script URL.
 * @returns Worker parse result.
 */
function runTaskInWorkerThread(
    task: IAstWorkerTaskExecutorTask,
    workerScriptUrl: URL,
): Promise<IAstWorkerTaskExecutorWorkerResult> {
    return new Promise<IAstWorkerTaskExecutorWorkerResult>((resolve, reject) => {
        const worker = new Worker(workerScriptUrl, {
            workerData: {
                filePath: task.filePath,
                content: task.content,
                language: task.language,
            },
        })
        let settled = false
        const timeoutHandle = setTimeout(() => {
            if (settled) {
                return
            }

            settled = true
            detachWorkerListeners(worker)
            void worker.terminate().catch(() => undefined)
            reject(
                new AstWorkerTaskExecutorError(
                    AST_WORKER_TASK_EXECUTOR_ERROR_CODE.WORKER_TIMEOUT,
                    {
                        timeoutMs: task.timeoutMs,
                    },
                ),
            )
        }, task.timeoutMs)

        worker.once("message", (message: unknown) => {
            if (settled) {
                return
            }

            settled = true
            clearTimeout(timeoutHandle)
            detachWorkerListeners(worker)

            try {
                const workerResult = normalizeWorkerResult(message)
                resolve(workerResult)
            } catch (error) {
                reject(
                    error instanceof Error
                        ? error
                        : new Error("Worker response normalization failed"),
                )
            }
        })

        worker.once("error", (error: Error) => {
            if (settled) {
                return
            }

            settled = true
            clearTimeout(timeoutHandle)
            detachWorkerListeners(worker)
            reject(
                new AstWorkerTaskExecutorError(
                    AST_WORKER_TASK_EXECUTOR_ERROR_CODE.WORKER_EXECUTION_FAILED,
                    {
                        reason: error.message,
                    },
                ),
            )
        })

        worker.once("exit", (code: number) => {
            if (settled || code === 0) {
                return
            }

            settled = true
            clearTimeout(timeoutHandle)
            detachWorkerListeners(worker)
            reject(
                new AstWorkerTaskExecutorError(
                    AST_WORKER_TASK_EXECUTOR_ERROR_CODE.WORKER_TERMINATED,
                    {
                        exitCode: code,
                    },
                ),
            )
        })
    })
}

/**
 * Removes worker listeners that can leak across retries.
 *
 * @param worker Worker instance.
 */
function detachWorkerListeners(worker: Worker): void {
    worker.removeAllListeners("message")
    worker.removeAllListeners("error")
    worker.removeAllListeners("exit")
}

/**
 * Normalizes worker response into service-level result.
 *
 * @param message Unknown worker response message.
 * @returns Normalized worker parse result.
 */
function normalizeWorkerResult(message: unknown): IAstWorkerTaskExecutorWorkerResult {
    if (isWorkerSuccessMessage(message)) {
        return {
            parsedFile: normalizeParsedFile(message.parsedFile),
            workerThreadId: message.workerThreadId,
        }
    }

    if (isWorkerFailureMessage(message)) {
        throw new AstWorkerTaskExecutorError(
            AST_WORKER_TASK_EXECUTOR_ERROR_CODE.WORKER_EXECUTION_FAILED,
            {
                reason: message.reason,
            },
        )
    }

    throw new AstWorkerTaskExecutorError(
        AST_WORKER_TASK_EXECUTOR_ERROR_CODE.INVALID_WORKER_RESPONSE,
    )
}

/**
 * Type guard for worker success message.
 *
 * @param candidate Unknown response.
 * @returns True when candidate is success message.
 */
function isWorkerSuccessMessage(
    candidate: unknown,
): candidate is IAstWorkerTaskExecutorWorkerSuccessMessage {
    if (isRecord(candidate) === false || candidate.ok !== true) {
        return false
    }

    return typeof candidate.workerThreadId === "number" && "parsedFile" in candidate
}

/**
 * Type guard for worker failure message.
 *
 * @param candidate Unknown response.
 * @returns True when candidate is failure message.
 */
function isWorkerFailureMessage(
    candidate: unknown,
): candidate is IAstWorkerTaskExecutorWorkerFailureMessage {
    if (isRecord(candidate) === false || candidate.ok !== false) {
        return false
    }

    return typeof candidate.reason === "string"
}

/**
 * Normalizes unknown parsed-file payload.
 *
 * @param candidate Unknown parsed-file payload.
 * @returns Parsed source file DTO.
 */
function normalizeParsedFile(candidate: unknown): IParsedSourceFileDTO {
    if (isRecord(candidate) === false) {
        throw new AstWorkerTaskExecutorError(
            AST_WORKER_TASK_EXECUTOR_ERROR_CODE.INVALID_WORKER_RESPONSE,
        )
    }

    if (
        hasParsedFilePrimitiveFields(candidate) === false ||
        hasParsedFileArrayFields(candidate) === false
    ) {
        throw new AstWorkerTaskExecutorError(
            AST_WORKER_TASK_EXECUTOR_ERROR_CODE.INVALID_WORKER_RESPONSE,
        )
    }

    return candidate as unknown as IParsedSourceFileDTO
}

/**
 * Validates required primitive fields for parsed file payload.
 *
 * @param candidate Parsed file candidate.
 * @returns True when required primitive fields are present.
 */
function hasParsedFilePrimitiveFields(candidate: Record<string, unknown>): boolean {
    return (
        typeof candidate.filePath === "string" &&
        typeof candidate.language === "string" &&
        typeof candidate.hasSyntaxErrors === "boolean"
    )
}

/**
 * Validates required array fields for parsed file payload.
 *
 * @param candidate Parsed file candidate.
 * @returns True when required array fields are present.
 */
function hasParsedFileArrayFields(candidate: Record<string, unknown>): boolean {
    return PARSED_FILE_ARRAY_FIELDS.every((fieldName) => {
        return Array.isArray(candidate[fieldName])
    })
}

/**
 * Normalizes and validates task file path.
 *
 * @param filePath Raw file path.
 * @returns Normalized file path.
 */
function normalizeFilePath(filePath: string): string {
    try {
        return FilePath.create(filePath).toString()
    } catch {
        throw new AstWorkerTaskExecutorError(
            AST_WORKER_TASK_EXECUTOR_ERROR_CODE.INVALID_FILE_PATH,
            {
                filePath,
            },
        )
    }
}

/**
 * Normalizes and validates language input.
 *
 * @param language Raw language value.
 * @returns Normalized language.
 */
function normalizeLanguage(language: string): string {
    const normalizedLanguage = language.trim()

    if (normalizedLanguage.length === 0) {
        throw new AstWorkerTaskExecutorError(
            AST_WORKER_TASK_EXECUTOR_ERROR_CODE.INVALID_LANGUAGE,
            {
                language,
            },
        )
    }

    return normalizedLanguage
}

/**
 * Normalizes and validates content input.
 *
 * @param content Raw content value.
 * @returns Content value.
 */
function normalizeContent(content: string): string {
    if (typeof content !== "string") {
        throw new AstWorkerTaskExecutorError(
            AST_WORKER_TASK_EXECUTOR_ERROR_CODE.INVALID_CONTENT,
        )
    }

    return content
}

/**
 * Validates timeout value.
 *
 * @param timeoutMs Raw timeout value.
 * @returns Validated timeout value.
 */
function validateTimeoutMs(timeoutMs: number): number {
    if (Number.isSafeInteger(timeoutMs) === false || timeoutMs < 1) {
        throw new AstWorkerTaskExecutorError(
            AST_WORKER_TASK_EXECUTOR_ERROR_CODE.INVALID_TIMEOUT_MS,
            {
                timeoutMs,
            },
        )
    }

    return timeoutMs
}

/**
 * Normalizes retry policy with defaults.
 *
 * @param retryPolicy Optional retry policy.
 * @returns Normalized retry policy.
 */
function normalizeRetryPolicy(
    retryPolicy: IAstWorkerTaskExecutorRetryPolicy | undefined,
): IAstWorkerTaskExecutorNormalizedRetryPolicy {
    const maxAttempts = validateMaxAttempts(retryPolicy?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS)
    const initialBackoffMs = validateInitialBackoffMs(
        retryPolicy?.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS,
    )
    const maxBackoffMs = validateMaxBackoffMs(retryPolicy?.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS)

    if (maxBackoffMs < initialBackoffMs) {
        throw new AstWorkerTaskExecutorError(
            AST_WORKER_TASK_EXECUTOR_ERROR_CODE.INVALID_MAX_BACKOFF_MS,
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
 * Merges task-level retry policy with default policy.
 *
 * @param override Task-level retry policy.
 * @param fallback Default retry policy.
 * @returns Normalized merged retry policy.
 */
function mergeRetryPolicy(
    override: IAstWorkerTaskExecutorRetryPolicy | undefined,
    fallback: IAstWorkerTaskExecutorNormalizedRetryPolicy,
): IAstWorkerTaskExecutorNormalizedRetryPolicy {
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
 * Validates max-attempts value.
 *
 * @param maxAttempts Raw max-attempts value.
 * @returns Validated max-attempts value.
 */
function validateMaxAttempts(maxAttempts: number): number {
    if (Number.isSafeInteger(maxAttempts) === false || maxAttempts < 1) {
        throw new AstWorkerTaskExecutorError(
            AST_WORKER_TASK_EXECUTOR_ERROR_CODE.INVALID_MAX_ATTEMPTS,
            {
                maxAttempts,
            },
        )
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
        throw new AstWorkerTaskExecutorError(
            AST_WORKER_TASK_EXECUTOR_ERROR_CODE.INVALID_INITIAL_BACKOFF_MS,
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
        throw new AstWorkerTaskExecutorError(
            AST_WORKER_TASK_EXECUTOR_ERROR_CODE.INVALID_MAX_BACKOFF_MS,
            {
                maxBackoffMs,
            },
        )
    }

    return maxBackoffMs
}

/**
 * Computes retry backoff duration.
 *
 * @param attempt Current attempt number.
 * @param initialBackoffMs Initial backoff value.
 * @param maxBackoffMs Max backoff value.
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
 * Creates execution failure error from unknown thrown value.
 *
 * @param error Unknown thrown value.
 * @param attempts Attempt count.
 * @returns Normalized execution failure error.
 */
function createExecutionFailureError(
    error: unknown,
    attempts: number,
): AstWorkerTaskExecutorError {
    return new AstWorkerTaskExecutorError(
        AST_WORKER_TASK_EXECUTOR_ERROR_CODE.WORKER_EXECUTION_FAILED,
        {
            attempts,
            reason: normalizeErrorReason(error),
        },
    )
}

/**
 * Normalizes optional idempotency key.
 *
 * @param idempotencyKey Optional idempotency key.
 * @returns Trimmed idempotency key or undefined.
 */
function normalizeIdempotencyKey(idempotencyKey: string | undefined): string | undefined {
    if (idempotencyKey === undefined) {
        return undefined
    }

    const normalized = idempotencyKey.trim()
    return normalized.length > 0 ? normalized : undefined
}

/**
 * Returns stable failure reason string.
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

    return "Unknown worker execution error"
}

/**
 * Type guard for record-like values.
 *
 * @param candidate Unknown candidate.
 * @returns True when candidate is record.
 */
function isRecord(candidate: unknown): candidate is Record<string, unknown> {
    return typeof candidate === "object" && candidate !== null
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
 * Resolves non-negative duration in milliseconds.
 *
 * @param startedAtMs Start timestamp.
 * @param finishedAtMs End timestamp.
 * @returns Non-negative duration.
 */
function resolveDurationMs(startedAtMs: number, finishedAtMs: number): number {
    return Math.max(0, Math.trunc(finishedAtMs - startedAtMs))
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
