import type {IGitProvider} from "@codenautic/core"

import {normalizeGitAclError} from "./acl"
import {GIT_PROVIDER_OPERATION_NAME_SET} from "./git-provider-operation-names"

/**
 * Health status values reported by git provider monitor.
 */
export const GIT_PROVIDER_HEALTH_STATUS = {
    Healthy: "HEALTHY",
    Degraded: "DEGRADED",
    Unhealthy: "UNHEALTHY",
} as const

/**
 * Health status literal.
 */
export type GitProviderHealthStatus = (typeof GIT_PROVIDER_HEALTH_STATUS)[keyof typeof GIT_PROVIDER_HEALTH_STATUS]

/**
 * Circuit-breaker state values.
 */
export const GIT_PROVIDER_CIRCUIT_STATE = {
    Closed: "CLOSED",
    Open: "OPEN",
    HalfOpen: "HALF_OPEN",
} as const

/**
 * Circuit-breaker state literal.
 */
export type GitProviderCircuitState =
    (typeof GIT_PROVIDER_CIRCUIT_STATE)[keyof typeof GIT_PROVIDER_CIRCUIT_STATE]

/**
 * Reason codes for health-status transitions.
 */
export const GIT_PROVIDER_HEALTH_REASON = {
    OperationSuccess: "OPERATION_SUCCESS",
    OperationFailure: "OPERATION_FAILURE",
    HealthCheckSuccess: "HEALTH_CHECK_SUCCESS",
    HealthCheckFailure: "HEALTH_CHECK_FAILURE",
    CircuitOpened: "CIRCUIT_OPENED",
    CircuitHalfOpen: "CIRCUIT_HALF_OPEN",
    CircuitClosed: "CIRCUIT_CLOSED",
} as const

/**
 * Health reason literal.
 */
export type GitProviderHealthReason =
    (typeof GIT_PROVIDER_HEALTH_REASON)[keyof typeof GIT_PROVIDER_HEALTH_REASON]

/**
 * Error codes emitted by health-monitor wrapper.
 */
export const GIT_PROVIDER_HEALTH_ERROR_CODE = {
    CIRCUIT_OPEN: "CIRCUIT_OPEN",
} as const

/**
 * Health-monitor wrapper error code literal.
 */
export type GitProviderHealthErrorCode =
    (typeof GIT_PROVIDER_HEALTH_ERROR_CODE)[keyof typeof GIT_PROVIDER_HEALTH_ERROR_CODE]

/**
 * Error raised when circuit breaker blocks provider operation.
 */
export class GitProviderHealthError extends Error {
    /**
     * Typed error code.
     */
    public readonly code: GitProviderHealthErrorCode

    /**
     * Timestamp when circuit is expected to close.
     */
    public readonly openUntil: Date

    /**
     * Creates typed health-monitor error.
     *
     * @param code Error code.
     * @param message Error message.
     * @param openUntil Circuit-open deadline.
     */
    public constructor(code: GitProviderHealthErrorCode, message: string, openUntil: Date) {
        super(message)
        this.name = "GitProviderHealthError"
        this.code = code
        this.openUntil = openUntil
    }
}

/**
 * Aggregated git provider health report.
 */
export interface IGitProviderHealthReport {
    /**
     * Health status category.
     */
    readonly status: GitProviderHealthStatus

    /**
     * Circuit-breaker state.
     */
    readonly circuitState: GitProviderCircuitState

    /**
     * Whether provider is currently healthy.
     */
    readonly isHealthy: boolean

    /**
     * Consecutive failure count.
     */
    readonly consecutiveFailures: number

    /**
     * Configured threshold that opens circuit.
     */
    readonly failureThreshold: number

    /**
     * Configured circuit-open cooldown.
     */
    readonly circuitOpenMs: number

    /**
     * Configured periodic ping interval.
     */
    readonly pingIntervalMs: number

    /**
     * Last check timestamp.
     */
    readonly lastCheckedAt: Date | null

    /**
     * Last successful operation timestamp.
     */
    readonly lastSuccessAt: Date | null

    /**
     * Last failed operation timestamp.
     */
    readonly lastFailureAt: Date | null

    /**
     * Last failure message when available.
     */
    readonly lastFailureMessage: string | null

    /**
     * Current circuit-open deadline.
     */
    readonly circuitOpenUntil: Date | null
}

/**
 * Event payload emitted on health-status changes.
 */
export interface IGitProviderHealthStatusEvent {
    /**
     * Previous status.
     */
    readonly previousStatus: GitProviderHealthStatus

    /**
     * Next status.
     */
    readonly nextStatus: GitProviderHealthStatus

    /**
     * Previous circuit state.
     */
    readonly previousCircuitState: GitProviderCircuitState

    /**
     * Next circuit state.
     */
    readonly nextCircuitState: GitProviderCircuitState

    /**
     * Transition reason.
     */
    readonly reason: GitProviderHealthReason

    /**
     * Event timestamp.
     */
    readonly occurredAt: string

    /**
     * Health report after transition.
     */
    readonly report: IGitProviderHealthReport
}

/**
 * Runtime health-monitor API.
 */
export interface IGitProviderHealthMonitor {
    /**
     * Starts periodic health checks.
     */
    start(): void

    /**
     * Stops periodic health checks.
     */
    stop(): void

    /**
     * Runs one explicit health-check cycle.
     *
     * @returns Updated health report.
     */
    runHealthCheck(): Promise<IGitProviderHealthReport>

    /**
     * Returns current health report without running checks.
     *
     * @returns Snapshot.
     */
    getReport(): IGitProviderHealthReport
}

/**
 * Periodic scheduler contract for interval checks.
 */
export interface IGitProviderHealthScheduler {
    /**
     * Registers periodic callback.
     *
     * @param callback Callback function.
     * @param intervalMs Interval in milliseconds.
     * @returns Opaque handle.
     */
    setInterval(callback: () => void, intervalMs: number): unknown

    /**
     * Clears periodic callback.
     *
     * @param handle Opaque handle.
     */
    clearInterval(handle: unknown): void
}

/**
 * Health-monitor options.
 */
export interface IGitProviderHealthOptions {
    /**
     * Interval for periodic ping checks.
     */
    readonly pingIntervalMs?: number

    /**
     * Failure threshold before opening circuit.
     */
    readonly failureThreshold?: number

    /**
     * Cooldown while circuit stays open.
     */
    readonly circuitOpenMs?: number

    /**
     * Whether monitor should auto-start periodic checks.
     */
    readonly autoStart?: boolean

    /**
     * Ping implementation used by health checks.
     */
    readonly ping?: (provider: IGitProvider) => Promise<void>

    /**
     * Optional timestamp provider.
     */
    readonly now?: () => number

    /**
     * Optional scheduler implementation for tests.
     */
    readonly scheduler?: IGitProviderHealthScheduler

    /**
     * Optional status-transition callback.
     */
    readonly onStatusChange?: (event: IGitProviderHealthStatusEvent) => void
}

/**
 * Wrapper result with decorated provider and monitor instance.
 */
export interface IGitProviderHealthBundle<TProvider extends IGitProvider> {
    /**
     * Decorated provider.
     */
    readonly provider: TProvider

    /**
     * Runtime health monitor.
     */
    readonly monitor: IGitProviderHealthMonitor
}

const DEFAULT_PING_INTERVAL_MS = 30_000
const DEFAULT_FAILURE_THRESHOLD = 3
const DEFAULT_CIRCUIT_OPEN_MS = 60_000

/**
 * Wraps git provider with health checks, circuit breaker, and status reporting.
 *
 * @param provider Concrete git provider.
 * @param options Health monitor options.
 * @returns Bundle containing decorated provider and monitor API.
 */
export function withGitProviderHealthMonitor<TProvider extends IGitProvider>(
    provider: TProvider,
    options: IGitProviderHealthOptions,
): IGitProviderHealthBundle<TProvider> {
    const monitor = new GitProviderHealthMonitor(provider, options)
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

            return async (...args: readonly unknown[]): Promise<unknown> => {
                monitor.beforeOperation(property)
                try {
                    const result = await toPromise(invokeOperation(value, target, args))
                    monitor.recordSuccess(GIT_PROVIDER_HEALTH_REASON.OperationSuccess)
                    return result
                } catch (error) {
                    monitor.recordFailure(error, GIT_PROVIDER_HEALTH_REASON.OperationFailure)
                    throw error
                }
            }
        },
    })

    if (options.autoStart ?? true) {
        monitor.start()
    }

    return {
        provider: decoratedProvider,
        monitor,
    }
}

/**
 * Git provider health monitor implementation.
 */
class GitProviderHealthMonitor implements IGitProviderHealthMonitor {
    private readonly provider: IGitProvider
    private readonly pingIntervalMs: number
    private readonly failureThreshold: number
    private readonly circuitOpenMs: number
    private readonly ping: (provider: IGitProvider) => Promise<void>
    private readonly now: () => number
    private readonly scheduler: IGitProviderHealthScheduler
    private readonly onStatusChange?: (event: IGitProviderHealthStatusEvent) => void
    private readonly noopHealthCheckHandler: () => void

    private intervalHandle: unknown
    private circuitState: GitProviderCircuitState = GIT_PROVIDER_CIRCUIT_STATE.Closed
    private consecutiveFailures = 0
    private lastCheckedAtMs: number | null = null
    private lastSuccessAtMs: number | null = null
    private lastFailureAtMs: number | null = null
    private lastFailureMessage: string | null = null
    private circuitOpenUntilMs: number | null = null

    /**
     * Creates health monitor.
     *
     * @param provider Concrete provider.
     * @param options Monitor options.
     */
    public constructor(provider: IGitProvider, options: IGitProviderHealthOptions) {
        this.provider = provider
        this.pingIntervalMs = normalizePositiveInteger(
            options.pingIntervalMs,
            DEFAULT_PING_INTERVAL_MS,
            "pingIntervalMs",
        )
        this.failureThreshold = normalizePositiveInteger(
            options.failureThreshold,
            DEFAULT_FAILURE_THRESHOLD,
            "failureThreshold",
        )
        this.circuitOpenMs = normalizePositiveInteger(
            options.circuitOpenMs,
            DEFAULT_CIRCUIT_OPEN_MS,
            "circuitOpenMs",
        )
        this.ping = options.ping ?? defaultPing
        this.now = options.now ?? Date.now
        this.scheduler = options.scheduler ?? getDefaultScheduler()
        this.onStatusChange = options.onStatusChange
        this.noopHealthCheckHandler = (): void => {
            void this.runHealthCheck()
        }
    }

    /**
     * Starts periodic health checks.
     */
    public start(): void {
        if (this.intervalHandle !== undefined) {
            return
        }

        const handle = this.scheduler.setInterval(
            this.noopHealthCheckHandler,
            this.pingIntervalMs,
        )
        this.intervalHandle = handle
        unrefTimer(handle)
    }

    /**
     * Stops periodic health checks.
     */
    public stop(): void {
        if (this.intervalHandle === undefined) {
            return
        }

        this.scheduler.clearInterval(this.intervalHandle)
        this.intervalHandle = undefined
    }

    /**
     * Executes one health-check cycle.
     *
     * @returns Updated health report.
     */
    public async runHealthCheck(): Promise<IGitProviderHealthReport> {
        this.lastCheckedAtMs = this.now()

        if (this.circuitState === GIT_PROVIDER_CIRCUIT_STATE.Open) {
            const openUntil = this.circuitOpenUntilMs ?? this.now()
            if (this.now() < openUntil) {
                return this.getReport()
            }

            this.transitionCircuitState(
                GIT_PROVIDER_CIRCUIT_STATE.HalfOpen,
                GIT_PROVIDER_HEALTH_REASON.CircuitHalfOpen,
            )
        }

        try {
            await this.ping(this.provider)
            this.recordSuccess(GIT_PROVIDER_HEALTH_REASON.HealthCheckSuccess)
        } catch (error) {
            this.recordFailure(error, GIT_PROVIDER_HEALTH_REASON.HealthCheckFailure)
        }

        return this.getReport()
    }

    /**
     * Returns current health snapshot.
     *
     * @returns Health report.
     */
    public getReport(): IGitProviderHealthReport {
        const status = resolveHealthStatus(this.circuitState, this.consecutiveFailures)
        const report: IGitProviderHealthReport = {
            status,
            circuitState: this.circuitState,
            isHealthy: status === GIT_PROVIDER_HEALTH_STATUS.Healthy,
            consecutiveFailures: this.consecutiveFailures,
            failureThreshold: this.failureThreshold,
            circuitOpenMs: this.circuitOpenMs,
            pingIntervalMs: this.pingIntervalMs,
            lastCheckedAt: toDate(this.lastCheckedAtMs),
            lastSuccessAt: toDate(this.lastSuccessAtMs),
            lastFailureAt: toDate(this.lastFailureAtMs),
            lastFailureMessage: this.lastFailureMessage,
            circuitOpenUntil: toDate(this.circuitOpenUntilMs),
        }

        return report
    }

    /**
     * Applies circuit-gate checks before provider operation.
     *
     * @param operationName Operation label.
     * @throws GitProviderHealthError when circuit is open.
     */
    public beforeOperation(operationName: string): void {
        if (this.circuitState !== GIT_PROVIDER_CIRCUIT_STATE.Open) {
            return
        }

        const nowMs = this.now()
        const openUntil = this.circuitOpenUntilMs ?? nowMs
        if (nowMs >= openUntil) {
            this.transitionCircuitState(
                GIT_PROVIDER_CIRCUIT_STATE.HalfOpen,
                GIT_PROVIDER_HEALTH_REASON.CircuitHalfOpen,
            )
            return
        }

        throw new GitProviderHealthError(
            GIT_PROVIDER_HEALTH_ERROR_CODE.CIRCUIT_OPEN,
            `Git provider circuit is open for operation "${operationName}"`,
            new Date(openUntil),
        )
    }

    /**
     * Records successful operation and closes circuit when needed.
     *
     * @param reason Success reason.
     */
    public recordSuccess(reason: GitProviderHealthReason): void {
        this.lastSuccessAtMs = this.now()
        this.lastFailureMessage = null
        this.consecutiveFailures = 0
        this.circuitOpenUntilMs = null

        const nextCircuitState = this.circuitState === GIT_PROVIDER_CIRCUIT_STATE.Closed
            ? GIT_PROVIDER_CIRCUIT_STATE.Closed
            : GIT_PROVIDER_CIRCUIT_STATE.Closed
        this.transitionCircuitState(nextCircuitState, reason)
    }

    /**
     * Records failed operation and opens circuit when threshold is reached.
     *
     * @param error Operation error.
     * @param reason Failure reason.
     */
    public recordFailure(error: unknown, reason: GitProviderHealthReason): void {
        const normalized = normalizeGitAclError(error)
        this.lastFailureAtMs = this.now()
        this.lastFailureMessage = normalized.message
        this.consecutiveFailures += 1

        if (
            this.circuitState === GIT_PROVIDER_CIRCUIT_STATE.HalfOpen ||
            this.consecutiveFailures >= this.failureThreshold
        ) {
            this.circuitOpenUntilMs = this.now() + this.circuitOpenMs
            this.transitionCircuitState(
                GIT_PROVIDER_CIRCUIT_STATE.Open,
                GIT_PROVIDER_HEALTH_REASON.CircuitOpened,
            )
            return
        }

        this.emitStatusChange(
            this.circuitState,
            this.circuitState,
            reason,
        )
    }

    /**
     * Transitions circuit state and emits status events.
     *
     * @param nextState Target state.
     * @param reason Transition reason.
     */
    private transitionCircuitState(nextState: GitProviderCircuitState, reason: GitProviderHealthReason): void {
        const previousCircuitState = this.circuitState
        this.circuitState = nextState
        this.emitStatusChange(previousCircuitState, nextState, reason)
    }

    /**
     * Emits status-transition event when consumer is configured.
     *
     * @param previousCircuitState Previous circuit state.
     * @param nextCircuitState Next circuit state.
     * @param reason Transition reason.
     */
    private emitStatusChange(
        previousCircuitState: GitProviderCircuitState,
        nextCircuitState: GitProviderCircuitState,
        reason: GitProviderHealthReason,
    ): void {
        if (this.onStatusChange === undefined) {
            return
        }

        const previousStatus = resolveHealthStatus(previousCircuitState, this.consecutiveFailures)
        const nextStatus = resolveHealthStatus(nextCircuitState, this.consecutiveFailures)

        this.onStatusChange({
            previousStatus,
            nextStatus,
            previousCircuitState,
            nextCircuitState,
            reason,
            occurredAt: new Date(this.now()).toISOString(),
            report: this.getReport(),
        })
    }
}

/**
 * Resolves health status from circuit state and failure count.
 *
 * @param circuitState Circuit state.
 * @param consecutiveFailures Failure count.
 * @returns Health status.
 */
function resolveHealthStatus(
    circuitState: GitProviderCircuitState,
    consecutiveFailures: number,
): GitProviderHealthStatus {
    if (circuitState === GIT_PROVIDER_CIRCUIT_STATE.Open) {
        return GIT_PROVIDER_HEALTH_STATUS.Unhealthy
    }

    if (consecutiveFailures > 0 || circuitState === GIT_PROVIDER_CIRCUIT_STATE.HalfOpen) {
        return GIT_PROVIDER_HEALTH_STATUS.Degraded
    }

    return GIT_PROVIDER_HEALTH_STATUS.Healthy
}

/**
 * Default ping implementation for provider health checks.
 *
 * @param provider Git provider.
 * @returns Completion promise.
 */
async function defaultPing(provider: IGitProvider): Promise<void> {
    await provider.getBranches()
}

/**
 * Returns default scheduler implementation backed by global timers.
 *
 * @returns Scheduler.
 */
function getDefaultScheduler(): IGitProviderHealthScheduler {
    return {
        setInterval(callback: () => void, intervalMs: number): unknown {
            return setInterval(callback, intervalMs)
        },
        clearInterval(handle: unknown): void {
            clearInterval(handle as ReturnType<typeof setInterval>)
        },
    }
}

/**
 * Calls `unref` on interval handle when supported.
 *
 * @param handle Interval handle.
 */
function unrefTimer(handle: unknown): void {
    const maybeHandle = handle as {unref?: () => void}
    if (typeof maybeHandle.unref === "function") {
        maybeHandle.unref()
    }
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
 * Converts operation result to Promise.
 *
 * @param value Raw value.
 * @returns Promise.
 */
function toPromise(value: unknown): Promise<unknown> {
    if (value instanceof Promise) {
        return value
    }

    return Promise.resolve(value)
}

/**
 * Invokes callable operation with explicit context.
 *
 * @param operation Callable operation.
 * @param thisArg Invocation context.
 * @param args Invocation args.
 * @returns Raw result.
 */
function invokeOperation(
    operation: (...args: readonly unknown[]) => unknown,
    thisArg: unknown,
    args: readonly unknown[],
): unknown {
    return operation.call(thisArg, ...args)
}

/**
 * Normalizes optional positive integer option.
 *
 * @param value Raw value.
 * @param fallback Default value.
 * @param fieldName Field label.
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
 * Converts optional timestamp to date.
 *
 * @param value Timestamp in milliseconds.
 * @returns Date value.
 */
function toDate(value: number | null): Date | null {
    if (value === null) {
        return null
    }

    return new Date(value)
}
