import type {
    IChatChunkDTO,
    ILLMProvider,
    IStreamingChatResponseDTO,
} from "@codenautic/core"

import {LLM_PROVIDER_OPERATION_NAME_SET} from "./llm-provider-operation-names"

/**
 * Retry reason categories emitted by LLM retry wrapper.
 */
export const LLM_RETRY_REASON = {
    RetryableError: "RETRYABLE_ERROR",
} as const

/**
 * LLM retry reason literal.
 */
export type LlmRetryReason = (typeof LLM_RETRY_REASON)[keyof typeof LLM_RETRY_REASON]

/**
 * Retry event payload for observability.
 */
export interface ILlmRetryEvent {
    /**
     * Invoked operation name.
     */
    readonly operation: string

    /**
     * Current 1-based attempt number.
     */
    readonly attempt: number

    /**
     * Max configured attempts.
     */
    readonly maxAttempts: number

    /**
     * Applied retry delay in milliseconds.
     */
    readonly delayMs: number

    /**
     * Retry reason.
     */
    readonly reason: LlmRetryReason

    /**
     * Event timestamp in ISO format.
     */
    readonly occurredAt: string
}

/**
 * Normalized LLM error metadata used by retry wrapper.
 */
export interface INormalizedLlmRetryError {
    /**
     * Normalized status code when available.
     */
    readonly statusCode?: number

    /**
     * Provider retry-after hint in milliseconds.
     */
    readonly retryAfterMs?: number

    /**
     * Indicates whether error is retryable.
     */
    readonly isRetryable: boolean
}

/**
 * DLQ entry for exhausted LLM retries.
 */
export interface ILlmRetryDlqEntry {
    /**
     * Failed operation name.
     */
    readonly operation: string

    /**
     * Attempt count performed before exhaustion.
     */
    readonly attempts: number

    /**
     * Configured max attempts.
     */
    readonly maxAttempts: number

    /**
     * Final normalized error payload.
     */
    readonly normalizedError: INormalizedLlmRetryError

    /**
     * Raw final error object.
     */
    readonly error: unknown

    /**
     * Failure timestamp in ISO format.
     */
    readonly failedAt: string
}

/**
 * DLQ writer contract for exhausted retries.
 */
export interface ILlmRetryDlqWriter {
    /**
     * Writes failed operation entry to DLQ sink.
     *
     * @param entry Exhausted retry payload.
     * @returns Completion promise.
     */
    write(entry: ILlmRetryDlqEntry): Promise<void>
}

/**
 * Retry wrapper options.
 */
export interface ILlmRetryOptions {
    /**
     * Maximum operation attempts including initial call.
     */
    readonly maxAttempts?: number

    /**
     * Base delay in milliseconds for exponential backoff.
     */
    readonly baseDelayMs?: number

    /**
     * Optional sleep implementation for tests.
     */
    readonly sleep?: (delayMs: number) => Promise<void>

    /**
     * Optional timestamp provider for tests and observability.
     */
    readonly now?: () => number

    /**
     * Optional callback executed before each retry delay.
     */
    readonly onRetry?: (event: ILlmRetryEvent) => void

    /**
     * Optional DLQ writer used when retries are exhausted.
     */
    readonly dlqWriter?: ILlmRetryDlqWriter
}

const DEFAULT_MAX_ATTEMPTS = 5
const DEFAULT_BASE_DELAY_MS = 250

/**
 * Wraps LLM provider with retry policy for retryable provider errors.
 *
 * @param provider Concrete LLM provider.
 * @param options Retry options.
 * @returns Decorated provider preserving runtime shape.
 */
export function withLlmRetry<TProvider extends ILLMProvider>(
    provider: TProvider,
    options: ILlmRetryOptions,
): TProvider {
    const policy = new LlmRetryPolicy(options)
    const decoratedProvider = new Proxy(provider, {
        get(target, property, receiver): unknown {
            const value: unknown = Reflect.get(target, property, receiver)
            if (
                typeof property !== "string" ||
                !LLM_PROVIDER_OPERATION_NAME_SET.has(property) ||
                !isCallable(value)
            ) {
                return value
            }

            if (property === "stream") {
                return (...args: readonly unknown[]): IStreamingChatResponseDTO => {
                    return policy.executeStream(property, (): IStreamingChatResponseDTO => {
                        return toStreamingResponse(invokeOperation(value, target, args))
                    })
                }
            }

            return (...args: readonly unknown[]): Promise<unknown> => {
                return policy.executeAsync(property, (): Promise<unknown> => {
                    return toPromise(invokeOperation(value, target, args))
                })
            }
        },
    })

    return decoratedProvider
}

/**
 * Retry policy implementation for wrapped LLM operations.
 */
class LlmRetryPolicy {
    private readonly maxAttempts: number
    private readonly baseDelayMs: number
    private readonly sleep: (delayMs: number) => Promise<void>
    private readonly now: () => number
    private readonly onRetry?: (event: ILlmRetryEvent) => void
    private readonly dlqWriter?: ILlmRetryDlqWriter

    /**
     * Creates retry policy from options.
     *
     * @param options Retry options.
     */
    public constructor(options: ILlmRetryOptions) {
        this.maxAttempts = normalizePositiveInteger(
            options.maxAttempts,
            DEFAULT_MAX_ATTEMPTS,
            "maxAttempts",
        )
        this.baseDelayMs = normalizePositiveInteger(
            options.baseDelayMs,
            DEFAULT_BASE_DELAY_MS,
            "baseDelayMs",
        )
        this.sleep = options.sleep ?? createDelay
        this.now = options.now ?? Date.now
        this.onRetry = options.onRetry
        this.dlqWriter = options.dlqWriter
    }

    /**
     * Executes async operation with retry/backoff and DLQ on exhaustion.
     *
     * @param operationName Operation label.
     * @param operation Async operation.
     * @returns Operation result.
     */
    public async executeAsync<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
        for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
            try {
                return await operation()
            } catch (error) {
                const normalizedError = normalizeLlmRetryError(error)
                const shouldRetry = shouldRetryLlmError(
                    normalizedError,
                    attempt,
                    this.maxAttempts,
                )

                if (!shouldRetry) {
                    await this.writeDlqEntry(operationName, attempt, error, normalizedError)
                    throw error
                }

                const delayMs = resolveRetryDelay(
                    normalizedError.retryAfterMs,
                    this.baseDelayMs,
                    attempt,
                )
                if (this.onRetry !== undefined) {
                    this.onRetry({
                        operation: operationName,
                        attempt,
                        maxAttempts: this.maxAttempts,
                        delayMs,
                        reason: LLM_RETRY_REASON.RetryableError,
                        occurredAt: new Date(this.now()).toISOString(),
                    })
                }

                await this.sleep(delayMs)
            }
        }

        throw new Error("Unreachable llm retry branch")
    }

    /**
     * Executes stream operation with retry/backoff on stream-creation failures.
     *
     * @param operationName Operation label.
     * @param operation Stream operation.
     * @returns Stream response.
     */
    public executeStream(
        operationName: string,
        operation: () => IStreamingChatResponseDTO,
    ): IStreamingChatResponseDTO {
        const streamPromise = this.executeAsync(operationName, () => {
            return Promise.resolve(operation())
        })

        return createStreamingResponse(streamPromise)
    }

    /**
     * Writes one exhausted operation to configured DLQ.
     *
     * @param operationName Operation label.
     * @param attempts Attempt count.
     * @param error Final raw error.
     * @param normalizedError Final normalized error.
     * @returns Completion promise.
     */
    private async writeDlqEntry(
        operationName: string,
        attempts: number,
        error: unknown,
        normalizedError: INormalizedLlmRetryError,
    ): Promise<void> {
        if (this.dlqWriter === undefined) {
            return
        }

        await this.dlqWriter.write({
            operation: operationName,
            attempts,
            maxAttempts: this.maxAttempts,
            error,
            normalizedError,
            failedAt: new Date(this.now()).toISOString(),
        })
    }
}

/**
 * Creates stream wrapper that awaits stream creation before iteration.
 *
 * @param streamPromise Promise resolving to provider stream.
 * @returns Deferred stream.
 */
function createStreamingResponse(
    streamPromise: Promise<IStreamingChatResponseDTO>,
): IStreamingChatResponseDTO {
    return {
        async *[Symbol.asyncIterator](): AsyncIterator<IChatChunkDTO> {
            const stream = await streamPromise

            for await (const chunk of stream) {
                yield chunk
            }
        },
    }
}

/**
 * Resolves retry delay from retry-after hint or exponential backoff.
 *
 * @param retryAfterMs Optional retry hint from provider.
 * @param baseDelayMs Base retry delay.
 * @param attempt Current 1-based attempt number.
 * @returns Delay in milliseconds.
 */
function resolveRetryDelay(
    retryAfterMs: number | undefined,
    baseDelayMs: number,
    attempt: number,
): number {
    if (retryAfterMs !== undefined && Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
        return Math.trunc(retryAfterMs)
    }

    return baseDelayMs * 4 ** (attempt - 1)
}

/**
 * Resolves whether one normalized error is retryable for current attempt.
 *
 * @param error Normalized retry metadata.
 * @param attempt Current 1-based attempt number.
 * @param maxAttempts Max retry attempts.
 * @returns True when wrapper must retry.
 */
function shouldRetryLlmError(
    error: INormalizedLlmRetryError,
    attempt: number,
    maxAttempts: number,
): boolean {
    if (attempt >= maxAttempts) {
        return false
    }

    return error.isRetryable
}

/**
 * Normalizes unknown provider error into retry metadata.
 *
 * @param error Unknown provider error.
 * @returns Normalized retry payload.
 */
function normalizeLlmRetryError(error: unknown): INormalizedLlmRetryError {
    const record = toRecord(error)
    if (record === null) {
        return {
            isRetryable: false,
        }
    }

    const statusCode =
        normalizeStatusCode(readNumericRecordField(record["statusCode"])) ??
        normalizeStatusCode(readNumericRecordField(record["status"]))
    const retryAfterMs =
        readRetryAfterMs(record) ?? readRetryAfterFromHeaders(record["headers"])
    const explicitRetryable =
        readBooleanRecordField(record["isRetryable"]) ??
        readBooleanRecordField(record["retryable"])

    if (explicitRetryable !== undefined) {
        return {
            statusCode,
            retryAfterMs,
            isRetryable: explicitRetryable,
        }
    }

    return {
        statusCode,
        retryAfterMs,
        isRetryable: isRetryableStatus(statusCode),
    }
}

/**
 * Reads retry-after delay from error record fields.
 *
 * @param record Error record.
 * @returns Delay in milliseconds.
 */
function readRetryAfterMs(record: Readonly<Record<string, unknown>>): number | undefined {
    const retryAfterMs = readNumericRecordField(record["retryAfterMs"])
    if (retryAfterMs !== undefined && retryAfterMs > 0) {
        return Math.trunc(retryAfterMs)
    }

    const retryAfterSeconds = readNumericRecordField(record["retryAfter"])
    if (retryAfterSeconds !== undefined && retryAfterSeconds > 0) {
        return Math.round(retryAfterSeconds * 1000)
    }

    return undefined
}

/**
 * Reads retry-after delay from headers value.
 *
 * @param headersValue Candidate headers value.
 * @returns Delay in milliseconds.
 */
function readRetryAfterFromHeaders(headersValue: unknown): number | undefined {
    if (!(headersValue instanceof Headers)) {
        return undefined
    }

    const retryAfter = headersValue.get("retry-after")
    if (retryAfter === null || retryAfter === undefined) {
        return undefined
    }

    const retryAfterSeconds = Number(retryAfter)
    if (Number.isFinite(retryAfterSeconds) === false || retryAfterSeconds <= 0) {
        return undefined
    }

    return Math.round(retryAfterSeconds * 1000)
}

/**
 * Resolves retryable status class.
 *
 * @param statusCode HTTP status code.
 * @returns True when request should be retried.
 */
function isRetryableStatus(statusCode: number | undefined): boolean {
    if (statusCode === undefined) {
        return false
    }

    return statusCode === 429 || statusCode >= 500
}

/**
 * Narrows unknown value to streaming response contract.
 *
 * @param value Invocation result.
 * @returns Streaming response.
 */
function toStreamingResponse(value: unknown): IStreamingChatResponseDTO {
    if (
        typeof value !== "object" ||
        value === null ||
        !(Symbol.asyncIterator in value)
    ) {
        throw new Error("stream operation must return AsyncIterable")
    }

    return value as IStreamingChatResponseDTO
}

/**
 * Type guard for callable values.
 *
 * @param value Candidate value.
 * @returns True when value is callable.
 */
function isCallable(value: unknown): value is (...args: readonly unknown[]) => unknown {
    return typeof value === "function"
}

/**
 * Executes callable with explicit `this` context.
 *
 * @param operation Callable operation.
 * @param thisArg Invocation context.
 * @param args Invocation arguments.
 * @returns Raw operation result.
 */
function invokeOperation(
    operation: (...args: readonly unknown[]) => unknown,
    thisArg: unknown,
    args: readonly unknown[],
): unknown {
    return operation.call(thisArg, ...args)
}

/**
 * Converts raw operation result into Promise.
 *
 * @param value Raw value.
 * @returns Promise-wrapped value.
 */
function toPromise(value: unknown): Promise<unknown> {
    if (value instanceof Promise) {
        return value
    }

    return Promise.resolve(value)
}

/**
 * Converts unknown to plain record.
 *
 * @param value Unknown value.
 * @returns Plain record or null.
 */
function toRecord(value: unknown): Readonly<Record<string, unknown>> | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return null
    }

    return value as Readonly<Record<string, unknown>>
}

/**
 * Reads finite numeric value from unknown field.
 *
 * @param value Raw field value.
 * @returns Finite number or undefined.
 */
function readNumericRecordField(value: unknown): number | undefined {
    if (typeof value !== "number" || Number.isFinite(value) === false) {
        return undefined
    }

    return value
}

/**
 * Reads boolean value from unknown field.
 *
 * @param value Raw field value.
 * @returns Boolean or undefined.
 */
function readBooleanRecordField(value: unknown): boolean | undefined {
    if (typeof value !== "boolean") {
        return undefined
    }

    return value
}

/**
 * Normalizes optional positive integer option.
 *
 * @param value Raw value.
 * @param fallback Default value.
 * @param fieldName Field label used in validation error.
 * @returns Positive integer.
 */
function normalizePositiveInteger(value: number | undefined, fallback: number, fieldName: string): number {
    if (value === undefined) {
        return fallback
    }

    if (!Number.isInteger(value) || value < 1) {
        throw new Error(`${fieldName} must be a positive integer`)
    }

    return value
}

/**
 * Normalizes optional status code to integer form.
 *
 * @param statusCode Raw status code.
 * @returns Status code or undefined.
 */
function normalizeStatusCode(statusCode: number | undefined): number | undefined {
    if (statusCode === undefined || Number.isFinite(statusCode) === false) {
        return undefined
    }

    return Math.trunc(statusCode)
}

/**
 * Default async sleep implementation.
 *
 * @param delayMs Delay in milliseconds.
 * @returns Completion promise.
 */
function createDelay(delayMs: number): Promise<void> {
    return new Promise<void>((resolve): void => {
        setTimeout(resolve, delayMs)
    })
}
