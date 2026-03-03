import { describe, expect, it } from "vitest"

import {
    codeReviewFormSchema,
    llmProviderFormSchema,
    type ICodeReviewFormValues,
    type ILlmProviderFormValues,
} from "@/components/settings/settings-form-schemas"

describe("settings-form-schemas", (): void => {
    it("валидирует корректную форму code-review", (): void => {
        const result = codeReviewFormSchema.parse({
            cadence: "daily",
            enableDriftSignals: true,
            severity: "medium",
            suggestionsLimit: 8,
        }) satisfies ICodeReviewFormValues

        expect(result.suggestionsLimit).toBe(8)
    })

    it("отбрасывает некорректный severity для code-review", (): void => {
        expect((): void => {
            codeReviewFormSchema.parse({
                cadence: "daily",
                enableDriftSignals: false,
                severity: "critical",
                suggestionsLimit: 2,
            })
        }).toThrowError()
    })

    it("валидирует форму llm-провайдера с опциональным endpoint", (): void => {
        const result = llmProviderFormSchema.parse({
            apiKey: "  sk-test-key  ",
            model: "gpt-4o",
            provider: "OpenAI",
            testAfterSave: false,
        }) satisfies ILlmProviderFormValues

        expect(result.apiKey).toBe("sk-test-key")
        expect(result.endpoint).toBeUndefined()
    })

    it("санитизирует endpoint в llm форме", (): void => {
        const result = llmProviderFormSchema.parse({
            apiKey: "sk-test-key",
            endpoint: "  https://api.example.com/v1  ",
            model: "gpt-4o-mini",
            provider: "Azure OpenAI",
            testAfterSave: true,
        }) satisfies ILlmProviderFormValues

        expect(result.endpoint).toBe("https://api.example.com/v1")
    })
})
