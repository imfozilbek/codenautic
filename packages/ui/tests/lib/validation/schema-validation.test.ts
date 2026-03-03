import { describe, expect, it } from "vitest"
import { z } from "zod"

import {
    createSanitizedStringSchema,
    isEnumValue,
    parseEnumValue,
    parseSchemaOrError,
} from "@/lib/validation/schema-validation"

describe("schema-validation", (): void => {
    it("парсит корректные payload-данные", (): void => {
        const schema = z.object({
            mode: z.string(),
            limit: z.number(),
        })
        const result = parseSchemaOrError(schema, {
            limit: 5,
            mode: "dark",
        })

        if (result.success === true) {
            expect(result.data).toEqual({
                mode: "dark",
                limit: 5,
            })
            return
        }

        throw new Error("Validation unexpectedly failed for valid payload")
    })

    it("возвращает человекочитаемую ошибку валидации", (): void => {
        const schema = z.object({
            mode: z.string(),
            limit: z.number(),
        })
        const result = parseSchemaOrError(schema, {
            mode: 2,
            limit: "10",
        })

        if (result.success !== true) {
            expect(result.error).toContain("mode")
            expect(result.error.toLowerCase()).toContain("expected string")
            return
        }

        throw new Error("Validation unexpectedly succeeded for invalid payload")
    })

    it("валидирует enum значения", (): void => {
        const values = ["light", "dark", "system"] as const
        expect(parseEnumValue(values, "dark")).toEqual({ value: "dark" })
        expect(parseEnumValue(values, "unknown")).toEqual({
            message: 'Недопустимое значение "unknown".',
        })
        expect(isEnumValue(values, "system")).toBe(true)
        expect(isEnumValue(values, "blue")).toBe(false)
    })

    it("очищает строку через sanitize-схему", (): void => {
        const schema = createSanitizedStringSchema() as z.ZodType<string>
        const sanitizedSafe = parseSchemaOrError<string>(schema, "  <b>safe</b>  ")
        const scriptSafe = parseSchemaOrError<string>(schema, "  <script>alert(1)</script>test  ")

        if (sanitizedSafe.success === false) {
            throw new Error("Expected sanitization schema to validate safe value")
        }
        if (scriptSafe.success === false) {
            throw new Error("Expected sanitization schema to validate script payload")
        }

        expect(sanitizedSafe.data).toBe("safe")
        expect(scriptSafe.data).toBe("test")
    })

    it("parseSchemaOrError защищает от ошибок без доступа к внутренним полям", (): void => {
        const schema = z.object({
            enabled: z.boolean(),
        })
        const result = parseSchemaOrError(schema, {
            enabled: "true",
        })

        if (result.success !== true) {
            expect(result.error).toContain("enabled")
            return
        }

        throw new Error("Validation unexpectedly succeeded for invalid payload")
    })
})
