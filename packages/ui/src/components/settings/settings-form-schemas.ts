import { sanitizeText } from "@/lib/validation/schema-validation"
import { z } from "zod"

/**
 * Режимы выполнения code-review.
 */
export const CODE_REVIEW_CADENCE_OPTIONS = ["daily", "weekly", "on_demand"] as const

/**
 * Уровни тяжести инцидентов.
 */
export const CODE_REVIEW_SEVERITY_OPTIONS = ["low", "medium", "high"] as const

/**
 * Поддерживаемые провайдеры LLM.
 */
export const LLM_PROVIDER_OPTIONS = ["OpenAI", "Anthropic", "Azure OpenAI", "Mistral"] as const

/**
 * Поддерживаемые модели для формы LLM.
 */
export const LLM_MODEL_OPTIONS = [
    "gpt-4o-mini",
    "gpt-4o",
    "claude-3-7-sonnet",
    "mistral-small-latest",
] as const

/**
 * Zod-схема для формы code-review.
 */
export const codeReviewFormSchema = z.object({
    cadence: z.enum(CODE_REVIEW_CADENCE_OPTIONS),
    enableDriftSignals: z.coerce.boolean(),
    severity: z.enum(CODE_REVIEW_SEVERITY_OPTIONS),
    suggestionsLimit: z.coerce
        .number()
        .int()
        .min(1, "Введите число не меньше 1")
        .max(99, "Превышен лимит"),
})

/**
 * Zod-схема для LLM provider формы.
 */
const llmApiKeySchema = z
    .string()
    .transform((value: string): string => sanitizeText(value))
    .superRefine((value, context): void => {
        if (value.length < 8) {
            context.addIssue({
                code: z.ZodIssueCode.too_small,
                message: "Секретный ключ должен быть не короче 8 символов",
                minimum: 8,
                inclusive: true,
                type: "string",
            })
            return
        }

        if (value.length > 256) {
            context.addIssue({
                code: z.ZodIssueCode.too_big,
                message: "Слишком длинный ключ",
                maximum: 256,
                inclusive: true,
                type: "string",
            })
        }
    })

export const llmProviderFormSchema = z.object({
    apiKey: llmApiKeySchema,
    endpoint: z.preprocess((value: unknown): string | undefined => {
        if (typeof value !== "string") {
            return undefined
        }

        const sanitizedEndpoint = sanitizeText(value)
        if (sanitizedEndpoint.length === 0) {
            return undefined
        }

        return sanitizedEndpoint
    }, z.string().url("Укажите корректный endpoint").max(250, "Слишком длинный URL").optional()),
    model: z.enum(LLM_MODEL_OPTIONS),
    provider: z.enum(LLM_PROVIDER_OPTIONS),
    testAfterSave: z.boolean(),
})

/**
 * Типы значений для code-review формы.
 */
export type ICodeReviewFormValues = z.infer<typeof codeReviewFormSchema>

/**
 * Типы значений для LLM формы.
 */
export type ILlmProviderFormValues = z.infer<typeof llmProviderFormSchema>
