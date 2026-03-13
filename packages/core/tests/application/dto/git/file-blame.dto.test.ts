import {describe, expect, test} from "bun:test"

import type {IBlameData, IFileBlame} from "../../../../src/application/dto/git"

describe("IFileBlame", () => {
    test("supports file-scoped batch blame payload", () => {
        const blameRange: IBlameData = {
            lineStart: 4,
            lineEnd: 9,
            commitSha: "abc123",
            authorName: "Alice",
            authorEmail: "alice@example.com",
            date: "2026-03-13T12:00:00.000Z",
        }
        const fileBlame: IFileBlame = {
            filePath: "src/app.ts",
            blame: [blameRange],
        }

        expect(fileBlame.filePath).toBe("src/app.ts")
        expect(fileBlame.blame).toHaveLength(1)
        expect(fileBlame.blame[0]?.commitSha).toBe("abc123")
        expect(fileBlame.blame[0]?.authorEmail).toBe("alice@example.com")
    })
})
