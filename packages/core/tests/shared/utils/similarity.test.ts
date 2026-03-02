import {describe, expect, test} from "bun:test"

import {similarity} from "../../../src/shared/utils/similarity"

describe("similarity", () => {
    test("returns 1 for identical vectors", () => {
        expect(similarity([1, 2, 3], [1, 2, 3])).toBe(1)
    })

    test("returns 0 for orthogonal vectors", () => {
        expect(similarity([1, 0], [0, 1])).toBe(0)
    })

    test("returns -1 for opposite vectors", () => {
        expect(similarity([1, 0], [-1, 0])).toBe(-1)
    })

    test("throws when vector lengths differ", () => {
        expect(() => {
            similarity([1, 2], [1])
        }).toThrow("Vectors must have the same length")
    })

    test("throws when vector is zero-length", () => {
        expect(() => {
            similarity([], [])
        }).toThrow("Vectors must not be empty")
    })

    test("throws when vector magnitude is zero", () => {
        expect(() => {
            similarity([0, 0], [0, 0])
        }).toThrow("Vectors must have non-zero magnitude")
    })

    test("throws for sparse vectors with missing values", () => {
        const left: number[] = [1]
        left.length = 2

        expect(() => {
            similarity(left, [1, 2])
        }).toThrow("Vector value is missing")
    })
})
