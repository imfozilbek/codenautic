import {describe, expect, test} from "bun:test"

import {APIError} from "openai"
import {MESSAGE_ROLE, type IChatChunkDTO} from "@codenautic/core"

import {
    NovitaProvider,
    NovitaProviderError,
    type INovitaClient,
} from "../../src/llm"

type AsyncMethod<TResult> = (...args: readonly unknown[]) => Promise<TResult>
type INovitaClientMockOverrides = {
    readonly chatCreate?: INovitaClient["chat"]["completions"]["create"]
    readonly embedCreate?: INovitaClient["embeddings"]["create"]
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
 * Creates default unexpected method for Novita mock sections.
 *
 * @returns Method rejecting on unexpected invocation.
 */
function createUnexpectedMethod<TMethod>(): TMethod {
    return ((..._args: readonly unknown[]): Promise<never> => {
        return Promise.reject(new Error("Unexpected Novita client call"))
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
 * Creates Novita-compatible client mock.
 *
 * @param overrides Partial method overrides.
 * @returns Novita-compatible mock.
 */
function createNovitaClientMock(overrides: INovitaClientMockOverrides): INovitaClient {
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

describe("NovitaProvider", () => {
    test("executes chat request using OpenAI-compatible payload", async () => {
        const chatCreate = createQueuedAsyncMethod([
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
                        prompt_tokens: 3,
                        completion_tokens: 2,
                        total_tokens: 5,
                    },
                }
            },
        ])
        const provider = new NovitaProvider({
            client: createNovitaClientMock({
                chatCreate: chatCreate as unknown as INovitaClient["chat"]["completions"]["create"],
            }),
        })

        const response = await provider.chat({
            model: "meta-llama/llama-3.1-70b-instruct",
            messages: [
                {
                    role: MESSAGE_ROLE.USER,
                    content: "hi",
                },
            ],
        })

        expect(response.content).toBe("ok")
        expect(response.usage.total).toBe(5)
        expect(chatCreate.calls[0]?.[0]).toMatchObject({
            model: "meta-llama/llama-3.1-70b-instruct",
            messages: [
                {
                    role: "user",
                    content: "hi",
                },
            ],
        })
    })

    test("streams chat chunks and preserves usage chunk", async () => {
        const chatCreate = createQueuedAsyncMethod([
            () => {
                return createAsyncIterable([
                    {
                        choices: [
                            {
                                delta: {
                                    content: "he",
                                },
                                finish_reason: null,
                            },
                        ],
                    },
                    {
                        choices: [
                            {
                                delta: {},
                                finish_reason: "stop",
                            },
                        ],
                        usage: {
                            prompt_tokens: 2,
                            completion_tokens: 1,
                            total_tokens: 3,
                        },
                    },
                ])
            },
        ])
        const provider = new NovitaProvider({
            client: createNovitaClientMock({
                chatCreate: chatCreate as unknown as INovitaClient["chat"]["completions"]["create"],
            }),
        })

        const chunks = await collectChunks(
            provider.stream({
                model: "meta-llama/llama-3.1-70b-instruct",
                messages: [
                    {
                        role: MESSAGE_ROLE.USER,
                        content: "hello",
                    },
                ],
            }),
        )

        expect(chunks).toEqual([
            {
                delta: "he",
            },
            {
                delta: "",
                usage: {
                    input: 2,
                    output: 1,
                    total: 3,
                },
                finishReason: "stop",
            },
        ])
    })

    test("creates embeddings with configured embedding model", async () => {
        const embedCreate = createQueuedAsyncMethod([
            () => {
                return {
                    data: [
                        {
                            embedding: [0.1, 0.2],
                        },
                    ],
                }
            },
        ])
        const provider = new NovitaProvider({
            client: createNovitaClientMock({
                embedCreate,
            }),
            embeddingModel: "text-embedding-3-large",
        })

        const embeddings = await provider.embed(["first"])

        expect(embeddings).toEqual([[0.1, 0.2]])
        expect(embedCreate.calls[0]?.[0]).toEqual({
            input: ["first"],
            model: "text-embedding-3-large",
            encoding_format: "float",
        })
    })

    test("retries retryable rate-limit failure and maps final metadata", async () => {
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
        const provider = new NovitaProvider({
            client: createNovitaClientMock({
                chatCreate: chatCreate as unknown as INovitaClient["chat"]["completions"]["create"],
            }),
            sleep(delayMs: number): Promise<void> {
                sleepCalls.push(delayMs)
                return Promise.resolve()
            },
        })

        const response = await provider.chat({
            model: "meta-llama/llama-3.1-70b-instruct",
            messages: [
                {
                    role: MESSAGE_ROLE.USER,
                    content: "retry",
                },
            ],
        })

        expect(response.content).toBe("ok")
        expect(chatCreate.calls).toHaveLength(2)
        expect(sleepCalls).toEqual([1000])
    })

    test("maps non-retryable and exhausted retry failures to NovitaProviderError", async () => {
        const badRequestProvider = new NovitaProvider({
            client: createNovitaClientMock({
                chatCreate: createQueuedAsyncMethod([
                    () => {
                        throw APIError.generate(400, {}, "bad request", new Headers())
                    },
                ]) as unknown as INovitaClient["chat"]["completions"]["create"],
            }),
        })

        const badRequestError = await captureRejectedError(() =>
            badRequestProvider.chat({
                model: "meta-llama/llama-3.1-70b-instruct",
                messages: [
                    {
                        role: MESSAGE_ROLE.USER,
                        content: "invalid",
                    },
                ],
            }),
        )

        expect(badRequestError).toBeInstanceOf(NovitaProviderError)
        expect(badRequestError).toMatchObject({
            name: "NovitaProviderError",
            statusCode: 400,
            isRetryable: false,
        })

        const serverProvider = new NovitaProvider({
            client: createNovitaClientMock({
                chatCreate: createQueuedAsyncMethod([
                    () => {
                        throw APIError.generate(503, {}, "server down", new Headers())
                    },
                    () => {
                        throw APIError.generate(503, {}, "server down", new Headers())
                    },
                ]) as unknown as INovitaClient["chat"]["completions"]["create"],
            }),
            retryMaxAttempts: 2,
            sleep(): Promise<void> {
                return Promise.resolve()
            },
        })

        const serverError = await captureRejectedError(() =>
            serverProvider.chat({
                model: "meta-llama/llama-3.1-70b-instruct",
                messages: [
                    {
                        role: MESSAGE_ROLE.USER,
                        content: "server",
                    },
                ],
            }),
        )

        expect(serverError).toBeInstanceOf(NovitaProviderError)
        expect(serverError).toMatchObject({
            name: "NovitaProviderError",
            statusCode: 503,
            isRetryable: true,
        })
    })

    test("validates constructor and embedding input invariants", async () => {
        expect(() => {
            return new NovitaProvider({
                apiKey: " ",
            })
        }).toThrow("apiKey cannot be empty")

        expect(() => {
            return new NovitaProvider({
                client: createNovitaClientMock({}),
                retryMaxAttempts: 0,
            })
        }).toThrow("retryMaxAttempts must be positive integer")

        const provider = new NovitaProvider({
            client: createNovitaClientMock({}),
        })
        const error = await captureRejectedError(() => provider.embed([" "]))

        expect(error.message).toContain("texts[0] cannot be empty")
        expect(await provider.embed([])).toEqual([])
    })
})
