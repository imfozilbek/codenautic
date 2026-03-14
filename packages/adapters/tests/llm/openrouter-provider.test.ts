import {describe, expect, test} from "bun:test"

import {APIError} from "openai"
import {
    CHAT_RESPONSE_FORMAT,
    MESSAGE_ROLE,
    type IChatChunkDTO,
} from "@codenautic/core"

import {
    OpenRouterProvider,
    OpenRouterProviderError,
    type IOpenRouterClient,
} from "../../src/llm"

type AsyncMethod<TResult> = (...args: readonly unknown[]) => Promise<TResult>
type IOpenRouterClientMockOverrides = {
    readonly chatCreate?: IOpenRouterClient["chat"]["completions"]["create"]
    readonly embedCreate?: IOpenRouterClient["embeddings"]["create"]
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
 * Creates default unexpected method for OpenRouter mock sections.
 *
 * @returns Method rejecting on unexpected invocation.
 */
function createUnexpectedMethod<TMethod>(): TMethod {
    return ((..._args: readonly unknown[]): Promise<never> => {
        return Promise.reject(new Error("Unexpected OpenRouter client call"))
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
 * Creates OpenRouter-compatible client mock.
 *
 * @param overrides Partial method overrides.
 * @returns OpenRouter-compatible mock.
 */
function createOpenRouterClientMock(
    overrides: IOpenRouterClientMockOverrides,
): IOpenRouterClient {
    return {
        chat: {
            completions: {
                create: resolveMethod(overrides.chatCreate),
            },
        },
        embeddings: {
            create: resolveMethod(overrides.embedCreate),
        },
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

describe("OpenRouterProvider", () => {
    test("executes chat request with tools, finish reason and JSON mode", async () => {
        const chatCreate = createQueuedAsyncMethod([
            () => {
                return {
                    choices: [
                        {
                            message: {
                                content: "{\"ok\":true}",
                                tool_calls: [
                                    {
                                        id: "call-1",
                                        function: {
                                            name: "calc",
                                            arguments: "{\"a\":1}",
                                        },
                                    },
                                ],
                            },
                            finish_reason: "tool_calls",
                        },
                    ],
                    usage: {
                        prompt_tokens: 12,
                        completion_tokens: 4,
                        total_tokens: 16,
                    },
                }
            },
        ])
        const provider = new OpenRouterProvider({
            client: createOpenRouterClientMock({
                chatCreate: chatCreate as unknown as IOpenRouterClient["chat"]["completions"]["create"],
            }),
        })

        const response = await provider.chat({
            model: " openai/gpt-4o-mini ",
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
            responseFormat: {
                type: CHAT_RESPONSE_FORMAT.JSON_OBJECT,
            },
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
            finishReason: "tool_calls",
        })
        expect(chatCreate.calls).toHaveLength(1)
        expect(chatCreate.calls[0]?.[0]).toMatchObject({
            model: "openai/gpt-4o-mini",
            response_format: {
                type: "json_object",
            },
            tools: [
                {
                    type: "function",
                    function: {
                        name: "calc",
                    },
                },
            ],
            messages: [
                {
                    role: "system",
                    content: "return JSON only",
                },
                {
                    role: "user",
                    content: "solve task",
                },
            ],
        })
    })

    test("streams text deltas, finish reason and final usage chunk", async () => {
        const chatCreate = createQueuedAsyncMethod([
            () => {
                return createAsyncIterable([
                    {
                        choices: [
                            {
                                delta: {
                                    content: "Hel",
                                },
                                finish_reason: null,
                            },
                        ],
                    },
                    {
                        choices: [
                            {
                                delta: {
                                    content: "lo",
                                },
                                finish_reason: "stop",
                            },
                        ],
                    },
                    {
                        choices: [],
                        usage: {
                            prompt_tokens: 5,
                            completion_tokens: 2,
                            total_tokens: 7,
                        },
                    },
                ])
            },
        ])
        const provider = new OpenRouterProvider({
            client: createOpenRouterClientMock({
                chatCreate: chatCreate as unknown as IOpenRouterClient["chat"]["completions"]["create"],
            }),
        })

        const chunks = await collectChunks(
            provider.stream({
                model: "openai/gpt-4o-mini",
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
                finishReason: "stop",
                usage: undefined,
            },
            {
                delta: "",
                finishReason: undefined,
                usage: {
                    input: 5,
                    output: 2,
                    total: 7,
                },
            },
        ])
        expect(chatCreate.calls[0]?.[0]).toMatchObject({
            stream: true,
            stream_options: {
                include_usage: true,
            },
        })
    })

    test("creates embeddings with configured embedding model", async () => {
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
        const provider = new OpenRouterProvider({
            client: createOpenRouterClientMock({
                embedCreate,
            }),
            embeddingModel: "text-embedding-3-large",
        })

        const embeddings = await provider.embed(["first", "second"])

        expect(embeddings).toEqual([
            [0.1, 0.2],
            [0.3, 0.4],
        ])
        expect(embedCreate.calls[0]?.[0]).toEqual({
            input: ["first", "second"],
            model: "text-embedding-3-large",
            encoding_format: "float",
        })
    })

    test("retries retryable rate limit failures using retry-after header", async () => {
        const sleepCalls: number[] = []
        const chatCreate = createQueuedAsyncMethod([
            () => {
                throw APIError.generate(429, {}, "rate limited", new Headers({"retry-after": "1"}))
            },
            () => {
                return {
                    choices: [
                        {
                            message: {
                                content: "ok",
                            },
                            finish_reason: "stop",
                        },
                    ],
                    usage: {
                        prompt_tokens: 1,
                        completion_tokens: 1,
                        total_tokens: 2,
                    },
                }
            },
        ])
        const provider = new OpenRouterProvider({
            client: createOpenRouterClientMock({
                chatCreate: chatCreate as unknown as IOpenRouterClient["chat"]["completions"]["create"],
            }),
            sleep(delayMs: number): Promise<void> {
                sleepCalls.push(delayMs)
                return Promise.resolve()
            },
        })

        const response = await provider.chat({
            model: "openai/gpt-4o-mini",
            messages: [
                {
                    role: MESSAGE_ROLE.USER,
                    content: "retry please",
                },
            ],
        })

        expect(response.content).toBe("ok")
        expect(sleepCalls).toEqual([1000])
        expect(chatCreate.calls).toHaveLength(2)
    })

    test("uses default sleep implementation for retry backoff when custom sleeper is omitted", async () => {
        const chatCreate = createQueuedAsyncMethod([
            () => {
                throw APIError.generate(429, {}, "rate limited", new Headers({"retry-after": "0"}))
            },
            () => {
                return {
                    choices: [
                        {
                            message: {
                                content: "ok after default sleep",
                            },
                            finish_reason: "stop",
                        },
                    ],
                    usage: {
                        prompt_tokens: 2,
                        completion_tokens: 1,
                        total_tokens: 3,
                    },
                }
            },
        ])
        const provider = new OpenRouterProvider({
            client: createOpenRouterClientMock({
                chatCreate: chatCreate as unknown as IOpenRouterClient["chat"]["completions"]["create"],
            }),
        })

        const response = await provider.chat({
            model: "openai/gpt-4o-mini",
            messages: [
                {
                    role: MESSAGE_ROLE.USER,
                    content: "retry with default sleep",
                },
            ],
        })

        expect(response.content).toBe("ok after default sleep")
        expect(chatCreate.calls).toHaveLength(2)
    })

    test("stops on non-retryable errors and exposes exhausted retry metadata", async () => {
        const badRequestProvider = new OpenRouterProvider({
            client: createOpenRouterClientMock({
                chatCreate: createQueuedAsyncMethod([
                    () => {
                        throw APIError.generate(400, {}, "bad request", new Headers())
                    },
                ]) as unknown as IOpenRouterClient["chat"]["completions"]["create"],
            }),
        })

        const badRequestError = await captureRejectedError(() =>
            badRequestProvider.chat({
                model: "openai/gpt-4o-mini",
                messages: [
                    {
                        role: MESSAGE_ROLE.USER,
                        content: "invalid",
                    },
                ],
            }),
        )

        expect(badRequestError).toBeInstanceOf(OpenRouterProviderError)
        expect(badRequestError).toMatchObject({
            name: "OpenRouterProviderError",
            statusCode: 400,
            isRetryable: false,
        })

        const sleepCalls: number[] = []
        const serverProvider = new OpenRouterProvider({
            client: createOpenRouterClientMock({
                chatCreate: createQueuedAsyncMethod([
                    () => {
                        throw APIError.generate(503, {}, "server down", new Headers())
                    },
                    () => {
                        throw APIError.generate(503, {}, "server down", new Headers())
                    },
                ]) as unknown as IOpenRouterClient["chat"]["completions"]["create"],
            }),
            retryMaxAttempts: 2,
            sleep(delayMs: number): Promise<void> {
                sleepCalls.push(delayMs)
                return Promise.resolve()
            },
        })

        const serverError = await captureRejectedError(() =>
            serverProvider.chat({
                model: "openai/gpt-4o-mini",
                messages: [
                    {
                        role: MESSAGE_ROLE.USER,
                        content: "server",
                    },
                ],
            }),
        )

        expect(serverError).toBeInstanceOf(OpenRouterProviderError)
        expect(serverError).toMatchObject({
            name: "OpenRouterProviderError",
            statusCode: 503,
            isRetryable: true,
        })
        expect(sleepCalls).toEqual([250])
    })

    test("validates constructor and embedding inputs", async () => {
        expect(() => {
            return new OpenRouterProvider({
                apiKey: " ",
            })
        }).toThrow("apiKey cannot be empty")

        expect(() => {
            return new OpenRouterProvider({
                client: createOpenRouterClientMock({}),
                retryMaxAttempts: 0,
            })
        }).toThrow("retryMaxAttempts must be positive integer")

        const provider = new OpenRouterProvider({
            client: createOpenRouterClientMock({}),
        })

        const error = await captureRejectedError(() => provider.embed([" "]))

        expect(error.message).toContain("texts[0] cannot be empty")
        expect(await provider.embed([])).toEqual([])
    })
})
