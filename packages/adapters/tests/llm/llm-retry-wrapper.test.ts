import {describe, expect, test} from "bun:test"

import type {
    IChatChunkDTO,
    IChatRequestDTO,
    IChatResponseDTO,
    ILLMProvider,
} from "@codenautic/core"

import {withLlmRetry, type ILlmRetryDlqEntry} from "../../src/llm"

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
     * Captured delay calls.
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
 * Builds minimal chat request payload.
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
                content: "hello",
            },
        ],
    }
}

/**
 * Creates stream that yields one deterministic chunk.
 *
 * @param delta Chunk payload.
 * @returns Streaming response.
 */
function createSingleChunkStream(delta: string): AsyncIterable<IChatChunkDTO> {
    return {
        [Symbol.asyncIterator](): AsyncIterator<IChatChunkDTO> {
            let emitted = false

            return {
                next(): Promise<IteratorResult<IChatChunkDTO>> {
                    if (emitted) {
                        return Promise.resolve({
                            done: true,
                            value: undefined,
                        })
                    }

                    emitted = true
                    return Promise.resolve({
                        done: false,
                        value: {
                            delta,
                        },
                    })
                },
            }
        },
    }
}

/**
 * Builds provider double with optional custom handlers.
 *
 * @param handlers Optional operation handlers.
 * @returns Provider double.
 */
function createRecordingProvider(handlers: {
    readonly chat?: (request: IChatRequestDTO) => Promise<IChatResponseDTO>
    readonly stream?: (request: IChatRequestDTO) => AsyncIterable<IChatChunkDTO>
    readonly embed?: (texts: readonly string[]) => Promise<readonly number[][]>
}): ILLMProvider {
    return {
        chat(request: IChatRequestDTO): Promise<IChatResponseDTO> {
            if (handlers.chat !== undefined) {
                return handlers.chat(request)
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
        stream(request: IChatRequestDTO): AsyncIterable<IChatChunkDTO> {
            if (handlers.stream !== undefined) {
                return handlers.stream(request)
            }

            return createSingleChunkStream(request.model)
        },
        embed(texts: readonly string[]): Promise<readonly number[][]> {
            if (handlers.embed !== undefined) {
                return handlers.embed(texts)
            }

            return Promise.resolve([
                texts.map((_text: string, index: number): number => index),
            ])
        },
    }
}

/**
 * Collects all chunks from stream.
 *
 * @param stream Source stream.
 * @returns Materialized chunks.
 */
async function collectChunks(stream: AsyncIterable<IChatChunkDTO>): Promise<readonly IChatChunkDTO[]> {
    const chunks: IChatChunkDTO[] = []

    for await (const chunk of stream) {
        chunks.push(chunk)
    }

    return chunks
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

describe("withLlmRetry", () => {
    test("retries retryable chat errors with backoff delay = baseDelay * 4^(attempt-1)", async () => {
        const clock = createVirtualClock()
        let attempts = 0
        const provider = createRecordingProvider({
            chat(request: IChatRequestDTO): Promise<IChatResponseDTO> {
                attempts += 1
                if (attempts < 3) {
                    const retryableError = new Error("temporary llm error") as Error & {
                        isRetryable: boolean
                        statusCode: number
                    }
                    retryableError.isRetryable = true
                    retryableError.statusCode = 500
                    return Promise.reject(retryableError)
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
        })
        const wrappedProvider = withLlmRetry(provider, {
            maxAttempts: 5,
            baseDelayMs: 10,
            now: clock.now,
            sleep: clock.sleep,
        })

        const result = await wrappedProvider.chat(createChatRequest("m-retry"))

        expect(result.content).toBe("m-retry")
        expect(attempts).toBe(3)
        expect(clock.delays).toEqual([
            10,
            40,
        ])
    })

    test("does not retry non-retryable chat errors", async () => {
        const clock = createVirtualClock()
        let attempts = 0
        const provider = createRecordingProvider({
            chat(): Promise<IChatResponseDTO> {
                attempts += 1
                const authError = new Error("forbidden") as Error & {
                    statusCode: number
                }
                authError.statusCode = 403
                return Promise.reject(authError)
            },
        })
        const wrappedProvider = withLlmRetry(provider, {
            maxAttempts: 5,
            baseDelayMs: 10,
            now: clock.now,
            sleep: clock.sleep,
        })

        await expectPromiseRejectMessage(
            wrappedProvider.chat(createChatRequest("m-auth")),
            "forbidden",
        )

        expect(attempts).toBe(1)
        expect(clock.delays).toEqual([])
    })

    test("writes exhausted operations to dlq after max attempts", async () => {
        const clock = createVirtualClock()
        const dlqEntries: ILlmRetryDlqEntry[] = []
        let attempts = 0
        const provider = createRecordingProvider({
            chat(): Promise<IChatResponseDTO> {
                attempts += 1
                const serverError = new Error("still failing") as Error & {
                    statusCode: number
                }
                serverError.statusCode = 500
                return Promise.reject(serverError)
            },
        })
        const wrappedProvider = withLlmRetry(provider, {
            maxAttempts: 3,
            baseDelayMs: 5,
            now: clock.now,
            sleep: clock.sleep,
            dlqWriter: {
                write(entry: ILlmRetryDlqEntry): Promise<void> {
                    dlqEntries.push(entry)
                    return Promise.resolve()
                },
            },
        })

        await expectPromiseRejectMessage(
            wrappedProvider.chat(createChatRequest("m-dlq")),
            "still failing",
        )

        expect(attempts).toBe(3)
        expect(clock.delays).toEqual([
            5,
            20,
        ])
        expect(dlqEntries).toHaveLength(1)
        expect(dlqEntries[0]?.operation).toBe("chat")
        expect(dlqEntries[0]?.attempts).toBe(3)
        expect(dlqEntries[0]?.maxAttempts).toBe(3)
        expect(dlqEntries[0]?.normalizedError.isRetryable).toBe(true)
        expect(dlqEntries[0]?.normalizedError.statusCode).toBe(500)
    })

    test("prefers retry-after delay from provider error", async () => {
        const clock = createVirtualClock()
        let attempts = 0
        const provider = createRecordingProvider({
            chat(request: IChatRequestDTO): Promise<IChatResponseDTO> {
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

                return Promise.resolve({
                    content: request.model,
                    usage: {
                        input: 0,
                        output: 0,
                        total: 0,
                    },
                })
            },
        })
        const wrappedProvider = withLlmRetry(provider, {
            maxAttempts: 5,
            baseDelayMs: 10,
            now: clock.now,
            sleep: clock.sleep,
        })

        const result = await wrappedProvider.chat(createChatRequest("m-retry-after"))

        expect(result.content).toBe("m-retry-after")
        expect(attempts).toBe(2)
        expect(clock.delays).toEqual([77])
    })

    test("retries stream when provider throws before stream creation", async () => {
        const clock = createVirtualClock()
        let attempts = 0
        const provider = createRecordingProvider({
            stream(request: IChatRequestDTO): AsyncIterable<IChatChunkDTO> {
                attempts += 1
                if (attempts === 1) {
                    const retryableError = new Error("temporary stream failure") as Error & {
                        statusCode: number
                    }
                    retryableError.statusCode = 500
                    throw retryableError
                }

                return createSingleChunkStream(request.model)
            },
        })
        const wrappedProvider = withLlmRetry(provider, {
            maxAttempts: 5,
            baseDelayMs: 10,
            now: clock.now,
            sleep: clock.sleep,
        })

        const chunks = await collectChunks(wrappedProvider.stream(createChatRequest("m-stream")))

        expect(attempts).toBe(2)
        expect(clock.delays).toEqual([10])
        expect(chunks).toEqual([
            {
                delta: "m-stream",
            },
        ])
    })

    test("validates retry options", () => {
        const provider = createRecordingProvider({})

        expect(() => {
            return withLlmRetry(provider, {
                maxAttempts: 0,
            })
        }).toThrow("maxAttempts must be a positive integer")

        expect(() => {
            return withLlmRetry(provider, {
                baseDelayMs: 0,
            })
        }).toThrow("baseDelayMs must be a positive integer")
    })
})
