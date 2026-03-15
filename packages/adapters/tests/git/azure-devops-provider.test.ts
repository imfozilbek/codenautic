import {describe, expect, test} from "bun:test"

import {
    CHECK_RUN_CONCLUSION,
    CHECK_RUN_STATUS,
    INLINE_COMMENT_SIDE,
} from "@codenautic/core"

import {
    AzureDevOpsProvider,
    AzureDevOpsProviderError,
    AZURE_DEVOPS_PROVIDER_ERROR_CODE,
    type IAzureDevOpsGitClient,
} from "../../src/git"

type AsyncMethod<TResult> = (...args: readonly unknown[]) => Promise<TResult>

type IAzureDevOpsApiErrorFields = {
    readonly status?: number
    readonly statusCode?: number
    readonly headers?: Readonly<Record<string, string>>
}

type IAzureDevOpsClientMockOverrides = {
    readonly getRepository?: AsyncMethod<unknown>
    readonly getPullRequest?: AsyncMethod<unknown>
    readonly getPullRequestCommits?: AsyncMethod<readonly unknown[]>
    readonly getPullRequestIterations?: AsyncMethod<readonly unknown[]>
    readonly getPullRequestIterationChanges?: AsyncMethod<unknown>
    readonly createThread?: AsyncMethod<unknown>
    readonly createPullRequestStatus?: AsyncMethod<unknown>
    readonly getItems?: AsyncMethod<readonly unknown[]>
    readonly getItem?: AsyncMethod<unknown>
    readonly getBranches?: AsyncMethod<readonly unknown[]>
    readonly getCommitsBatch?: AsyncMethod<readonly unknown[]>
    readonly getCommit?: AsyncMethod<unknown>
    readonly getCommitChanges?: AsyncMethod<unknown>
    readonly getRefs?: AsyncMethod<unknown>
    readonly getAnnotatedTag?: AsyncMethod<unknown>
    readonly getCommitDiffs?: AsyncMethod<unknown>
}

type IPagedListLike<T> = T[] & {
    continuationToken?: string
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
 * Creates constant paged list payload with optional continuation token.
 *
 * @param values Page values.
 * @param continuationToken Optional continuation token.
 * @returns Paged list payload.
 */
function createPagedList<T>(
    values: readonly T[],
    continuationToken?: string,
): IPagedListLike<T> {
    const page = [...values] as IPagedListLike<T>

    if (continuationToken !== undefined) {
        page.continuationToken = continuationToken
    }

    return page
}

/**
 * Creates Azure DevOps style API error with retry metadata.
 *
 * @param message Error message.
 * @param fields Additional response fields.
 * @returns Error payload.
 */
function createAzureDevOpsApiError(
    message: string,
    fields: IAzureDevOpsApiErrorFields,
): Error & IAzureDevOpsApiErrorFields {
    return Object.assign(new Error(message), fields)
}

/**
 * Creates default unexpected method for Azure DevOps client mocks.
 *
 * @returns Method rejecting on unexpected invocation.
 */
function createUnexpectedAzureMethod<TMethod>(): TMethod {
    return ((..._args: readonly unknown[]): Promise<never> => {
        return Promise.reject(new Error("Unexpected Azure DevOps client call"))
    }) as TMethod
}

/**
 * Resolves mock method override or falls back to unexpected-call handler.
 *
 * @param override Optional override method.
 * @returns Override or default unexpected method.
 */
function resolveAzureMethod<TMethod>(override: TMethod | undefined): TMethod {
    return override ?? createUnexpectedAzureMethod<TMethod>()
}

/**
 * Creates Azure DevOps git client mock with overridable methods.
 *
 * @param overrides Partial client overrides.
 * @returns Azure DevOps git client mock.
 */
function createAzureDevOpsClientMock(
    overrides: IAzureDevOpsClientMockOverrides,
): IAzureDevOpsGitClient {
    return {
        getRepository:
            resolveAzureMethod(overrides.getRepository) as IAzureDevOpsGitClient["getRepository"],
        getPullRequest:
            resolveAzureMethod(
                overrides.getPullRequest,
            ) as IAzureDevOpsGitClient["getPullRequest"],
        getPullRequestCommits:
            resolveAzureMethod(
                overrides.getPullRequestCommits,
            ) as IAzureDevOpsGitClient["getPullRequestCommits"],
        getPullRequestIterations:
            resolveAzureMethod(
                overrides.getPullRequestIterations,
            ) as IAzureDevOpsGitClient["getPullRequestIterations"],
        getPullRequestIterationChanges:
            resolveAzureMethod(
                overrides.getPullRequestIterationChanges,
            ) as IAzureDevOpsGitClient["getPullRequestIterationChanges"],
        createThread:
            resolveAzureMethod(overrides.createThread) as IAzureDevOpsGitClient["createThread"],
        createPullRequestStatus:
            resolveAzureMethod(
                overrides.createPullRequestStatus,
            ) as IAzureDevOpsGitClient["createPullRequestStatus"],
        getItems: resolveAzureMethod(overrides.getItems) as IAzureDevOpsGitClient["getItems"],
        getItem: resolveAzureMethod(overrides.getItem) as IAzureDevOpsGitClient["getItem"],
        getBranches:
            resolveAzureMethod(overrides.getBranches) as IAzureDevOpsGitClient["getBranches"],
        getCommitsBatch:
            resolveAzureMethod(
                overrides.getCommitsBatch,
            ) as IAzureDevOpsGitClient["getCommitsBatch"],
        getCommit:
            resolveAzureMethod(overrides.getCommit) as IAzureDevOpsGitClient["getCommit"],
        getCommitChanges:
            resolveAzureMethod(
                overrides.getCommitChanges,
            ) as IAzureDevOpsGitClient["getCommitChanges"],
        getRefs: resolveAzureMethod(overrides.getRefs) as IAzureDevOpsGitClient["getRefs"],
        getAnnotatedTag:
            resolveAzureMethod(
                overrides.getAnnotatedTag,
            ) as IAzureDevOpsGitClient["getAnnotatedTag"],
        getCommitDiffs:
            resolveAzureMethod(
                overrides.getCommitDiffs,
            ) as IAzureDevOpsGitClient["getCommitDiffs"],
    }
}

/**
 * Creates Azure thread response echoing submitted comment content.
 *
 * @param input Raw create-thread payload.
 * @returns Minimal Azure thread response.
 */
function createAzureThreadResponse(input: unknown): Readonly<Record<string, unknown>> {
    const record = input as {
        readonly comments?: ReadonlyArray<{
            readonly content?: string
        }>
    }

    return {
        id: 91,
        publishedDate: "2026-03-14T11:00:00.000Z",
        comments: [
            {
                id: 1,
                content: record.comments?.[0]?.content,
                author: {
                    displayName: "CodeNautic",
                },
                publishedDate: "2026-03-14T11:00:00.000Z",
            },
        ],
    }
}

/**
 * Creates provider configured for inline thread comment tests.
 *
 * @param createThread Thread creation mock.
 * @returns Azure DevOps provider instance.
 */
function createInlineCommentTestProvider(
    createThread: ReturnType<typeof createAsyncMethod<unknown>>,
): AzureDevOpsProvider {
    return new AzureDevOpsProvider({
        organizationUrl: "https://dev.azure.com/codenautic",
        project: "platform",
        repositoryId: "repo-1",
        token: "pat-token",
        client: createAzureDevOpsClientMock({
            createThread,
            getPullRequest: createAsyncMethod(() => {
                return {
                    sourceRefName: "refs/heads/feature/azure-provider",
                    targetRefName: "refs/heads/main",
                }
            }),
            getPullRequestIterations: createAsyncMethod(() => {
                return [
                    {id: 3},
                ]
            }),
            getPullRequestIterationChanges: createAsyncMethod(() => {
                return {
                    changeEntries: [
                        {
                            changeTrackingId: 77,
                            changeType: 2,
                            item: {
                                path: "/src/azure-provider.ts",
                                gitObjectType: 3,
                            },
                            originalPath: "/src/azure-provider.ts",
                        },
                    ],
                    nextSkip: 0,
                    nextTop: 0,
                }
            }),
        }),
    })
}

/**
 * Asserts that promise rejects with Azure provider error shape.
 *
 * @param promise Promise expected to reject.
 * @param operation Expected operation label.
 * @returns Assertion promise.
 */
async function expectUnsupportedAzureOperation(
    promise: Promise<unknown>,
    operation: string,
): Promise<void> {
    try {
        await promise
    } catch (error) {
        expect(error).toBeInstanceOf(AzureDevOpsProviderError)

        if (error instanceof AzureDevOpsProviderError) {
            expect(error.code).toBe(AZURE_DEVOPS_PROVIDER_ERROR_CODE.UNSUPPORTED_OPERATION)
            expect(error.operation).toBe(operation)
            return
        }
    }

    throw new Error("Expected AzureDevOpsProviderError to be thrown")
}

describe("AzureDevOpsProvider", () => {
    test("maps pull request payload and paginated changed files", async () => {
        const getPullRequestIterationChanges = createAsyncMethod((input: unknown) => {
            const record = input as {
                readonly iterationId: number
                readonly skip?: number
            }

            expect(record.iterationId).toBe(2)

            if ((record.skip ?? 0) === 0) {
                return {
                    changeEntries: [
                        {
                            changeTrackingId: 41,
                            changeType: 2,
                            item: {
                                path: "/src/azure-provider.ts",
                                gitObjectType: 3,
                            },
                            originalPath: "/src/azure-provider.ts",
                        },
                    ],
                    nextSkip: 1,
                    nextTop: 100,
                }
            }

            return {
                changeEntries: [
                    {
                        changeTrackingId: 42,
                        changeType: 1,
                        item: {
                            path: "/src/new-file.ts",
                            gitObjectType: 3,
                        },
                    },
                ],
                nextSkip: 0,
                nextTop: 0,
            }
        })

        const getItem = createAsyncMethod((input: unknown) => {
            const record = input as {
                readonly path: string
                readonly versionDescriptor: {
                    readonly version: string
                }
            }

            if (
                record.path === "/src/azure-provider.ts" &&
                record.versionDescriptor.version === "base-sha"
            ) {
                return {
                    path: record.path,
                    content: "export const oldValue = 1\n",
                    contentMetadata: {
                        isBinary: false,
                    },
                }
            }

            if (
                record.path === "/src/azure-provider.ts" &&
                record.versionDescriptor.version === "head-sha"
            ) {
                return {
                    path: record.path,
                    content: "export const oldValue = 1\nexport const newValue = 2\n",
                    contentMetadata: {
                        isBinary: false,
                    },
                }
            }

            if (
                record.path === "/src/new-file.ts" &&
                record.versionDescriptor.version === "head-sha"
            ) {
                return {
                    path: record.path,
                    content: "export const added = true\n",
                    contentMetadata: {
                        isBinary: false,
                    },
                }
            }

            return {
                path: record.path,
                contentMetadata: {
                    isBinary: false,
                },
            }
        })

        const provider = new AzureDevOpsProvider({
            organizationUrl: "https://dev.azure.com/codenautic",
            project: "platform",
            repositoryId: "repo-1",
            token: "pat-token",
            client: createAzureDevOpsClientMock({
                getRepository: createAsyncMethod(() => {
                    return {
                        defaultBranch: "refs/heads/main",
                    }
                }),
                getPullRequest: createAsyncMethod(() => {
                    return {
                        pullRequestId: 7,
                        title: "Add Azure DevOps provider",
                        description: "Wire Azure review adapter",
                        sourceRefName: "refs/heads/feature/azure-provider",
                        targetRefName: "refs/heads/main",
                        status: 1,
                        createdBy: {
                            id: "user-1",
                            displayName: "Alice",
                            uniqueName: "alice@example.com",
                        },
                        lastMergeSourceCommit: {
                            commitId: "head-sha",
                        },
                        lastMergeTargetCommit: {
                            commitId: "base-sha",
                        },
                    }
                }),
                getPullRequestCommits: createAsyncMethod(() => {
                    return createPagedList([
                        {
                            commitId: "head-sha",
                            comment: "wire azure provider",
                            author: {
                                name: "Alice",
                                email: "alice@example.com",
                                date: "2026-03-14T10:00:00.000Z",
                            },
                        },
                    ])
                }),
                getPullRequestIterations: createAsyncMethod(() => {
                    return [
                        {id: 1},
                        {id: 2},
                    ]
                }),
                getPullRequestIterationChanges,
                getItem,
            }),
        })

        const mergeRequest = await provider.getMergeRequest("7")
        const diffFiles = await provider.getChangedFiles("7")

        expect(mergeRequest.title).toBe("Add Azure DevOps provider")
        expect(mergeRequest.sourceBranch).toBe("feature/azure-provider")
        expect(mergeRequest.targetBranch).toBe("main")
        expect(mergeRequest.author.username).toBe("alice@example.com")
        expect(mergeRequest.author.displayName).toBe("Alice")
        expect(mergeRequest.commits).toHaveLength(1)
        expect(mergeRequest.diffFiles).toHaveLength(2)
        expect(diffFiles).toHaveLength(2)
        expect(diffFiles[0]?.path).toBe("src/azure-provider.ts")
        expect(diffFiles[0]?.status).toBe("modified")
        expect(diffFiles[0]?.patch).toContain("+export const newValue = 2")
        expect(diffFiles[1]?.path).toBe("src/new-file.ts")
        expect(diffFiles[1]?.status).toBe("added")
        expect(diffFiles[1]?.patch).toContain("+export const added = true")
        expect(getPullRequestIterationChanges.calls).toHaveLength(4)
    })

    test("posts regular comments as standalone threads", async () => {
        const createThread = createAsyncMethod((input: unknown) => {
            return createAzureThreadResponse(input)
        })
        const provider = createInlineCommentTestProvider(createThread)
        const regularComment = await provider.postComment("7", "Looks good overall")
        const regularPayload = createThread.calls[0]?.[0] as {
            readonly threadContext?: unknown
            readonly comments?: ReadonlyArray<{
                readonly content?: string
            }>
        }

        expect(regularComment.body).toBe("Looks good overall")
        expect(regularPayload.comments?.[0]?.content).toBe("Looks good overall")
        expect(regularPayload.threadContext).toBeUndefined()
    })

    test("posts inline thread comments with tracked change context", async () => {
        const createThread = createAsyncMethod((input: unknown) => {
            return createAzureThreadResponse(input)
        })
        const provider = createInlineCommentTestProvider(createThread)
        const inlineComment = await provider.postInlineComment("7", {
            id: "inline-1",
            body: "Please rename this helper",
            author: "CodeNautic",
            createdAt: "2026-03-14T11:00:00.000Z",
            filePath: "src/azure-provider.ts",
            line: 14,
            side: INLINE_COMMENT_SIDE.RIGHT,
        })
        const inlinePayload = createThread.calls[0]?.[0] as {
            readonly threadContext?: {
                readonly filePath?: string
                readonly rightFileStart?: {
                    readonly line?: number
                }
            }
            readonly pullRequestThreadContext?: {
                readonly changeTrackingId?: number
                readonly iterationContext?: {
                    readonly secondComparingIteration?: number
                }
            }
        }

        expect(inlineComment.filePath).toBe("src/azure-provider.ts")
        expect(inlineComment.line).toBe(14)
        expect(inlineComment.side).toBe(INLINE_COMMENT_SIDE.RIGHT)
        expect(inlinePayload.threadContext?.filePath).toBe("/src/azure-provider.ts")
        expect(inlinePayload.threadContext?.rightFileStart?.line).toBe(14)
        expect(inlinePayload.pullRequestThreadContext?.changeTrackingId).toBe(77)
        expect(
            inlinePayload.pullRequestThreadContext?.iterationContext?.secondComparingIteration,
        ).toBe(3)
    })

    test("creates review via sequential fallback using top-level and inline threads", async () => {
        let createThreadCallIndex = 0
        const createThread = createAsyncMethod((input: unknown) => {
            createThreadCallIndex += 1
            const callIndex = createThreadCallIndex
            const minute = 8 + createThreadCallIndex
            const payload = input as {
                readonly comments?: ReadonlyArray<{
                    readonly content?: string
                }>
            }

            return {
                id: 700 + callIndex,
                comments: [
                    {
                        id: 700 + callIndex,
                        content: payload.comments?.[0]?.content,
                        author: {
                            displayName: "CodeNautic",
                        },
                        publishedDate: `2026-03-14T11:${String(minute).padStart(2, "0")}:00.000Z`,
                    },
                ],
            }
        })
        const provider = createInlineCommentTestProvider(createThread)

        const created = await provider.createReview("7", {
            body: " Batch body ",
            comments: [
                {
                    id: "inline-1",
                    body: "Inline one",
                    author: "CodeNautic",
                    createdAt: "2026-03-14T11:10:00.000Z",
                    filePath: "src/azure-provider.ts",
                    line: 14,
                    side: INLINE_COMMENT_SIDE.RIGHT,
                },
                {
                    id: "inline-2",
                    body: "Inline two",
                    author: "CodeNautic",
                    createdAt: "2026-03-14T11:11:00.000Z",
                    filePath: "src/azure-provider.ts",
                    line: 15,
                    side: INLINE_COMMENT_SIDE.LEFT,
                },
            ],
        })
        const bodyPayload = createThread.calls[0]?.[0] as {
            readonly threadContext?: unknown
        }
        const firstInlinePayload = createThread.calls[1]?.[0] as {
            readonly threadContext?: {
                readonly filePath?: string
            }
        }
        const secondInlinePayload = createThread.calls[2]?.[0] as {
            readonly threadContext?: {
                readonly filePath?: string
            }
        }

        expect(created).toEqual([
            {
                id: "701",
                body: "Batch body",
                author: "CodeNautic",
                createdAt: "2026-03-14T11:09:00.000Z",
            },
            {
                id: "702",
                body: "Inline one",
                author: "CodeNautic",
                createdAt: "2026-03-14T11:10:00.000Z",
            },
            {
                id: "703",
                body: "Inline two",
                author: "CodeNautic",
                createdAt: "2026-03-14T11:11:00.000Z",
            },
        ])
        expect(bodyPayload.threadContext).toBeUndefined()
        expect(firstInlinePayload.threadContext?.filePath).toBe("/src/azure-provider.ts")
        expect(secondInlinePayload.threadContext?.filePath).toBe("/src/azure-provider.ts")
        expect(createThread.calls).toHaveLength(3)
    })

    test("creates pull request statuses with retry and updates legacy check runs", async () => {
        const sleepCalls: number[] = []
        const createPullRequestStatus = createAsyncMethod((_input: unknown) => {
            const callIndex = createPullRequestStatus.calls.length

            if (callIndex === 1) {
                throw createAzureDevOpsApiError("rate limited", {
                    statusCode: 429,
                    headers: {
                        "retry-after": "1",
                    },
                })
            }

            if (callIndex === 2) {
                return {
                    id: 501,
                    context: {
                        name: "Code Review",
                    },
                    state: 1,
                    description: "queued",
                }
            }

            return {
                id: 502,
                context: {
                    name: "Code Review",
                },
                state: 2,
                description: "completed successfully",
            }
        })

        const provider = new AzureDevOpsProvider({
            organizationUrl: "https://dev.azure.com/codenautic",
            project: "platform",
            repositoryId: "repo-1",
            token: "pat-token",
            client: createAzureDevOpsClientMock({
                createPullRequestStatus,
            }),
            sleep(delayMs: number): Promise<void> {
                sleepCalls.push(delayMs)
                return Promise.resolve()
            },
        })

        const created = await provider.createCheckRun("7", "Code Review")
        const updated = await provider.updateCheckRun(
            created.id,
            CHECK_RUN_STATUS.COMPLETED,
            CHECK_RUN_CONCLUSION.SUCCESS,
        )

        expect(created.id).toBe("501")
        expect(created.status).toBe(CHECK_RUN_STATUS.QUEUED)
        expect(created.conclusion).toBe(CHECK_RUN_CONCLUSION.NEUTRAL)
        expect(updated.id).toBe("502")
        expect(updated.status).toBe(CHECK_RUN_STATUS.COMPLETED)
        expect(updated.conclusion).toBe(CHECK_RUN_CONCLUSION.SUCCESS)
        expect(sleepCalls).toEqual([1000])
        expect(createPullRequestStatus.calls).toHaveLength(3)
    })

    test("paginates commit history with filters", async () => {
        const getCommitsBatch = createAsyncMethod((input: unknown) => {
            const record = input as {
                readonly searchCriteria?: {
                    readonly $skip?: number
                }
            }
            const skip = record.searchCriteria?.$skip ?? 0

            if (skip === 0) {
                return [
                    {
                        commitId: "commit-1",
                        comment: "first",
                    },
                    {
                        commitId: "commit-2",
                        comment: "second",
                    },
                ]
            }

            return [
                {
                    commitId: "commit-3",
                    comment: "third",
                },
            ]
        })

        const provider = new AzureDevOpsProvider({
            organizationUrl: "https://dev.azure.com/codenautic",
            project: "platform",
            repositoryId: "repo-1",
            token: "pat-token",
            client: createAzureDevOpsClientMock({
                getRefs: createAsyncMethod((input: unknown) => {
                    const record = input as {
                        readonly filter?: string
                    }

                    if (record.filter === "heads/main") {
                        return createPagedList([
                            {
                                name: "refs/heads/main",
                                objectId: "commit-3",
                            },
                        ])
                    }

                    return createPagedList([])
                }),
                getCommitsBatch,
                getCommit: createAsyncMethod((commitId: unknown) => {
                    return {
                        commitId,
                        comment: `${String(commitId)} body`,
                        author: {
                            name: "Alice",
                            email: "alice@example.com",
                            date: "2026-03-14T10:00:00.000Z",
                        },
                    }
                }),
                getCommitChanges: createAsyncMethod(() => {
                    return {
                        changes: [
                            {
                                item: {
                                    path: "/src/provider.ts",
                                    gitObjectType: 3,
                                },
                            },
                        ],
                    }
                }),
            }),
        })

        const history = await provider.getCommitHistory("main", {
            author: "Alice",
            path: "src/provider.ts",
            maxCount: 3,
        })

        const firstCall = getCommitsBatch.calls[0]?.[0] as {
            readonly searchCriteria?: {
                readonly author?: string
                readonly itemPath?: string
                readonly $skip?: number
            }
            readonly versionDescriptor?: {
                readonly version?: string
            }
        }

        expect(history).toHaveLength(3)
        expect(history[0]?.sha).toBe("commit-1")
        expect(history[2]?.sha).toBe("commit-3")
        expect(firstCall.searchCriteria?.author).toBe("Alice")
        expect(firstCall.searchCriteria?.itemPath).toBe("/src/provider.ts")
        expect(firstCall.versionDescriptor?.version).toBe("main")
        expect(getCommitsBatch.calls).toHaveLength(2)
    })

    test("throws typed unsupported error for blame operations", async () => {
        const provider = new AzureDevOpsProvider({
            organizationUrl: "https://dev.azure.com/codenautic",
            project: "platform",
            repositoryId: "repo-1",
            token: "pat-token",
            client: createAzureDevOpsClientMock({}),
        })

        const singleBlame = provider.getBlameData("src/provider.ts", "main")
        const batchBlame = provider.getBlameDataBatch(["src/provider.ts"], "main")

        await expectUnsupportedAzureOperation(singleBlame, "getBlameData")
        await expectUnsupportedAzureOperation(batchBlame, "getBlameDataBatch")
    })

    test("wraps terminal ACL failures into typed provider errors", async () => {
        const provider = new AzureDevOpsProvider({
            organizationUrl: "https://dev.azure.com/codenautic",
            project: "platform",
            repositoryId: "repo-1",
            token: "pat-token",
            client: createAzureDevOpsClientMock({
                getPullRequest: createAsyncMethod(() => {
                    throw createAzureDevOpsApiError("forbidden", {
                        statusCode: 403,
                    })
                }),
            }),
        })

        try {
            await provider.getMergeRequest("7")
        } catch (error) {
            expect(error).toBeInstanceOf(AzureDevOpsProviderError)

            if (error instanceof AzureDevOpsProviderError) {
                expect(error.code).toBe(AZURE_DEVOPS_PROVIDER_ERROR_CODE.API_REQUEST_FAILED)
                expect(error.operation).toBe("getPullRequest")
                expect(error.statusCode).toBe(403)
                expect(error.isRetryable).toBe(false)
                return
            }
        }

        throw new Error("Expected AzureDevOpsProviderError to be thrown")
    })
})
