import {describe, expect, test} from "bun:test"

import type {IBlameData} from "../../../../src/application/dto/git"

describe("IBlameData", () => {
    test("поддерживает метаданные blame для диапазона строк", () => {
        const blame: IBlameData = {
            lineStart: 10,
            lineEnd: 12,
            commitSha: "abc123",
            authorName: "Alice",
            authorEmail: "alice@example.com",
            date: "2026-03-03T10:00:00.000Z",
        }

        expect(blame.lineStart).toBe(10)
        expect(blame.lineEnd).toBe(12)
        expect(blame.commitSha).toBe("abc123")
        expect(blame.authorEmail).toBe("alice@example.com")
    })
})
