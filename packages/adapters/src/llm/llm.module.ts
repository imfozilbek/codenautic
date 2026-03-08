import {Container, type ILLMProvider} from "@codenautic/core"

import {bindConstantSingleton} from "../shared/bind-constant-singleton"
import type {ILlmProviderFactory} from "./llm-provider.factory"
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
    bindConstantSingleton(container, LLM_TOKENS.Provider, options.provider)

    if (options.providerFactory !== undefined) {
        bindConstantSingleton(
            container,
            LLM_TOKENS.ProviderFactory,
            options.providerFactory,
        )
    }
}
