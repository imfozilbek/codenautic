import {describe, expect, test} from "bun:test"

import {createTwoFilesPatch} from "diff"
import {
    CHECK_RUN_CONCLUSION,
    CHECK_RUN_STATUS,
    GIT_REF_COMPARISON_STATUS,
    INLINE_COMMENT_SIDE,
} from "@codenautic/core"

import {
    BITBUCKET_PROVIDER_ERROR_CODE,
    BitbucketProvider,
    BitbucketProviderError,
    type IBitbucketApiResponse,
    type IBitbucketClient,
} from "../../src/git"

type IBitbucketApiErrorFields = {
    readonly status?: number
    readonly statusCode?: number
    readonly headers?: Readonly<Record<string, string>>
}

type IRequestParameters = Readonly<Record<string, unknown>> | undefined

type IRequestHandler = (
    route: string,
    parameters?: IRequestParameters,
) => unknown

/**
 * Creates one reusable async request method with captured calls.
 *
 * @param handler Request handler.
 * @returns Async request method with captured calls.
 */
function createAsyncRequestMethod(
    handler: IRequestHandler,
): {
    readonly calls: readonly (readonly [string, IRequestParameters])[]
    <T>(
        route: string,
        parameters?: IRequestParameters,
    ): Promise<IBitbucketApiResponse<T>>
} {
    const calls: (readonly [string, IRequestParameters])[] = []

    const request = (async <T>(
        route: string,
        parameters?: IRequestParameters,
    ): Promise<IBitbucketApiResponse<T>> => {
        calls.push([route, parameters])

        const result = await Promise.resolve(handler(route, parameters))
        return createBitbucketResponse(result as T)
    }) as {
        readonly calls: readonly (readonly [string, IRequestParameters])[]
        <T>(
            route: string,
            parameters?: IRequestParameters,
        ): Promise<IBitbucketApiResponse<T>>
    }

    Object.defineProperty(request, "calls", {
        value: calls,
    })

    return request
}

/**
 * Creates queued async request method with one handler per call.
 *
 * @param handlers Queued request handlers.
 * @returns Async request method with captured calls.
 */
function createQueuedAsyncRequestMethod(
    handlers: readonly IRequestHandler[],
): {
    readonly calls: readonly (readonly [string, IRequestParameters])[]
    <T>(
        route: string,
        parameters?: IRequestParameters,
    ): Promise<IBitbucketApiResponse<T>>
} {
    const calls: (readonly [string, IRequestParameters])[] = []
    let callIndex = 0

    const request = (async <T>(
        route: string,
        parameters?: IRequestParameters,
    ): Promise<IBitbucketApiResponse<T>> => {
        calls.push([route, parameters])

        const handler = handlers[callIndex]
        callIndex += 1

        if (handler === undefined) {
            throw new Error("Unexpected Bitbucket client call")
        }

        const result = await Promise.resolve(handler(route, parameters))
        return createBitbucketResponse(result as T)
    }) as {
        readonly calls: readonly (readonly [string, IRequestParameters])[]
        <T>(
            route: string,
            parameters?: IRequestParameters,
        ): Promise<IBitbucketApiResponse<T>>
    }

    Object.defineProperty(request, "calls", {
        value: calls,
    })

    return request
}

/**
 * Creates Bitbucket client mock.
 *
 * @param request Mock request implementation.
 * @returns Bitbucket client mock.
 */
function createBitbucketClientMock(
    request: ReturnType<typeof createAsyncRequestMethod> | ReturnType<typeof createQueuedAsyncRequestMethod>,
): IBitbucketClient {
    return {
        request,
    }
}

/**
 * Creates generic Bitbucket SDK-like response payload.
 *
 * @param data Raw response data.
 * @returns Wrapped response payload.
 */
function createBitbucketResponse<T>(data: T): IBitbucketApiResponse<T> {
    return {
        data,
        headers: {},
        status: 200,
        url: "https://api.bitbucket.org/2.0/mock",
    }
}

/**
 * Creates Bitbucket-like API error used by retry tests.
 *
 * @param message Error message.
 * @param fields Error metadata fields.
 * @returns Error with status metadata.
 */
function createBitbucketApiError(
    message: string,
    fields: IBitbucketApiErrorFields,
): Error & IBitbucketApiErrorFields {
    return Object.assign(new Error(message), fields)
}

/**
 * Creates provider configured for tests.
 *
 * @param client Mock Bitbucket client.
 * @returns Bitbucket provider instance.
 */
function createProvider(client: IBitbucketClient): BitbucketProvider {
    return new BitbucketProvider({
        workspace: "codenautic",
        repoSlug: "platform",
        token: "bb-token",
        client,
    })
}

/**
 * Creates paginated pull request commits response.
 *
 * @param parameters Request parameters.
 * @returns Pull request commits payload.
 */
function createPullRequestCommitPage(parameters: IRequestParameters): unknown {
    if (parameters?.["page"] === 1) {
        return {
            values: [
                {
                    hash: "commit-1",
                    message: "First commit",
                    date: "2026-03-14T10:00:00.000Z",
                    author: {raw: "Alice <alice@example.com>"},
                },
            ],
            next: "page-2",
        }
    }

    return {
        values: [
            {
                hash: "commit-2",
                message: "Second commit",
                date: "2026-03-14T11:00:00.000Z",
                author: {raw: "Alice <alice@example.com>"},
            },
        ],
    }
}

/**
 * Creates paginated pull request diffstat response.
 *
 * @param parameters Request parameters.
 * @returns Pull request diffstat payload.
 */
function createPullRequestDiffstatPage(parameters: IRequestParameters): unknown {
    if (parameters?.["page"] === 1) {
        return {
            values: [
                {
                    status: "modified",
                    old: {path: "src/git.ts"},
                    new: {path: "src/git.ts"},
                    lines_added: 1,
                    lines_removed: 1,
                },
            ],
            next: "page-2",
        }
    }

    return {
        values: [
            {
                status: "renamed",
                old: {path: "src/legacy.ts"},
                new: {path: "src/modern.ts"},
                lines_added: 1,
                lines_removed: 1,
            },
        ],
    }
}

/**
 * Creates route response for pull request mapping test.
 *
 * @param route Bitbucket route.
 * @param parameters Request parameters.
 * @param patch Unified diff patch.
 * @returns Route response payload.
 */
function createPullRequestRouteResponse(
    route: string,
    parameters: IRequestParameters,
    patch: string,
): unknown {
    if (route.includes("/pullrequests/{pull_request_id}") && !route.includes("/commits") &&
        !route.includes("/diffstat") && !route.includes("/patch")) {
        return {
            id: 7,
            title: "Bitbucket provider",
            description: "Implement adapter",
            state: "OPEN",
            source: {
                branch: {name: "feature/bitbucket"},
                commit: {hash: "head-sha"},
            },
            destination: {
                branch: {name: "main"},
                commit: {hash: "base-sha"},
            },
            author: {
                account_id: "user-1",
                nickname: "alice",
                display_name: "Alice",
            },
        }
    }

    if (route.includes("/pullrequests/{pull_request_id}/commits")) {
        return createPullRequestCommitPage(parameters)
    }

    if (route.includes("/pullrequests/{pull_request_id}/diffstat")) {
        return createPullRequestDiffstatPage(parameters)
    }

    if (route.includes("/pullrequests/{pull_request_id}/patch")) {
        return patch
    }

    throw new Error(`Unexpected route: ${route}`)
}

/**
 * Creates route response for tree/content test.
 *
 * @param route Bitbucket route.
 * @param parameters Request parameters.
 * @returns Route response payload.
 */
function createTreeAndContentRouteResponse(route: string, parameters: IRequestParameters): unknown {
    const routeKey = createTreeAndContentRouteKey(route, parameters)

    if (routeKey === "root:meta") {
        return {
            values: [
                {
                    path: "src",
                    type: "commit_directory",
                    size: 0,
                    commit: {hash: "tree-sha"},
                },
                {
                    path: "README.md",
                    type: "commit_file",
                    size: 12,
                    commit: {hash: "readme-sha"},
                },
            ],
        }
    }

    if (routeKey === "child:meta:src") {
        return {
            values: [
                {
                    path: "src/index.ts",
                    type: "commit_file",
                    size: 24,
                    commit: {hash: "file-sha"},
                },
            ],
        }
    }

    if (routeKey === "child:undefined:src/index.ts") {
        return "export const value = 1\n"
    }

    throw new Error(`Unexpected route: ${route}`)
}

/**
 * Builds deterministic route key for tree/content test.
 *
 * @param route Bitbucket route.
 * @param parameters Request parameters.
 * @returns Deterministic key for route matching.
 */
function createTreeAndContentRouteKey(route: string, parameters: IRequestParameters): string {
    const format = String(parameters?.["format"])
    const path = String(parameters?.["path"])

    if (route.endsWith("/src/{commit}")) {
        return `root:${format}`
    }

    if (route.endsWith("/src/{commit}/{path}")) {
        return `child:${format}:${path}`
    }

    return "unknown"
}

/**
 * Asserts standardized unsupported blame error shape.
 *
 * @param error Unknown thrown error.
 */
function assertUnsupportedBlameError(error: unknown): void {
    expect(error).toBeInstanceOf(BitbucketProviderError)
    expect(error).toMatchObject({
        code: BITBUCKET_PROVIDER_ERROR_CODE.UNSUPPORTED_OPERATION,
        capability: "line-blame",
    })
}

describe("BitbucketProvider", () => {
    test("maps pull request payload and paginated changed files", async () => {
        const patch = [
            createTwoFilesPatch("src/git.ts", "src/git.ts", "old", "new", "", ""),
            createTwoFilesPatch("src/legacy.ts", "src/modern.ts", "legacy", "modern", "", ""),
        ].join("\n")
        const request = createAsyncRequestMethod((route, parameters) => {
            return createPullRequestRouteResponse(route, parameters, patch)
        })
        const provider = createProvider(createBitbucketClientMock(request))

        const mergeRequest = await provider.getMergeRequest("7")

        expect(mergeRequest.number).toBe(7)
        expect(mergeRequest.title).toBe("Bitbucket provider")
        expect(mergeRequest.author.username).toBe("alice")
        expect(mergeRequest.commits).toHaveLength(2)
        expect(mergeRequest.diffFiles).toHaveLength(2)
        expect(mergeRequest.diffFiles[0]?.path).toBe("src/git.ts")
        expect(mergeRequest.diffFiles[1]?.oldPath).toBe("src/legacy.ts")
        expect(mergeRequest.diffFiles[1]?.path).toBe("src/modern.ts")
    })

    test("lists recursive file tree and loads text content", async () => {
        const request = createAsyncRequestMethod((route, parameters) => {
            return createTreeAndContentRouteResponse(route, parameters)
        })
        const provider = createProvider(createBitbucketClientMock(request))

        const tree = await provider.getFileTree("main")
        const content = await provider.getFileContentByRef("src/index.ts", "main")

        expect(tree).toEqual([
            {
                path: "README.md",
                type: "blob",
                size: 12,
                sha: "readme-sha",
            },
            {
                path: "src",
                type: "tree",
                size: 0,
                sha: "tree-sha",
            },
            {
                path: "src/index.ts",
                type: "blob",
                size: 24,
                sha: "file-sha",
            },
        ])
        expect(content).toBe("export const value = 1\n")
    })

    test("posts regular and inline comments", async () => {
        const request = createQueuedAsyncRequestMethod([
            (route, parameters) => {
                expect(route).toContain("/pullrequests/{pull_request_id}/comments")
                expect(parameters?._body).toEqual({
                    content: {
                        raw: "Looks good",
                    },
                })

                return {
                    id: 101,
                    content: {raw: "Looks good"},
                    user: {display_name: "CodeNautic"},
                    created_on: "2026-03-14T12:00:00.000Z",
                }
            },
            (route, parameters) => {
                expect(route).toContain("/pullrequests/{pull_request_id}/comments")
                expect(parameters?._body).toEqual({
                    content: {
                        raw: "Please rename this",
                    },
                    inline: {
                        path: "src/git.ts",
                        to: 8,
                    },
                })

                return {
                    id: 102,
                    content: {raw: "Please rename this"},
                    user: {display_name: "CodeNautic"},
                    created_on: "2026-03-14T12:05:00.000Z",
                    inline: {
                        path: "src/git.ts",
                        to: 8,
                    },
                }
            },
        ])
        const provider = createProvider(createBitbucketClientMock(request))

        const comment = await provider.postComment("9", "Looks good")
        const inlineComment = await provider.postInlineComment("9", {
            id: "local",
            body: "Please rename this",
            author: "agent",
            createdAt: "2026-03-14T12:05:00.000Z",
            filePath: "src/git.ts",
            line: 8,
            side: INLINE_COMMENT_SIDE.RIGHT,
        })

        expect(comment.id).toBe("101")
        expect(inlineComment.id).toBe("102")
        expect(inlineComment.filePath).toBe("src/git.ts")
        expect(inlineComment.line).toBe(8)
        expect(inlineComment.side).toBe(INLINE_COMMENT_SIDE.RIGHT)
    })

    test("creates review via sequential fallback using top-level and inline comments", async () => {
        const request = createQueuedAsyncRequestMethod([
            (route, parameters) => {
                expect(route).toContain("/pullrequests/{pull_request_id}/comments")
                expect(parameters?._body).toEqual({
                    content: {
                        raw: "Batch body",
                    },
                })

                return {
                    id: 201,
                    content: {raw: "Batch body"},
                    user: {display_name: "CodeNautic"},
                    created_on: "2026-03-14T12:09:00.000Z",
                }
            },
            (route, parameters) => {
                expect(route).toContain("/pullrequests/{pull_request_id}/comments")
                expect(parameters?._body).toEqual({
                    content: {
                        raw: "Inline one",
                    },
                    inline: {
                        path: "src/git.ts",
                        to: 8,
                    },
                })

                return {
                    id: 202,
                    content: {raw: "Inline one"},
                    user: {display_name: "CodeNautic"},
                    created_on: "2026-03-14T12:10:00.000Z",
                    inline: {
                        path: "src/git.ts",
                        to: 8,
                    },
                }
            },
            (route, parameters) => {
                expect(route).toContain("/pullrequests/{pull_request_id}/comments")
                expect(parameters?._body).toEqual({
                    content: {
                        raw: "Inline two",
                    },
                    inline: {
                        path: "src/git.ts",
                        from: 5,
                    },
                })

                return {
                    id: 203,
                    content: {raw: "Inline two"},
                    user: {display_name: "CodeNautic"},
                    created_on: "2026-03-14T12:11:00.000Z",
                    inline: {
                        path: "src/git.ts",
                        from: 5,
                    },
                }
            },
        ])
        const provider = createProvider(createBitbucketClientMock(request))

        const created = await provider.createReview("9", {
            body: " Batch body ",
            comments: [
                {
                    id: "inline-1",
                    body: "Inline one",
                    author: "CodeNautic",
                    createdAt: "2026-03-14T12:10:00.000Z",
                    filePath: "src/git.ts",
                    line: 8,
                    side: INLINE_COMMENT_SIDE.RIGHT,
                },
                {
                    id: "inline-2",
                    body: "Inline two",
                    author: "CodeNautic",
                    createdAt: "2026-03-14T12:11:00.000Z",
                    filePath: "src/git.ts",
                    line: 5,
                    side: INLINE_COMMENT_SIDE.LEFT,
                },
            ],
        })

        expect(created).toEqual([
            {
                id: "201",
                body: "Batch body",
                author: "CodeNautic",
                createdAt: "2026-03-14T12:09:00.000Z",
            },
            {
                id: "202",
                body: "Inline one",
                author: "CodeNautic",
                createdAt: "2026-03-14T12:10:00.000Z",
            },
            {
                id: "203",
                body: "Inline two",
                author: "CodeNautic",
                createdAt: "2026-03-14T12:11:00.000Z",
            },
        ])
        expect(request.calls).toHaveLength(3)
    })

    test("deletes pull request comment", async () => {
        const request = createQueuedAsyncRequestMethod([
            (route, parameters) => {
                expect(route).toContain("/pullrequests/{pull_request_id}/comments/{comment_id}")
                expect(parameters?.["pull_request_id"]).toBe(9)
                expect(parameters?.["comment_id"]).toBe(101)

                return {}
            },
        ])
        const provider = createProvider(createBitbucketClientMock(request))

        await provider.deleteComment("9", " 101 ")

        expect(request.calls).toHaveLength(1)
    })

    test("creates build statuses with retry and updates legacy check runs", async () => {
        const rateLimitError = createBitbucketApiError("Too many requests", {
            status: 429,
            headers: {
                "retry-after": "0",
            },
        })
        const request = createQueuedAsyncRequestMethod([
            (route) => {
                expect(route).toContain("/pullrequests/{pull_request_id}")
                return {
                    id: 9,
                    source: {
                        commit: {hash: "head-sha"},
                    },
                }
            },
            (route) => {
                expect(route).toContain("/commit/{commit}/statuses/build")
                throw rateLimitError
            },
            (_route, parameters) => {
                expect(parameters?._body).toEqual({
                    key: "codenautic-review-gate",
                    name: "Review Gate",
                    state: "INPROGRESS",
                    description: "queued",
                })

                return {
                    key: "codenautic-review-gate",
                    name: "Review Gate",
                    state: "INPROGRESS",
                    description: "queued",
                    url: "https://bitbucket.example.com/status/1",
                }
            },
            (_route, parameters) => {
                expect(parameters?.["key"]).toBe("codenautic-review-gate")
                expect(parameters?._body).toEqual({
                    key: "codenautic-review-gate",
                    name: "Review Gate",
                    state: "SUCCESSFUL",
                    description: undefined,
                })

                return {
                    key: "codenautic-review-gate",
                    name: "Review Gate",
                    state: "SUCCESSFUL",
                    description: "done",
                    url: "https://bitbucket.example.com/status/1",
                }
            },
        ])
        const provider = createProvider(createBitbucketClientMock(request))

        const check = await provider.createCheckRun("9", "Review Gate")
        const updated = await provider.updateCheckRun(
            check.id,
            CHECK_RUN_STATUS.COMPLETED,
            CHECK_RUN_CONCLUSION.SUCCESS,
        )

        expect(check.id).toBe("codenautic-review-gate")
        expect(check.status).toBe(CHECK_RUN_STATUS.IN_PROGRESS)
        expect(updated.conclusion).toBe(CHECK_RUN_CONCLUSION.SUCCESS)
    })

    test("paginates commit history with metadata and path filters", async () => {
        const request = createAsyncRequestMethod((route, parameters) => {
            if (route.endsWith("/commits/{revision}")) {
                if (parameters?.["page"] === 1) {
                    return {
                        values: [
                            {
                                hash: "commit-1",
                                message: "Touch src",
                                date: "2026-03-14T10:00:00.000Z",
                                author: {raw: "Alice <alice@example.com>"},
                            },
                            {
                                hash: "commit-2",
                                message: "Other author",
                                date: "2026-03-14T11:00:00.000Z",
                                author: {raw: "Bob <bob@example.com>"},
                            },
                        ],
                        next: "page-2",
                    }
                }

                return {
                    values: [
                        {
                            hash: "commit-3",
                            message: "Touch docs",
                            date: "2026-03-14T12:00:00.000Z",
                            author: {raw: "Alice <alice@example.com>"},
                        },
                    ],
                }
            }

            if (route.endsWith("/diffstat/{spec}") && parameters?.["spec"] === "commit-1") {
                return {
                    values: [
                        {
                            status: "modified",
                            old: {path: "src/app.ts"},
                            new: {path: "src/app.ts"},
                            lines_added: 2,
                            lines_removed: 1,
                        },
                    ],
                }
            }

            if (route.endsWith("/diffstat/{spec}") && parameters?.["spec"] === "commit-3") {
                return {
                    values: [
                        {
                            status: "modified",
                            old: {path: "docs/readme.md"},
                            new: {path: "docs/readme.md"},
                            lines_added: 1,
                            lines_removed: 0,
                        },
                    ],
                }
            }

            throw new Error(`Unexpected route: ${route}`)
        })
        const provider = createProvider(createBitbucketClientMock(request))

        const history = await provider.getCommitHistory("main", {
            author: "alice",
            since: "2026-03-14T00:00:00.000Z",
            until: "2026-03-14T23:59:59.000Z",
            path: "src",
        })

        expect(history).toHaveLength(1)
        expect(history[0]?.sha).toBe("commit-1")
        expect(history[0]?.filesChanged).toEqual(["src/app.ts"])
    })

    test("lists branches and tags and compares refs", async () => {
        const patch = createTwoFilesPatch("src/git.ts", "src/git.ts", "old", "new", "", "")
        const request = createQueuedAsyncRequestMethod([
            (route) => {
                expect(route).toContain("/repositories/{workspace}/{repo_slug}")
                return {
                    mainbranch: {
                        name: "main",
                    },
                }
            },
            (route) => {
                expect(route).toContain("/refs/branches")
                return {
                    values: [
                        {
                            name: "main",
                            target: {
                                hash: "branch-sha",
                                date: "2026-03-14T09:00:00.000Z",
                            },
                        },
                    ],
                }
            },
            (route) => {
                expect(route).toContain("/refs/tags")
                return {
                    values: [
                        {
                            name: "v1.0.0",
                            target: {
                                hash: "tag-commit-sha",
                                date: "2026-03-13T09:00:00.000Z",
                            },
                        },
                    ],
                }
            },
            (route, parameters) => {
                expect(route).toContain("/commit/{commit}")
                expect(parameters?.["commit"]).toBe("tag-commit-sha")
                return {
                    hash: "tag-commit-sha",
                    message: "Release commit",
                    date: "2026-03-13T09:00:00.000Z",
                }
            },
            (route, parameters) => {
                expect(route).toContain("/diffstat/{spec}")
                expect(parameters?.["spec"]).toBe("main..feature")
                return {
                    values: [
                        {
                            status: "modified",
                            old: {path: "src/git.ts"},
                            new: {path: "src/git.ts"},
                            lines_added: 1,
                            lines_removed: 1,
                        },
                    ],
                }
            },
            (route, parameters) => {
                expect(route).toContain("/patch/{spec}")
                expect(parameters?.["spec"]).toBe("main..feature")
                return patch
            },
            (route, parameters) => {
                expect(route).toContain("/commits/{revision}")
                expect(parameters?.["revision"]).toBe("feature")
                expect(parameters?.["exclude"]).toBe("main")
                return {
                    values: [
                        {hash: "ahead-1"},
                        {hash: "ahead-2"},
                    ],
                }
            },
            (route, parameters) => {
                expect(route).toContain("/commits/{revision}")
                expect(parameters?.["revision"]).toBe("main")
                expect(parameters?.["exclude"]).toBe("feature")
                return {
                    values: [],
                }
            },
        ])
        const provider = createProvider(createBitbucketClientMock(request))

        const branches = await provider.getBranches()
        const tags = await provider.getTags()
        const diff = await provider.getDiffBetweenRefs("main", "feature")

        expect(branches[0]?.isDefault).toBe(true)
        expect(tags[0]?.name).toBe("v1.0.0")
        expect(tags[0]?.commit.sha).toBe("tag-commit-sha")
        expect(diff.comparisonStatus).toBe(GIT_REF_COMPARISON_STATUS.AHEAD)
        expect(diff.summary.changedFiles).toBe(1)
        expect(diff.files[0]?.path).toBe("src/git.ts")
    })

    test("aggregates contributor stats and temporal coupling", async () => {
        const request = createAsyncRequestMethod((route, parameters) => {
            if (route.endsWith("/commits/{revision}")) {
                return {
                    values: [
                        {
                            hash: "commit-1",
                            message: "First",
                            date: "2026-03-14T10:00:00.000Z",
                            author: {raw: "Alice <alice@example.com>"},
                        },
                        {
                            hash: "commit-2",
                            message: "Second",
                            date: "2026-03-14T11:00:00.000Z",
                            author: {raw: "Alice <alice@example.com>"},
                        },
                    ],
                }
            }

            if (route.endsWith("/diffstat/{spec}") && parameters?.["spec"] === "commit-1") {
                return {
                    values: [
                        {
                            status: "modified",
                            old: {path: "src/a.ts"},
                            new: {path: "src/a.ts"},
                            lines_added: 2,
                            lines_removed: 1,
                        },
                        {
                            status: "modified",
                            old: {path: "src/b.ts"},
                            new: {path: "src/b.ts"},
                            lines_added: 1,
                            lines_removed: 0,
                        },
                    ],
                }
            }

            if (route.endsWith("/diffstat/{spec}") && parameters?.["spec"] === "commit-2") {
                return {
                    values: [
                        {
                            status: "modified",
                            old: {path: "src/a.ts"},
                            new: {path: "src/a.ts"},
                            lines_added: 1,
                            lines_removed: 1,
                        },
                        {
                            status: "modified",
                            old: {path: "src/c.ts"},
                            new: {path: "src/c.ts"},
                            lines_added: 4,
                            lines_removed: 0,
                        },
                    ],
                }
            }

            throw new Error(`Unexpected route: ${route}`)
        })
        const provider = createProvider(createBitbucketClientMock(request))

        const contributorStats = await provider.getContributorStats("main")
        const temporalCoupling = await provider.getTemporalCoupling("main", {
            filePaths: ["src/a.ts"],
        })

        expect(contributorStats).toHaveLength(1)
        expect(contributorStats[0]?.commitCount).toBe(2)
        expect(contributorStats[0]?.files[0]?.filePath).toBe("src/a.ts")
        expect(contributorStats[0]?.files[0]?.commitCount).toBe(2)
        expect(temporalCoupling).toHaveLength(2)
        expect(temporalCoupling[0]?.sourcePath).toBe("src/a.ts")
        expect(temporalCoupling[0]?.strength).toBe(0.5)
    })

    test("throws typed unsupported error for blame operations", async () => {
        const provider = createProvider(
            createBitbucketClientMock(
                createAsyncRequestMethod(() => {
                    throw new Error("Bitbucket request should not be called")
                }),
            ),
        )

        try {
            await provider.getBlameData("src/git.ts", "main")
            throw new Error("Expected unsupported blame error")
        } catch (error) {
            assertUnsupportedBlameError(error)
        }

        try {
            await provider.getBlameDataBatch(["src/git.ts"], "main")
            throw new Error("Expected unsupported blame error")
        } catch (error) {
            assertUnsupportedBlameError(error)
        }
    })

    test("wraps terminal ACL failures into typed provider errors", async () => {
        const request = createAsyncRequestMethod(() => {
            throw createBitbucketApiError("Forbidden", {
                status: 403,
            })
        })
        const provider = createProvider(createBitbucketClientMock(request))

        try {
            await provider.getBranches()
        } catch (error) {
            expect(error).toBeInstanceOf(BitbucketProviderError)

            if (error instanceof BitbucketProviderError) {
                expect(error.code).toBe(BITBUCKET_PROVIDER_ERROR_CODE.API_REQUEST_FAILED)
                expect(error.operation).toBe("getRepository")
                expect(error.isRetryable).toBe(false)
                return
            }
        }

        throw new Error("Expected BitbucketProviderError to be thrown")
    })
})
