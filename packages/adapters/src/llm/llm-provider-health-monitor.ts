import type {
    IChatChunkDTO,
    ILLMProvider,
    IStreamingChatResponseDTO,
} from "@codenautic/core"

import {LLM_PROVIDER_OPERATION_NAME_SET} from "./llm-provider-operation-names"

/**
 * Health status values reported by LLM provider monitor.
 */
export const LLM_PROVIDER_HEALTH_STATUS = {
    Healthy: "HEALTHY",
    Degraded: "DEGRADED",
    Unhealthy: "UNHEALTHY",
} as const

/**
 * Health status literal.
 */
export type LlmProviderHealthStatus =
    (typeof LLM_PROVIDER_HEALTH_STATUS)[keyof typeof LLM_PROVIDER_HEALTH_STATUS]

/**
 * Circuit-breaker state values.
 */
export const LLM_PROVIDER_CIRCUIT_STATE = {
    Closed: "CLOSED",
    Open: "OPEN",
    HalfOpen: "HALF_OPEN",
} as const

/**
 * Circuit-breaker state literal.
 */
export type LlmProviderCircuitState =
    (typeof LLM_PROVIDER_CIRCUIT_STATE)[keyof typeof LLM_PROVIDER_CIRCUIT_STATE]

/**
 * Reason codes for health-status transitions.
 */
export const LLM_PROVIDER_HEALTH_REASON = {
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
export type LlmProviderHealthReason =
    (typeof LLM_PROVIDER_HEALTH_REASON)[keyof typeof LLM_PROVIDER_HEALTH_REASON]

/**
 * Error codes emitted by health-monitor wrapper.
 */
export const LLM_PROVIDER_HEALTH_ERROR_CODE = {
    CIRCUIT_OPEN: "CIRCUIT_OPEN",
} as const

/**
 * Health-monitor wrapper error code literal.
 */
export type LlmProviderHealthErrorCode =
    (typeof LLM_PROVIDER_HEALTH_ERROR_CODE)[keyof typeof LLM_PROVIDER_HEALTH_ERROR_CODE]

/**
 * Error raised when circuit breaker blocks provider operation.
 */
export class LlmProviderHealthError extends Error {
    /**
     * Typed error code.
     */
    public readonly code: LlmProviderHealthErrorCode

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
    public constructor(code: LlmProviderHealthErrorCode, message: string, openUntil: Date) {
        super(message)
        this.name = "LlmProviderHealthError"
        this.code = code
        this.openUntil = openUntil
    }
}

/**
 * Aggregated LLM provider health report.
 */
export interface ILlmProviderHealthReport {
    /**
     * Health status category.
     */
    readonly status: LlmProviderHealthStatus

    /**
     * Circuit-breaker state.
     */
    readonly circuitState: LlmProviderCircuitState

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
export interface ILlmProviderHealthStatusEvent {
    /**
     * Previous status.
     */
    readonly previousStatus: LlmProviderHealthStatus

    /**
     * Next status.
     */
    readonly nextStatus: LlmProviderHealthStatus

    /**
     * Previous circuit state.
     */
    readonly previousCircuitState: LlmProviderCircuitState

    /**
     * Next circuit state.
     */
    readonly nextCircuitState: LlmProviderCircuitState

    /**
     * Transition reason.
     */
    readonly reason: LlmProviderHealthReason

    /**
     * Event timestamp.
     */
    readonly occurredAt: string

    /**
     * Health report after transition.
     */
    readonly report: ILlmProviderHealthReport
}

/**
 * Runtime health-monitor API.
 */
export interface ILlmProviderHealthMonitor {
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
    runHealthCheck(): Promise<ILlmProviderHealthReport>

    /**
     * Returns current health report without running checks.
     *
     * @returns Snapshot.
     */
    getReport(): ILlmProviderHealthReport
}

/**
 * Periodic scheduler contract for interval checks.
 */
export interface ILlmProviderHealthScheduler {
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
export interface ILlmProviderHealthOptions {
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
    readonly ping?: (provider: ILLMProvider) => Promise<void>

    /**
     * Optional timestamp provider.
     */
    readonly now?: () => number

    /**
     * Optional scheduler implementation for tests.
     */
    readonly scheduler?: ILlmProviderHealthScheduler

    /**
     * Optional status-transition callback.
     */
    readonly onStatusChange?: (event: ILlmProviderHealthStatusEvent) => void
}

/**
 * Wrapper result with decorated provider and monitor instance.
 */
export interface ILlmProviderHealthBundle<TProvider extends ILLMProvider> {
    /**
     * Decorated provider.
     */
    readonly provider: TProvider

    /**
     * Runtime health monitor.
     */
    readonly monitor: ILlmProviderHealthMonitor
}

const DEFAULT_PING_INTERVAL_MS = 30_000
const DEFAULT_FAILURE_THRESHOLD = 3
const DEFAULT_CIRCUIT_OPEN_MS = 60_000

/**
 * Wraps LLM provider with health checks, circuit breaker, and status reporting.
 *
 * @param provider Concrete LLM provider.
 * @param options Health monitor options.
 * @returns Bundle containing decorated provider and monitor API.
 */
export function withLlmProviderHealthMonitor<TProvider extends ILLMProvider>(
    provider: TProvider,
    options: ILlmProviderHealthOptions,
): ILlmProviderHealthBundle<TProvider> {
    const monitor = new LlmProviderHealthMonitor(provider, options)
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
                    monitor.beforeOperation(property)
                    return createMonitoredStreamingResponse(
                        (): IStreamingChatResponseDTO => {
                            return toStreamingResponse(invokeOperation(value, target, args))
                        },
                        (): void => {
                            monitor.recordSuccess(LLM_PROVIDER_HEALTH_REASON.OperationSuccess)
                        },
                        (error: unknown): void => {
                            monitor.recordFailure(error, LLM_PROVIDER_HEALTH_REASON.OperationFailure)
                        },
                    )
                }
            }

            return async (...args: readonly unknown[]): Promise<unknown> => {
                monitor.beforeOperation(property)
                try {
                    const result = await toPromise(invokeOperation(value, target, args))
                    monitor.recordSuccess(LLM_PROVIDER_HEALTH_REASON.OperationSuccess)
                    return result
                } catch (error) {
                    monitor.recordFailure(error, LLM_PROVIDER_HEALTH_REASON.OperationFailure)
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
 * LLM provider health monitor implementation.
 */
class LlmProviderHealthMonitor implements ILlmProviderHealthMonitor {
    private readonly provider: ILLMProvider
    private readonly pingIntervalMs: number
    private readonly failureThreshold: number
    private readonly circuitOpenMs: number
    private readonly ping: (provider: ILLMProvider) => Promise<void>
    private readonly now: () => number
    private readonly scheduler: ILlmProviderHealthScheduler
    private readonly onStatusChange?: (event: ILlmProviderHealthStatusEvent) => void
    private readonly noopHealthCheckHandler: () => void

    private intervalHandle: unknown
    private circuitState: LlmProviderCircuitState = LLM_PROVIDER_CIRCUIT_STATE.Closed
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
    public constructor(provider: ILLMProvider, options: ILlmProviderHealthOptions) {
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
    public async runHealthCheck(): Promise<ILlmProviderHealthReport> {
        this.lastCheckedAtMs = this.now()

        if (this.circuitState === LLM_PROVIDER_CIRCUIT_STATE.Open) {
            const openUntil = this.circuitOpenUntilMs ?? this.now()
            if (this.now() < openUntil) {
                return this.getReport()
            }

            this.transitionCircuitState(
                LLM_PROVIDER_CIRCUIT_STATE.HalfOpen,
                LLM_PROVIDER_HEALTH_REASON.CircuitHalfOpen,
            )
        }

        try {
            await this.ping(this.provider)
            this.recordSuccess(LLM_PROVIDER_HEALTH_REASON.HealthCheckSuccess)
        } catch (error) {
            this.recordFailure(error, LLM_PROVIDER_HEALTH_REASON.HealthCheckFailure)
        }

        return this.getReport()
    }

    /**
     * Returns current health snapshot.
     *
     * @returns Health report.
     */
    public getReport(): ILlmProviderHealthReport {
        const status = resolveHealthStatus(this.circuitState, this.consecutiveFailures)
        const report: ILlmProviderHealthReport = {
            status,
            circuitState: this.circuitState,
            isHealthy: status === LLM_PROVIDER_HEALTH_STATUS.Healthy,
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
     * @throws LlmProviderHealthError when circuit is open.
     */
    public beforeOperation(operationName: string): void {
        if (this.circuitState !== LLM_PROVIDER_CIRCUIT_STATE.Open) {
            return
        }

        const nowMs = this.now()
        const openUntil = this.circuitOpenUntilMs ?? nowMs
        if (nowMs >= openUntil) {
            this.transitionCircuitState(
                LLM_PROVIDER_CIRCUIT_STATE.HalfOpen,
                LLM_PROVIDER_HEALTH_REASON.CircuitHalfOpen,
            )
            return
        }

        throw new LlmProviderHealthError(
            LLM_PROVIDER_HEALTH_ERROR_CODE.CIRCUIT_OPEN,
            `LLM provider circuit is open for operation "${operationName}"`,
            new Date(openUntil),
        )
    }

    /**
     * Records successful operation and closes circuit when needed.
     *
     * @param reason Success reason.
     */
    public recordSuccess(reason: LlmProviderHealthReason): void {
        this.lastSuccessAtMs = this.now()
        this.lastFailureMessage = null
        this.consecutiveFailures = 0
        this.circuitOpenUntilMs = null
        this.transitionCircuitState(LLM_PROVIDER_CIRCUIT_STATE.Closed, reason)
    }

    /**
     * Records failed operation and opens circuit when threshold is reached.
     *
     * @param error Operation error.
     * @param reason Failure reason.
     */
    public recordFailure(error: unknown, reason: LlmProviderHealthReason): void {
        this.lastFailureAtMs = this.now()
        this.lastFailureMessage = toErrorMessage(error)
        this.consecutiveFailures += 1

        if (
            this.circuitState === LLM_PROVIDER_CIRCUIT_STATE.HalfOpen ||
            this.consecutiveFailures >= this.failureThreshold
        ) {
            this.circuitOpenUntilMs = this.now() + this.circuitOpenMs
            this.transitionCircuitState(
                LLM_PROVIDER_CIRCUIT_STATE.Open,
                LLM_PROVIDER_HEALTH_REASON.CircuitOpened,
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
    private transitionCircuitState(nextState: LlmProviderCircuitState, reason: LlmProviderHealthReason): void {
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
        previousCircuitState: LlmProviderCircuitState,
        nextCircuitState: LlmProviderCircuitState,
        reason: LlmProviderHealthReason,
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
    circuitState: LlmProviderCircuitState,
    consecutiveFailures: number,
): LlmProviderHealthStatus {
    if (circuitState === LLM_PROVIDER_CIRCUIT_STATE.Open) {
        return LLM_PROVIDER_HEALTH_STATUS.Unhealthy
    }

    if (consecutiveFailures > 0 || circuitState === LLM_PROVIDER_CIRCUIT_STATE.HalfOpen) {
        return LLM_PROVIDER_HEALTH_STATUS.Degraded
    }

    return LLM_PROVIDER_HEALTH_STATUS.Healthy
}

/**
 * Creates monitored streaming wrapper around provider stream.
 *
 * @param createStream Stream factory callback.
 * @param onSuccess Success hook.
 * @param onFailure Failure hook.
 * @returns Monitored stream.
 */
function createMonitoredStreamingResponse(
    createStream: () => IStreamingChatResponseDTO,
    onSuccess: () => void,
    onFailure: (error: unknown) => void,
): IStreamingChatResponseDTO {
    return {
        async *[Symbol.asyncIterator](): AsyncIterator<IChatChunkDTO> {
            let stream: IStreamingChatResponseDTO
            try {
                stream = createStream()
            } catch (error) {
                onFailure(error)
                throw error
            }

            try {
                for await (const chunk of stream) {
                    yield chunk
                }

                onSuccess()
            } catch (error) {
                onFailure(error)
                throw error
            }
        },
    }
}

/**
 * Normalizes error message from unknown value.
 *
 * @param error Unknown error payload.
 * @returns Human-readable message.
 */
function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    const record = toRecord(error)
    const message = record?.["message"]
    if (typeof message === "string" && message.length > 0) {
        return message
    }

    return "LLM provider operation failed"
}

/**
 * Default ping implementation for provider health checks.
 *
 * @param provider LLM provider.
 * @returns Completion promise.
 */
async function defaultPing(provider: ILLMProvider): Promise<void> {
    await provider.embed(["health-check"])
}

/**
 * Returns default scheduler implementation backed by global timers.
 *
 * @returns Scheduler.
 */
function getDefaultScheduler(): ILlmProviderHealthScheduler {
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
 * Narrows unknown value to plain record.
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
 * Narrows unknown operation result to streaming response.
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
