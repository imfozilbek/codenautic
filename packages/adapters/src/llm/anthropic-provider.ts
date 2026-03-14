import Anthropic, {
    APIConnectionError,
    APIConnectionTimeoutError,
    APIError,
} from "@anthropic-ai/sdk"
import {VoyageAIClient, VoyageAIError, VoyageAITimeoutError} from "voyageai"
import {
    CHAT_FINISH_REASON,
    type IChatChunkDTO,
    type IChatRequestDTO,
    type IChatResponseDTO,
    type ILLMProvider,
    type IStreamingChatResponseDTO,
    type ITokenUsageDTO,
} from "@codenautic/core"

import {
    AnthropicRequestAcl,
    AnthropicResponseAcl,
    type IAnthropicChatRequest,
    type ILlmAclRequestNormalizationOptions,
    type ILlmAclResponseNormalizationOptions,
} from "./acl"
import {
    AnthropicProviderError,
    type IAnthropicProviderErrorDetails,
} from "./anthropic-provider.error"

const DEFAULT_RETRY_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_BASE_DELAY_MS = 250
const DEFAULT_EMBEDDING_MODEL = "voyage-code-3"

/**
 * Minimal Anthropic non-streaming payload.
 */
type IAnthropicChatCompletionRequest = IAnthropicChatRequest

/**
 * Minimal Anthropic streaming payload.
 */
interface IAnthropicStreamingRequest extends IAnthropicChatRequest {
    readonly stream: true
}

/**
 * Minimal subset of Anthropic SDK used by adapter implementation.
 */
export interface IAnthropicClient {
    readonly messages: {
        readonly create: {
            (request: IAnthropicChatCompletionRequest): Promise<unknown>
            (request: IAnthropicStreamingRequest): Promise<AsyncIterable<unknown>>
        }
    }
}

/**
 * Minimal Voyage embedding request payload.
 */
interface IVoyageEmbeddingRequest {
    readonly input: readonly string[]
    readonly model: string
}

/**
 * Minimal Voyage embedding response payload.
 */
interface IVoyageEmbeddingResponse {
    readonly data: readonly {
        readonly embedding: readonly number[]
    }[]
}

/**
 * Minimal subset of Voyage client used by adapter implementation.
 */
export interface IVoyageEmbeddingClient {
    /**
     * Builds embeddings for input texts.
     *
     * @param request Embedding request payload.
     * @returns Embedding response.
     */
    embed(request: IVoyageEmbeddingRequest): Promise<IVoyageEmbeddingResponse>
}

/**
 * Anthropic provider constructor options.
 */
export interface IAnthropicProviderOptions {
    /**
     * Anthropic API key used when SDK client is constructed internally.
     */
    readonly apiKey?: string

    /**
     * Optional alternative Anthropic base URL.
     */
    readonly baseUrl?: string

    /**
     * Voyage API key used for embeddings when client is constructed internally.
     */
    readonly voyageApiKey?: string

    /**
     * Embedding model used by `embed()`.
     */
    readonly embeddingModel?: string

    /**
     * Optional injected Anthropic-compatible client for tests.
     */
    readonly client?: IAnthropicClient

    /**
     * Optional injected Voyage-compatible client for tests.
     */
    readonly embeddingClient?: IVoyageEmbeddingClient

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
 * Internal mutable state for Anthropic stream normalization.
 */
interface IAnthropicStreamState {
    inputTokens: number
}

/**
 * Anthropic implementation of the shared LLM provider contract with Voyage embeddings.
 */
export class AnthropicProvider implements ILLMProvider {
    private readonly client: IAnthropicClient
    private readonly embeddingClient: IVoyageEmbeddingClient | undefined
    private readonly requestAcl: AnthropicRequestAcl
    private readonly responseAcl: AnthropicResponseAcl
    private readonly embeddingModel: string
    private readonly retryMaxAttempts: number
    private readonly sleep: (delayMs: number) => Promise<void>

    /**
     * Creates Anthropic provider.
     *
     * @param options Provider options.
     */
    public constructor(options: IAnthropicProviderOptions) {
        this.client = options.client ?? createAnthropicClient(options)
        this.embeddingClient = options.embeddingClient ?? createVoyageEmbeddingClient(options)
        this.requestAcl = new AnthropicRequestAcl(options.requestNormalizationOptions)
        this.responseAcl = new AnthropicResponseAcl(options.responseNormalizationOptions)
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
            return this.client.messages.create(
                buildAnthropicChatCompletionRequest(normalizedRequest),
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
        const streamRequest = buildAnthropicStreamingRequest(normalizedRequest)

        return this.createStreamingResponse(streamRequest)
    }

    /**
     * Builds embeddings for input texts through Voyage API.
     *
     * @param texts Source texts.
     * @returns Embedding vectors.
     */
    public async embed(texts: readonly string[]): Promise<readonly number[][]> {
        if (texts.length === 0) {
            return []
        }

        const embeddingClient = this.embeddingClient
        if (embeddingClient === undefined) {
            throw new Error("voyageApiKey cannot be empty")
        }

        const response = await this.executeRequest(() => {
            return embeddingClient.embed({
                input: normalizeEmbeddingTexts(texts),
                model: this.embeddingModel,
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
    private createStreamingResponse(request: IAnthropicStreamingRequest): IStreamingChatResponseDTO {
        return createAnthropicStreamingIterable(this.executeStreamingRequest(request))
    }

    /**
     * Executes initial streaming request with explicit streaming result typing.
     *
     * @param request Streaming request payload.
     * @returns Async iterable over Anthropic events.
     */
    private executeStreamingRequest(
        request: IAnthropicStreamingRequest,
    ): Promise<AsyncIterable<unknown>> {
        return this.executeRequest<AsyncIterable<unknown>>(() => {
            return this.client.messages.create(request) as unknown as Promise<AsyncIterable<unknown>>
        })
    }

    /**
     * Executes Anthropic or Voyage request with retry semantics.
     *
     * @param operation Async operation factory.
     * @returns Successful operation result.
     * @throws {AnthropicProviderError} When retries are exhausted or request is not retryable.
     */
    private async executeRequest<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
        let attempt = 0

        while (attempt < this.retryMaxAttempts) {
            attempt += 1

            try {
                return await operation()
            } catch (error) {
                const normalizedError = normalizeAnthropicProviderError(error)

                if (normalizedError.isRetryable === false || attempt >= this.retryMaxAttempts) {
                    throw new AnthropicProviderError(normalizedError.message, normalizedError)
                }

                await this.sleep(resolveRetryDelayMs(normalizedError.retryAfterMs, attempt))
            }
        }

        throw new AnthropicProviderError("Anthropic request failed", {
            source: "unknown",
            isRetryable: false,
        })
    }
}

/**
 * Creates real Anthropic SDK client.
 *
 * @param options Provider options.
 * @returns Anthropic-compatible client.
 */
function createAnthropicClient(options: IAnthropicProviderOptions): IAnthropicClient {
    const apiKey = normalizeRequiredText(options.apiKey, "apiKey")
    const client = new Anthropic({
        apiKey,
        baseURL: normalizeOptionalText(options.baseUrl),
        maxRetries: 0,
    })

    return client as unknown as IAnthropicClient
}

/**
 * Creates real Voyage SDK client when voyage api key is available.
 *
 * @param options Provider options.
 * @returns Voyage-compatible embedding client or undefined.
 */
function createVoyageEmbeddingClient(
    options: IAnthropicProviderOptions,
): IVoyageEmbeddingClient | undefined {
    const apiKey = normalizeOptionalText(options.voyageApiKey)
    if (apiKey === undefined) {
        return undefined
    }

    const client = new VoyageAIClient({
        apiKey,
    })

    return client as unknown as IVoyageEmbeddingClient
}

/**
 * Builds non-streaming Anthropic chat request.
 *
 * @param request ACL-normalized chat request.
 * @returns Anthropic client request.
 */
function buildAnthropicChatCompletionRequest(
    request: IAnthropicChatRequest,
): IAnthropicChatCompletionRequest {
    return {
        model: request.model,
        messages: request.messages,
        system: request.system,
        max_tokens: request.max_tokens,
        temperature: request.temperature,
        tools: request.tools,
    }
}

/**
 * Builds streaming Anthropic chat request.
 *
 * @param request ACL-normalized chat request.
 * @returns Anthropic client streaming request.
 */
function buildAnthropicStreamingRequest(request: IAnthropicChatRequest): IAnthropicStreamingRequest {
    return {
        ...buildAnthropicChatCompletionRequest(request),
        stream: true,
    }
}

/**
 * Creates normalized streaming iterable wrapper around Anthropic stream.
 *
 * @param streamPromise Promise resolving to Anthropic stream.
 * @returns Streaming chat response iterable.
 */
function createAnthropicStreamingIterable(
    streamPromise: Promise<AsyncIterable<unknown>>,
): IStreamingChatResponseDTO {
    return {
        async *[Symbol.asyncIterator](): AsyncIterator<IChatChunkDTO> {
            const stream = await streamPromise
            const state: IAnthropicStreamState = {
                inputTokens: 0,
            }

            for await (const event of stream) {
                updateStreamState(event, state)
                const chunk = normalizeStreamingChunk(event, state)

                if (chunk !== undefined) {
                    yield chunk
                }
            }
        },
    }
}

/**
 * Updates stream state from message start events.
 *
 * @param event Raw stream event.
 * @param state Mutable stream state.
 */
function updateStreamState(event: unknown, state: IAnthropicStreamState): void {
    const eventRecord = toRecord(event)
    if (eventRecord?.["type"] !== "message_start") {
        return
    }

    const messageRecord = toRecord(eventRecord["message"])
    const usageRecord = toRecord(messageRecord?.["usage"])
    const inputTokens = normalizeUsageNumber(usageRecord?.["input_tokens"])

    state.inputTokens = inputTokens
}

/**
 * Normalizes one streaming event into shared chunk shape.
 *
 * @param event Raw Anthropic stream event.
 * @param state Current stream state.
 * @returns Shared stream chunk or undefined.
 */
function normalizeStreamingChunk(
    event: unknown,
    state: IAnthropicStreamState,
): IChatChunkDTO | undefined {
    const eventRecord = toRecord(event)
    if (eventRecord === null) {
        return undefined
    }

    const eventType = eventRecord["type"]

    if (eventType === "content_block_delta") {
        return normalizeStreamingTextChunk(eventRecord["delta"])
    }

    if (eventType === "message_delta") {
        return normalizeStreamingMessageChunk(eventRecord, state.inputTokens)
    }

    return undefined
}

/**
 * Normalizes text delta event to chunk.
 *
 * @param deltaPayload Raw content block delta payload.
 * @returns Shared chunk or undefined.
 */
function normalizeStreamingTextChunk(deltaPayload: unknown): IChatChunkDTO | undefined {
    const deltaRecord = toRecord(deltaPayload)
    if (deltaRecord?.["type"] !== "text_delta") {
        return undefined
    }

    const delta = readString(deltaRecord["text"]) ?? ""
    if (delta.length === 0) {
        return undefined
    }

    return {
        delta,
        finishReason: undefined,
        usage: undefined,
    }
}

/**
 * Normalizes message delta event to finish/usage chunk.
 *
 * @param eventRecord Raw message delta event.
 * @param fallbackInputTokens Input tokens from message start.
 * @returns Shared chunk or undefined.
 */
function normalizeStreamingMessageChunk(
    eventRecord: Readonly<Record<string, unknown>>,
    fallbackInputTokens: number,
): IChatChunkDTO | undefined {
    const deltaRecord = toRecord(eventRecord["delta"])
    const stopReason = readString(deltaRecord?.["stop_reason"])
    const finishReason = normalizeStreamFinishReason(stopReason)
    const usage = normalizeStreamingUsage(eventRecord["usage"], fallbackInputTokens)

    if (finishReason === undefined && usage === undefined) {
        return undefined
    }

    return {
        delta: "",
        finishReason,
        usage,
    }
}

/**
 * Maps Anthropic stop reason to shared finish reason semantics.
 *
 * @param stopReason Raw stop reason.
 * @returns Shared finish reason.
 */
function normalizeStreamFinishReason(stopReason: string | undefined): string | undefined {
    if (stopReason === undefined) {
        return undefined
    }

    if (stopReason === "end_turn" || stopReason === "stop_sequence") {
        return CHAT_FINISH_REASON.STOP
    }

    if (stopReason === "max_tokens") {
        return CHAT_FINISH_REASON.LENGTH
    }

    if (stopReason === "tool_use") {
        return CHAT_FINISH_REASON.TOOL_CALLS
    }

    if (stopReason === "refusal") {
        return CHAT_FINISH_REASON.CONTENT_FILTER
    }

    return stopReason
}

/**
 * Normalizes Anthropic streaming usage payload.
 *
 * @param usagePayload Raw usage payload.
 * @param fallbackInputTokens Input tokens from message start.
 * @returns Shared usage DTO or undefined.
 */
function normalizeStreamingUsage(
    usagePayload: unknown,
    fallbackInputTokens: number,
): ITokenUsageDTO | undefined {
    const usageRecord = toRecord(usagePayload)
    if (usageRecord === null) {
        return undefined
    }

    const inputFromEvent = normalizeUsageNumber(usageRecord["input_tokens"])
    const input = inputFromEvent > 0 ? inputFromEvent : fallbackInputTokens
    const output = normalizeUsageNumber(usageRecord["output_tokens"])

    return {
        input,
        output,
        total: input + output,
    }
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
 * Normalizes Anthropic or Voyage error to provider metadata.
 *
 * @param error Unknown error value.
 * @returns Normalized provider error payload.
 */
function normalizeAnthropicProviderError(
    error: unknown,
): IAnthropicProviderErrorDetails & {readonly message: string} {
    if (error instanceof APIConnectionTimeoutError || error instanceof APIConnectionError) {
        return {
            source: "anthropic",
            message: error.message,
            isRetryable: true,
        }
    }

    if (error instanceof APIError) {
        const retryAfterMs = readRetryAfterMs(readApiErrorHeaders(error))
        const statusCode = readApiErrorStatus(error)
        const details = readAnthropicApiErrorDetails(error.error)

        return {
            source: "anthropic",
            message: error.message,
            statusCode,
            code: details.code,
            type: details.type,
            retryAfterMs,
            isRetryable: isRetryableStatus(statusCode),
        }
    }

    if (error instanceof VoyageAITimeoutError) {
        return {
            source: "voyage",
            message: error.message,
            isRetryable: true,
        }
    }

    if (error instanceof VoyageAIError) {
        const statusCode = readVoyageErrorStatus(error)
        return {
            source: "voyage",
            message: error.message,
            statusCode,
            isRetryable: isRetryableStatus(statusCode),
        }
    }

    if (error instanceof Error) {
        return {
            source: "unknown",
            message: error.message,
            isRetryable: false,
        }
    }

    return {
        source: "unknown",
        message: "Anthropic request failed",
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
 * Reads retry-after header from provider headers.
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
 * Reads provider-specific Anthropic API error details.
 *
 * @param payload Raw API error payload.
 * @returns Normalized code/type details.
 */
function readAnthropicApiErrorDetails(payload: unknown): {
    readonly code?: string
    readonly type?: string
} {
    const payloadRecord = toRecord(payload)
    const nestedErrorRecord = toRecord(payloadRecord?.["error"])

    const code = readString(nestedErrorRecord?.["code"]) ?? readString(payloadRecord?.["code"])
    const type = readString(nestedErrorRecord?.["type"]) ?? readString(payloadRecord?.["type"])

    return {
        code,
        type,
    }
}

/**
 * Reads HTTP headers from API error using safe runtime narrowing.
 *
 * @param error Anthropic API error.
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
 * @param error Anthropic API error.
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
 * Reads numeric status code from Voyage error.
 *
 * @param error Voyage error instance.
 * @returns Status code or undefined.
 */
function readVoyageErrorStatus(error: VoyageAIError): number | undefined {
    const statusCode = error.statusCode
    if (typeof statusCode !== "number" || Number.isFinite(statusCode) === false) {
        return undefined
    }

    return statusCode
}

/**
 * Reads optional text from unknown value.
 *
 * @param value Raw unknown value.
 * @returns Trimmed string or undefined.
 */
function readString(value: unknown): string | undefined {
    if (typeof value !== "string") {
        return undefined
    }

    return normalizeOptionalText(value)
}

/**
 * Converts unknown to plain record.
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
 * Normalizes numeric usage values.
 *
 * @param value Raw token count.
 * @returns Safe integer value.
 */
function normalizeUsageNumber(value: unknown): number {
    if (typeof value !== "number" || Number.isFinite(value) === false || value < 0) {
        return 0
    }

    return Math.trunc(value)
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
