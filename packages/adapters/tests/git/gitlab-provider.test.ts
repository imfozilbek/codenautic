import {describe, expect, test} from "bun:test"

import {
    CHECK_RUN_CONCLUSION,
    CHECK_RUN_STATUS,
    INLINE_COMMENT_SIDE,
} from "@codenautic/core"

import {
    GitLabProvider,
    GitLabProviderError,
    type IGitLabClient,
} from "../../src/git"

const MAX_TEXT_FILE_BYTES = 1024 * 1024

type AsyncMethod<TResult> = (...args: readonly unknown[]) => Promise<TResult>
type IGitLabApiErrorFields = {
    readonly status?: number
    readonly statusCode?: number
    readonly headers?: Readonly<Record<string, string>>
}
type IGitLabClientMockOverrides = {
    readonly getProject?: AsyncMethod<unknown>
    readonly getMergeRequest?: AsyncMethod<unknown>
    readonly getMergeRequestChanges?: AsyncMethod<unknown>
    readonly getMergeRequestCommits?: AsyncMethod<readonly unknown[]>
    readonly getMergeRequestDiffVersions?: AsyncMethod<readonly unknown[]>
    readonly createMergeRequestNote?: AsyncMethod<unknown>
    readonly createMergeRequestDiscussion?: AsyncMethod<unknown>
    readonly listRepositoryTree?: AsyncMethod<readonly unknown[]>
    readonly getRepositoryFile?: AsyncMethod<unknown>
    readonly listBranches?: AsyncMethod<readonly unknown[]>
    readonly listTags?: AsyncMethod<readonly unknown[]>
    readonly listCommits?: AsyncMethod<readonly unknown[]>
    readonly getCommit?: AsyncMethod<unknown>
    readonly getCommitDiff?: AsyncMethod<readonly unknown[]>
    readonly getFileBlame?: AsyncMethod<readonly unknown[]>
    readonly createCommitStatus?: AsyncMethod<unknown>
    readonly compareRefs?: AsyncMethod<unknown>
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
 * Creates async mock backed by one reusable handler.
 *
 * @param handler Call handler.
 * @returns Async function with captured calls.
 */
function createAsyncMethod<TResult>(
    handler: (...args: readonly unknown[]) => TResult | Promise<TResult>,
): AsyncMethod<TResult> & {readonly calls: readonly (readonly unknown[])[]} {
    const calls: (readonly unknown[])[] = []

    const method = ((...args: readonly unknown[]): Promise<TResult> => {
        calls.push(args)

        return Promise.resolve(handler(...args))
    }) as AsyncMethod<TResult> & {readonly calls: readonly (readonly unknown[])[]}

    Object.defineProperty(method, "calls", {
        value: calls,
    })

    return method
}

/**
 * Creates constant handler for queued async methods.
 *
 * @param value Constant resolved value.
 * @returns Handler returning provided value.
 */
function createValueHandler<TResult>(value: TResult): () => TResult {
    return (): TResult => {
        return value
    }
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
 * Creates GitLab-like API error object used in retry tests.
 *
 * @param message Error message.
 * @param fields Additional response fields.
 * @returns Error with GitLab status metadata.
 */
function createGitLabApiError(
    message: string,
    fields: IGitLabApiErrorFields,
): Error & IGitLabApiErrorFields {
    return Object.assign(new Error(message), fields)
}

/**
 * Creates default unexpected method for GitLab client mocks.
 *
 * @returns Method rejecting on unexpected invocation.
 */
function createUnexpectedGitLabMethod<TMethod>(): TMethod {
    return ((..._args: readonly unknown[]): Promise<never> => {
        return Promise.reject(new Error("Unexpected GitLab client call"))
    }) as TMethod
}

/**
 * Resolves mock method override or falls back to unexpected-call handler.
 *
 * @param override Optional override method.
 * @returns Override or default unexpected method.
 */
function resolveGitLabMethod<TMethod>(override: TMethod | undefined): TMethod {
    return override ?? createUnexpectedGitLabMethod<TMethod>()
}

/**
 * Creates GitLab client mock with overridable methods.
 *
 * @param overrides Partial client overrides.
 * @returns GitLab client mock.
 */
function createGitLabClientMock(
    overrides: IGitLabClientMockOverrides,
): IGitLabClient {
    return {
        getProject:
            resolveGitLabMethod(overrides.getProject) as IGitLabClient["getProject"],
        getMergeRequest:
            resolveGitLabMethod(overrides.getMergeRequest) as IGitLabClient["getMergeRequest"],
        getMergeRequestChanges:
            resolveGitLabMethod(
                overrides.getMergeRequestChanges,
            ) as IGitLabClient["getMergeRequestChanges"],
        getMergeRequestCommits:
            resolveGitLabMethod(
                overrides.getMergeRequestCommits,
            ) as IGitLabClient["getMergeRequestCommits"],
        getMergeRequestDiffVersions:
            resolveGitLabMethod(
                overrides.getMergeRequestDiffVersions,
            ) as IGitLabClient["getMergeRequestDiffVersions"],
        createMergeRequestNote:
            resolveGitLabMethod(
                overrides.createMergeRequestNote,
            ) as IGitLabClient["createMergeRequestNote"],
        createMergeRequestDiscussion:
            resolveGitLabMethod(
                overrides.createMergeRequestDiscussion,
            ) as IGitLabClient["createMergeRequestDiscussion"],
        listRepositoryTree:
            resolveGitLabMethod(
                overrides.listRepositoryTree,
            ) as IGitLabClient["listRepositoryTree"],
        getRepositoryFile:
            resolveGitLabMethod(
                overrides.getRepositoryFile,
            ) as IGitLabClient["getRepositoryFile"],
        listBranches:
            resolveGitLabMethod(overrides.listBranches) as IGitLabClient["listBranches"],
        listTags:
            resolveGitLabMethod(overrides.listTags) as IGitLabClient["listTags"],
        listCommits:
            resolveGitLabMethod(overrides.listCommits) as IGitLabClient["listCommits"],
        getCommit:
            resolveGitLabMethod(overrides.getCommit) as IGitLabClient["getCommit"],
        getCommitDiff:
            resolveGitLabMethod(overrides.getCommitDiff) as IGitLabClient["getCommitDiff"],
        getFileBlame:
            resolveGitLabMethod(overrides.getFileBlame) as IGitLabClient["getFileBlame"],
        createCommitStatus:
            resolveGitLabMethod(
                overrides.createCommitStatus,
            ) as IGitLabClient["createCommitStatus"],
        compareRefs:
            resolveGitLabMethod(overrides.compareRefs) as IGitLabClient["compareRefs"],
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

describe("GitLabProvider", () => {
    test("maps merge request payload and changed files", async () => {
        const provider = new GitLabProvider({
            host: "https://gitlab.example.com",
            projectId: "group/project",
            token: "glpat-test",
            client: createGitLabClientMock({
                getMergeRequest: createAsyncMethod(() => {
                    return {
                        id: 18,
                        iid: 7,
                        title: "Refine git provider abstractions",
                        description: "Move external status semantics into dedicated port",
                        source_branch: "feature/gitlab",
                        target_branch: "main",
                        state: "opened",
                        author: {
                            id: 3,
                            username: "alice",
                            name: "Alice",
                        },
                    }
                }),
                getMergeRequestChanges: createAsyncMethod(() => {
                    return {
                        changes: [
                            {
                                old_path: "src/git.ts",
                                new_path: "src/git.ts",
                                new_file: false,
                                renamed_file: false,
                                deleted_file: false,
                                diff: "@@ -1,1 +1,2 @@\n-old\n+new",
                            },
                        ],
                    }
                }),
                getMergeRequestCommits: createAsyncMethod(() => {
                    return [
                        {
                            id: "commit-1",
                            message: "wire gitlab provider",
                            author_name: "Alice",
                            committed_date: "2026-03-14T10:00:00.000Z",
                        },
                    ]
                }),
            }),
        })

        const mergeRequest = await provider.getMergeRequest("7")
        const changedFiles = await provider.getChangedFiles("7")

        expect(mergeRequest.id).toBe("18")
        expect(mergeRequest.number).toBe(7)
        expect(mergeRequest.sourceBranch).toBe("feature/gitlab")
        expect(mergeRequest.author.username).toBe("alice")
        expect(mergeRequest.commits[0]?.id).toBe("commit-1")
        expect(changedFiles).toHaveLength(1)
        expect(changedFiles[0]?.status).toBe("modified")
        expect(changedFiles[0]?.hunks[0]).toContain("@@")
    })

    test("loads file tree and decodes text content", async () => {
        const provider = new GitLabProvider({
            host: "https://gitlab.example.com",
            projectId: 42,
            token: "glpat-test",
            client: createGitLabClientMock({
                listRepositoryTree: createAsyncMethod(() => {
                    return [
                        {
                            id: "tree-1",
                            path: "src",
                            type: "tree",
                        },
                        {
                            id: "blob-1",
                            path: "src/gitlab-provider.ts",
                            type: "blob",
                            size: 128,
                        },
                    ]
                }),
                getRepositoryFile: createAsyncMethod(() => {
                    return {
                        encoding: "base64",
                        size: 11,
                        content: Buffer.from("hello world", "utf8").toString("base64"),
                    }
                }),
            }),
        })

        const tree = await provider.getFileTree("main")
        const content = await provider.getFileContentByRef("src/gitlab-provider.ts", "main")

        expect(tree).toEqual([
            {
                path: "src",
                type: "tree",
                size: 0,
                sha: "tree-1",
            },
            {
                path: "src/gitlab-provider.ts",
                type: "blob",
                size: 128,
                sha: "blob-1",
            },
        ])
        expect(content).toBe("hello world")
    })

    test("rejects binary repository files", async () => {
        const provider = new GitLabProvider({
            host: "https://gitlab.example.com",
            projectId: 42,
            token: "glpat-test",
            client: createGitLabClientMock({
                getRepositoryFile: createAsyncMethod(() => {
                    return {
                        encoding: "base64",
                        size: MAX_TEXT_FILE_BYTES,
                        content: Buffer.from([0, 159, 146, 150]).toString("base64"),
                    }
                }),
            }),
        })

        try {
            await provider.getFileContentByRef("assets/logo.bin", "main")
            throw new Error("Expected binary file loading to fail")
        } catch (error) {
            expect(error).toBeInstanceOf(Error)

            if (error instanceof Error) {
                expect(error.message).toBe("GitLab binary file content is not supported")
            }
        }
    })

    test("posts regular notes and inline discussion threads", async () => {
        const createDiscussion = createAsyncMethod((input: unknown) => {
            return {
                notes: [
                    {
                        id: 401,
                        body: "Please handle null explicitly",
                        created_at: "2026-03-14T11:00:00.000Z",
                        author: {
                            username: "review-bot",
                        },
                        position: (input as {readonly position: unknown}).position,
                    },
                ],
            }
        })
        const provider = new GitLabProvider({
            host: "https://gitlab.example.com",
            projectId: 42,
            token: "glpat-test",
            client: createGitLabClientMock({
                createMergeRequestNote: createAsyncMethod(() => {
                    return {
                        id: 301,
                        body: "Top-level comment",
                        created_at: "2026-03-14T10:55:00.000Z",
                        author: {
                            username: "review-bot",
                        },
                    }
                }),
                getMergeRequest: createAsyncMethod(() => {
                    return {
                        diff_refs: {
                            base_sha: "base-sha",
                            start_sha: "start-sha",
                            head_sha: "head-sha",
                        },
                    }
                }),
                createMergeRequestDiscussion: createDiscussion,
            }),
        })

        const comment = await provider.postComment("9", "Top-level comment")
        const inlineComment = await provider.postInlineComment("9", {
            id: "inline-1",
            body: "Please handle null explicitly",
            author: "review-bot",
            createdAt: "2026-03-14T11:00:00.000Z",
            filePath: "src/app.ts",
            line: 14,
            side: INLINE_COMMENT_SIDE.RIGHT,
        })

        expect(comment).toEqual({
            id: "301",
            body: "Top-level comment",
            author: "review-bot",
            createdAt: "2026-03-14T10:55:00.000Z",
        })
        expect(inlineComment.filePath).toBe("src/app.ts")
        expect(inlineComment.line).toBe(14)
        expect(inlineComment.side).toBe("RIGHT")
        expect(createDiscussion.calls[0]?.[0]).toEqual({
            mergeRequestIid: 9,
            body: "Please handle null explicitly",
            position: {
                position_type: "text",
                base_sha: "base-sha",
                start_sha: "start-sha",
                head_sha: "head-sha",
                new_path: "src/app.ts",
                new_line: 14,
            },
        })
    })

    test("creates review via sequential fallback note then inline discussions", async () => {
        const createDiscussion = createQueuedAsyncMethod([
            createValueHandler({
                notes: [
                    {
                        id: 701,
                        body: "Inline one",
                        created_at: "2026-03-14T11:10:00.000Z",
                        author: {
                            username: "review-bot",
                        },
                        position: {
                            new_path: "src/app.ts",
                            new_line: 15,
                        },
                    },
                ],
            }),
            createValueHandler({
                notes: [
                    {
                        id: 702,
                        body: "Inline two",
                        created_at: "2026-03-14T11:11:00.000Z",
                        author: {
                            username: "review-bot",
                        },
                        position: {
                            old_path: "src/legacy.ts",
                            old_line: 8,
                            new_path: "src/legacy.ts",
                            new_line: 8,
                        },
                    },
                ],
            }),
        ])
        const provider = new GitLabProvider({
            host: "https://gitlab.example.com",
            projectId: 42,
            token: "glpat-test",
            client: createGitLabClientMock({
                createMergeRequestNote: createAsyncMethod((mergeRequestIid: unknown, body: unknown) => {
                    return {
                        id: 700,
                        body,
                        created_at: "2026-03-14T11:09:00.000Z",
                        author: {
                            username: "review-bot",
                        },
                        mergeRequestIid,
                    }
                }),
                getMergeRequest: createAsyncMethod(() => {
                    return {
                        diff_refs: {
                            base_sha: "base-sha",
                            start_sha: "start-sha",
                            head_sha: "head-sha",
                        },
                    }
                }),
                createMergeRequestDiscussion: createDiscussion,
            }),
        })

        const created = await provider.createReview("9", {
            body: " Batch body ",
            comments: [
                {
                    id: "inline-1",
                    body: "Inline one",
                    author: "review-bot",
                    createdAt: "2026-03-14T11:10:00.000Z",
                    filePath: "src/app.ts",
                    line: 15,
                    side: INLINE_COMMENT_SIDE.RIGHT,
                },
                {
                    id: "inline-2",
                    body: "Inline two",
                    author: "review-bot",
                    createdAt: "2026-03-14T11:11:00.000Z",
                    filePath: "src/legacy.ts",
                    line: 8,
                    side: INLINE_COMMENT_SIDE.LEFT,
                },
            ],
        })

        expect(created).toEqual([
            {
                id: "700",
                body: "Batch body",
                author: "review-bot",
                createdAt: "2026-03-14T11:09:00.000Z",
            },
            {
                id: "701",
                body: "Inline one",
                author: "review-bot",
                createdAt: "2026-03-14T11:10:00.000Z",
            },
            {
                id: "702",
                body: "Inline two",
                author: "review-bot",
                createdAt: "2026-03-14T11:11:00.000Z",
            },
        ])
        expect(createDiscussion.calls).toHaveLength(2)
    })

    test("guards createReview sequential fallback when merge request context drifts", async () => {
        const providerRef: {current?: GitLabProvider} = {}
        const createDiscussion = createQueuedAsyncMethod([
            createValueHandler({
                notes: [
                    {
                        id: 801,
                        body: "Inline one",
                        created_at: "2026-03-14T11:20:00.000Z",
                        author: {
                            username: "review-bot",
                        },
                        position: {
                            new_path: "src/app.ts",
                            new_line: 12,
                        },
                    },
                ],
            }),
            createValueHandler({
                notes: [
                    {
                        id: 802,
                        body: "Inline two",
                        created_at: "2026-03-14T11:21:00.000Z",
                        author: {
                            username: "review-bot",
                        },
                        position: {
                            new_path: "src/app.ts",
                            new_line: 13,
                        },
                    },
                ],
            }),
        ])
        const guardedDiscussion = createAsyncMethod((input: unknown) => {
            const callIndex = createDiscussion.calls.length
            const result = createDiscussion(input)

            if (callIndex === 0 && providerRef.current !== undefined) {
                ;(providerRef.current as unknown as {lastMergeRequestIid?: number}).lastMergeRequestIid = 999
            }

            return result
        })
        const provider = new GitLabProvider({
            host: "https://gitlab.example.com",
            projectId: 42,
            token: "glpat-test",
            client: createGitLabClientMock({
                createMergeRequestNote: createAsyncMethod(() => {
                    return {
                        id: 800,
                        body: "Batch body",
                        created_at: "2026-03-14T11:19:00.000Z",
                        author: {
                            username: "review-bot",
                        },
                    }
                }),
                getMergeRequest: createAsyncMethod(() => {
                    return {
                        diff_refs: {
                            base_sha: "base-sha",
                            start_sha: "start-sha",
                            head_sha: "head-sha",
                        },
                    }
                }),
                createMergeRequestDiscussion: guardedDiscussion,
            }),
        })
        providerRef.current = provider

        const guardError = await captureRejectedError(() => {
            return provider.createReview("9", {
                body: "Batch body",
                comments: [
                    {
                        id: "inline-1",
                        body: "Inline one",
                        author: "review-bot",
                        createdAt: "2026-03-14T11:20:00.000Z",
                        filePath: "src/app.ts",
                        line: 12,
                        side: INLINE_COMMENT_SIDE.RIGHT,
                    },
                    {
                        id: "inline-2",
                        body: "Inline two",
                        author: "review-bot",
                        createdAt: "2026-03-14T11:21:00.000Z",
                        filePath: "src/app.ts",
                        line: 13,
                        side: INLINE_COMMENT_SIDE.RIGHT,
                    },
                ],
            })
        })

        expect(guardError.message).toContain("lastMergeRequestIid guard failed")
    })

    test("creates and updates pipeline statuses and supports legacy check wrappers", async () => {
        const createCommitStatus = createQueuedAsyncMethod([
            createValueHandler({
                id: 501,
                name: "CodeNautic Review",
                status: "pending",
                description: "queued",
            }),
            createValueHandler({
                id: 502,
                name: "CodeNautic Review",
                status: "success",
                description: "Looks good",
            }),
            createValueHandler({
                id: 503,
                name: "Legacy Review",
                status: "pending",
            }),
            createValueHandler({
                id: 504,
                name: "Legacy Review",
                status: "failed",
            }),
        ])
        const provider = new GitLabProvider({
            host: "https://gitlab.example.com",
            projectId: 42,
            token: "glpat-test",
            webhookToken: "shared-secret",
            client: createGitLabClientMock({
                createCommitStatus,
                getMergeRequest: createAsyncMethod(() => {
                    return {
                        sha: "head-sha",
                    }
                }),
            }),
        })

        const created = await provider.createPipelineStatus({
            mergeRequestId: "12",
            name: "CodeNautic Review",
        })
        const updated = await provider.updatePipelineStatus({
            pipelineId: created.id,
            mergeRequestId: "12",
            name: "CodeNautic Review",
            status: CHECK_RUN_STATUS.COMPLETED,
            conclusion: CHECK_RUN_CONCLUSION.SUCCESS,
            summary: "Looks good",
        })
        const legacyCreated = await provider.createCheckRun("13", "Legacy Review")
        const legacyUpdated = await provider.updateCheckRun(
            legacyCreated.id,
            CHECK_RUN_STATUS.COMPLETED,
            CHECK_RUN_CONCLUSION.FAILURE,
        )

        expect(created.status).toBe("queued")
        expect(created.conclusion).toBe("neutral")
        expect(updated.status).toBe("completed")
        expect(updated.conclusion).toBe("success")
        expect(legacyUpdated.conclusion).toBe("failure")
        expect(provider.verifyWebhookToken("shared-secret")).toBe(true)
        expect(provider.verifyWebhookToken("other-secret")).toBe(false)
        expect(createCommitStatus.calls[1]?.[0]).toEqual({
            sha: "head-sha",
            state: "success",
            name: "CodeNautic Review",
            description: "Looks good",
        })
        expect(createCommitStatus.calls[3]?.[0]).toEqual({
            sha: "head-sha",
            state: "failed",
            name: "Legacy Review",
            description: undefined,
        })
    })

    test("retries rate-limited status creation and honors retry-after header", async () => {
        const sleepCalls: number[] = []
        const createCommitStatus = createQueuedAsyncMethod([
            createErrorHandler(
                createGitLabApiError("Too Many Requests", {
                    statusCode: 429,
                    headers: {
                        "retry-after": "2",
                    },
                }),
            ),
            createValueHandler({
                id: 601,
                name: "CodeNautic Review",
                status: "pending",
            }),
        ])
        const provider = new GitLabProvider({
            host: "https://gitlab.example.com",
            projectId: 42,
            token: "glpat-test",
            retryMaxAttempts: 2,
            sleep(delayMs: number): Promise<void> {
                sleepCalls.push(delayMs)
                return Promise.resolve()
            },
            client: createGitLabClientMock({
                createCommitStatus,
                getMergeRequest: createAsyncMethod(() => {
                    return {
                        sha: "head-sha",
                    }
                }),
            }),
        })

        const created = await provider.createPipelineStatus({
            mergeRequestId: "22",
            name: "CodeNautic Review",
        })

        expect(created.id).toBe("601")
        expect(sleepCalls).toEqual([2000])
        expect(createCommitStatus.calls).toHaveLength(2)
    })

    test("throws typed provider error on not found without retry", async () => {
        const createCommitStatus = createAsyncMethod(() => {
            throw createGitLabApiError("Missing merge request", {
                status: 404,
            })
        })
        const provider = new GitLabProvider({
            host: "https://gitlab.example.com",
            projectId: 42,
            token: "glpat-test",
            client: createGitLabClientMock({
                createCommitStatus,
                getMergeRequest: createAsyncMethod(() => {
                    return {
                        sha: "head-sha",
                    }
                }),
            }),
        })

        try {
            await provider.createPipelineStatus({
                mergeRequestId: "99",
                name: "CodeNautic Review",
            })
        } catch (error) {
            expect(error).toBeInstanceOf(GitLabProviderError)

            if (error instanceof GitLabProviderError) {
                expect(error.kind).toBe("NOT_FOUND")
                expect(error.statusCode).toBe(404)
                expect(error.isRetryable).toBe(false)
            }
        }

        expect(createCommitStatus.calls).toHaveLength(1)
    })
})
