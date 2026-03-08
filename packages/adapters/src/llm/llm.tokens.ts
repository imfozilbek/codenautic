import {createToken, type ILLMProvider} from "@codenautic/core"

import type {ILlmProviderFactory} from "./llm-provider.factory"

/**
 * DI tokens for llm adapter domain.
 */
export const LLM_TOKENS = {
    Provider: createToken<ILLMProvider>("adapters.llm.provider"),
    ProviderFactory: createToken<ILlmProviderFactory>("adapters.llm.provider-factory"),
} as const
