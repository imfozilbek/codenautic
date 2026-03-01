import {describe, expect, test} from "bun:test"

import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

describe("UniqueId", () => {
    test("generates value when input is omitted", () => {
        const generated = UniqueId.create()

        expect(generated.value.length).toBeGreaterThan(0)
    })

    test("normalizes provided value and compares equality by value", () => {
        const left = UniqueId.create("  same-id  ")
        const right = UniqueId.create("same-id")
        const different = UniqueId.create("different-id")

        expect(left.value).toBe("same-id")
        expect(left.equals(right)).toBe(true)
        expect(left.equals(different)).toBe(false)
    })

    test("throws when value is empty after trim", () => {
        expect(() => {
            UniqueId.create("   ")
        }).toThrow("UniqueId cannot be empty")
    })
})
