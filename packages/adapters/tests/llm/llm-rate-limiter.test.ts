import {describe, expect, test} from "bun:test"

import type {
    IChatChunkDTO,
    IChatRequestDTO,
    IChatResponseDTO,
    ILLMProvider,
} from "@codenautic/core"

import {
    LLM_RATE_LIMIT_REASON,
    LLM_RATE_LIMIT_TIER,
    withLlmRateLimit,
} from "../../src/llm"

/**
 * Virtual clock with controllable current time and async sleep.
 */
interface IVirtualClock {
    /**
     * Returns current virtual timestamp in milliseconds.
     *
     * @returns Virtual timestamp.
     */
    readonly now: () => number

    /**
     * Advances virtual time by requested delay.
     *
     * @param delayMs Delay in milliseconds.
     * @returns Completion promise.
     */
    readonly sleep: (delayMs: number) => Promise<void>

    /**
     * Captured sleep delays.
     */
    readonly delays: number[]
}

/**
 * Creates virtual clock helper for deterministic limiter tests.
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
 * Builds minimal chat request for tests.
 *
 * @param model Model id.
 * @returns Chat request payload.
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
 * @param delta Chunk delta.
 * @returns Stream response.
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
 * Creates provider double with custom handlers.
 *
 * @param handlers Optional chat/stream/embed handlers.
 * @returns LLM provider double.
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

            return Promise.resolve([])
        },
    }
}

/**
 * Collects all stream chunks into array.
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

describe("withLlmRateLimit", () => {
    test("throttles chat requests when free tier quota is exhausted within one window", async () => {
        const clock = createVirtualClock()
        const calls: string[] = []
        const provider = createRecordingProvider({
            chat(request: IChatRequestDTO): Promise<IChatResponseDTO> {
                calls.push(request.model)
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
        const rateLimited = withLlmRateLimit(provider, {
            organizationId: "org-llm-free",
            tier: LLM_RATE_LIMIT_TIER.FREE,
            freeTierLimit: 2,
            windowMs: 1_000,
            now: clock.now,
            sleep: clock.sleep,
        })

        await rateLimited.chat(createChatRequest("m1"))
        await rateLimited.chat(createChatRequest("m2"))
        await rateLimited.chat(createChatRequest("m3"))

        expect(calls).toEqual([
            "m1",
            "m2",
            "m3",
        ])
        expect(clock.delays).toEqual([1_000])
    })

    test("uses pro tier quota when tier is PRO", async () => {
        const clock = createVirtualClock()
        const calls: string[] = []
        const provider = createRecordingProvider({
            chat(request: IChatRequestDTO): Promise<IChatResponseDTO> {
                calls.push(request.model)
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
        const rateLimited = withLlmRateLimit(provider, {
            organizationId: "org-llm-pro",
            tier: LLM_RATE_LIMIT_TIER.PRO,
            freeTierLimit: 1,
            proTierLimit: 3,
            windowMs: 500,
            now: clock.now,
            sleep: clock.sleep,
        })

        await rateLimited.chat(createChatRequest("m1"))
        await rateLimited.chat(createChatRequest("m2"))
        await rateLimited.chat(createChatRequest("m3"))
        await rateLimited.chat(createChatRequest("m4"))

        expect(calls).toEqual([
            "m1",
            "m2",
            "m3",
            "m4",
        ])
        expect(clock.delays).toEqual([500])
    })

    test("handles provider 429 on chat request by throttling and retrying", async () => {
        const clock = createVirtualClock()
        const throttleReasons: string[] = []
        let attempts = 0
        const provider = createRecordingProvider({
            chat(): Promise<IChatResponseDTO> {
                attempts += 1
                if (attempts === 1) {
                    const rateLimitedError = new Error("rate limited") as Error & {
                        statusCode: number
                        retryAfterMs: number
                    }
                    rateLimitedError.statusCode = 429
                    rateLimitedError.retryAfterMs = 250
                    return Promise.reject(rateLimitedError)
                }

                return Promise.resolve({
                    content: "ok",
                    usage: {
                        input: 0,
                        output: 0,
                        total: 0,
                    },
                })
            },
        })
        const rateLimited = withLlmRateLimit(provider, {
            organizationId: "org-llm-429",
            tier: LLM_RATE_LIMIT_TIER.PRO,
            proTierLimit: 100,
            windowMs: 5_000,
            now: clock.now,
            sleep: clock.sleep,
            onThrottle(event): void {
                throttleReasons.push(event.reason)
            },
        })

        const result = await rateLimited.chat(createChatRequest("m429"))

        expect(result.content).toBe("ok")
        expect(attempts).toBe(2)
        expect(clock.delays).toEqual([250])
        expect(throttleReasons).toEqual([LLM_RATE_LIMIT_REASON.ProviderRateLimited])
    })

    test("throttles stream requests and preserves emitted chunks", async () => {
        const clock = createVirtualClock()
        const streamCalls: string[] = []
        const provider = createRecordingProvider({
            stream(request: IChatRequestDTO): AsyncIterable<IChatChunkDTO> {
                streamCalls.push(request.model)
                return createSingleChunkStream(request.model)
            },
        })
        const rateLimited = withLlmRateLimit(provider, {
            organizationId: "org-llm-stream",
            tier: LLM_RATE_LIMIT_TIER.FREE,
            freeTierLimit: 1,
            windowMs: 1_000,
            now: clock.now,
            sleep: clock.sleep,
        })

        const firstChunks = await collectChunks(rateLimited.stream(createChatRequest("s1")))
        const secondChunks = await collectChunks(rateLimited.stream(createChatRequest("s2")))

        expect(firstChunks).toEqual([
            {
                delta: "s1",
            },
        ])
        expect(secondChunks).toEqual([
            {
                delta: "s2",
            },
        ])
        expect(streamCalls).toEqual([
            "s1",
            "s2",
        ])
        expect(clock.delays).toEqual([1_000])
    })

    test("validates limiter options", () => {
        const provider = createRecordingProvider({})

        expect(() => {
            return withLlmRateLimit(provider, {
                organizationId: " ",
                tier: LLM_RATE_LIMIT_TIER.FREE,
            })
        }).toThrow("organizationId must not be empty")

        expect(() => {
            return withLlmRateLimit(provider, {
                organizationId: "org-invalid-window",
                tier: LLM_RATE_LIMIT_TIER.FREE,
                windowMs: 0,
            })
        }).toThrow("windowMs must be a positive integer")
    })
})
