import {describe, expect, test} from "bun:test"

import {
    LLM_PROVIDER_FACTORY_ERROR_CODE,
    LLM_PROVIDER_TYPE,
    LlmProviderFactory,
    LlmProviderFactoryError,
    normalizeLlmProviderType,
} from "../../src/llm"
import {createLlmProviderMock} from "../helpers/provider-factories"

/**
 * Asserts typed LLM provider factory error payload.
 *
 * @param callback Action expected to throw.
 * @param code Expected error code.
 * @param providerType Expected raw provider type.
 */
function expectLlmFactoryError(
    callback: () => unknown,
    code: (typeof LLM_PROVIDER_FACTORY_ERROR_CODE)[keyof typeof LLM_PROVIDER_FACTORY_ERROR_CODE],
    providerType: string,
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(LlmProviderFactoryError)

        if (error instanceof LlmProviderFactoryError) {
            expect(error.code).toBe(code)
            expect(error.providerType).toBe(providerType)
            return
        }
    }

    throw new Error("Expected LlmProviderFactoryError to be thrown")
}

describe("LlmProviderFactory", () => {
    test("normalizes provider aliases to canonical types", () => {
        expect(normalizeLlmProviderType("openai")).toBe(LLM_PROVIDER_TYPE.OPENAI)
        expect(normalizeLlmProviderType("anthropic")).toBe(LLM_PROVIDER_TYPE.ANTHROPIC)
        expect(normalizeLlmProviderType("claude")).toBe(LLM_PROVIDER_TYPE.ANTHROPIC)
        expect(normalizeLlmProviderType("openrouter")).toBe(LLM_PROVIDER_TYPE.OPENROUTER)
        expect(normalizeLlmProviderType("groq")).toBe(LLM_PROVIDER_TYPE.GROQ)
        expect(normalizeLlmProviderType("gemini")).toBe(LLM_PROVIDER_TYPE.GOOGLE)
        expect(normalizeLlmProviderType("cerebras")).toBe(LLM_PROVIDER_TYPE.CEREBRAS)
    })

    test("creates configured provider and resolves sanitized byok/fallback configuration", () => {
        const openAiProvider = createLlmProviderMock()
        const anthropicProvider = createLlmProviderMock()
        const factory = new LlmProviderFactory({
            openai: {
                provider: openAiProvider,
                supportedModels: ["gpt-4o", "gpt-4o-mini"],
            },
            anthropic: {
                provider: anthropicProvider,
                supportedModels: ["claude-3-7-sonnet"],
            },
        })

        const provider = factory.create({
            providerType: " openai ",
            model: " gpt-4o ",
            apiKey: "sk-secret-value",
            fallback: {
                providerType: "anthropic",
                model: " claude-3-7-sonnet ",
            },
        })
        const configuration = factory.resolveConfiguration({
            providerType: "openai",
            model: "gpt-4o",
            apiKey: "sk-secret-value",
            fallback: {
                providerType: "anthropic",
                model: "claude-3-7-sonnet",
            },
        })

        expect(provider).toBe(openAiProvider)
        expect(configuration).toEqual({
            providerType: LLM_PROVIDER_TYPE.OPENAI,
            model: "gpt-4o",
            usesByok: true,
            fallback: {
                providerType: LLM_PROVIDER_TYPE.ANTHROPIC,
                model: "claude-3-7-sonnet",
            },
        })
        expect(JSON.stringify(configuration)).not.toContain("sk-secret-value")
        expect("apiKey" in configuration).toBe(false)
    })

    test("throws typed error for unknown and unconfigured providers", () => {
        const factory = new LlmProviderFactory({
            openai: {
                provider: createLlmProviderMock(),
            },
        })

        expectLlmFactoryError(
            () =>
                factory.create({
                    providerType: "custom-provider",
                    model: "gpt-4o",
                }),
            LLM_PROVIDER_FACTORY_ERROR_CODE.UNKNOWN_PROVIDER,
            "custom-provider",
        )
        expect(() =>
            factory.create({
                providerType: "anthropic",
                model: "claude-3-7-sonnet",
            }),
        ).toThrow("LLM provider is not configured for type: anthropic")
    })

    test("throws predictable configuration errors for invalid model and byok api key", () => {
        const factory = new LlmProviderFactory({
            openai: {
                provider: createLlmProviderMock(),
                supportedModels: ["gpt-4o"],
            },
        })

        expectLlmFactoryError(
            () =>
                factory.resolveConfiguration({
                    providerType: "openai",
                    model: "gpt-4o-mini",
                }),
            LLM_PROVIDER_FACTORY_ERROR_CODE.INVALID_MODEL,
            LLM_PROVIDER_TYPE.OPENAI,
        )
        expect(() =>
            factory.resolveConfiguration({
                providerType: "openai",
                model: " ",
            }),
        ).toThrow("LLM model configuration is invalid for provider: OPENAI")
        expect(() =>
            factory.resolveConfiguration({
                providerType: "openai",
                model: "gpt-4o",
                apiKey: " ",
            }),
        ).toThrow("BYOK api key is invalid for provider: OPENAI")
    })

    test("throws dedicated fallback configuration errors", () => {
        const factory = new LlmProviderFactory({
            openai: {
                provider: createLlmProviderMock(),
                supportedModels: ["gpt-4o"],
            },
            anthropic: {
                provider: createLlmProviderMock(),
                supportedModels: ["claude-3-7-sonnet"],
            },
        })

        expect(() =>
            factory.resolveConfiguration({
                providerType: "openai",
                model: "gpt-4o",
                fallback: {
                    providerType: "unknown-fallback",
                    model: "x",
                },
            }),
        ).toThrow("Unknown fallback llm provider type: unknown-fallback")
        expect(() =>
            factory.resolveConfiguration({
                providerType: "openai",
                model: "gpt-4o",
                fallback: {
                    providerType: "cerebras",
                    model: "llama3.1-70b",
                },
            }),
        ).toThrow("Fallback llm provider is not configured for type: cerebras")
        expect(() =>
            factory.resolveConfiguration({
                providerType: "openai",
                model: "gpt-4o",
                fallback: {
                    providerType: "anthropic",
                    model: " ",
                },
            }),
        ).toThrow("Fallback llm model configuration is invalid for provider: ANTHROPIC")
    })

    test("preserves empty provider input in public error message", () => {
        const factory = new LlmProviderFactory({})

        expectLlmFactoryError(
            () =>
                factory.create({
                    providerType: "   ",
                    model: "gpt-4o",
                }),
            LLM_PROVIDER_FACTORY_ERROR_CODE.UNKNOWN_PROVIDER,
            "   ",
        )
        expect(() =>
            factory.create({
                providerType: "   ",
                model: "gpt-4o",
            }),
        ).toThrow("Unknown llm provider type: <empty>")
    })
})
