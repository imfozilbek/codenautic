import type {
    IChatChunkDTO,
    IChatRequestDTO,
    IChatResponseDTO,
    ILLMProvider,
    IStreamingChatResponseDTO,
} from "@codenautic/core"

import type {
    ILlmAclRequestNormalizationOptions,
    ILlmAclResponseNormalizationOptions,
} from "./acl"
import {
    OpenAIProvider,
    type IOpenAIClient,
    type IOpenAIProviderOptions,
} from "./openai-provider"
import {OpenAIProviderError} from "./openai-provider.error"
import {
    NovitaProviderError,
    type INovitaProviderErrorDetails,
} from "./novita-provider.error"

const DEFAULT_NOVITA_BASE_URL = "https://api.novita.ai/v3/openai"

/**
 * Minimal OpenAI-compatible client accepted by Novita provider.
 */
export interface INovitaClient extends IOpenAIClient {}

/**
 * Novita provider constructor options.
 */
export interface INovitaProviderOptions {
    /**
     * API key used when SDK client is constructed internally.
     */
    readonly apiKey?: string

    /**
     * Optional alternative Novita-compatible base URL.
     */
    readonly baseUrl?: string

    /**
     * Embedding model used by `embed()`.
     */
    readonly embeddingModel?: string

    /**
     * Optional injected OpenAI-compatible client for tests.
     */
    readonly client?: INovitaClient

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
 * Novita implementation of the shared LLM provider contract.
 */
export class NovitaProvider implements ILLMProvider {
    private readonly openAiCompatibleProvider: OpenAIProvider

    /**
     * Creates Novita provider.
     *
     * @param options Provider options.
     */
    public constructor(options: INovitaProviderOptions) {
        this.openAiCompatibleProvider = new OpenAIProvider(
            buildOpenAiCompatibleOptions(options),
        )
    }

    /**
     * Executes chat completion request.
     *
     * @param request Shared chat request DTO.
     * @returns Shared chat response DTO.
     */
    public async chat(request: IChatRequestDTO): Promise<IChatResponseDTO> {
        try {
            return await this.openAiCompatibleProvider.chat(request)
        } catch (error) {
            throw mapNovitaProviderError(error)
        }
    }

    /**
     * Executes streaming chat completion request.
     *
     * @param request Shared chat request DTO.
     * @returns Async stream of normalized chunks.
     */
    public stream(request: IChatRequestDTO): IStreamingChatResponseDTO {
        let stream: IStreamingChatResponseDTO

        try {
            stream = this.openAiCompatibleProvider.stream(request)
        } catch (error) {
            throw mapNovitaProviderError(error)
        }

        return createNovitaStreamingResponse(stream)
    }

    /**
     * Creates embedding vectors for provided texts.
     *
     * @param texts Input text chunks.
     * @returns Embedding vectors.
     */
    public async embed(texts: readonly string[]): Promise<readonly number[][]> {
        try {
            return await this.openAiCompatibleProvider.embed(texts)
        } catch (error) {
            throw mapNovitaProviderError(error)
        }
    }
}

/**
 * Maps Novita provider options into OpenAI-compatible provider options.
 *
 * @param options Novita provider options.
 * @returns OpenAI-compatible options.
 */
function buildOpenAiCompatibleOptions(options: INovitaProviderOptions): IOpenAIProviderOptions {
    return {
        apiKey: options.apiKey,
        baseUrl: options.baseUrl ?? DEFAULT_NOVITA_BASE_URL,
        embeddingModel: options.embeddingModel,
        client: options.client,
        retryMaxAttempts: options.retryMaxAttempts,
        sleep: options.sleep,
        requestNormalizationOptions: options.requestNormalizationOptions,
        responseNormalizationOptions: options.responseNormalizationOptions,
    }
}

/**
 * Maps unknown provider error into typed Novita provider error.
 *
 * @param error Unknown upstream error.
 * @returns Typed Novita provider error.
 */
function mapNovitaProviderError(error: unknown): NovitaProviderError {
    if (error instanceof NovitaProviderError) {
        return error
    }

    if (error instanceof OpenAIProviderError) {
        const details: INovitaProviderErrorDetails = {
            statusCode: error.statusCode,
            code: error.code,
            type: error.type,
            retryAfterMs: error.retryAfterMs,
            isRetryable: error.isRetryable,
        }

        return new NovitaProviderError(error.message, details)
    }

    if (error instanceof Error) {
        return new NovitaProviderError(error.message, {
            isRetryable: false,
        })
    }

    return new NovitaProviderError("Novita request failed", {
        isRetryable: false,
    })
}

/**
 * Creates streaming response wrapper with Novita error mapping.
 *
 * @param stream Source stream.
 * @returns Wrapped stream.
 */
function createNovitaStreamingResponse(stream: IStreamingChatResponseDTO): IStreamingChatResponseDTO {
    return {
        async *[Symbol.asyncIterator](): AsyncIterator<IChatChunkDTO> {
            try {
                for await (const chunk of stream) {
                    yield chunk
                }
            } catch (error) {
                throw mapNovitaProviderError(error)
            }
        },
    }
}
