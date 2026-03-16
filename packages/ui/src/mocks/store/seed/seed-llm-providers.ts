import type { ILlmProviderConfig } from "@/lib/api/endpoints/llm-providers.endpoint"

import type { LlmProvidersCollection } from "../collections/llm-providers-collection"

/**
 * Начальный набор конфигураций LLM провайдеров.
 *
 * OpenAI подключен, Anthropic подключен, Azure OpenAI и Mistral отключены.
 */
const SEED_LLM_PROVIDERS: ReadonlyArray<ILlmProviderConfig> = [
    {
        id: "llm-openai",
        provider: "OpenAI",
        model: "gpt-4o-mini",
        maskedApiKey: "****************************aB1c",
        endpoint: "https://api.openai.com/v1",
        status: "CONNECTED",
        connected: true,
        lastTestedAt: "2026-03-15T10:00:00.000Z",
    },
    {
        id: "llm-anthropic",
        provider: "Anthropic",
        model: "claude-3-7-sonnet",
        maskedApiKey: "****************************xY2z",
        endpoint: "https://api.anthropic.com",
        status: "CONNECTED",
        connected: true,
        lastTestedAt: "2026-03-15T09:30:00.000Z",
    },
    {
        id: "llm-azure-openai",
        provider: "Azure OpenAI",
        model: "gpt-4o-mini",
        maskedApiKey: "",
        endpoint: "",
        status: "DISCONNECTED",
        connected: false,
    },
    {
        id: "llm-mistral",
        provider: "Mistral",
        model: "mistral-small-latest",
        maskedApiKey: "",
        endpoint: "https://api.mistral.ai/v1",
        status: "DISCONNECTED",
        connected: false,
    },
]

/**
 * Заполняет LLM providers коллекцию начальным набором данных.
 *
 * @param collection - Коллекция LLM провайдеров для заполнения.
 */
export function seedLlmProviders(collection: LlmProvidersCollection): void {
    collection.seed({
        providers: SEED_LLM_PROVIDERS,
    })
}
