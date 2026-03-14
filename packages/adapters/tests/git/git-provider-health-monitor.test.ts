import {describe, expect, test} from "bun:test"

import type {IGitProvider, IMergeRequestDTO} from "@codenautic/core"

import {
    GIT_PROVIDER_HEALTH_ERROR_CODE,
    GIT_PROVIDER_HEALTH_REASON,
    GIT_PROVIDER_HEALTH_STATUS,
    GitProviderHealthError,
    withGitProviderHealthMonitor,
    type IGitProviderHealthScheduler,
} from "../../src/git"
import {createGitProviderMock} from "../helpers/provider-factories"

/**
 * Provider double with configurable merge-request operation.
 *
 * @param handler Merge-request callback.
 * @returns Provider double.
 */
function createMergeRequestProvider(
    handler: (id: string) => Promise<IMergeRequestDTO>,
): IGitProvider {
    return {
        ...createGitProviderMock(),
        getMergeRequest(id: string): Promise<IMergeRequestDTO> {
            return handler(id)
        },
    }
}

/**
 * Scheduler test double with manual trigger.
 */
class TestHealthScheduler implements IGitProviderHealthScheduler {
    public readonly intervals: Array<{
        readonly callback: () => void
        readonly intervalMs: number
        readonly handle: Record<string, unknown>
    }> = []
    public readonly clearedHandles: unknown[] = []

    /**
     * Captures interval subscription.
     *
     * @param callback Scheduled callback.
     * @param intervalMs Interval in milliseconds.
     * @returns Opaque handle.
     */
    public setInterval(callback: () => void, intervalMs: number): unknown {
        const handle = {}
        this.intervals.push({
            callback,
            intervalMs,
            handle,
        })
        return handle
    }

    /**
     * Captures interval cleanup.
     *
     * @param handle Opaque handle.
     */
    public clearInterval(handle: unknown): void {
        this.clearedHandles.push(handle)
    }

    /**
     * Triggers captured callback at provided index.
     *
     * @param index Interval index.
     */
    public trigger(index: number): void {
        const interval = this.intervals[index]
        if (interval === undefined) {
            throw new Error(`Interval at index ${String(index)} is not registered`)
        }

        interval.callback()
    }
}

/**
 * Waits until predicate returns true or throws after timeout.
 *
 * @param predicate Async predicate.
 * @param errorMessage Timeout message.
 * @param timeoutMs Timeout in milliseconds.
 * @returns Completion promise.
 */
async function waitUntil(
    predicate: () => boolean,
    errorMessage: string,
    timeoutMs = 200,
): Promise<void> {
    const startedAt = Date.now()
    while (!predicate()) {
        if (Date.now() - startedAt > timeoutMs) {
            throw new Error(errorMessage)
        }

        await Promise.resolve()
    }
}

/**
 * Asserts promise rejection and returns typed error instance.
 *
 * @param promise Promise expected to reject.
 * @returns Rejected error.
 */
async function expectRejectedError(promise: Promise<unknown>): Promise<Error> {
    try {
        await promise
    } catch (error) {
        expect(error).toBeInstanceOf(Error)
        if (error instanceof Error) {
            return error
        }
    }

    throw new Error("Expected promise to reject with Error")
}

describe("withGitProviderHealthMonitor", () => {
    test("starts periodic ping checks and stops scheduler on demand", async () => {
        const scheduler = new TestHealthScheduler()
        let pingCount = 0
        const provider = createMergeRequestProvider((id: string): Promise<IMergeRequestDTO> => {
            return Promise.resolve({id} as IMergeRequestDTO)
        })
        const wrapped = withGitProviderHealthMonitor(provider, {
            autoStart: true,
            pingIntervalMs: 1_000,
            scheduler,
            ping: (): Promise<void> => {
                pingCount += 1
                return Promise.resolve()
            },
        })

        expect(scheduler.intervals).toHaveLength(1)
        expect(scheduler.intervals[0]?.intervalMs).toBe(1_000)

        scheduler.trigger(0)
        await waitUntil(
            () => pingCount === 1,
            "Periodic ping was not executed",
        )

        wrapped.monitor.stop()
        expect(scheduler.clearedHandles).toEqual([scheduler.intervals[0]?.handle])
    })

    test("opens circuit after threshold failures and blocks calls while open", async () => {
        let nowMs = 0
        let attempts = 0
        const provider = createMergeRequestProvider((_id: string): Promise<IMergeRequestDTO> => {
            attempts += 1
            const error = new Error("upstream unavailable") as Error & {
                statusCode: number
            }
            error.statusCode = 500
            return Promise.reject(error)
        })
        const wrapped = withGitProviderHealthMonitor(provider, {
            autoStart: false,
            failureThreshold: 2,
            circuitOpenMs: 100,
            now: (): number => nowMs,
        })

        await expectRejectedError(wrapped.provider.getMergeRequest("mr-1"))
        await expectRejectedError(wrapped.provider.getMergeRequest("mr-2"))

        const blockedError = await expectRejectedError(
            wrapped.provider.getMergeRequest("mr-3"),
        )

        expect(blockedError).toBeInstanceOf(GitProviderHealthError)
        if (blockedError instanceof GitProviderHealthError) {
            expect(blockedError.code).toBe(GIT_PROVIDER_HEALTH_ERROR_CODE.CIRCUIT_OPEN)
        }

        expect(attempts).toBe(2)
        const report = wrapped.monitor.getReport()
        expect(report.status).toBe(GIT_PROVIDER_HEALTH_STATUS.Unhealthy)
        expect(report.circuitState).toBe("OPEN")
        expect(report.consecutiveFailures).toBe(2)

        nowMs += 100
    })

    test("moves to half-open after cooldown and closes circuit on successful probe", async () => {
        let nowMs = 0
        let attempts = 0
        const provider = createMergeRequestProvider((id: string): Promise<IMergeRequestDTO> => {
            attempts += 1
            if (attempts === 1) {
                const error = new Error("temporary error") as Error & {
                    statusCode: number
                }
                error.statusCode = 500
                return Promise.reject(error)
            }

            return Promise.resolve({id} as IMergeRequestDTO)
        })
        const wrapped = withGitProviderHealthMonitor(provider, {
            autoStart: false,
            failureThreshold: 1,
            circuitOpenMs: 50,
            now: (): number => nowMs,
        })

        await expectRejectedError(wrapped.provider.getMergeRequest("mr-open"))
        expect(wrapped.monitor.getReport().status).toBe(GIT_PROVIDER_HEALTH_STATUS.Unhealthy)

        nowMs += 60
        const mergeRequest = await wrapped.provider.getMergeRequest("mr-recover")

        expect(mergeRequest.id).toBe("mr-recover")
        expect(attempts).toBe(2)
        const report = wrapped.monitor.getReport()
        expect(report.status).toBe(GIT_PROVIDER_HEALTH_STATUS.Healthy)
        expect(report.circuitState).toBe("CLOSED")
        expect(report.consecutiveFailures).toBe(0)
    })

    test("emits status-reporting events for circuit transitions", async () => {
        let nowMs = 0
        let attempts = 0
        const reasons: string[] = []
        const provider = createMergeRequestProvider((id: string): Promise<IMergeRequestDTO> => {
            attempts += 1
            if (attempts === 1) {
                const error = new Error("server error") as Error & {
                    statusCode: number
                }
                error.statusCode = 500
                return Promise.reject(error)
            }

            return Promise.resolve({id} as IMergeRequestDTO)
        })
        const wrapped = withGitProviderHealthMonitor(provider, {
            autoStart: false,
            failureThreshold: 1,
            circuitOpenMs: 10,
            now: (): number => nowMs,
            onStatusChange: (event): void => {
                reasons.push(event.reason)
            },
        })

        await expectRejectedError(wrapped.provider.getMergeRequest("mr-open"))
        nowMs += 11
        await wrapped.provider.getMergeRequest("mr-close")

        expect(reasons).toContain(GIT_PROVIDER_HEALTH_REASON.CircuitOpened)
        expect(reasons).toContain(GIT_PROVIDER_HEALTH_REASON.OperationSuccess)
    })
})
