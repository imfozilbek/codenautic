import type { ITokenUsageRecord } from "@/lib/api/endpoints/token-usage.endpoint"

import type { TokenUsageCollection } from "../collections/token-usage-collection"

/**
 * Начальные записи расхода токенов для mock API.
 */
const SEED_TOKEN_USAGE_RECORDS: ReadonlyArray<ITokenUsageRecord> = [
    {
        ccr: "ccr-9001",
        completionTokens: 22000,
        developer: "Neo",
        id: "usage-1",
        model: "gpt-4o-mini",
        promptTokens: 63000,
    },
    {
        ccr: "ccr-9002",
        completionTokens: 9100,
        developer: "Trinity",
        id: "usage-2",
        model: "claude-3-7-sonnet",
        promptTokens: 41000,
    },
    {
        ccr: "ccr-9003",
        completionTokens: 14800,
        developer: "Morpheus",
        id: "usage-3",
        model: "gpt-4.1-mini",
        promptTokens: 52000,
    },
    {
        ccr: "ccr-9004",
        completionTokens: 13200,
        developer: "Niobe",
        id: "usage-4",
        model: "mistral-small-latest",
        promptTokens: 48000,
    },
    {
        ccr: "ccr-9005",
        completionTokens: 7400,
        developer: "Neo",
        id: "usage-5",
        model: "gpt-4o-mini",
        promptTokens: 27000,
    },
    {
        ccr: "ccr-9006",
        completionTokens: 11600,
        developer: "Trinity",
        id: "usage-6",
        model: "gpt-4.1-mini",
        promptTokens: 39000,
    },
    {
        ccr: "ccr-9007",
        completionTokens: 19800,
        developer: "Neo",
        id: "usage-7",
        model: "claude-3-7-sonnet",
        promptTokens: 57000,
    },
]

/**
 * Заполняет token-usage коллекцию начальным набором данных.
 *
 * @param tokenUsage - Коллекция token usage для заполнения.
 */
export function seedTokenUsage(tokenUsage: TokenUsageCollection): void {
    tokenUsage.seed(SEED_TOKEN_USAGE_RECORDS)
}
