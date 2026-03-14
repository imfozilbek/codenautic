import type {IGitProvider} from "@codenautic/core"

import {GIT_ACL_ERROR_KIND, normalizeGitAclError} from "./acl"
import {GIT_PROVIDER_OPERATION_NAME_SET} from "./git-provider-operation-names"

/**
 * Supported organization tiers for Git API quotas.
 */
export const GIT_RATE_LIMIT_TIER = {
    FREE: "FREE",
    PRO: "PRO",
} as const

/**
 * Git rate-limit tier literal.
 */
export type GitRateLimitTier = (typeof GIT_RATE_LIMIT_TIER)[keyof typeof GIT_RATE_LIMIT_TIER]

/**
 * Throttling reason categories emitted by limiter.
 */
export const GIT_RATE_LIMIT_REASON = {
    QuotaExceeded: "QUOTA_EXCEEDED",
    ProviderRateLimited: "PROVIDER_RATE_LIMITED",
} as const

/**
 * Rate-limit event reason literal.
 */
export type GitRateLimitReason = (typeof GIT_RATE_LIMIT_REASON)[keyof typeof GIT_RATE_LIMIT_REASON]

/**
 * Runtime throttle event payload.
 */
export interface IGitRateLimitEvent {
    /**
     * Organization identifier.
     */
    readonly organizationId: string

    /**
     * Organization tier at throttle time.
     */
    readonly tier: GitRateLimitTier

    /**
     * Current operation name.
     */
    readonly operation: string

    /**
     * Throttle reason category.
     */
    readonly reason: GitRateLimitReason

    /**
     * Applied delay in milliseconds.
     */
    readonly delayMs: number

    /**
     * Event timestamp in ISO format.
     */
    readonly occurredAt: string
}

/**
 * Configuration for Git provider rate-limiting wrapper.
 */
export interface IGitRateLimitOptions {
    /**
     * Organization identifier used for shared quota tracking.
     */
    readonly organizationId: string

    /**
     * Organization tier used to resolve quota size.
     */
    readonly tier: GitRateLimitTier

    /**
     * Window duration in milliseconds.
     */
    readonly windowMs?: number

    /**
     * Free-tier quota override for one window.
     */
    readonly freeTierLimit?: number

    /**
     * Pro-tier quota override for one window.
     */
    readonly proTierLimit?: number

    /**
     * Maximum retries for provider 429 responses.
     */
    readonly maxProvider429Retries?: number

    /**
     * Timestamp provider for deterministic tests.
     */
    readonly now?: () => number

    /**
     * Sleep implementation used for throttling waits.
     */
    readonly sleep?: (delayMs: number) => Promise<void>

    /**
     * Optional observer callback for throttle events.
     */
    readonly onThrottle?: (event: IGitRateLimitEvent) => void
}

const DEFAULT_WINDOW_MS = 15 * 60 * 1000
const DEFAULT_FREE_TIER_LIMIT = 100
const DEFAULT_PRO_TIER_LIMIT = 1000
const DEFAULT_MAX_PROVIDER_429_RETRIES = 3

interface IOrganizationRateLimitState {
    /**
     * Window start timestamp in milliseconds.
     */
    windowStartedAtMs: number

    /**
     * Consumed request count in the active window.
     */
    requestCount: number

    /**
     * Provider-imposed throttle end timestamp in milliseconds.
     */
    blockedUntilMs: number
}

interface IDeferred {
    /**
     * Deferred promise.
     */
    readonly promise: Promise<void>

    /**
     * Resolves deferred promise.
     */
    readonly resolve: () => void
}

const ORGANIZATION_RATE_LIMIT_STATES = new Map<string, IOrganizationRateLimitState>()
const ORGANIZATION_QUEUES = new Map<string, Promise<void>>()

/**
 * Wraps Git provider with per-organization rate limiting.
 *
 * @param provider Concrete provider implementation.
 * @param options Limiter options.
 * @returns Decorated provider preserving original runtime shape.
 */
export function withGitRateLimit<TProvider extends IGitProvider>(
    provider: TProvider,
    options: IGitRateLimitOptions,
): TProvider {
    const limiter = new GitRateLimiter(options)
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
                return limiter.execute(property, (): Promise<unknown> => {
                    return toPromise(invokeOperation(value, target, args))
                })
            }
        },
    })

    return decoratedProvider
}

/**
 * Internal rate-limiter orchestrating quota windows and provider 429 handling.
 */
class GitRateLimiter {
    private readonly organizationId: string
    private readonly tier: GitRateLimitTier
    private readonly windowMs: number
    private readonly freeTierLimit: number
    private readonly proTierLimit: number
    private readonly maxProvider429Retries: number
    private readonly now: () => number
    private readonly sleep: (delayMs: number) => Promise<void>
    private readonly onThrottle?: (event: IGitRateLimitEvent) => void

    /**
     * Creates limiter from user options.
     *
     * @param options Limiter options.
     */
    public constructor(options: IGitRateLimitOptions) {
        this.organizationId = normalizeOrganizationId(options.organizationId)
        this.tier = options.tier
        this.windowMs = normalizePositiveInteger(
            options.windowMs,
            DEFAULT_WINDOW_MS,
            "windowMs",
        )
        this.freeTierLimit = normalizePositiveInteger(
            options.freeTierLimit,
            DEFAULT_FREE_TIER_LIMIT,
            "freeTierLimit",
        )
        this.proTierLimit = normalizePositiveInteger(
            options.proTierLimit,
            DEFAULT_PRO_TIER_LIMIT,
            "proTierLimit",
        )
        this.maxProvider429Retries = normalizeNonNegativeInteger(
            options.maxProvider429Retries,
            DEFAULT_MAX_PROVIDER_429_RETRIES,
            "maxProvider429Retries",
        )
        this.now = options.now ?? Date.now
        this.sleep = options.sleep ?? createDelay
        this.onThrottle = options.onThrottle
    }

    /**
     * Executes one provider operation with organization-level throttling.
     *
     * @param operationName Operation label.
     * @param operation Async provider call.
     * @returns Operation result.
     */
    public execute<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
        return runInOrganizationQueue(this.organizationId, async (): Promise<T> => {
            return this.executeWithRateLimit(operationName, operation)
        })
    }

    /**
     * Runs operation and retries only provider 429 responses.
     *
     * @param operationName Operation label.
     * @param operation Async provider call.
     * @returns Operation result.
     */
    private async executeWithRateLimit<T>(
        operationName: string,
        operation: () => Promise<T>,
    ): Promise<T> {
        let provider429Retries = 0

        while (true) {
            await this.acquireQuota(operationName)

            try {
                return await operation()
            } catch (error) {
                const normalizedError = normalizeGitAclError(error)
                if (
                    normalizedError.kind !== GIT_ACL_ERROR_KIND.RATE_LIMITED ||
                    provider429Retries >= this.maxProvider429Retries
                ) {
                    throw error
                }

                provider429Retries += 1
                const retryDelayMs = resolveProviderRetryDelay(
                    normalizedError.retryAfterMs,
                    this.windowMs,
                )
                this.blockOrganization(retryDelayMs)
                await this.throttle(
                    operationName,
                    GIT_RATE_LIMIT_REASON.ProviderRateLimited,
                    retryDelayMs,
                )
            }
        }
    }

    /**
     * Blocks until one quota slot becomes available.
     *
     * @param operationName Operation label used for events.
     * @returns Completion promise.
     */
    private async acquireQuota(operationName: string): Promise<void> {
        while (true) {
            const nowMs = this.now()
            const state = getOrCreateOrganizationState(this.organizationId, nowMs)
            normalizeStateWindow(state, nowMs, this.windowMs)

            if (state.blockedUntilMs > nowMs) {
                const blockedDelayMs = state.blockedUntilMs - nowMs
                await this.throttle(
                    operationName,
                    GIT_RATE_LIMIT_REASON.ProviderRateLimited,
                    blockedDelayMs,
                )
                continue
            }

            const tierLimit = this.resolveTierLimit()
            if (state.requestCount < tierLimit) {
                state.requestCount += 1
                return
            }

            const windowResetAtMs = state.windowStartedAtMs + this.windowMs
            const waitDelayMs = Math.max(windowResetAtMs - nowMs, 1)
            await this.throttle(
                operationName,
                GIT_RATE_LIMIT_REASON.QuotaExceeded,
                waitDelayMs,
            )
        }
    }

    /**
     * Applies provider-driven block for current organization.
     *
     * @param delayMs Block duration in milliseconds.
     */
    private blockOrganization(delayMs: number): void {
        const nowMs = this.now()
        const state = getOrCreateOrganizationState(this.organizationId, nowMs)
        const blockedUntilMs = nowMs + delayMs

        if (blockedUntilMs > state.blockedUntilMs) {
            state.blockedUntilMs = blockedUntilMs
        }
    }

    /**
     * Emits throttle event and sleeps for delay.
     *
     * @param operationName Operation label.
     * @param reason Throttle reason.
     * @param delayMs Delay in milliseconds.
     * @returns Completion promise.
     */
    private async throttle(
        operationName: string,
        reason: GitRateLimitReason,
        delayMs: number,
    ): Promise<void> {
        const normalizedDelayMs = Math.max(Math.trunc(delayMs), 0)
        if (normalizedDelayMs === 0) {
            return
        }

        if (this.onThrottle !== undefined) {
            this.onThrottle({
                organizationId: this.organizationId,
                tier: this.tier,
                operation: operationName,
                reason,
                delayMs: normalizedDelayMs,
                occurredAt: new Date(this.now()).toISOString(),
            })
        }

        await this.sleep(normalizedDelayMs)
    }

    /**
     * Resolves per-window quota for current tier.
     *
     * @returns Numeric quota for one window.
     */
    private resolveTierLimit(): number {
        if (this.tier === GIT_RATE_LIMIT_TIER.FREE) {
            return this.freeTierLimit
        }

        if (this.tier === GIT_RATE_LIMIT_TIER.PRO) {
            return this.proTierLimit
        }

        throw new Error(`Unsupported git rate-limit tier: ${String(this.tier)}`)
    }
}

/**
 * Executes one operation in a serialized per-organization queue.
 *
 * @param organizationId Organization identifier.
 * @param operation Operation callback.
 * @returns Operation result.
 */
async function runInOrganizationQueue<T>(
    organizationId: string,
    operation: () => Promise<T>,
): Promise<T> {
    const previous = ORGANIZATION_QUEUES.get(organizationId) ?? Promise.resolve()
    const deferred = createDeferred()
    const chained = previous.then((): Promise<void> => deferred.promise)
    ORGANIZATION_QUEUES.set(organizationId, chained)

    await previous
    try {
        return await operation()
    } finally {
        deferred.resolve()

        const active = ORGANIZATION_QUEUES.get(organizationId)
        if (active === chained) {
            ORGANIZATION_QUEUES.delete(organizationId)
        }
    }
}

/**
 * Creates deferred promise primitive.
 *
 * @returns Deferred pair.
 */
function createDeferred(): IDeferred {
    let resolve: (() => void) | undefined
    const promise = new Promise<void>((resolvePromise): void => {
        resolve = resolvePromise
    })

    if (resolve === undefined) {
        throw new Error("Failed to initialize deferred promise")
    }

    return {
        promise,
        resolve,
    }
}

/**
 * Returns organization state from registry or creates a new one.
 *
 * @param organizationId Organization identifier.
 * @param nowMs Current timestamp.
 * @returns Mutable organization state.
 */
function getOrCreateOrganizationState(
    organizationId: string,
    nowMs: number,
): IOrganizationRateLimitState {
    const existingState = ORGANIZATION_RATE_LIMIT_STATES.get(organizationId)
    if (existingState !== undefined) {
        return existingState
    }

    const newState: IOrganizationRateLimitState = {
        windowStartedAtMs: nowMs,
        requestCount: 0,
        blockedUntilMs: 0,
    }
    ORGANIZATION_RATE_LIMIT_STATES.set(organizationId, newState)
    return newState
}

/**
 * Normalizes one window boundary based on current timestamp.
 *
 * @param state Mutable state to normalize.
 * @param nowMs Current timestamp.
 * @param windowMs Window duration.
 */
function normalizeStateWindow(
    state: IOrganizationRateLimitState,
    nowMs: number,
    windowMs: number,
): void {
    if (nowMs >= state.windowStartedAtMs + windowMs) {
        state.windowStartedAtMs = nowMs
        state.requestCount = 0
    }
}

/**
 * Resolves retry delay for provider 429 response.
 *
 * @param retryAfterMs Retry hint from provider.
 * @param fallbackWindowMs Fallback delay.
 * @returns Positive delay in milliseconds.
 */
function resolveProviderRetryDelay(retryAfterMs: number | undefined, fallbackWindowMs: number): number {
    if (retryAfterMs !== undefined && Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
        return Math.trunc(retryAfterMs)
    }

    return fallbackWindowMs
}

/**
 * Converts unknown function result into Promise.
 *
 * @param value Invocation result.
 * @returns Promise-wrapped result.
 */
function toPromise(value: unknown): Promise<unknown> {
    if (value instanceof Promise) {
        return value
    }

    return Promise.resolve(value)
}

/**
 * Type guard for callable values.
 *
 * @param value Candidate value.
 * @returns True when value is a function.
 */
function isCallable(value: unknown): value is (...args: readonly unknown[]) => unknown {
    return typeof value === "function"
}

/**
 * Executes callable operation with explicit `this` context.
 *
 * @param operation Callable operation.
 * @param thisArg Invocation context.
 * @param args Invocation arguments.
 * @returns Operation result.
 */
function invokeOperation(
    operation: (...args: readonly unknown[]) => unknown,
    thisArg: unknown,
    args: readonly unknown[],
): unknown {
    return operation.call(thisArg, ...args)
}

/**
 * Validates organization identifier.
 *
 * @param organizationId Raw organization id.
 * @returns Normalized id.
 */
function normalizeOrganizationId(organizationId: string): string {
    const normalizedOrganizationId = organizationId.trim()
    if (normalizedOrganizationId.length === 0) {
        throw new Error("organizationId must not be empty")
    }

    return normalizedOrganizationId
}

/**
 * Normalizes optional positive integer option.
 *
 * @param value Raw numeric value.
 * @param fallback Default value.
 * @param fieldName Field label for validation errors.
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
 * Normalizes optional non-negative integer option.
 *
 * @param value Raw numeric value.
 * @param fallback Default value.
 * @param fieldName Field label for validation errors.
 * @returns Non-negative integer.
 */
function normalizeNonNegativeInteger(
    value: number | undefined,
    fallback: number,
    fieldName: string,
): number {
    if (value === undefined) {
        return fallback
    }

    if (!Number.isInteger(value) || value < 0) {
        throw new Error(`${fieldName} must be a non-negative integer`)
    }

    return value
}

/**
 * Default async delay helper.
 *
 * @param delayMs Delay in milliseconds.
 * @returns Completion promise.
 */
function createDelay(delayMs: number): Promise<void> {
    return new Promise<void>((resolve): void => {
        setTimeout(resolve, delayMs)
    })
}
