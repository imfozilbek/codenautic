import OpenAI, {
    APIConnectionError,
    APIConnectionTimeoutError,
    APIError,
} from "openai"
import {
    MESSAGE_ROLE,
    type IChatChunkDTO,
    type IChatRequestDTO,
    type IChatResponseDTO,
    type ILLMProvider,
    type IMessageDTO,
    type IStreamingChatResponseDTO,
    type ITokenUsageDTO,
} from "@codenautic/core"

import {
    OpenAiRequestAcl,
    OpenAiResponseAcl,
    type ILlmAclRequestNormalizationOptions,
    type ILlmAclResponseNormalizationOptions,
    type IOpenAiChatRequest,
    type IOpenAiTool,
} from "./acl"
import {
    OpenAIProviderError,
    type IOpenAIProviderErrorDetails,
} from "./openai-provider.error"

const DEFAULT_RETRY_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_BASE_DELAY_MS = 250
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"

/**
 * Minimal OpenAI chat message payload passed to SDK client.
 */
interface IOpenAIChatMessage {
    readonly role: "system" | "user" | "assistant" | "tool"
    readonly content: string
    readonly name?: string
    readonly tool_call_id?: string
}

/**
 * Minimal OpenAI non-streaming chat payload.
 */
interface IOpenAIChatCompletionRequest {
    readonly model: string
    readonly messages: readonly IOpenAIChatMessage[]
    readonly temperature?: number
    readonly max_tokens?: number
    readonly tools?: readonly IOpenAiTool[]
    readonly response_format?: IOpenAiChatRequest["response_format"]
}

/**
 * Minimal OpenAI streaming chat payload.
 */
interface IOpenAIStreamingChatCompletionRequest extends IOpenAIChatCompletionRequest {
    readonly stream: true
    readonly stream_options: {
        readonly include_usage: true
    }
}

/**
 * Minimal OpenAI tool call payload.
 */
interface IOpenAIResponseToolCall {
    readonly id?: string | null
    readonly function?: {
        readonly name?: string | null
        readonly arguments?: string | null
    } | null
}

/**
 * Minimal OpenAI chat response payload.
 */
interface IOpenAIChatCompletionResponse {
    readonly choices: readonly {
        readonly message?: {
            readonly content?: string | null
            readonly tool_calls?: readonly IOpenAIResponseToolCall[] | null
        } | null
        readonly finish_reason?: string | null
    }[]
    readonly usage?: {
        readonly prompt_tokens?: number | null
        readonly completion_tokens?: number | null
        readonly total_tokens?: number | null
    } | null
    readonly output_text?: string
    readonly costUsd?: number
    readonly cost_usd?: number
}

/**
 * Minimal OpenAI streaming chunk payload.
 */
interface IOpenAIChatCompletionChunk {
    readonly choices: readonly {
        readonly delta?: {
            readonly content?: string | null
        } | null
        readonly finish_reason?: string | null
    }[]
    readonly usage?: {
        readonly prompt_tokens?: number | null
        readonly completion_tokens?: number | null
        readonly total_tokens?: number | null
    } | null
}

/**
 * Minimal OpenAI embedding request payload.
 */
interface IOpenAIEmbeddingRequest {
    readonly input: readonly string[]
    readonly model: string
    readonly encoding_format: "float"
}

/**
 * Minimal OpenAI embedding response payload.
 */
interface IOpenAIEmbeddingResponse {
    readonly data: readonly {
        readonly embedding: readonly number[]
    }[]
}

/**
 * Minimal subset of OpenAI SDK used by adapter implementation.
 */
export interface IOpenAIClient {
    readonly chat: {
        readonly completions: {
            readonly create: {
                (request: IOpenAIChatCompletionRequest): Promise<IOpenAIChatCompletionResponse>
                (request: IOpenAIStreamingChatCompletionRequest): Promise<AsyncIterable<IOpenAIChatCompletionChunk>>
            }
        }
    }
    readonly embeddings: {
        readonly create: (request: IOpenAIEmbeddingRequest) => Promise<IOpenAIEmbeddingResponse>
    }
}

/**
 * OpenAI provider constructor options.
 */
export interface IOpenAIProviderOptions {
    /**
     * API key used when SDK client is constructed internally.
     */
    readonly apiKey?: string

    /**
     * Optional alternative base URL.
     */
    readonly baseUrl?: string

    /**
     * Optional OpenAI organization identifier.
     */
    readonly organization?: string

    /**
     * Optional OpenAI project identifier.
     */
    readonly project?: string

    /**
     * Embedding model used by `embed()`.
     */
    readonly embeddingModel?: string

    /**
     * Optional injected OpenAI-compatible client for tests.
     */
    readonly client?: IOpenAIClient

    /**
     * Maximum retry attempts for retryable upstream failures.
     */
    readonly retryMaxAttempts?: number

    /**
     * Optional sleep implementation used between retries.
     */
    readonly sleep?: (delayMs: number) => Promise<void>

    /**
     * Optional ACL request normalization options.
     */
    readonly requestNormalizationOptions?: ILlmAclRequestNormalizationOptions

    /**
     * Optional ACL response normalization options.
     */
    readonly responseNormalizationOptions?: ILlmAclResponseNormalizationOptions
}

/**
 * OpenAI implementation of the shared LLM provider contract.
 */
export class OpenAIProvider implements ILLMProvider {
    private readonly client: IOpenAIClient
    private readonly requestAcl: OpenAiRequestAcl
    private readonly responseAcl: OpenAiResponseAcl
    private readonly embeddingModel: string
    private readonly retryMaxAttempts: number
    private readonly sleep: (delayMs: number) => Promise<void>

    /**
     * Creates OpenAI provider.
     *
     * @param options Provider options.
     */
    public constructor(options: IOpenAIProviderOptions) {
        this.client = options.client ?? createOpenAIClient(options)
        this.requestAcl = new OpenAiRequestAcl(options.requestNormalizationOptions)
        this.responseAcl = new OpenAiResponseAcl(options.responseNormalizationOptions)
        this.embeddingModel = normalizeOptionalText(options.embeddingModel) ?? DEFAULT_EMBEDDING_MODEL
        this.retryMaxAttempts = normalizeRetryMaxAttempts(options.retryMaxAttempts)
        this.sleep = options.sleep ?? defaultSleep
    }

    /**
     * Executes chat completion request.
     *
     * @param request Shared chat request DTO.
     * @returns Shared chat response DTO.
     */
    public async chat(request: IChatRequestDTO): Promise<IChatResponseDTO> {
        const normalizedRequest = this.requestAcl.toDomain(request)
        const response = await this.executeRequest(() => {
            return this.client.chat.completions.create(
                buildOpenAIChatCompletionRequest(normalizedRequest),
            )
        })

        return this.responseAcl.toDomain(response).response
    }

    /**
     * Executes streaming chat completion request.
     *
     * @param request Shared chat request DTO.
     * @returns Async stream of normalized chunks.
     */
    public stream(request: IChatRequestDTO): IStreamingChatResponseDTO {
        const normalizedRequest = this.requestAcl.toDomain(request)
        const streamRequest = buildOpenAIStreamingChatCompletionRequest(normalizedRequest)

        return this.createStreamingResponse(streamRequest)
    }

    /**
     * Builds embeddings for input texts.
     *
     * @param texts Source texts.
     * @returns Embedding vectors.
     */
    public async embed(texts: readonly string[]): Promise<readonly number[][]> {
        if (texts.length === 0) {
            return []
        }

        const response = await this.executeRequest(() => {
            return this.client.embeddings.create({
                input: normalizeEmbeddingTexts(texts),
                model: this.embeddingModel,
                encoding_format: "float",
            })
        })

        return response.data.map((item) => {
            return [...item.embedding]
        })
    }

    /**
     * Wraps initial streaming request with retry-aware request bootstrap.
     *
     * @param request Streaming chat request.
     * @returns Async iterable of normalized chunks.
     */
    private createStreamingResponse(
        request: IOpenAIStreamingChatCompletionRequest,
    ): IStreamingChatResponseDTO {
        return createOpenAIStreamingIterable(this.executeStreamingRequest(request))
    }

    /**
     * Executes initial streaming request with explicit streaming result typing.
     *
     * @param request Streaming request payload.
     * @returns Async iterable over OpenAI chunks.
     */
    private executeStreamingRequest(
        request: IOpenAIStreamingChatCompletionRequest,
    ): Promise<AsyncIterable<IOpenAIChatCompletionChunk>> {
        return this.executeRequest<AsyncIterable<IOpenAIChatCompletionChunk>>(() => {
            return this.client.chat.completions.create(request) as unknown as Promise<
                AsyncIterable<IOpenAIChatCompletionChunk>
            >
        })
    }

    /**
     * Executes OpenAI request with retry semantics.
     *
     * @param operation Async operation factory.
     * @returns Successful operation result.
     * @throws {OpenAIProviderError} When retries are exhausted or request is not retryable.
     */
    private async executeRequest<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
        let attempt = 0

        while (attempt < this.retryMaxAttempts) {
            attempt += 1

            try {
                return await operation()
            } catch (error) {
                const normalizedError = normalizeOpenAIProviderError(error)

                if (normalizedError.isRetryable === false || attempt >= this.retryMaxAttempts) {
                    throw new OpenAIProviderError(normalizedError.message, normalizedError)
                }

                await this.sleep(resolveRetryDelayMs(normalizedError.retryAfterMs, attempt))
            }
        }

        throw new OpenAIProviderError("OpenAI request failed", {
            isRetryable: false,
        })
    }
}

/**
 * Creates real OpenAI SDK client.
 *
 * @param options Provider options.
 * @returns OpenAI-compatible client.
 */
function createOpenAIClient(options: IOpenAIProviderOptions): IOpenAIClient {
    const apiKey = normalizeRequiredText(options.apiKey, "apiKey")
    const client = new OpenAI({
        apiKey,
        baseURL: normalizeOptionalText(options.baseUrl),
        organization: normalizeOptionalText(options.organization) ?? null,
        project: normalizeOptionalText(options.project) ?? null,
        maxRetries: 0,
    })

    return client as unknown as IOpenAIClient
}

/**
 * Builds non-streaming OpenAI chat request.
 *
 * @param request ACL-normalized chat request.
 * @returns OpenAI client request.
 */
function buildOpenAIChatCompletionRequest(
    request: IOpenAiChatRequest,
): IOpenAIChatCompletionRequest {
    return {
        model: request.model,
        messages: request.messages.map(toOpenAIChatMessage),
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        tools: request.tools,
        response_format: request.response_format,
    }
}

/**
 * Builds streaming OpenAI chat request.
 *
 * @param request ACL-normalized chat request.
 * @returns OpenAI client streaming request.
 */
function buildOpenAIStreamingChatCompletionRequest(
    request: IOpenAiChatRequest,
): IOpenAIStreamingChatCompletionRequest {
    return {
        ...buildOpenAIChatCompletionRequest(request),
        stream: true,
        stream_options: {
            include_usage: true,
        },
    }
}

/**
 * Converts normalized shared message to OpenAI SDK message shape.
 *
 * @param message Shared normalized message.
 * @returns OpenAI-compatible message payload.
 */
function toOpenAIChatMessage(message: IMessageDTO): IOpenAIChatMessage {
    const baseMessage = {
        role: message.role,
        content: message.content,
        name: normalizeOptionalText(message.name),
    }

    if (message.role !== MESSAGE_ROLE.TOOL) {
        return baseMessage
    }

    return {
        ...baseMessage,
        tool_call_id: normalizeRequiredText(message.toolCallId, "toolCallId"),
    }
}

/**
 * Normalizes one streaming chunk.
 *
 * @param chunk Raw OpenAI stream chunk.
 * @returns Shared stream chunk or undefined when chunk carries no relevant data.
 */
function normalizeStreamingChunk(
    chunk: IOpenAIChatCompletionChunk,
): IChatChunkDTO | undefined {
    const firstChoice = chunk.choices[0]
    const delta = normalizeChunkDelta(firstChoice?.delta?.content)
    const finishReason = normalizeOptionalText(firstChoice?.finish_reason)
    const usage = normalizeUsage(chunk.usage)

    if (delta.length === 0 && finishReason === undefined && usage === undefined) {
        return undefined
    }

    return {
        delta,
        finishReason,
        usage,
    }
}

/**
 * Normalizes streaming text delta.
 *
 * @param delta Raw delta text.
 * @returns Normalized delta text.
 */
function normalizeChunkDelta(delta: string | null | undefined): string {
    return delta ?? ""
}

/**
 * Normalizes usage payload from OpenAI responses.
 *
 * @param usage Raw usage payload.
 * @returns Shared usage DTO or undefined.
 */
function normalizeUsage(
    usage:
        | {
              readonly prompt_tokens?: number | null
              readonly completion_tokens?: number | null
              readonly total_tokens?: number | null
          }
        | null
        | undefined,
): ITokenUsageDTO | undefined {
    if (usage === null || usage === undefined) {
        return undefined
    }

    const input = normalizeUsageNumber(usage.prompt_tokens)
    const output = normalizeUsageNumber(usage.completion_tokens)
    const total = normalizeUsageNumber(usage.total_tokens) ?? input + output

    return {
        input,
        output,
        total,
    }
}

/**
 * Normalizes numeric usage values.
 *
 * @param value Raw token count.
 * @returns Safe integer value.
 */
function normalizeUsageNumber(value: number | null | undefined): number {
    if (value === null || value === undefined || Number.isFinite(value) === false || value < 0) {
        return 0
    }

    return Math.trunc(value)
}

/**
 * Normalizes embedding text input list.
 *
 * @param texts Raw text list.
 * @returns Trimmed, validated text list.
 */
function normalizeEmbeddingTexts(texts: readonly string[]): readonly string[] {
    return texts.map((text, index) => {
        return normalizeRequiredText(text, `texts[${index}]`)
    })
}

/**
 * Normalizes OpenAI SDK or transport error to provider metadata.
 *
 * @param error Unknown error value.
 * @returns Normalized provider error payload.
 */
function normalizeOpenAIProviderError(
    error: unknown,
): IOpenAIProviderErrorDetails & {readonly message: string} {
    if (error instanceof APIConnectionTimeoutError || error instanceof APIConnectionError) {
        return {
            message: error.message,
            isRetryable: true,
        }
    }

    if (error instanceof APIError) {
        const retryAfterMs = readRetryAfterMs(readApiErrorHeaders(error))
        const statusCode = readApiErrorStatus(error)

        return {
            message: error.message,
            statusCode,
            code: readApiErrorString(error.code),
            type: readApiErrorString(error.type),
            retryAfterMs,
            isRetryable: isRetryableStatus(statusCode),
        }
    }

    if (error instanceof Error) {
        return {
            message: error.message,
            isRetryable: false,
        }
    }

    return {
        message: "OpenAI request failed",
        isRetryable: false,
    }
}

/**
 * Resolves retryable status class.
 *
 * @param statusCode HTTP status code.
 * @returns True when request should be retried.
 */
function isRetryableStatus(statusCode: number | undefined): boolean {
    if (statusCode === undefined) {
        return false
    }

    return statusCode === 429 || statusCode >= 500
}

/**
 * Reads retry-after header from OpenAI error headers.
 *
 * @param headers Raw header collection.
 * @returns Retry delay in milliseconds.
 */
function readRetryAfterMs(headers: Headers | undefined): number | undefined {
    const retryAfter = headers?.get("retry-after")
    if (retryAfter === null || retryAfter === undefined) {
        return undefined
    }

    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds) === false || seconds < 0) {
        return undefined
    }

    return Math.round(seconds * 1000)
}

/**
 * Resolves retry delay using header hint or exponential fallback.
 *
 * @param retryAfterMs Retry-after hint.
 * @param attempt Current attempt number.
 * @returns Delay in milliseconds.
 */
function resolveRetryDelayMs(retryAfterMs: number | undefined, attempt: number): number {
    if (retryAfterMs !== undefined) {
        return retryAfterMs
    }

    return DEFAULT_RETRY_BASE_DELAY_MS * (2 ** (attempt - 1))
}

/**
 * Normalizes optional text value.
 *
 * @param value Raw string value.
 * @returns Trimmed string or undefined.
 */
function normalizeOptionalText(value: string | null | undefined): string | undefined {
    if (typeof value !== "string") {
        return undefined
    }

    const normalized = value.trim()
    if (normalized.length === 0) {
        return undefined
    }

    return normalized
}

/**
 * Normalizes required text input.
 *
 * @param value Raw string value.
 * @param fieldName Field label for error message.
 * @returns Trimmed non-empty string.
 */
function normalizeRequiredText(value: string | null | undefined, fieldName: string): string {
    const normalized = normalizeOptionalText(value)
    if (normalized === undefined) {
        throw new Error(`${fieldName} cannot be empty`)
    }

    return normalized
}

/**
 * Normalizes retry attempt count.
 *
 * @param retryMaxAttempts Raw retry count.
 * @returns Positive integer retry count.
 */
function normalizeRetryMaxAttempts(retryMaxAttempts: number | undefined): number {
    if (retryMaxAttempts === undefined) {
        return DEFAULT_RETRY_MAX_ATTEMPTS
    }

    if (Number.isFinite(retryMaxAttempts) === false || retryMaxAttempts <= 0) {
        throw new Error("retryMaxAttempts must be positive integer")
    }

    return Math.trunc(retryMaxAttempts)
}

/**
 * Default sleep implementation for retry backoff.
 *
 * @param delayMs Delay in milliseconds.
 * @returns Promise resolved after timeout.
 */
function defaultSleep(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, delayMs)
    })
}

/**
 * Creates normalized streaming iterable wrapper around OpenAI stream.
 *
 * @param streamPromise Promise resolving to OpenAI stream.
 * @returns Streaming chat response iterable.
 */
function createOpenAIStreamingIterable(
    streamPromise: Promise<AsyncIterable<IOpenAIChatCompletionChunk>>,
): IStreamingChatResponseDTO {
    return {
        async *[Symbol.asyncIterator](): AsyncIterator<IChatChunkDTO> {
            const stream = await streamPromise

            for await (const chunk of stream) {
                const normalizedChunk = normalizeStreamingChunk(chunk)
                if (normalizedChunk !== undefined) {
                    yield normalizedChunk
                }
            }
        },
    }
}

/**
 * Reads HTTP headers from API error using safe runtime narrowing.
 *
 * @param error OpenAI API error.
 * @returns Headers collection or undefined.
 */
function readApiErrorHeaders(error: unknown): Headers | undefined {
    const headers = error instanceof APIError ? (error.headers as unknown) : undefined
    if (headers instanceof Headers) {
        return headers
    }

    return undefined
}

/**
 * Reads numeric status code from API error using safe runtime narrowing.
 *
 * @param error OpenAI API error.
 * @returns Status code or undefined.
 */
function readApiErrorStatus(error: unknown): number | undefined {
    const status = error instanceof APIError ? (error.status as unknown) : undefined
    if (typeof status !== "number" || Number.isFinite(status) === false) {
        return undefined
    }

    return status
}

/**
 * Reads optional string field from API error using safe runtime narrowing.
 *
 * @param value Unknown error field value.
 * @returns Trimmed string or undefined.
 */
function readApiErrorString(value: unknown): string | undefined {
    return normalizeOptionalText(typeof value === "string" ? value : undefined)
}
