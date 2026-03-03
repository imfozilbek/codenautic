import {describe, expect, it} from "vitest"
import {z} from "zod"

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

        expect(result.success).toBe(true)
        expect(result.data).toEqual({
            mode: "dark",
            limit: 5,
        })
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

        expect(result.success).toBe(false)
        expect(result.error).toContain("mode")
        expect(result.error).toContain("Expected string")
    })

    it("валидирует enum значения", (): void => {
        const values = ["light", "dark", "system"] as const
        expect(parseEnumValue(values, "dark")).toEqual({value: "dark"})
        expect(parseEnumValue(values, "unknown")).toEqual({
            message: 'Недопустимое значение "unknown".',
        })
        expect(isEnumValue(values, "system")).toBe(true)
        expect(isEnumValue(values, "blue")).toBe(false)
    })

    it("очищает строку через sanitize-схему", (): void => {
        const schema = createSanitizedStringSchema()

        expect(schema.parse("  <b>safe</b>  ")).toBe("safe")
        expect(schema.parse("  <script>alert(1)</script>test  ")).toBe("test")
    })

    it("parseSchemaOrError защищает от ошибок без доступа к внутренним полям", (): void => {
        const schema = z.object({
            enabled: z.boolean(),
        })
        const result = parseSchemaOrError(schema, {
            enabled: "true",
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain("enabled")
    })
})
