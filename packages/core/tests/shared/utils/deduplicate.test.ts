import {describe, expect, test} from "bun:test"

import {deduplicate} from "../../../src/shared/utils/deduplicate"

interface IItem {
    id: string
    value: number
}

describe("deduplicate", () => {
    test("removes duplicates and preserves first occurrence order", () => {
        const source: readonly IItem[] = [
            {id: "a", value: 1},
            {id: "b", value: 2},
            {id: "a", value: 3},
            {id: "c", value: 4},
            {id: "b", value: 5},
        ]

        const result = deduplicate(source, (item) => item.id)

        expect(result).toEqual([
            {id: "a", value: 1},
            {id: "b", value: 2},
            {id: "c", value: 4},
        ])
    })

    test("returns empty array for empty source", () => {
        const result = deduplicate([], (value) => value)

        expect(result).toEqual([])
    })
})
