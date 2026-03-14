import {Container, type ILLMProvider} from "@codenautic/core"

import {bindConstantSingleton} from "../shared/bind-constant-singleton"
import type {ILlmProviderFactory} from "./llm-provider.factory"
import {withLlmRateLimit, type ILlmRateLimitOptions} from "./llm-rate-limiter"
import {withLlmRetry, type ILlmRetryOptions} from "./llm-retry-wrapper"
import {LLM_TOKENS} from "./llm.tokens"

/**
 * Registration options for llm adapter module.
 */
export interface IRegisterLlmModuleOptions {
    /**
     * LLM provider implementation.
     */
    readonly provider: ILLMProvider

    /**
     * Optional rate limiter configuration for provider calls.
     */
    readonly rateLimit?: ILlmRateLimitOptions

    /**
     * Optional retry policy configuration for provider calls.
     */
    readonly retry?: ILlmRetryOptions

    /**
     * Optional LLM provider factory.
     */
    readonly providerFactory?: ILlmProviderFactory
}

/**
 * Registers llm adapters in DI container.
 *
 * @param container Target container.
 * @param options Module options.
 */
export function registerLlmModule(container: Container, options: IRegisterLlmModuleOptions): void {
    const provider = resolveLlmProvider(options)

    bindConstantSingleton(container, LLM_TOKENS.Provider, provider)

    if (options.providerFactory !== undefined) {
        bindConstantSingleton(
            container,
            LLM_TOKENS.ProviderFactory,
            options.providerFactory,
        )
    }
}

/**
 * Resolves provider instance with optional shared wrappers.
 *
 * @param options LLM module registration options.
 * @returns Decorated provider.
 */
function resolveLlmProvider(options: IRegisterLlmModuleOptions): ILLMProvider {
    let provider = options.provider

    if (options.rateLimit !== undefined) {
        provider = withLlmRateLimit(provider, options.rateLimit)
    }

    if (options.retry !== undefined) {
        provider = withLlmRetry(provider, options.retry)
    }

    return provider
}
