import {describe, expect, test} from "bun:test"

import type {
    IBlameData,
    IFileBlame,
    IGitBlame,
} from "../../../../src"

class InMemoryGitBlame implements IGitBlame {
    public getBlameData(
        _filePath: string,
        _ref: string,
    ): Promise<readonly IBlameData[]> {
        return Promise.resolve([
            {
                lineStart: 1,
                lineEnd: 5,
                commitSha: "single-1",
                authorName: "Alice",
                authorEmail: "alice@example.com",
                date: "2026-03-13T12:00:00.000Z",
            },
        ])
    }

    public getBlameDataBatch(
        filePaths: readonly string[],
        _ref: string,
    ): Promise<readonly IFileBlame[]> {
        return Promise.resolve(
            filePaths.map((filePath, index): IFileBlame => {
                return {
                    filePath,
                    blame: [
                        {
                            lineStart: 1,
                            lineEnd: index + 1,
                            commitSha: `commit-${index + 1}`,
                            authorName: index === 0 ? "Alice" : "Bob",
                            authorEmail:
                                index === 0
                                    ? "alice@example.com"
                                    : "bob@example.com",
                            date: "2026-03-13T12:00:00.000Z",
                        },
                    ],
                }
            }),
        )
    }
}

describe("IGitBlame contract", () => {
    test("returns single-file and batch blame payloads", async () => {
        const provider = new InMemoryGitBlame()

        const singleBlame = await provider.getBlameData("src/app.ts", "main")
        const batchBlame = await provider.getBlameDataBatch(
            ["src/app.ts", "src/lib.ts"],
            "main",
        )

        expect(singleBlame).toHaveLength(1)
        expect(singleBlame[0]?.commitSha).toBe("single-1")
        expect(batchBlame).toHaveLength(2)
        expect(batchBlame[0]?.filePath).toBe("src/app.ts")
        expect(batchBlame[1]?.blame[0]?.authorName).toBe("Bob")
    })
})
