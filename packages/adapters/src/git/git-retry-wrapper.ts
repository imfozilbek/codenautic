import type {IGitProvider} from "@codenautic/core"

import {
    normalizeGitAclError,
    shouldRetryGitAclError,
    type INormalizedGitAclError,
} from "./acl"
import {GIT_PROVIDER_OPERATION_NAME_SET} from "./git-provider-operation-names"

/**
 * Retry reason categories emitted by Git retry wrapper.
 */
export const GIT_RETRY_REASON = {
    RetryableError: "RETRYABLE_ERROR",
} as const

/**
 * Git retry reason literal.
 */
export type GitRetryReason = (typeof GIT_RETRY_REASON)[keyof typeof GIT_RETRY_REASON]

/**
 * Retry event payload for observability.
 */
export interface IGitRetryEvent {
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
    readonly reason: GitRetryReason

    /**
     * Event timestamp in ISO format.
     */
    readonly occurredAt: string
}

/**
 * DLQ entry for exhausted git retries.
 */
export interface IGitRetryDlqEntry {
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
    readonly normalizedError: INormalizedGitAclError

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
export interface IGitRetryDlqWriter {
    /**
     * Writes failed operation entry to DLQ sink.
     *
     * @param entry Exhausted retry payload.
     * @returns Completion promise.
     */
    write(entry: IGitRetryDlqEntry): Promise<void>
}

/**
 * Retry wrapper options.
 */
export interface IGitRetryOptions {
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
    readonly onRetry?: (event: IGitRetryEvent) => void

    /**
     * Optional DLQ writer used when retries are exhausted.
     */
    readonly dlqWriter?: IGitRetryDlqWriter
}

const DEFAULT_MAX_ATTEMPTS = 5
const DEFAULT_BASE_DELAY_MS = 250

/**
 * Wraps Git provider with retry policy for retryable ACL errors.
 *
 * @param provider Concrete git provider.
 * @param options Retry options.
 * @returns Decorated provider preserving runtime shape.
 */
export function withGitRetry<TProvider extends IGitProvider>(
    provider: TProvider,
    options: IGitRetryOptions,
): TProvider {
    const policy = new GitRetryPolicy(options)
    const decoratedProvider = new Proxy(provider, {
        get(target, property, receiver): unknown {
            const value: unknown = Reflect.get(target, property, receiver)
            if (
                typeof property !== "string" ||
                !GIT_PROVIDER_OPERATION_NAME_SET.has(property) ||
                !isCallable(value)
            ) {
                return value
            }

            return (...args: readonly unknown[]): Promise<unknown> => {
                return policy.execute(property, (): Promise<unknown> => {
                    return toPromise(invokeOperation(value, target, args))
                })
            }
        },
    })

    return decoratedProvider
}

/**
 * Retry policy implementation for wrapped git operations.
 */
class GitRetryPolicy {
    private readonly maxAttempts: number
    private readonly baseDelayMs: number
    private readonly sleep: (delayMs: number) => Promise<void>
    private readonly now: () => number
    private readonly onRetry?: (event: IGitRetryEvent) => void
    private readonly dlqWriter?: IGitRetryDlqWriter

    /**
     * Creates retry policy from options.
     *
     * @param options Retry options.
     */
    public constructor(options: IGitRetryOptions) {
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
     * Executes operation with retry/backoff and DLQ on exhaustion.
     *
     * @param operationName Operation label.
     * @param operation Async operation.
     * @returns Operation result.
     */
    public async execute<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
        for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
            try {
                return await operation()
            } catch (error) {
                const normalizedError = normalizeGitAclError(error)
                const shouldRetry = shouldRetryGitAclError(
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
                        reason: GIT_RETRY_REASON.RetryableError,
                        occurredAt: new Date(this.now()).toISOString(),
                    })
                }

                await this.sleep(delayMs)
            }
        }

        throw new Error("Unreachable git retry branch")
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
        normalizedError: INormalizedGitAclError,
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
