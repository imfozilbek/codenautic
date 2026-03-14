import { describe, expect, it } from "vitest"

import { safeParseJson, safeParseJsonUnknown } from "@/lib/utils/safe-json"

describe("safeParseJson", (): void => {
    it("when valid JSON is provided, then returns parsed value", (): void => {
        const result = safeParseJson('{"name":"test"}', {})

        expect(result).toEqual({ name: "test" })
    })

    it("when valid JSON array is provided, then returns parsed array", (): void => {
        const result = safeParseJson("[1,2,3]", [] as number[])

        expect(result).toEqual([1, 2, 3])
    })

    it("when invalid JSON is provided, then returns fallback", (): void => {
        const fallback = { default: true }
        const result = safeParseJson("{broken json", fallback)

        expect(result).toBe(fallback)
    })

    it("when empty string is provided, then returns fallback", (): void => {
        const result = safeParseJson("", "fallback")

        expect(result).toBe("fallback")
    })

    it("when JSON null is provided, then returns null", (): void => {
        const result = safeParseJson("null", "fallback")

        expect(result).toBeNull()
    })

    it("when JSON primitive is provided, then returns primitive", (): void => {
        const result = safeParseJson("42", 0)

        expect(result).toBe(42)
    })

    it("when JSON string is provided, then returns string", (): void => {
        const result = safeParseJson('"hello"', "")

        expect(result).toBe("hello")
    })
})

describe("safeParseJsonUnknown", (): void => {
    it("when valid JSON is provided, then returns parsed value", (): void => {
        const result = safeParseJsonUnknown('{"key":"value"}')

        expect(result).toEqual({ key: "value" })
    })

    it("when invalid JSON is provided, then returns undefined", (): void => {
        const result = safeParseJsonUnknown("{not valid}")

        expect(result).toBeUndefined()
    })

    it("when empty string is provided, then returns undefined", (): void => {
        const result = safeParseJsonUnknown("")

        expect(result).toBeUndefined()
    })
})
