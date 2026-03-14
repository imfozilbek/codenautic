import {describe, expect, test} from "bun:test"

import type {IGitProvider, IMergeRequestDTO} from "@codenautic/core"

import {withGitRetry, type IGitRetryDlqEntry} from "../../src/git"
import {createGitProviderMock} from "../helpers/provider-factories"

/**
 * Virtual clock helper for deterministic retry tests.
 */
interface IVirtualClock {
    /**
     * Returns current virtual timestamp in milliseconds.
     *
     * @returns Virtual timestamp.
     */
    readonly now: () => number

    /**
     * Advances virtual time by delay and resolves immediately.
     *
     * @param delayMs Delay in milliseconds.
     * @returns Completion promise.
     */
    readonly sleep: (delayMs: number) => Promise<void>

    /**
     * Captured delays.
     */
    readonly delays: number[]
}

/**
 * Creates one virtual clock instance.
 *
 * @param initialMs Initial timestamp.
 * @returns Virtual clock facade.
 */
function createVirtualClock(initialMs = 0): IVirtualClock {
    let currentMs = initialMs
    const delays: number[] = []

    return {
        now(): number {
            return currentMs
        },
        sleep(delayMs: number): Promise<void> {
            delays.push(delayMs)
            currentMs += delayMs
            return Promise.resolve()
        },
        delays,
    }
}

/**
 * Creates git provider double with custom merge-request handler.
 *
 * @param handler Merge-request handler.
 * @returns Provider double.
 */
function createRecordingProvider(
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
 * Asserts that promise rejects with expected message fragment.
 *
 * @param promise Promise expected to reject.
 * @param messageFragment Expected message fragment.
 * @returns Completion promise.
 */
async function expectPromiseRejectMessage(
    promise: Promise<unknown>,
    messageFragment: string,
): Promise<void> {
    try {
        await promise
    } catch (error) {
        expect(error).toBeInstanceOf(Error)
        if (error instanceof Error) {
            expect(error.message).toContain(messageFragment)
            return
        }
    }

    throw new Error("Expected promise to reject with matching message")
}

describe("withGitRetry", () => {
    test("retries retryable errors with backoff delay = baseDelay * 4^(attempt-1)", async () => {
        const clock = createVirtualClock()
        let attempts = 0
        const provider = createRecordingProvider((id: string): Promise<IMergeRequestDTO> => {
            attempts += 1
            if (attempts < 3) {
                const retryableError = new Error("temporary upstream error") as Error & {
                    statusCode: number
                }
                retryableError.statusCode = 500
                return Promise.reject(retryableError)
            }

            return Promise.resolve({id} as IMergeRequestDTO)
        })
        const wrappedProvider = withGitRetry(provider, {
            maxAttempts: 5,
            baseDelayMs: 10,
            now: clock.now,
            sleep: clock.sleep,
        })

        const result = await wrappedProvider.getMergeRequest("mr-retry")

        expect(result.id).toBe("mr-retry")
        expect(attempts).toBe(3)
        expect(clock.delays).toEqual([
            10,
            40,
        ])
    })

    test("does not retry non-retryable errors", async () => {
        const clock = createVirtualClock()
        let attempts = 0
        const provider = createRecordingProvider((_id: string): Promise<IMergeRequestDTO> => {
            attempts += 1
            const authError = new Error("forbidden") as Error & {
                statusCode: number
            }
            authError.statusCode = 403
            return Promise.reject(authError)
        })
        const wrappedProvider = withGitRetry(provider, {
            maxAttempts: 5,
            baseDelayMs: 10,
            now: clock.now,
            sleep: clock.sleep,
        })

        await expectPromiseRejectMessage(
            wrappedProvider.getMergeRequest("mr-auth"),
            "forbidden",
        )

        expect(attempts).toBe(1)
        expect(clock.delays).toEqual([])
    })

    test("writes exhausted operations to dlq after max attempts", async () => {
        const clock = createVirtualClock()
        const dlqEntries: IGitRetryDlqEntry[] = []
        let attempts = 0
        const provider = createRecordingProvider((_id: string): Promise<IMergeRequestDTO> => {
            attempts += 1
            const serverError = new Error("still failing") as Error & {
                statusCode: number
            }
            serverError.statusCode = 500
            return Promise.reject(serverError)
        })
        const wrappedProvider = withGitRetry(provider, {
            maxAttempts: 3,
            baseDelayMs: 5,
            now: clock.now,
            sleep: clock.sleep,
            dlqWriter: {
                write(entry: IGitRetryDlqEntry): Promise<void> {
                    dlqEntries.push(entry)
                    return Promise.resolve()
                },
            },
        })

        await expectPromiseRejectMessage(
            wrappedProvider.getMergeRequest("mr-dlq"),
            "still failing",
        )

        expect(attempts).toBe(3)
        expect(clock.delays).toEqual([
            5,
            20,
        ])
        expect(dlqEntries).toHaveLength(1)
        expect(dlqEntries[0]?.operation).toBe("getMergeRequest")
        expect(dlqEntries[0]?.attempts).toBe(3)
        expect(dlqEntries[0]?.maxAttempts).toBe(3)
        expect(dlqEntries[0]?.normalizedError.isRetryable).toBe(true)
        expect(dlqEntries[0]?.normalizedError.statusCode).toBe(500)
    })

    test("prefers retry-after delay from provider error", async () => {
        const clock = createVirtualClock()
        let attempts = 0
        const provider = createRecordingProvider((id: string): Promise<IMergeRequestDTO> => {
            attempts += 1
            if (attempts === 1) {
                const rateLimitedError = new Error("rate limit") as Error & {
                    statusCode: number
                    retryAfterMs: number
                }
                rateLimitedError.statusCode = 429
                rateLimitedError.retryAfterMs = 77
                return Promise.reject(rateLimitedError)
            }

            return Promise.resolve({id} as IMergeRequestDTO)
        })
        const wrappedProvider = withGitRetry(provider, {
            maxAttempts: 5,
            baseDelayMs: 10,
            now: clock.now,
            sleep: clock.sleep,
        })

        const result = await wrappedProvider.getMergeRequest("mr-retry-after")

        expect(result.id).toBe("mr-retry-after")
        expect(attempts).toBe(2)
        expect(clock.delays).toEqual([77])
    })
})
