import {describe, expect, test} from "bun:test"

import {deserialize, serialize} from "../../../src/shared/utils/serialize"

interface ISnapshot {
    createdAt: Date
    nested: {
        startedAt: Date
        values: readonly number[]
    }
    message: string
}

describe("serialize/deserialize", () => {
    test("serializes and deserializes object with Date round-trip", () => {
        const original: ISnapshot = {
            createdAt: new Date("2026-03-02T00:00:00.000Z"),
            nested: {
                startedAt: new Date("2026-03-02T12:30:00.000Z"),
                values: [1, 2, 3],
            },
            message: "ok",
        }

        const encoded = serialize(original)
        const decoded = deserialize<ISnapshot>(encoded)

        expect(decoded.createdAt instanceof Date).toBe(true)
        expect(decoded.nested.startedAt instanceof Date).toBe(true)
        expect(decoded.createdAt.toISOString()).toBe(original.createdAt.toISOString())
        expect(decoded.nested.startedAt.toISOString()).toBe(original.nested.startedAt.toISOString())
        expect(decoded.nested.values).toEqual([1, 2, 3])
        expect(decoded.message).toBe("ok")
    })

    test("throws on invalid json payload", () => {
        expect(() => {
            deserialize("{invalid}")
        }).toThrow("Invalid JSON payload")
    })
})
