import {describe, expect, test} from "bun:test"

import {
    GIT_ACL_ERROR_CODE,
    GitAclError,
    GitLabMergeRequestAcl,
    type IGitMergeRequestFetchRequest,
} from "../../../src/git"

describe("GitLabMergeRequestAcl contract", () => {
    test("maps GitLab payload into stable domain DTO without SDK field leakage", () => {
        const acl = new GitLabMergeRequestAcl()
        const payload = {
            id: 1050,
            iid: 77,
            project_id: 42,
            title: "Fix race condition in review pipeline",
            description: null,
            source_branch: "feature/race-fix",
            target_branch: "main",
            web_url: "https://gitlab.local/group/repo/-/merge_requests/77",
            author: {
                id: 501,
                username: "alice",
                name: "Alice Johnson",
                state: "active",
            },
            diff_refs: {
                base_sha: "abc000",
                head_sha: "def999",
            },
            changes: [
                {
                    old_path: "src/a.ts",
                    new_path: "src/b.ts",
                    new_file: false,
                    deleted_file: false,
                    diff: "@@ -1 +1 @@",
                    additions: 10,
                    deletions: 3,
                },
            ],
            labels: ["backend"],
            pipeline: {
                status: "success",
            },
        }

        const result = acl.transform(payload)

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected successful mapping")
        }

        expect(Object.keys(result.value).sort()).toEqual([
            "author",
            "changedFiles",
            "description",
            "diffRefs",
            "mergeRequestExternalId",
            "provider",
            "repositoryExternalId",
            "sourceBranch",
            "targetBranch",
            "title",
            "webUrl",
        ])

        expect(Object.keys(result.value.author).sort()).toEqual([
            "displayName",
            "externalId",
            "username",
        ])

        expect(result.value).toEqual({
            provider: "gitlab",
            repositoryExternalId: "42",
            mergeRequestExternalId: "77",
            title: "Fix race condition in review pipeline",
            description: "",
            sourceBranch: "feature/race-fix",
            targetBranch: "main",
            webUrl: "https://gitlab.local/group/repo/-/merge_requests/77",
            author: {
                externalId: "501",
                username: "alice",
                displayName: "Alice Johnson",
            },
            diffRefs: {
                baseSha: "abc000",
                headSha: "def999",
            },
            changedFiles: [
                {
                    path: "src/b.ts",
                    status: "modified",
                    additions: 10,
                    deletions: 3,
                },
            ],
        })
    })

    test("normalizes 429 errors as retryable and idempotent-safe", () => {
        const acl = new GitLabMergeRequestAcl()

        const normalized = acl.normalizeError({
            message: "Too Many Requests",
            response: {
                status: 429,
                headers: {
                    "retry-after": "7",
                },
            },
        })

        expect(normalized.code).toBe(GIT_ACL_ERROR_CODE.RATE_LIMITED)
        expect(normalized.statusCode).toBe(429)
        expect(normalized.retryable).toBe(true)
        expect(normalized.idempotentSafe).toBe(true)
        expect(normalized.retryAfterSeconds).toBe(7)
        expect(acl.shouldRetry(normalized)).toBe(true)
    })

    test("normalizes 5xx errors as retryable upstream failures", () => {
        const acl = new GitLabMergeRequestAcl()

        const normalized = acl.normalizeError({
            message: "Bad Gateway",
            statusCode: 502,
        })

        expect(normalized.code).toBe(GIT_ACL_ERROR_CODE.UPSTREAM_UNAVAILABLE)
        expect(normalized.statusCode).toBe(502)
        expect(normalized.retryable).toBe(true)
        expect(normalized.idempotentSafe).toBe(true)
        expect(acl.shouldRetry(normalized)).toBe(true)
    })

    test("handles partial payload by applying safe defaults instead of crashing", () => {
        const acl = new GitLabMergeRequestAcl()
        const payload = {
            id: 12,
            iid: 9,
            project_id: 100,
            title: "Add retry policy",
            source_branch: "feature/retry-policy",
            target_branch: "main",
            author: {
                id: 1000,
                username: "bob",
            },
            diff_refs: {
                base_sha: "base-sha",
                head_sha: "head-sha",
            },
        }

        const result = acl.transform(payload)

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected successful mapping")
        }

        expect(result.value.description).toBe("")
        expect(result.value.webUrl).toBe("")
        expect(result.value.author.displayName).toBe("bob")
        expect(result.value.changedFiles).toEqual([])
    })

    test("returns invalid payload error for missing required fields", () => {
        const acl = new GitLabMergeRequestAcl()

        const result = acl.transform({
            id: 12,
            iid: 9,
            project_id: 100,
        })

        expect(result.isFail).toBe(true)
        if (result.isOk) {
            throw new Error("Expected invalid payload failure")
        }

        expect(result.error.code).toBe(GIT_ACL_ERROR_CODE.INVALID_PAYLOAD)
        expect(result.error.retryable).toBe(false)
        expect(acl.shouldRetry(result.error)).toBe(false)
    })

    test("returns invalid payload error when payload is not an object", () => {
        const acl = new GitLabMergeRequestAcl()

        const result = acl.transform("invalid-payload")

        expect(result.isFail).toBe(true)
        if (result.isOk) {
            throw new Error("Expected invalid payload failure")
        }

        expect(result.error.code).toBe(GIT_ACL_ERROR_CODE.INVALID_PAYLOAD)
        expect(result.error.message).toContain("non-null object")
    })

    test("returns invalid payload error when author is missing", () => {
        const acl = new GitLabMergeRequestAcl()

        const result = acl.transform({
            project_id: 100,
            iid: 9,
            title: "Add retry policy",
            source_branch: "feature/retry-policy",
            target_branch: "main",
            diff_refs: {
                base_sha: "base-sha",
                head_sha: "head-sha",
            },
        })

        expect(result.isFail).toBe(true)
        if (result.isOk) {
            throw new Error("Expected invalid payload failure")
        }

        expect(result.error.message).toContain("missing author")
    })

    test("returns invalid payload error when author data is incomplete", () => {
        const acl = new GitLabMergeRequestAcl()

        const result = acl.transform({
            project_id: 100,
            iid: 9,
            title: "Add retry policy",
            source_branch: "feature/retry-policy",
            target_branch: "main",
            author: {
                id: "",
                username: "bob",
            },
            diff_refs: {
                base_sha: "base-sha",
                head_sha: "head-sha",
            },
        })

        expect(result.isFail).toBe(true)
        if (result.isOk) {
            throw new Error("Expected invalid payload failure")
        }

        expect(result.error.message).toContain("incomplete author")
    })

    test("returns invalid payload error when author id has invalid type", () => {
        const acl = new GitLabMergeRequestAcl()

        const result = acl.transform({
            project_id: 100,
            iid: 9,
            title: "Add retry policy",
            source_branch: "feature/retry-policy",
            target_branch: "main",
            author: {
                id: {},
                username: "bob",
            },
            diff_refs: {
                base_sha: "base-sha",
                head_sha: "head-sha",
            },
        })

        expect(result.isFail).toBe(true)
        if (result.isOk) {
            throw new Error("Expected invalid payload failure")
        }

        expect(result.error.message).toContain("incomplete author")
    })

    test("returns invalid payload error when diff refs are missing", () => {
        const acl = new GitLabMergeRequestAcl()

        const result = acl.transform({
            project_id: 100,
            iid: 9,
            title: "Add retry policy",
            source_branch: "feature/retry-policy",
            target_branch: "main",
            author: {
                id: 10,
                username: "bob",
            },
        })

        expect(result.isFail).toBe(true)
        if (result.isOk) {
            throw new Error("Expected invalid payload failure")
        }

        expect(result.error.message).toContain("missing diff_refs")
    })

    test("returns invalid payload error when diff refs are incomplete", () => {
        const acl = new GitLabMergeRequestAcl()

        const result = acl.transform({
            project_id: 100,
            iid: 9,
            title: "Add retry policy",
            source_branch: "feature/retry-policy",
            target_branch: "main",
            author: {
                id: 10,
                username: "bob",
            },
            diff_refs: {
                base_sha: "base-sha",
            },
        })

        expect(result.isFail).toBe(true)
        if (result.isOk) {
            throw new Error("Expected invalid payload failure")
        }

        expect(result.error.message).toContain("incomplete diff refs")
    })

    test("maps change status variants and skips invalid change entries", () => {
        const acl = new GitLabMergeRequestAcl()
        const result = acl.transform({
            project_id: "100",
            iid: "9",
            title: "Normalize change statuses",
            source_branch: "feature/retry-policy",
            target_branch: "main",
            author: {
                id: 10,
                username: "bob",
                name: "Bob",
            },
            diff_refs: {
                base_sha: "base-sha",
                head_sha: "head-sha",
            },
            changes: [
                {
                    old_path: "old.ts",
                    new_file: true,
                    additions: 5,
                    deletions: 1,
                },
                {
                    old_path: "to-delete.ts",
                    deleted_file: true,
                    additions: 0,
                    deletions: 10,
                },
                {
                    new_path: "bad-counts.ts",
                    additions: "invalid",
                    deletions: -1,
                },
                {
                    additions: 1,
                    deletions: 1,
                },
                "not-object",
            ],
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected successful mapping")
        }

        expect(result.value.changedFiles).toEqual([
            {
                path: "old.ts",
                status: "added",
                additions: 5,
                deletions: 1,
            },
            {
                path: "to-delete.ts",
                status: "deleted",
                additions: 0,
                deletions: 10,
            },
            {
                path: "bad-counts.ts",
                status: "modified",
                additions: 0,
                deletions: 0,
            },
        ])
    })

    test("produces deterministic idempotency key for identical requests", () => {
        const acl = new GitLabMergeRequestAcl()
        const request: IGitMergeRequestFetchRequest = {
            provider: "gitlab",
            projectExternalId: "42",
            mergeRequestExternalId: "77",
            includeChanges: true,
        }

        const first = acl.createIdempotencyKey(request)
        const second = acl.createIdempotencyKey(request)
        const changed = acl.createIdempotencyKey({
            ...request,
            mergeRequestExternalId: "78",
        })

        expect(first).toBe(second)
        expect(first === changed).toBe(false)
    })

    test("uses includeChanges flag as part of idempotency key", () => {
        const acl = new GitLabMergeRequestAcl()
        const request: IGitMergeRequestFetchRequest = {
            provider: "gitlab",
            projectExternalId: "42",
            mergeRequestExternalId: "77",
            includeChanges: true,
        }

        const withChanges = acl.createIdempotencyKey(request)
        const withoutChanges = acl.createIdempotencyKey({
            ...request,
            includeChanges: false,
        })

        expect(withChanges === withoutChanges).toBe(false)
    })

    test("returns the same normalized error when input is already GitAclError", () => {
        const acl = new GitLabMergeRequestAcl()
        const existing = new GitAclError({
            code: GIT_ACL_ERROR_CODE.UNKNOWN,
            message: "Existing",
            retryable: false,
            idempotentSafe: false,
        })

        const normalized = acl.normalizeError(existing)

        expect(normalized).toBe(existing)
    })

    test("normalizes unauthorized errors", () => {
        const acl = new GitLabMergeRequestAcl()

        const normalized = acl.normalizeError({
            message: "Forbidden",
            response: {
                status: 403,
            },
        })

        expect(normalized.code).toBe(GIT_ACL_ERROR_CODE.UNAUTHORIZED)
        expect(normalized.retryable).toBe(false)
        expect(normalized.idempotentSafe).toBe(false)
    })

    test("normalizes generic 4xx errors into invalid payload", () => {
        const acl = new GitLabMergeRequestAcl()

        const normalized = acl.normalizeError({
            message: "Not Found",
            statusCode: "404",
        })

        expect(normalized.code).toBe(GIT_ACL_ERROR_CODE.INVALID_PAYLOAD)
        expect(normalized.statusCode).toBe(404)
        expect(normalized.retryable).toBe(false)
    })

    test("normalizes 5xx errors when status is provided as response.status string", () => {
        const acl = new GitLabMergeRequestAcl()

        const normalized = acl.normalizeError({
            message: "Service unavailable",
            response: {
                status: "503",
            },
        })

        expect(normalized.code).toBe(GIT_ACL_ERROR_CODE.UPSTREAM_UNAVAILABLE)
        expect(normalized.statusCode).toBe(503)
    })

    test("normalizes 5xx errors when status is provided as response.status number", () => {
        const acl = new GitLabMergeRequestAcl()

        const normalized = acl.normalizeError({
            message: "Server error",
            response: {
                status: 500,
            },
        })

        expect(normalized.code).toBe(GIT_ACL_ERROR_CODE.UPSTREAM_UNAVAILABLE)
        expect(normalized.statusCode).toBe(500)
    })

    test("normalizes unknown provider errors with default message", () => {
        const acl = new GitLabMergeRequestAcl()

        const normalized = acl.normalizeError(1234)

        expect(normalized.code).toBe(GIT_ACL_ERROR_CODE.UNKNOWN)
        expect(normalized.message).toBe("Unknown Git provider error")
        expect(normalized.statusCode).toBeUndefined()
    })

    test("normalizes object errors without status as unknown", () => {
        const acl = new GitLabMergeRequestAcl()

        const normalized = acl.normalizeError({
            details: "no-status",
            statusCode: "not-a-number",
        })

        expect(normalized.code).toBe(GIT_ACL_ERROR_CODE.UNKNOWN)
        expect(normalized.statusCode).toBeUndefined()
    })

    test("extracts status from nested cause and retry-after from uppercase headers", () => {
        const acl = new GitLabMergeRequestAcl()

        const normalized = acl.normalizeError({
            message: "Rate limited",
            cause: {
                response: {
                    statusCode: 429,
                    headers: {
                        "Retry-After": "15",
                    },
                },
            },
        })

        expect(normalized.code).toBe(GIT_ACL_ERROR_CODE.RATE_LIMITED)
        expect(normalized.retryAfterSeconds).toBe(15)
    })

    test("extracts retry-after from direct retryAfterSeconds field", () => {
        const acl = new GitLabMergeRequestAcl()

        const normalized = acl.normalizeError({
            message: "Rate limited",
            status: 429,
            retryAfterSeconds: 9,
        })

        expect(normalized.retryAfterSeconds).toBe(9)
    })

    test("extracts retry-after from uppercase header on top-level response", () => {
        const acl = new GitLabMergeRequestAcl()

        const normalized = acl.normalizeError({
            message: "Rate limited",
            statusCode: 429,
            response: {
                headers: {
                    "Retry-After": "11",
                },
            },
        })

        expect(normalized.retryAfterSeconds).toBe(11)
    })

    test("preserves message and cause for native Error instances", () => {
        const acl = new GitLabMergeRequestAcl()
        const upstreamError = Object.assign(new Error("Gateway timeout"), {
            statusCode: 504,
        })

        const normalized = acl.normalizeError(upstreamError)

        expect(normalized.message).toBe("Gateway timeout")
        expect(normalized.code).toBe(GIT_ACL_ERROR_CODE.UPSTREAM_UNAVAILABLE)
        expect(normalized.cause).toBe(upstreamError)
    })
})
