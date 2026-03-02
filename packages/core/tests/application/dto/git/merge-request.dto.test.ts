import {describe, expect, test} from "bun:test"

import {
    MERGE_REQUEST_DIFF_FILE_STATUS,
    type IMergeRequestDTO,
} from "../../../../src/application/dto/git/merge-request.dto"

describe("IMergeRequestDTO", () => {
    test("supports platform-agnostic merge request payload", () => {
        const mergeRequest: IMergeRequestDTO = {
            id: "mr-1",
            number: 42,
            title: "Improve pipeline reliability",
            description: "Adds retries for flaky stages",
            sourceBranch: "feature/retry-stage",
            targetBranch: "main",
            author: {
                id: "user-1",
                username: "alice",
                displayName: "Alice Doe",
            },
            state: "opened",
            commits: [
                {
                    id: "abc123",
                    message: "Add retry policy",
                    author: "Alice Doe",
                    timestamp: "2026-03-03T08:00:00.000Z",
                },
            ],
            diffFiles: [
                {
                    path: "src/pipeline/retry.ts",
                    status: MERGE_REQUEST_DIFF_FILE_STATUS.MODIFIED,
                    patch: "@@ -1,2 +1,5 @@",
                    hunks: ["@@ -1,2 +1,5 @@"],
                },
            ],
        }

        expect(mergeRequest.number).toBe(42)
        expect(mergeRequest.author.username).toBe("alice")
        expect(mergeRequest.diffFiles[0]?.status).toBe("modified")
    })
})
