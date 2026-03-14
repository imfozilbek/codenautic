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
    OpenRouterProviderError,
    type IOpenRouterProviderErrorDetails,
} from "./openrouter-provider.error"

const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

/**
 * Minimal OpenAI-compatible client accepted by OpenRouter provider.
 */
export interface IOpenRouterClient extends IOpenAIClient {}

/**
 * OpenRouter provider constructor options.
 */
export interface IOpenRouterProviderOptions {
    /**
     * API key used when SDK client is constructed internally.
     */
    readonly apiKey?: string

    /**
     * Optional alternative OpenRouter-compatible base URL.
     */
    readonly baseUrl?: string

    /**
     * Embedding model used by `embed()`.
     */
    readonly embeddingModel?: string

    /**
     * Optional injected OpenAI-compatible client for tests.
     */
    readonly client?: IOpenRouterClient

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
 * OpenRouter implementation of the shared LLM provider contract.
 */
export class OpenRouterProvider implements ILLMProvider {
    private readonly openAiCompatibleProvider: OpenAIProvider

    /**
     * Creates OpenRouter provider.
     *
     * @param options Provider options.
     */
    public constructor(options: IOpenRouterProviderOptions) {
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
            throw mapOpenRouterProviderError(error)
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
            throw mapOpenRouterProviderError(error)
        }

        return createOpenRouterStreamingResponse(stream)
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
            throw mapOpenRouterProviderError(error)
        }
    }
}

/**
 * Maps OpenRouter provider options into OpenAI-compatible provider options.
 *
 * @param options OpenRouter provider options.
 * @returns OpenAI-compatible options.
 */
function buildOpenAiCompatibleOptions(
    options: IOpenRouterProviderOptions,
): IOpenAIProviderOptions {
    return {
        apiKey: options.apiKey,
        baseUrl: options.baseUrl ?? DEFAULT_OPENROUTER_BASE_URL,
        embeddingModel: options.embeddingModel,
        client: options.client,
        retryMaxAttempts: options.retryMaxAttempts,
        sleep: options.sleep,
        requestNormalizationOptions: options.requestNormalizationOptions,
        responseNormalizationOptions: options.responseNormalizationOptions,
    }
}

/**
 * Maps unknown provider error into typed OpenRouter provider error.
 *
 * @param error Unknown upstream error.
 * @returns Typed OpenRouter provider error.
 */
function mapOpenRouterProviderError(error: unknown): OpenRouterProviderError {
    if (error instanceof OpenRouterProviderError) {
        return error
    }

    if (error instanceof OpenAIProviderError) {
        const details: IOpenRouterProviderErrorDetails = {
            statusCode: error.statusCode,
            code: error.code,
            type: error.type,
            retryAfterMs: error.retryAfterMs,
            isRetryable: error.isRetryable,
        }

        return new OpenRouterProviderError(error.message, details)
    }

    if (error instanceof Error) {
        return new OpenRouterProviderError(error.message, {
            isRetryable: false,
        })
    }

    return new OpenRouterProviderError("OpenRouter request failed", {
        isRetryable: false,
    })
}

/**
 * Creates streaming response wrapper with OpenRouter error mapping.
 *
 * @param stream Source stream.
 * @returns Wrapped stream.
 */
function createOpenRouterStreamingResponse(
    stream: IStreamingChatResponseDTO,
): IStreamingChatResponseDTO {
    return {
        async *[Symbol.asyncIterator](): AsyncIterator<IChatChunkDTO> {
            try {
                for await (const chunk of stream) {
                    yield chunk
                }
            } catch (error) {
                throw mapOpenRouterProviderError(error)
            }
        },
    }
}
