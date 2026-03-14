import {describe, expect, test} from "bun:test"

import {APIError} from "@anthropic-ai/sdk"
import {CHAT_FINISH_REASON, MESSAGE_ROLE, type IChatChunkDTO} from "@codenautic/core"

import {
    AnthropicProvider,
    AnthropicProviderError,
    type IAnthropicClient,
    type IVoyageEmbeddingClient,
} from "../../src/llm"

type AsyncMethod<TResult> = (...args: readonly unknown[]) => Promise<TResult>
type IAnthropicClientMockOverrides = {
    readonly messageCreate?: IAnthropicClient["messages"]["create"]
}
type IVoyageClientMockOverrides = {
    readonly embedCreate?: IVoyageEmbeddingClient["embed"]
}

/**
 * Creates async mock from queued handlers.
 *
 * @param handlers Per-call handlers.
 * @returns Async function with captured calls.
 */
function createQueuedAsyncMethod<TResult>(
    handlers: readonly ((...args: readonly unknown[]) => TResult | Promise<TResult>)[],
): AsyncMethod<TResult> & {readonly calls: readonly (readonly unknown[])[]} {
    const calls: (readonly unknown[])[] = []
    let callIndex = 0

    const method = ((...args: readonly unknown[]): Promise<TResult> => {
        calls.push(args)

        const handler = handlers[callIndex]
        callIndex += 1
        if (handler === undefined) {
            return Promise.reject(new Error("Unexpected call"))
        }

        return Promise.resolve(handler(...args))
    }) as AsyncMethod<TResult> & {readonly calls: readonly (readonly unknown[])[]}

    Object.defineProperty(method, "calls", {
        value: calls,
    })

    return method
}

/**
 * Creates async iterable from static item list.
 *
 * @param items Streamed items.
 * @returns Async iterable over items.
 */
function createAsyncIterable<TItem>(items: readonly TItem[]): AsyncIterable<TItem> {
    return {
        [Symbol.asyncIterator](): AsyncIterator<TItem> {
            let index = 0

            return {
                next(): Promise<IteratorResult<TItem>> {
                    const item = items[index]
                    index += 1

                    if (item === undefined) {
                        return Promise.resolve({
                            done: true,
                            value: undefined,
                        })
                    }

                    return Promise.resolve({
                        done: false,
                        value: item,
                    })
                },
            }
        },
    }
}

/**
 * Creates default unexpected method for test client sections.
 *
 * @returns Method rejecting on unexpected invocation.
 */
function createUnexpectedMethod<TMethod>(): TMethod {
    return ((..._args: readonly unknown[]): Promise<never> => {
        return Promise.reject(new Error("Unexpected client call"))
    }) as TMethod
}

/**
 * Resolves override or fallback unexpected method.
 *
 * @param override Optional override.
 * @returns Override or default rejecting method.
 */
function resolveMethod<TMethod>(override: TMethod | undefined): TMethod {
    return override ?? createUnexpectedMethod<TMethod>()
}

/**
 * Creates Anthropic client mock.
 *
 * @param overrides Partial method overrides.
 * @returns Anthropic-compatible mock.
 */
function createAnthropicClientMock(overrides: IAnthropicClientMockOverrides): IAnthropicClient {
    return {
        messages: {
            create: resolveMethod(overrides.messageCreate),
        },
    }
}

/**
 * Creates Voyage embedding client mock.
 *
 * @param overrides Partial method overrides.
 * @returns Voyage-compatible mock.
 */
function createVoyageClientMock(overrides: IVoyageClientMockOverrides): IVoyageEmbeddingClient {
    return {
        embed: resolveMethod(overrides.embedCreate),
    }
}

/**
 * Collects all streamed chunks into array.
 *
 * @param stream Source chunk stream.
 * @returns Materialized chunk list.
 */
async function collectChunks(stream: AsyncIterable<IChatChunkDTO>): Promise<readonly IChatChunkDTO[]> {
    const chunks: IChatChunkDTO[] = []

    for await (const chunk of stream) {
        chunks.push(chunk)
    }

    return chunks
}

/**
 * Captures rejected error for assertion-friendly checks.
 *
 * @param execute Async action expected to fail.
 * @returns Rejected error instance.
 */
async function captureRejectedError(execute: () => Promise<unknown>): Promise<Error> {
    try {
        await execute()
    } catch (error) {
        if (error instanceof Error) {
            return error
        }

        throw new Error("Expected error object to be thrown")
    }

    throw new Error("Expected promise to reject")
}

describe("AnthropicProvider", () => {
    test("executes chat request with tool use and finish reason", async () => {
        const messageCreate = createQueuedAsyncMethod([
            () => {
                return {
                    content: [
                        {
                            type: "text",
                            text: "{\"ok\":true}",
                        },
                        {
                            type: "tool_use",
                            id: "call-1",
                            name: "calc",
                            input: {
                                a: 1,
                            },
                        },
                    ],
                    usage: {
                        input_tokens: 12,
                        output_tokens: 4,
                    },
                    stop_reason: "tool_use",
                }
            },
        ])
        const provider = new AnthropicProvider({
            client: createAnthropicClientMock({
                messageCreate: messageCreate as unknown as IAnthropicClient["messages"]["create"],
            }),
        })

        const response = await provider.chat({
            model: " claude-3-7-sonnet ",
            maxTokens: 256,
            messages: [
                {
                    role: MESSAGE_ROLE.SYSTEM,
                    content: " return JSON only ",
                },
                {
                    role: MESSAGE_ROLE.USER,
                    content: " solve task ",
                },
            ],
            tools: [
                {
                    name: "calc",
                    description: "calculator",
                    parameters: {
                        type: "object",
                    },
                },
            ],
        })

        expect(response).toEqual({
            content: "{\"ok\":true}",
            toolCalls: [
                {
                    id: "call-1",
                    name: "calc",
                    arguments: "{\"a\":1}",
                },
            ],
            usage: {
                input: 12,
                output: 4,
                total: 16,
            },
            finishReason: "tool_use",
        })
        expect(messageCreate.calls).toHaveLength(1)
        expect(messageCreate.calls[0]?.[0]).toMatchObject({
            model: "claude-3-7-sonnet",
            max_tokens: 256,
            system: "return JSON only",
            tools: [
                {
                    name: "calc",
                    description: "calculator",
                },
            ],
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "solve task",
                        },
                    ],
                },
            ],
        })
    })

    test("streams text deltas, finish reason and usage chunk", async () => {
        const messageCreate = createQueuedAsyncMethod([
            () => {
                return createAsyncIterable([
                    {
                        type: "message_start",
                        message: {
                            usage: {
                                input_tokens: 5,
                                output_tokens: 0,
                            },
                        },
                    },
                    {
                        type: "content_block_delta",
                        delta: {
                            type: "text_delta",
                            text: "Hel",
                        },
                    },
                    {
                        type: "content_block_delta",
                        delta: {
                            type: "text_delta",
                            text: "lo",
                        },
                    },
                    {
                        type: "message_delta",
                        delta: {
                            stop_reason: "end_turn",
                        },
                        usage: {
                            input_tokens: 5,
                            output_tokens: 2,
                        },
                    },
                    {
                        type: "message_stop",
                    },
                ])
            },
        ])
        const provider = new AnthropicProvider({
            client: createAnthropicClientMock({
                messageCreate: messageCreate as unknown as IAnthropicClient["messages"]["create"],
            }),
        })

        const chunks = await collectChunks(
            provider.stream({
                model: "claude-3-7-sonnet",
                messages: [
                    {
                        role: MESSAGE_ROLE.USER,
                        content: "Say hello",
                    },
                ],
            }),
        )

        expect(chunks).toEqual([
            {
                delta: "Hel",
                finishReason: undefined,
                usage: undefined,
            },
            {
                delta: "lo",
                finishReason: undefined,
                usage: undefined,
            },
            {
                delta: "",
                finishReason: CHAT_FINISH_REASON.STOP,
                usage: {
                    input: 5,
                    output: 2,
                    total: 7,
                },
            },
        ])
        expect(messageCreate.calls[0]?.[0]).toMatchObject({
            stream: true,
        })
    })

    test("creates embeddings with configured voyage embedding model", async () => {
        const embedCreate = createQueuedAsyncMethod([
            () => {
                return {
                    data: [
                        {
                            embedding: [0.1, 0.2],
                        },
                        {
                            embedding: [0.3, 0.4],
                        },
                    ],
                }
            },
        ])
        const provider = new AnthropicProvider({
            client: createAnthropicClientMock({}),
            embeddingClient: createVoyageClientMock({
                embedCreate,
            }),
            embeddingModel: "voyage-code-3-large",
        })

        const embeddings = await provider.embed(["first", "second"])

        expect(embeddings).toEqual([
            [0.1, 0.2],
            [0.3, 0.4],
        ])
        expect(embedCreate.calls[0]?.[0]).toEqual({
            input: ["first", "second"],
            model: "voyage-code-3-large",
        })
    })

    test("retries retryable rate limit failures using retry-after header", async () => {
        const sleepCalls: number[] = []
        const messageCreate = createQueuedAsyncMethod([
            () => {
                throw APIError.generate(429, {}, "rate limited", new Headers({"retry-after": "1"}))
            },
            () => {
                return {
                    content: [
                        {
                            type: "text",
                            text: "ok",
                        },
                    ],
                    usage: {
                        input_tokens: 1,
                        output_tokens: 1,
                    },
                    stop_reason: "end_turn",
                }
            },
        ])
        const provider = new AnthropicProvider({
            client: createAnthropicClientMock({
                messageCreate: messageCreate as unknown as IAnthropicClient["messages"]["create"],
            }),
            sleep(delayMs: number): Promise<void> {
                sleepCalls.push(delayMs)
                return Promise.resolve()
            },
        })

        const response = await provider.chat({
            model: "claude-3-5-haiku-latest",
            messages: [
                {
                    role: MESSAGE_ROLE.USER,
                    content: "retry please",
                },
            ],
        })

        expect(response.content).toBe("ok")
        expect(sleepCalls).toEqual([1000])
        expect(messageCreate.calls).toHaveLength(2)
    })

    test("uses default sleep implementation for retry backoff when custom sleeper is omitted", async () => {
        const messageCreate = createQueuedAsyncMethod([
            () => {
                throw APIError.generate(429, {}, "rate limited", new Headers({"retry-after": "0"}))
            },
            () => {
                return {
                    content: [
                        {
                            type: "text",
                            text: "ok after default sleep",
                        },
                    ],
                    usage: {
                        input_tokens: 2,
                        output_tokens: 1,
                    },
                    stop_reason: "end_turn",
                }
            },
        ])
        const provider = new AnthropicProvider({
            client: createAnthropicClientMock({
                messageCreate: messageCreate as unknown as IAnthropicClient["messages"]["create"],
            }),
        })

        const response = await provider.chat({
            model: "claude-3-5-haiku-latest",
            messages: [
                {
                    role: MESSAGE_ROLE.USER,
                    content: "retry with default sleep",
                },
            ],
        })

        expect(response.content).toBe("ok after default sleep")
        expect(messageCreate.calls).toHaveLength(2)
    })

    test("stops on non-retryable errors and exposes exhausted retry metadata", async () => {
        const badRequestProvider = new AnthropicProvider({
            client: createAnthropicClientMock({
                messageCreate: createQueuedAsyncMethod([
                    () => {
                        throw APIError.generate(400, {}, "bad request", new Headers())
                    },
                ]) as unknown as IAnthropicClient["messages"]["create"],
            }),
        })

        const badRequestError = await captureRejectedError(() =>
            badRequestProvider.chat({
                model: "claude-3-5-haiku-latest",
                messages: [
                    {
                        role: MESSAGE_ROLE.USER,
                        content: "invalid",
                    },
                ],
            }),
        )

        expect(badRequestError).toBeInstanceOf(AnthropicProviderError)
        expect(badRequestError).toMatchObject({
            name: "AnthropicProviderError",
            source: "anthropic",
            statusCode: 400,
            isRetryable: false,
        })

        const sleepCalls: number[] = []
        const serverProvider = new AnthropicProvider({
            client: createAnthropicClientMock({
                messageCreate: createQueuedAsyncMethod([
                    () => {
                        throw APIError.generate(503, {}, "server down", new Headers())
                    },
                    () => {
                        throw APIError.generate(503, {}, "server down", new Headers())
                    },
                ]) as unknown as IAnthropicClient["messages"]["create"],
            }),
            retryMaxAttempts: 2,
            sleep(delayMs: number): Promise<void> {
                sleepCalls.push(delayMs)
                return Promise.resolve()
            },
        })

        const serverError = await captureRejectedError(() =>
            serverProvider.chat({
                model: "claude-3-5-haiku-latest",
                messages: [
                    {
                        role: MESSAGE_ROLE.USER,
                        content: "server",
                    },
                ],
            }),
        )

        expect(serverError).toBeInstanceOf(AnthropicProviderError)
        expect(serverError).toMatchObject({
            name: "AnthropicProviderError",
            source: "anthropic",
            statusCode: 503,
            isRetryable: true,
        })
        expect(sleepCalls).toEqual([250])
    })

    test("validates constructor and embedding inputs", async () => {
        expect(() => {
            return new AnthropicProvider({
                apiKey: " ",
                voyageApiKey: "voyage-secret",
            })
        }).toThrow("apiKey cannot be empty")

        expect(() => {
            return new AnthropicProvider({
                client: createAnthropicClientMock({}),
                retryMaxAttempts: 0,
            })
        }).toThrow("retryMaxAttempts must be positive integer")

        const providerWithoutVoyage = new AnthropicProvider({
            client: createAnthropicClientMock({}),
        })

        const noVoyageError = await captureRejectedError(() => providerWithoutVoyage.embed(["value"]))
        expect(noVoyageError.message).toContain("voyageApiKey cannot be empty")

        const providerWithVoyage = new AnthropicProvider({
            client: createAnthropicClientMock({}),
            embeddingClient: createVoyageClientMock({}),
        })
        const invalidTextError = await captureRejectedError(() => providerWithVoyage.embed([" "]))

        expect(invalidTextError.message).toContain("texts[0] cannot be empty")
        expect(await providerWithoutVoyage.embed([])).toEqual([])
    })
})
