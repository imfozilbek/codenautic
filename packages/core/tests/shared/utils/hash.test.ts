import {describe, expect, test} from "bun:test"

import {hash} from "../../../src/shared/utils/hash"

describe("hash", () => {
    test("returns deterministic sha256 hash for same input", () => {
        const first = hash("hello")
        const second = hash("hello")

        expect(first).toBe(second)
        expect(first).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824")
    })

    test("returns valid hash for empty string", () => {
        const digest = hash("")

        expect(digest).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
        expect(digest.length).toBe(64)
    })
})
