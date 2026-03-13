import {describe, expect, test} from "bun:test"

import {
    CHECK_RUN_CONCLUSION,
    CHECK_RUN_STATUS,
    INLINE_COMMENT_SIDE,
    type IInlineCommentDTO,
    type IWebhookEventDTO,
} from "@codenautic/core"

import {
    GitHubProvider,
    GitHubProviderError,
    type IGitHubOctokitClient,
} from "../../src/git"

type AsyncMethod<TResult> = (...args: readonly unknown[]) => Promise<TResult>
type IDataResponse = {readonly data: unknown}
type IGitHubApiErrorFields = {
    readonly status?: number
    readonly statusCode?: number
    readonly headers?: Readonly<Record<string, string>>
}
type IGitHubMockPulls = {
    readonly get?: AsyncMethod<unknown>
    readonly listFiles?: AsyncMethod<unknown>
    readonly listCommits?: AsyncMethod<unknown>
    readonly createReviewComment?: AsyncMethod<unknown>
}
type IGitHubMockIssues = {
    readonly createComment?: AsyncMethod<unknown>
}
type IGitHubMockChecks = {
    readonly create?: AsyncMethod<unknown>
    readonly update?: AsyncMethod<unknown>
}
type IGitHubMockRepos = {
    readonly get?: AsyncMethod<unknown>
    readonly listBranches?: AsyncMethod<unknown>
    readonly getContent?: AsyncMethod<unknown>
    readonly listCommits?: AsyncMethod<unknown>
    readonly getCommit?: AsyncMethod<unknown>
}
type IGitHubMockGit = {
    readonly getTree?: AsyncMethod<unknown>
}
type IGitHubClientMockOverrides = {
    readonly pulls?: IGitHubMockPulls
    readonly issues?: IGitHubMockIssues
    readonly checks?: IGitHubMockChecks
    readonly repos?: IGitHubMockRepos
    readonly git?: IGitHubMockGit
    readonly request?: AsyncMethod<unknown>
}
type IGitHubGraphQlRequestPayload = {
    readonly query: string
    readonly owner: string
    readonly repo: string
    readonly expression: string
}

/**
 * Creates async mock from queued handlers.
 *
 * @param handlers Per-call handlers.
 * @returns Async function with captured calls.
 */
function createQueuedAsyncMethod<TResult>(
    handlers: readonly ((...args: readonly unknown[]) => TResult | Promise<TResult>)[],
): AsyncMethod<TResult> & {readonly calls: readonly (readonly unknown[])[]} {
    const calls: (readonly unknown[])[] = []
    let callIndex = 0

    const method = ((...args: readonly unknown[]): Promise<TResult> => {
        calls.push(args)

        const handler = handlers[callIndex]
        callIndex += 1
        if (handler === undefined) {
            return Promise.reject(new Error("Unexpected call"))
        }

        return Promise.resolve(handler(...args))
    }) as AsyncMethod<TResult> & {readonly calls: readonly (readonly unknown[])[]}

    Object.defineProperty(method, "calls", {
        value: calls,
    })

    return method
}

/**
 * Creates constant data handler for queued async methods.
 *
 * @param data Data payload.
 * @returns Handler returning `{ data }`.
 */
function createDataHandler(data: unknown): () => IDataResponse {
    return (): IDataResponse => {
        return {data}
    }
}

/**
 * Checks whether value matches GitHub GraphQL request payload shape.
 *
 * @param value Candidate value.
 * @returns True when value is a GraphQL request payload.
 */
function isGitHubGraphQlRequestPayload(
    value: unknown,
): value is IGitHubGraphQlRequestPayload {
    if (typeof value !== "object" || value === null) {
        return false
    }

    const candidate = value as Record<string, unknown>

    return (
        typeof candidate.query === "string" &&
        typeof candidate.owner === "string" &&
        typeof candidate.repo === "string" &&
        typeof candidate.expression === "string"
    )
}

/**
 * Creates throwing handler for queued async methods.
 *
 * @param error Error instance to throw.
 * @returns Handler that throws provided error.
 */
function createErrorHandler(error: Error): () => never {
    return (): never => {
        throw error
    }
}

/**
 * Creates GitHub-like API error object used in retry tests.
 *
 * @param message Error message.
 * @param fields Additional GitHub response fields.
 * @returns Error with GitHub status metadata.
 */
function createGitHubApiError(
    message: string,
    fields: IGitHubApiErrorFields,
): Error & IGitHubApiErrorFields {
    return Object.assign(new Error(message), fields)
}

/**
 * Creates default unexpected method for Octokit mock sections.
 *
 * @returns Method rejecting on unexpected invocation.
 */
function createUnexpectedGitHubMethod<TMethod>(): TMethod {
    return ((..._args: readonly unknown[]): Promise<never> => {
        return Promise.reject(new Error("Unexpected GitHub client call"))
    }) as TMethod
}

/**
 * Resolves mock method override or falls back to unexpected-call handler.
 *
 * @param override Optional override method.
 * @returns Override or default unexpected method.
 */
function resolveGitHubMethod<TMethod>(override: TMethod | undefined): TMethod {
    return override ?? createUnexpectedGitHubMethod<TMethod>()
}

/**
 * Creates pull-request client mock section.
 *
 * @param overrides Partial pull-request methods.
 * @returns Fully populated pull-request client section.
 */
function createGitHubPullsMock(
    overrides?: IGitHubMockPulls,
): IGitHubOctokitClient["pulls"] {
    return {
        get: resolveGitHubMethod(overrides?.get) as IGitHubOctokitClient["pulls"]["get"],
        listFiles: resolveGitHubMethod(overrides?.listFiles) as IGitHubOctokitClient["pulls"]["listFiles"],
        listCommits:
            resolveGitHubMethod(overrides?.listCommits) as IGitHubOctokitClient["pulls"]["listCommits"],
        createReviewComment:
            resolveGitHubMethod(overrides?.createReviewComment) as IGitHubOctokitClient["pulls"]["createReviewComment"],
    }
}

/**
 * Creates issues client mock section.
 *
 * @param overrides Partial issue methods.
 * @returns Fully populated issues client section.
 */
function createGitHubIssuesMock(
    overrides?: IGitHubMockIssues,
): IGitHubOctokitClient["issues"] {
    return {
        createComment:
            resolveGitHubMethod(overrides?.createComment) as IGitHubOctokitClient["issues"]["createComment"],
    }
}

/**
 * Creates checks client mock section.
 *
 * @param overrides Partial check methods.
 * @returns Fully populated checks client section.
 */
function createGitHubChecksMock(
    overrides?: IGitHubMockChecks,
): IGitHubOctokitClient["checks"] {
    return {
        create: resolveGitHubMethod(overrides?.create) as IGitHubOctokitClient["checks"]["create"],
        update: resolveGitHubMethod(overrides?.update) as IGitHubOctokitClient["checks"]["update"],
    }
}

/**
 * Creates repository client mock section.
 *
 * @param overrides Partial repository methods.
 * @returns Fully populated repository client section.
 */
function createGitHubReposMock(
    overrides?: IGitHubMockRepos,
): IGitHubOctokitClient["repos"] {
    return {
        get: resolveGitHubMethod(overrides?.get) as IGitHubOctokitClient["repos"]["get"],
        listBranches:
            resolveGitHubMethod(overrides?.listBranches) as IGitHubOctokitClient["repos"]["listBranches"],
        getContent:
            resolveGitHubMethod(overrides?.getContent) as IGitHubOctokitClient["repos"]["getContent"],
        listCommits:
            resolveGitHubMethod(overrides?.listCommits) as IGitHubOctokitClient["repos"]["listCommits"],
        getCommit:
            resolveGitHubMethod(overrides?.getCommit) as IGitHubOctokitClient["repos"]["getCommit"],
    }
}

/**
 * Creates git-data client mock section.
 *
 * @param overrides Partial git-data methods.
 * @returns Fully populated git-data client section.
 */
function createGitHubGitMock(
    overrides?: IGitHubMockGit,
): IGitHubOctokitClient["git"] {
    return {
        getTree: resolveGitHubMethod(overrides?.getTree) as IGitHubOctokitClient["git"]["getTree"],
    }
}

/**
 * Creates default GitHub client mock that fails on unexpected calls.
 *
 * @param overrides Partial client overrides.
 * @returns Octokit-compatible mock.
 */
function createGitHubClientMock(
    overrides: IGitHubClientMockOverrides,
): IGitHubOctokitClient {
    return {
        pulls: createGitHubPullsMock(overrides.pulls),
        issues: createGitHubIssuesMock(overrides.issues),
        checks: createGitHubChecksMock(overrides.checks),
        repos: createGitHubReposMock(overrides.repos),
        git: createGitHubGitMock(overrides.git),
        request: resolveGitHubMethod(overrides.request) as IGitHubOctokitClient["request"],
    }
}

/**
 * Captures rejected error for assertion-friendly checks.
 *
 * @param execute Async action expected to fail.
 * @returns Rejected error instance.
 */
async function captureRejectedError(execute: () => Promise<unknown>): Promise<Error> {
    try {
        await execute()
    } catch (error) {
        if (error instanceof Error) {
            return error
        }

        throw new Error("Expected error object to be thrown")
    }

    throw new Error("Expected promise to reject")
}

describe("GitHubProvider", () => {
    test("exposes normalized GitHub provider error metadata through getters", () => {
        const error = new GitHubProviderError({
            kind: "RATE_LIMITED",
            message: "rate limited",
            isRetryable: true,
            statusCode: 429,
            retryAfterMs: 1000,
        })

        expect(error.name).toBe("GitHubProviderError")
        expect(error.kind).toBe("RATE_LIMITED")
        expect(error.isRetryable).toBe(true)
        expect(error.statusCode).toBe(429)
        expect(error.retryAfterMs).toBe(1000)
    })

    test("creates provider from token when custom client is omitted", () => {
        const provider = new GitHubProvider({
            owner: "codenautic",
            repo: "platform",
            token: "ghp_test_token",
            baseUrl: "https://github.example/api/v3",
        })

        expect(provider.formatSuggestion("const value = 1")).toBe(
            "```suggestion\nconst value = 1\n```",
        )
    })

    test("loads merge request and maps GitHub payload to core DTO", async () => {
        const pullsGet = createQueuedAsyncMethod([
            createDataHandler({
                id: 1001,
                number: 17,
                title: " Improve review pipeline ",
                body: "Refines stages",
                state: "open",
                head: {
                    ref: "feature/review",
                    sha: "head-sha",
                },
                base: {
                    ref: "main",
                },
                user: {
                    id: 77,
                    login: "alice",
                },
            }),
        ])
        const listCommits = createQueuedAsyncMethod([
            createDataHandler([
                {
                    sha: "c1",
                    commit: {
                        message: "Initial",
                        author: {
                            name: "Alice",
                            date: "2026-03-08T10:00:00.000Z",
                        },
                    },
                },
            ]),
        ])
        const listFiles = createQueuedAsyncMethod([
            createDataHandler([
                {
                    filename: "src/review.ts",
                    previous_filename: "src/old-review.ts",
                    status: "renamed",
                    patch: "@@ -1 +1 @@\n-old\n+new",
                },
            ]),
        ])
        const provider = new GitHubProvider({
            owner: "codenautic",
            repo: "platform",
            client: createGitHubClientMock({
                pulls: {
                    get: pullsGet,
                    listCommits,
                    listFiles,
                },
            }),
        })

        const mergeRequest = await provider.getMergeRequest("17")

        expect(mergeRequest).toEqual({
            id: "1001",
            number: 17,
            title: "Improve review pipeline",
            description: "Refines stages",
            sourceBranch: "feature/review",
            targetBranch: "main",
            author: {
                id: "77",
                username: "alice",
                displayName: "alice",
            },
            state: "open",
            commits: [
                {
                    id: "c1",
                    message: "Initial",
                    author: "Alice",
                    timestamp: "2026-03-08T10:00:00.000Z",
                },
            ],
            diffFiles: [
                {
                    path: "src/review.ts",
                    status: "renamed",
                    oldPath: "src/old-review.ts",
                    patch: "@@ -1 +1 @@\n-old\n+new",
                    hunks: ["@@ -1 +1 @@", "-old", "+new"],
                },
            ],
        })
        expect(pullsGet.calls).toHaveLength(1)
    })

    test("loads changed files and normalizes deleted and unknown statuses", async () => {
        const provider = new GitHubProvider({
            owner: "codenautic",
            repo: "platform",
            client: createGitHubClientMock({
                pulls: {
                    listFiles: createQueuedAsyncMethod([
                        createDataHandler([
                            {
                                filename: "src/deleted.ts",
                                status: "removed",
                            },
                            {
                                filename: "src/weird.ts",
                                status: "unknown",
                                patch: "",
                            },
                        ]),
                    ]),
                },
            }),
        })

        const files = await provider.getChangedFiles("18")

        expect(files).toEqual([
            {
                path: "src/deleted.ts",
                status: "deleted",
                patch: "",
                hunks: [],
            },
            {
                path: "src/weird.ts",
                status: "modified",
                patch: "",
                hunks: [],
            },
        ])
    })

    test("loads file tree for reference and filters unsupported node types", async () => {
        const provider = new GitHubProvider({
            owner: "codenautic",
            repo: "platform",
            client: createGitHubClientMock({
                repos: {
                    getCommit: createQueuedAsyncMethod([
                        createDataHandler({
                            commit: {
                                tree: {
                                    sha: "tree-sha",
                                },
                            },
                        }),
                    ]),
                },
                git: {
                    getTree: createQueuedAsyncMethod([
                        createDataHandler({
                            tree: [
                                {
                                    path: "src",
                                    type: "tree",
                                    sha: "tree-1",
                                },
                                {
                                    path: "src/app.ts",
                                    type: "blob",
                                    size: 42,
                                    sha: "blob-1",
                                },
                                {
                                    path: "submodule",
                                    type: "commit",
                                    sha: "skip",
                                },
                            ],
                        }),
                    ]),
                },
            }),
        })

        const tree = await provider.getFileTree("main")

        expect(tree).toEqual([
            {
                path: "src",
                type: "tree",
                size: 0,
                sha: "tree-1",
            },
            {
                path: "src/app.ts",
                type: "blob",
                size: 42,
                sha: "blob-1",
            },
        ])
    })

    test("applies root and nested gitignore patterns when loading file tree", async () => {
        const getContent = createQueuedAsyncMethod([
            createDataHandler({
                type: "file",
                encoding: "base64",
                content: Buffer.from(
                    [
                        "dist/",
                        "node_modules/",
                        "src/generated/*",
                        "!src/generated/keep.ts",
                    ].join("\n"),
                ).toString("base64"),
            }),
            createDataHandler({
                type: "file",
                encoding: "base64",
                content: Buffer.from("draft.md\n").toString("base64"),
            }),
        ])
        const provider = new GitHubProvider({
            owner: "codenautic",
            repo: "platform",
            client: createGitHubClientMock({
                repos: {
                    getCommit: createQueuedAsyncMethod([
                        createDataHandler({
                            commit: {
                                tree: {
                                    sha: "tree-sha",
                                },
                            },
                        }),
                    ]),
                    getContent,
                },
                git: {
                    getTree: createQueuedAsyncMethod([
                        createDataHandler({
                            tree: [
                                {
                                    path: ".gitignore",
                                    type: "blob",
                                    size: 48,
                                    sha: "blob-ignore-root",
                                },
                                {
                                    path: "README.md",
                                    type: "blob",
                                    size: 12,
                                    sha: "blob-readme",
                                },
                                {
                                    path: "draft.md",
                                    type: "blob",
                                    size: 14,
                                    sha: "blob-root-draft",
                                },
                                {
                                    path: "src",
                                    type: "tree",
                                    sha: "tree-src",
                                },
                                {
                                    path: "src/app.ts",
                                    type: "blob",
                                    size: 21,
                                    sha: "blob-app",
                                },
                                {
                                    path: "src/generated",
                                    type: "tree",
                                    sha: "tree-generated",
                                },
                                {
                                    path: "src/generated/drop.ts",
                                    type: "blob",
                                    size: 10,
                                    sha: "blob-drop",
                                },
                                {
                                    path: "src/generated/keep.ts",
                                    type: "blob",
                                    size: 10,
                                    sha: "blob-keep",
                                },
                                {
                                    path: "docs",
                                    type: "tree",
                                    sha: "tree-docs",
                                },
                                {
                                    path: "docs/.gitignore",
                                    type: "blob",
                                    size: 9,
                                    sha: "blob-ignore-docs",
                                },
                                {
                                    path: "docs/draft.md",
                                    type: "blob",
                                    size: 8,
                                    sha: "blob-docs-draft",
                                },
                                {
                                    path: "docs/publish.md",
                                    type: "blob",
                                    size: 8,
                                    sha: "blob-docs-publish",
                                },
                                {
                                    path: "dist",
                                    type: "tree",
                                    sha: "tree-dist",
                                },
                                {
                                    path: "dist/app.js",
                                    type: "blob",
                                    size: 18,
                                    sha: "blob-dist",
                                },
                                {
                                    path: "node_modules",
                                    type: "tree",
                                    sha: "tree-node-modules",
                                },
                                {
                                    path: "node_modules/pkg.js",
                                    type: "blob",
                                    size: 16,
                                    sha: "blob-node-module",
                                },
                            ],
                        }),
                    ]),
                },
            }),
        })

        const tree = await provider.getFileTree("main")

        expect(tree).toEqual([
            {
                path: ".gitignore",
                type: "blob",
                size: 48,
                sha: "blob-ignore-root",
            },
            {
                path: "README.md",
                type: "blob",
                size: 12,
                sha: "blob-readme",
            },
            {
                path: "draft.md",
                type: "blob",
                size: 14,
                sha: "blob-root-draft",
            },
            {
                path: "src",
                type: "tree",
                size: 0,
                sha: "tree-src",
            },
            {
                path: "src/app.ts",
                type: "blob",
                size: 21,
                sha: "blob-app",
            },
            {
                path: "src/generated",
                type: "tree",
                size: 0,
                sha: "tree-generated",
            },
            {
                path: "src/generated/keep.ts",
                type: "blob",
                size: 10,
                sha: "blob-keep",
            },
            {
                path: "docs",
                type: "tree",
                size: 0,
                sha: "tree-docs",
            },
            {
                path: "docs/.gitignore",
                type: "blob",
                size: 9,
                sha: "blob-ignore-docs",
            },
            {
                path: "docs/publish.md",
                type: "blob",
                size: 8,
                sha: "blob-docs-publish",
            },
        ])
        expect(getContent.calls).toEqual([
            [
                {
                    owner: "codenautic",
                    repo: "platform",
                    path: ".gitignore",
                    ref: "main",
                },
            ],
            [
                {
                    owner: "codenautic",
                    repo: "platform",
                    path: "docs/.gitignore",
                    ref: "main",
                },
            ],
        ])
    })

    test("loads file content from base64 response and handles empty content", async () => {
        const provider = new GitHubProvider({
            owner: "codenautic",
            repo: "platform",
            client: createGitHubClientMock({
                repos: {
                    getContent: createQueuedAsyncMethod([
                        createDataHandler({
                            type: "file",
                            encoding: "base64",
                            content: Buffer.from("export const value = 1\n").toString("base64"),
                        }),
                        createDataHandler({
                            type: "file",
                            encoding: "base64",
                        }),
                    ]),
                },
            }),
        })

        const content = await provider.getFileContentByRef("src/app.ts", "main")
        const emptyContent = await provider.getFileContentByRef("src/empty.ts", "main")

        expect(content).toBe("export const value = 1\n")
        expect(emptyContent).toBe("")
    })

    test("throws when content endpoint returns directory or non-file node", async () => {
        const provider = new GitHubProvider({
            owner: "codenautic",
            repo: "platform",
            client: createGitHubClientMock({
                repos: {
                    getContent: createQueuedAsyncMethod([
                        createDataHandler([]),
                        createDataHandler({
                            type: "dir",
                        }),
                    ]),
                },
            }),
        })

        const directoryError = await captureRejectedError(() => provider.getFileContentByRef("src", "main"))
        const nonFileError = await captureRejectedError(() => provider.getFileContentByRef("src", "dev"))

        expect(directoryError.message).toContain("GitHub content response points to directory, not file")
        expect(nonFileError.message).toContain("GitHub content response points to non-file node")
    })

    test("lists branches and marks default branch", async () => {
        const provider = new GitHubProvider({
            owner: "codenautic",
            repo: "platform",
            client: createGitHubClientMock({
                repos: {
                    get: createQueuedAsyncMethod([
                        createDataHandler({
                            default_branch: "main",
                        }),
                    ]),
                    listBranches: createQueuedAsyncMethod([
                        createDataHandler([
                            {
                                name: "main",
                                protected: true,
                                commit: {
                                    sha: "main-sha",
                                },
                            },
                            {
                                name: "feature/x",
                                protected: false,
                                commit: {
                                    sha: "feature-sha",
                                },
                            },
                        ]),
                    ]),
                },
            }),
        })

        const branches = await provider.getBranches()

        expect(branches).toEqual([
            {
                name: "main",
                sha: "main-sha",
                isDefault: true,
                isProtected: true,
            },
            {
                name: "feature/x",
                sha: "feature-sha",
                isDefault: false,
                isProtected: false,
            },
        ])
    })

    test("lists commit history with file filters and files changed", async () => {
        const listCommits = createQueuedAsyncMethod([
            createDataHandler([
                {
                    sha: "c1",
                },
                {
                    sha: "c2",
                },
            ]),
        ])
        const getCommit = createQueuedAsyncMethod([
            createDataHandler({
                commit: {
                    message: "Commit one",
                    author: {
                        name: "Alice",
                        email: "alice@example.com",
                        date: "2026-03-08T12:00:00.000Z",
                    },
                },
                files: [
                    {
                        filename: "src/a.ts",
                    },
                ],
            }),
        ])
        const provider = new GitHubProvider({
            owner: "codenautic",
            repo: "platform",
            client: createGitHubClientMock({
                repos: {
                    listCommits,
                    getCommit,
                },
            }),
        })

        const history = await provider.getCommitHistory("main", {
            since: "2026-03-01T00:00:00.000Z",
            until: "2026-03-09T00:00:00.000Z",
            filePath: "src/a.ts",
            maxCount: 1,
        })

        expect(history).toEqual([
            {
                sha: "c1",
                message: "Commit one",
                authorName: "Alice",
                authorEmail: "alice@example.com",
                date: "2026-03-08T12:00:00.000Z",
                filesChanged: ["src/a.ts"],
            },
        ])
        expect(listCommits.calls[0]?.[0]).toMatchObject({
            sha: "main",
            path: "src/a.ts",
            per_page: 1,
        })
    })

    test("validates commit history maxCount before request", async () => {
        const provider = new GitHubProvider({
            owner: "codenautic",
            repo: "platform",
            client: createGitHubClientMock({}),
        })

        const error = await captureRejectedError(() =>
            provider.getCommitHistory("main", {
                maxCount: 0,
            }),
        )

        expect(error.message).toContain("maxCount must be positive integer")
    })

    test("loads blame data through graphql request", async () => {
        const request = createQueuedAsyncMethod([
            createDataHandler({
                repository: {
                    object: {
                        blame: {
                            ranges: [
                                {
                                    startingLine: 1,
                                    endingLine: 3,
                                    commit: {
                                        oid: "abc",
                                        author: {
                                            name: "Alice",
                                            email: "alice@example.com",
                                            date: "2026-03-08T13:00:00.000Z",
                                        },
                                    },
                                },
                            ],
                        },
                    },
                },
            }),
        ])
        const provider = new GitHubProvider({
            owner: "codenautic",
            repo: "platform",
            client: createGitHubClientMock({
                request,
            }),
        })

        const blame = await provider.getBlameData("src/app.ts", "main")

        expect(blame).toEqual([
            {
                lineStart: 1,
                lineEnd: 3,
                commitSha: "abc",
                authorName: "Alice",
                authorEmail: "alice@example.com",
                date: "2026-03-08T13:00:00.000Z",
            },
        ])
        expect(request.calls[0]?.[0]).toBe("POST /graphql")
    })

    test("loads batch blame data in input order", async () => {
        const request = createQueuedAsyncMethod([
            createDataHandler({
                repository: {
                    object: {
                        blame: {
                            ranges: [
                                {
                                    startingLine: 1,
                                    endingLine: 2,
                                    commit: {
                                        oid: "abc",
                                        author: {
                                            name: "Alice",
                                            email: "alice@example.com",
                                            date: "2026-03-08T13:00:00.000Z",
                                        },
                                    },
                                },
                            ],
                        },
                    },
                },
            }),
            createDataHandler({
                repository: {
                    object: {
                        blame: {
                            ranges: [
                                {
                                    startingLine: 8,
                                    endingLine: 9,
                                    commit: {
                                        oid: "def",
                                        author: {
                                            name: "Bob",
                                            email: "bob@example.com",
                                            date: "2026-03-09T09:00:00.000Z",
                                        },
                                    },
                                },
                            ],
                        },
                    },
                },
            }),
        ])
        const provider = new GitHubProvider({
            owner: "codenautic",
            repo: "platform",
            client: createGitHubClientMock({
                request,
            }),
        })

        const blame = await provider.getBlameDataBatch(
            ["src/app.ts", "src/lib.ts"],
            "main",
        )

        expect(blame).toEqual([
            {
                filePath: "src/app.ts",
                blame: [
                    {
                        lineStart: 1,
                        lineEnd: 2,
                        commitSha: "abc",
                        authorName: "Alice",
                        authorEmail: "alice@example.com",
                        date: "2026-03-08T13:00:00.000Z",
                    },
                ],
            },
            {
                filePath: "src/lib.ts",
                blame: [
                    {
                        lineStart: 8,
                        lineEnd: 9,
                        commitSha: "def",
                        authorName: "Bob",
                        authorEmail: "bob@example.com",
                        date: "2026-03-09T09:00:00.000Z",
                    },
                ],
            },
        ])
        const firstPayload = request.calls[0]?.[1]
        const secondPayload = request.calls[1]?.[1]

        expect(isGitHubGraphQlRequestPayload(firstPayload)).toBe(true)
        expect(isGitHubGraphQlRequestPayload(secondPayload)).toBe(true)

        if (
            !isGitHubGraphQlRequestPayload(firstPayload) ||
            !isGitHubGraphQlRequestPayload(secondPayload)
        ) {
            throw new Error("Expected GitHub GraphQL request payload")
        }

        expect(firstPayload.owner).toBe("codenautic")
        expect(firstPayload.repo).toBe("platform")
        expect(firstPayload.expression).toBe("main:src/app.ts")
        expect(firstPayload.query.length).toBeGreaterThan(0)

        expect(secondPayload.owner).toBe("codenautic")
        expect(secondPayload.repo).toBe("platform")
        expect(secondPayload.expression).toBe("main:src/lib.ts")
        expect(secondPayload.query.length).toBeGreaterThan(0)
    })

    test("posts regular and inline comments with normalized payload", async () => {
        const pullsGet = createQueuedAsyncMethod([
            createDataHandler({
                head: {
                    sha: "head-sha",
                },
            }),
        ])
        const provider = new GitHubProvider({
            owner: "codenautic",
            repo: "platform",
            client: createGitHubClientMock({
                issues: {
                    createComment: createQueuedAsyncMethod([
                        createDataHandler({
                            id: 1,
                            body: "Looks good",
                            created_at: "2026-03-08T14:00:00.000Z",
                            user: {
                                login: "review-bot",
                            },
                        }),
                    ]),
                },
                pulls: {
                    get: pullsGet,
                    createReviewComment: createQueuedAsyncMethod([
                        createDataHandler({
                            id: 2,
                            body: "Inline note",
                            created_at: "2026-03-08T14:05:00.000Z",
                            user: {
                                login: "review-bot",
                            },
                            path: "src/app.ts",
                            line: 12,
                            side: null,
                        }),
                    ]),
                },
            }),
        })

        const comment = await provider.postComment("21", " Looks good ")
        const inlineComment = await provider.postInlineComment("21", {
            id: "local",
            body: "Inline note",
            author: "me",
            createdAt: "now",
            filePath: "src/app.ts",
            line: 12,
            side: INLINE_COMMENT_SIDE.RIGHT,
        })

        expect(comment).toEqual({
            id: "1",
            body: "Looks good",
            author: "review-bot",
            createdAt: "2026-03-08T14:00:00.000Z",
        })
        expect(inlineComment).toEqual({
            id: "2",
            body: "Inline note",
            author: "review-bot",
            createdAt: "2026-03-08T14:05:00.000Z",
            filePath: "src/app.ts",
            line: 12,
            side: INLINE_COMMENT_SIDE.RIGHT,
        })
    })

    test("creates and updates check runs", async () => {
        const provider = new GitHubProvider({
            owner: "codenautic",
            repo: "platform",
            client: createGitHubClientMock({
                pulls: {
                    get: createQueuedAsyncMethod([
                        createDataHandler({
                            head: {
                                sha: "head-sha",
                            },
                        }),
                    ]),
                },
                checks: {
                    create: createQueuedAsyncMethod([
                        createDataHandler({
                            id: 301,
                            name: "codex",
                            status: "queued",
                            conclusion: null,
                            output: {
                                summary: "",
                            },
                            details_url: "https://github.example/checks/301",
                        }),
                    ]),
                    update: createQueuedAsyncMethod([
                        createDataHandler({
                            id: 301,
                            name: "codex",
                            status: "completed",
                            conclusion: "success",
                            output: {
                                summary: "done",
                            },
                        }),
                    ]),
                },
            }),
        })

        const created = await provider.createCheckRun("44", "codex")
        const updated = await provider.updateCheckRun(
            "301",
            CHECK_RUN_STATUS.COMPLETED,
            CHECK_RUN_CONCLUSION.SUCCESS,
        )

        expect(created).toEqual({
            id: "301",
            name: "codex",
            status: CHECK_RUN_STATUS.QUEUED,
            conclusion: CHECK_RUN_CONCLUSION.NEUTRAL,
            summary: "",
            detailsUrl: "https://github.example/checks/301",
        })
        expect(updated).toEqual({
            id: "301",
            name: "codex",
            status: CHECK_RUN_STATUS.COMPLETED,
            conclusion: CHECK_RUN_CONCLUSION.SUCCESS,
            summary: "done",
            detailsUrl: undefined,
        })
    })

    test("formats suggestions and verifies webhook signatures", () => {
        const provider = new GitHubProvider({
            owner: "codenautic",
            repo: "platform",
            token: "ghp_test_token",
        })
        const rawBody = JSON.stringify({
            action: "opened",
            pull_request: {
                number: 1,
            },
        })
        const validEvent: IWebhookEventDTO = {
            eventType: "pull_request",
            payload: JSON.parse(rawBody) as unknown,
            signature:
                "sha256=ce85436da403218ed9154f25e277439191d0e8d6256ccb55f5d55c0fbea00ba0",
            platform: "github",
            timestamp: new Date("2026-03-08T15:00:00.000Z"),
        }
        const invalidEvent: IWebhookEventDTO = {
            ...validEvent,
            signature: "sha256=deadbeef",
        }

        expect(provider.formatSuggestion("return value")).toBe(
            "```suggestion\nreturn value\n```",
        )
        expect(provider.verifyWebhookSignature(validEvent, "webhook-secret", rawBody)).toBe(true)
        expect(provider.verifyWebhookSignature(invalidEvent, "webhook-secret", rawBody)).toBe(false)
        expect(provider.verifyWebhookSignature(validEvent, "wrong-secret", rawBody)).toBe(false)
    })

    test("retries only retryable github api errors and exposes normalized provider error", async () => {
        const sleepCalls: number[] = []
        const issuesCreateComment = createQueuedAsyncMethod([
            createErrorHandler(
                createGitHubApiError("rate limited", {
                    status: 429,
                    headers: {
                        "retry-after": "1",
                    },
                }),
            ),
            createDataHandler({
                id: 3,
                body: "Retried",
                created_at: "2026-03-08T16:00:00.000Z",
                user: {
                    login: "review-bot",
                },
            }),
        ])
        const provider = new GitHubProvider({
            owner: "codenautic",
            repo: "platform",
            client: createGitHubClientMock({
                issues: {
                    createComment: issuesCreateComment,
                },
            }),
            sleep(delayMs: number): Promise<void> {
                sleepCalls.push(delayMs)
                return Promise.resolve()
            },
        })

        const result = await provider.postComment("7", "Retried")

        expect(result.id).toBe("3")
        expect(sleepCalls).toEqual([1000])
        expect(issuesCreateComment.calls).toHaveLength(2)
    })

    test("uses default sleep implementation for retryable github rate limits", async () => {
        const issuesCreateComment = createQueuedAsyncMethod([
            createErrorHandler(
                createGitHubApiError("rate limited", {
                    status: 429,
                    headers: {
                        "retry-after": "0",
                    },
                }),
            ),
            createDataHandler({
                id: 4,
                body: "Retried with default sleep",
                created_at: "2026-03-08T16:05:00.000Z",
                user: {
                    login: "review-bot",
                },
            }),
        ])
        const provider = new GitHubProvider({
            owner: "codenautic",
            repo: "platform",
            client: createGitHubClientMock({
                issues: {
                    createComment: issuesCreateComment,
                },
            }),
        })

        const result = await provider.postComment("7", "Retried with default sleep")

        expect(result.id).toBe("4")
        expect(issuesCreateComment.calls).toHaveLength(2)
    })

    test("stops on non-retryable auth errors and retries server errors until exhaustion", async () => {
        const authProvider = new GitHubProvider({
            owner: "codenautic",
            repo: "platform",
            client: createGitHubClientMock({
                issues: {
                    createComment: createQueuedAsyncMethod([
                        createErrorHandler(createGitHubApiError("unauthorized", {statusCode: 401})),
                    ]),
                },
            }),
        })

        const authError = await captureRejectedError(() => authProvider.postComment("7", "Body"))

        expect(authError).toBeInstanceOf(GitHubProviderError)
        expect(authError).toMatchObject({
            name: "GitHubProviderError",
            kind: "AUTH",
            isRetryable: false,
            statusCode: 401,
        })

        const sleepCalls: number[] = []
        const serverProvider = new GitHubProvider({
            owner: "codenautic",
            repo: "platform",
            client: createGitHubClientMock({
                issues: {
                    createComment: createQueuedAsyncMethod([
                        createErrorHandler(createGitHubApiError("server down", {statusCode: 503})),
                        createErrorHandler(createGitHubApiError("server down", {statusCode: 503})),
                    ]),
                },
            }),
            retryMaxAttempts: 2,
            sleep(delayMs: number): Promise<void> {
                sleepCalls.push(delayMs)
                return Promise.resolve()
            },
        })

        const serverError = await captureRejectedError(() => serverProvider.postComment("7", "Body"))

        expect(serverError).toBeInstanceOf(GitHubProviderError)
        if (serverError instanceof GitHubProviderError) {
            expect(serverError.kind).toBe("SERVER_ERROR")
            expect(serverError.isRetryable).toBe(true)
            expect(serverError.statusCode).toBe(503)
        }

        expect(sleepCalls).toEqual([250])
    })

    test("validates constructor and input invariants", async () => {
        expect(() => {
            return new GitHubProvider({
                owner: "codenautic",
                repo: "platform",
            })
        }).toThrow("token cannot be empty")

        expect(() => {
            return new GitHubProvider({
                owner: "codenautic",
                repo: "platform",
                token: "t",
                retryMaxAttempts: 0,
            })
        }).toThrow("retryMaxAttempts must be positive integer")

        const provider = new GitHubProvider({
            owner: "codenautic",
            repo: "platform",
            client: createGitHubClientMock({
                pulls: {
                    get: createQueuedAsyncMethod([
                        createDataHandler({
                            head: {
                                sha: "head-sha",
                            },
                        }),
                    ]),
                },
            }),
        })

        const invalidMergeRequestIdError = await captureRejectedError(() =>
            provider.postComment("x", "body"),
        )
        const invalidLineError = await captureRejectedError(() =>
            provider.postInlineComment("1", {
                id: "1",
                body: "body",
                author: "author",
                createdAt: "now",
                filePath: "file.ts",
                line: 0,
                side: INLINE_COMMENT_SIDE.LEFT,
            } satisfies IInlineCommentDTO),
        )

        expect(invalidMergeRequestIdError.message).toContain("mergeRequestId must be positive integer")
        expect(invalidLineError.message).toContain("line must be positive integer")
        expect(() => provider.formatSuggestion(" ")).toThrow("codeBlock cannot be empty")
        expect(() =>
            provider.verifyWebhookSignature(
                {
                    eventType: "pull_request",
                    payload: {},
                    signature: "",
                    platform: "github",
                    timestamp: new Date(),
                },
                "secret",
            ),
        ).toThrow("signature cannot be empty")
    })
})
