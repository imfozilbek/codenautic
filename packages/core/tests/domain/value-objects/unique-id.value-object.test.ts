import {describe, expect, test} from "bun:test"

import {InvalidUniqueIdError} from "../../../src/domain/errors/invalid-unique-id.error"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

describe("UniqueId", () => {
    test("generates uuid v4 when input is omitted", () => {
        const generated = UniqueId.create()

        expect(generated.value).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        )
    })

    test("keeps provided custom value", () => {
        const custom = UniqueId.create("custom")

        expect(custom.value).toBe("custom")
    })

    test("exposes value getter and supports isEqual/equals", () => {
        const left = UniqueId.create("  same-id  ")
        const right = UniqueId.create("same-id")
        const different = UniqueId.create("different-id")

        expect(left.value).toBe("same-id")
        expect(left.isEqual(right)).toBe(true)
        expect(left.isEqual(different)).toBe(false)
        expect(left.equals(right)).toBe(true)
        expect(left.equals(different)).toBe(false)
    })

    test("throws InvalidUniqueIdError for empty string", () => {
        expect(() => {
            UniqueId.create("")
        }).toThrow(InvalidUniqueIdError)

        expect(() => {
            UniqueId.create(" ")
        }).toThrow(InvalidUniqueIdError)
    })

    test("exposes stable domain error code for invalid value", () => {
        try {
            UniqueId.create(" ")
            throw new Error("Expected UniqueId.create to throw")
        } catch (error) {
            expect(error instanceof InvalidUniqueIdError).toBe(true)
            if (error instanceof InvalidUniqueIdError) {
                expect(error.code).toBe("INVALID_UNIQUE_ID")
            }
        }
    })
})
