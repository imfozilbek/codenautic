import {describe, expect, test} from "bun:test"

import type {
    IChatRequestDTO,
    IChatResponseDTO,
    ILLMProvider,
} from "@codenautic/core"

import {
    LLM_PROVIDER_HEALTH_ERROR_CODE,
    LLM_PROVIDER_HEALTH_REASON,
    LLM_PROVIDER_HEALTH_STATUS,
    LlmProviderHealthError,
    withLlmProviderHealthMonitor,
    type ILlmProviderHealthScheduler,
} from "../../src/llm"
import {createLlmProviderMock} from "../helpers/provider-factories"

/**
 * Builds deterministic chat request payload.
 *
 * @param model Model identifier.
 * @returns Chat request.
 */
function createChatRequest(model: string): IChatRequestDTO {
    return {
        model,
        messages: [
            {
                role: "user",
                content: "health-check",
            },
        ],
    }
}

/**
 * Provider double with configurable chat handler.
 *
 * @param handler Chat callback.
 * @returns Provider double.
 */
function createChatProvider(
    handler: (request: IChatRequestDTO) => Promise<IChatResponseDTO>,
): ILLMProvider {
    return {
        ...createLlmProviderMock(),
        chat(request: IChatRequestDTO): Promise<IChatResponseDTO> {
            return handler(request)
        },
    }
}

/**
 * Scheduler test double with manual trigger.
 */
class TestHealthScheduler implements ILlmProviderHealthScheduler {
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

describe("withLlmProviderHealthMonitor", () => {
    test("starts periodic ping checks and stops scheduler on demand", async () => {
        const scheduler = new TestHealthScheduler()
        let pingCount = 0
        const provider = createChatProvider(
            (request: IChatRequestDTO): Promise<IChatResponseDTO> => {
                return Promise.resolve({
                    content: request.model,
                    usage: {
                        input: 0,
                        output: 0,
                        total: 0,
                    },
                })
            },
        )
        const wrapped = withLlmProviderHealthMonitor(provider, {
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
        const provider = createChatProvider(
            (_request: IChatRequestDTO): Promise<IChatResponseDTO> => {
                attempts += 1
                const error = new Error("upstream unavailable") as Error & {
                    statusCode: number
                }
                error.statusCode = 500
                return Promise.reject(error)
            },
        )
        const wrapped = withLlmProviderHealthMonitor(provider, {
            autoStart: false,
            failureThreshold: 2,
            circuitOpenMs: 100,
            now: (): number => nowMs,
        })

        await expectRejectedError(wrapped.provider.chat(createChatRequest("m1")))
        await expectRejectedError(wrapped.provider.chat(createChatRequest("m2")))

        const blockedError = await expectRejectedError(
            wrapped.provider.chat(createChatRequest("m3")),
        )

        expect(blockedError).toBeInstanceOf(LlmProviderHealthError)
        if (blockedError instanceof LlmProviderHealthError) {
            expect(blockedError.code).toBe(LLM_PROVIDER_HEALTH_ERROR_CODE.CIRCUIT_OPEN)
        }

        expect(attempts).toBe(2)
        const report = wrapped.monitor.getReport()
        expect(report.status).toBe(LLM_PROVIDER_HEALTH_STATUS.Unhealthy)
        expect(report.circuitState).toBe("OPEN")
        expect(report.consecutiveFailures).toBe(2)

        nowMs += 100
    })

    test("moves to half-open after cooldown and closes circuit on successful probe", async () => {
        let nowMs = 0
        let attempts = 0
        const provider = createChatProvider(
            (request: IChatRequestDTO): Promise<IChatResponseDTO> => {
                attempts += 1
                if (attempts === 1) {
                    const error = new Error("temporary error") as Error & {
                        statusCode: number
                    }
                    error.statusCode = 500
                    return Promise.reject(error)
                }

                return Promise.resolve({
                    content: request.model,
                    usage: {
                        input: 0,
                        output: 0,
                        total: 0,
                    },
                })
            },
        )
        const wrapped = withLlmProviderHealthMonitor(provider, {
            autoStart: false,
            failureThreshold: 1,
            circuitOpenMs: 50,
            now: (): number => nowMs,
        })

        await expectRejectedError(wrapped.provider.chat(createChatRequest("open")))
        expect(wrapped.monitor.getReport().status).toBe(LLM_PROVIDER_HEALTH_STATUS.Unhealthy)

        nowMs += 60
        const response = await wrapped.provider.chat(createChatRequest("recover"))

        expect(response.content).toBe("recover")
        expect(attempts).toBe(2)
        const report = wrapped.monitor.getReport()
        expect(report.status).toBe(LLM_PROVIDER_HEALTH_STATUS.Healthy)
        expect(report.circuitState).toBe("CLOSED")
        expect(report.consecutiveFailures).toBe(0)
    })

    test("emits status-reporting events for circuit transitions", async () => {
        let nowMs = 0
        let attempts = 0
        const reasons: string[] = []
        const provider = createChatProvider(
            (request: IChatRequestDTO): Promise<IChatResponseDTO> => {
                attempts += 1
                if (attempts === 1) {
                    const error = new Error("server error") as Error & {
                        statusCode: number
                    }
                    error.statusCode = 500
                    return Promise.reject(error)
                }

                return Promise.resolve({
                    content: request.model,
                    usage: {
                        input: 0,
                        output: 0,
                        total: 0,
                    },
                })
            },
        )
        const wrapped = withLlmProviderHealthMonitor(provider, {
            autoStart: false,
            failureThreshold: 1,
            circuitOpenMs: 10,
            now: (): number => nowMs,
            onStatusChange: (event): void => {
                reasons.push(event.reason)
            },
        })

        await expectRejectedError(wrapped.provider.chat(createChatRequest("open")))
        nowMs += 11
        await wrapped.provider.chat(createChatRequest("close"))

        expect(reasons).toContain(LLM_PROVIDER_HEALTH_REASON.CircuitOpened)
        expect(reasons).toContain(LLM_PROVIDER_HEALTH_REASON.OperationSuccess)
    })
})
