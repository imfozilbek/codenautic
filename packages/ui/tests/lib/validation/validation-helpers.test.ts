import { describe, expect, it } from "vitest"
import { z } from "zod"

import {
    parseSchemaOrError,
    createEnumSchema,
    parseEnumValue,
    isEnumValue,
    sanitizeText,
    sanitizeTextInput,
    createSanitizedStringSchema,
    createOptionalSanitizedStringSchema,
} from "@/lib/validation/schema-validation"

describe("parseSchemaOrError", (): void => {
    it("when payload matches schema, then returns success with data", (): void => {
        const schema = z.object({ name: z.string() })
        const result = parseSchemaOrError(schema, { name: "test" })

        expect(result.success).toBe(true)
        if (result.success === true) {
            expect(result.data).toEqual({ name: "test" })
        }
    })

    it("when payload does not match schema, then returns error message", (): void => {
        const schema = z.object({ name: z.string() })
        const result = parseSchemaOrError(schema, { name: 42 })

        expect(result.success).toBe(false)
        if (result.success === false) {
            expect(result.error).toContain("name")
        }
    })

    it("when payload is completely wrong type, then returns error", (): void => {
        const schema = z.string()
        const result = parseSchemaOrError(schema, 42)

        expect(result.success).toBe(false)
    })
})

describe("createEnumSchema", (): void => {
    it("when value is in allowed list, then parses successfully", (): void => {
        const schema = createEnumSchema(["low", "medium", "high"] as const)
        const result = schema.safeParse("low")

        expect(result.success).toBe(true)
    })

    it("when value is not in allowed list, then parse fails", (): void => {
        const schema = createEnumSchema(["low", "medium", "high"] as const)
        const result = schema.safeParse("extreme")

        expect(result.success).toBe(false)
    })

    it("when value is not a string, then parse fails", (): void => {
        const schema = createEnumSchema(["low", "medium"] as const)
        const result = schema.safeParse(42)

        expect(result.success).toBe(false)
    })
})

describe("parseEnumValue", (): void => {
    const values = ["low", "medium", "high"] as const

    it("when value is in allowed list, then returns value", (): void => {
        const result = parseEnumValue(values, "low")

        expect(result.value).toBe("low")
        expect(result.message).toBeUndefined()
    })

    it("when value is not in allowed list, then returns error message", (): void => {
        const result = parseEnumValue(values, "extreme")

        expect(result.value).toBeUndefined()
        expect(result.message).toContain("extreme")
    })

    it("when value is not a string, then returns empty result", (): void => {
        const result = parseEnumValue(values, 42)

        expect(result.value).toBeUndefined()
        expect(result.message).toBeUndefined()
    })
})

describe("isEnumValue", (): void => {
    const values = ["a", "b", "c"] as const

    it("when value is in list, then returns true", (): void => {
        expect(isEnumValue(values, "a")).toBe(true)
    })

    it("when value is not in list, then returns false", (): void => {
        expect(isEnumValue(values, "d")).toBe(false)
    })

    it("when value is not a string, then returns false", (): void => {
        expect(isEnumValue(values, 1)).toBe(false)
    })
})

describe("sanitizeText", (): void => {
    it("when input contains HTML tags, then strips them", (): void => {
        const result = sanitizeText("<script>alert('xss')</script>hello")

        expect(result).not.toContain("<script>")
        expect(result).toContain("hello")
    })

    it("when input is only whitespace, then returns empty string", (): void => {
        const result = sanitizeText("   ")

        expect(result).toBe("")
    })

    it("when input is plain text, then returns trimmed text", (): void => {
        const result = sanitizeText("  hello world  ")

        expect(result).toBe("hello world")
    })
})

describe("sanitizeTextInput", (): void => {
    it("when given a value, then returns source and sanitized value", (): void => {
        const result = sanitizeTextInput("  hello  ")

        expect(result.source).toBe("  hello  ")
        expect(result.value).toBe("hello")
    })
})

describe("createSanitizedStringSchema", (): void => {
    it("when given valid string, then parses and sanitizes", (): void => {
        const schema = createSanitizedStringSchema()
        const result = schema.safeParse("  clean text  ")

        expect(result.success).toBe(true)
    })

    it("when given non-string, then passes through to string validation", (): void => {
        const schema = createSanitizedStringSchema()
        const result = schema.safeParse(42)

        expect(result.success).toBe(false)
    })
})

describe("createOptionalSanitizedStringSchema", (): void => {
    it("when given valid string, then parses and sanitizes", (): void => {
        const schema = createOptionalSanitizedStringSchema()
        const result = schema.safeParse("text")

        expect(result.success).toBe(true)
    })

    it("when given undefined, then parses successfully", (): void => {
        const schema = createOptionalSanitizedStringSchema()
        const result = schema.safeParse(undefined)

        expect(result.success).toBe(true)
    })
})
