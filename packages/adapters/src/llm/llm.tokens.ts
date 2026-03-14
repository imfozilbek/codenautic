import {createToken, type ILLMProvider} from "@codenautic/core"

import type {ILlmProviderFactory} from "./llm-provider.factory"
import type {ILlmProviderHealthMonitor} from "./llm-provider-health-monitor"

/**
 * DI tokens for llm adapter domain.
 */
export const LLM_TOKENS = {
    HealthMonitor: createToken<ILlmProviderHealthMonitor>("adapters.llm.health-monitor"),
    Provider: createToken<ILLMProvider>("adapters.llm.provider"),
    ProviderFactory: createToken<ILlmProviderFactory>("adapters.llm.provider-factory"),
} as const
