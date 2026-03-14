import { http, HttpResponse } from "msw"
import { screen, waitFor } from "@testing-library/react"
import type { ReactElement } from "react"
import { describe, expect, it } from "vitest"

import { useCcrWorkspace, type IUseCcrWorkspaceResult } from "@/lib/hooks/queries/use-ccr-workspace"
import type {
    ICcrWorkspaceContextResponse,
    ICcrWorkspaceListResponse,
    ICcrWorkspaceRow,
} from "@/lib/api/endpoints/ccr-workspace.endpoint"
import { renderWithProviders } from "../../../utils/render"
import { server } from "../../../mocks/server"

const MOCK_CCR_ROW: ICcrWorkspaceRow = {
    id: "ccr-1",
    title: "Fix auth middleware",
    repository: "codenautic/core",
    assignee: "neo",
    status: "in_progress",
    comments: 3,
    updatedAt: "2026-03-10T08:00:00.000Z",
    team: "platform",
    severity: "high",
    attachedFiles: ["src/auth.ts", "src/middleware.ts"],
}

const MOCK_LIST_RESPONSE: ICcrWorkspaceListResponse = {
    ccrs: [MOCK_CCR_ROW],
}

const MOCK_CONTEXT_RESPONSE: ICcrWorkspaceContextResponse = {
    reviewId: "review-101",
    ccr: MOCK_CCR_ROW,
    diffFiles: [
        {
            filePath: "src/auth.ts",
            language: "typescript",
            lines: [
                {
                    leftLine: 10,
                    rightLine: 10,
                    leftText: "const token = null",
                    rightText: "const token = getToken()",
                    type: "added",
                },
            ],
        },
    ],
    threads: [
        {
            id: "thread-1",
            author: "morpheus",
            message: "Needs null check here.",
            createdAt: "2026-03-10T09:00:00.000Z",
            isResolved: false,
            replies: [],
        },
    ],
}

/**
 * Probe-компонент для тестирования useCcrWorkspace хука.
 */
function CcrWorkspaceProbe(props: {
    readonly reviewId?: string
    readonly enabled?: boolean
}): ReactElement {
    const hook = useCcrWorkspace({
        reviewId: props.reviewId,
        enabled: props.enabled,
    })

    return (
        <div>
            <CcrWorkspaceState {...hook} />
        </div>
    )
}

/**
 * Отображает состояние query-результатов workspace хука.
 */
function CcrWorkspaceState(hook: IUseCcrWorkspaceResult): ReactElement {
    if (hook.ccrListQuery.isPending) {
        return <p data-testid="workspace-state">pending</p>
    }

    if (hook.ccrListQuery.error !== null) {
        return <p data-testid="workspace-state">error</p>
    }

    const ccrs = hook.ccrListQuery.data?.ccrs ?? []
    const contextReviewId = hook.ccrContextQuery.data?.reviewId ?? "none"
    const contextThreadsCount = hook.ccrContextQuery.data?.threads.length ?? 0
    const contextDiffFilesCount = hook.ccrContextQuery.data?.diffFiles.length ?? 0

    return (
        <div>
            <p data-testid="workspace-state">loaded</p>
            <p data-testid="ccr-count">{ccrs.length}</p>
            <p data-testid="ccr-first-title">{ccrs[0]?.title ?? "empty"}</p>
            <p data-testid="ccr-first-status">{ccrs[0]?.status ?? "none"}</p>
            <p data-testid="context-review-id">{contextReviewId}</p>
            <p data-testid="context-threads">{contextThreadsCount}</p>
            <p data-testid="context-diff-files">{contextDiffFilesCount}</p>
            <p data-testid="context-pending">{String(hook.ccrContextQuery.isPending)}</p>
        </div>
    )
}

describe("useCcrWorkspace", (): void => {
    it("загружает список CCR для workspace", async (): Promise<void> => {
        server.use(
            http.get("http://localhost:7120/api/v1/reviews/workspace", () => {
                return HttpResponse.json(MOCK_LIST_RESPONSE)
            }),
        )

        renderWithProviders(<CcrWorkspaceProbe />)
        expect(screen.getByTestId("workspace-state").textContent).toBe("pending")

        await waitFor((): void => {
            expect(screen.getByTestId("workspace-state")).toHaveTextContent("loaded")
        })
        expect(screen.getByTestId("ccr-count")).toHaveTextContent("1")
        expect(screen.getByTestId("ccr-first-title")).toHaveTextContent("Fix auth middleware")
        expect(screen.getByTestId("ccr-first-status")).toHaveTextContent("in_progress")
    })

    it("загружает context для конкретного review", async (): Promise<void> => {
        server.use(
            http.get("http://localhost:7120/api/v1/reviews/workspace", () => {
                return HttpResponse.json(MOCK_LIST_RESPONSE)
            }),
            http.get("http://localhost:7120/api/v1/reviews/review-101/workspace", () => {
                return HttpResponse.json(MOCK_CONTEXT_RESPONSE)
            }),
        )

        renderWithProviders(<CcrWorkspaceProbe reviewId="review-101" />)

        await waitFor((): void => {
            expect(screen.getByTestId("workspace-state")).toHaveTextContent("loaded")
        })
        await waitFor((): void => {
            expect(screen.getByTestId("context-review-id")).toHaveTextContent("review-101")
        })
        expect(screen.getByTestId("context-threads")).toHaveTextContent("1")
        expect(screen.getByTestId("context-diff-files")).toHaveTextContent("1")
    })

    it("не загружает context query без reviewId", async (): Promise<void> => {
        let contextRequestCount = 0
        server.use(
            http.get("http://localhost:7120/api/v1/reviews/workspace", () => {
                return HttpResponse.json(MOCK_LIST_RESPONSE)
            }),
            http.get("http://localhost:7120/api/v1/reviews/:reviewId/workspace", () => {
                contextRequestCount += 1
                return HttpResponse.json(MOCK_CONTEXT_RESPONSE)
            }),
        )

        renderWithProviders(<CcrWorkspaceProbe />)

        await waitFor((): void => {
            expect(screen.getByTestId("workspace-state")).toHaveTextContent("loaded")
        })
        expect(screen.getByTestId("context-review-id")).toHaveTextContent("none")
        expect(contextRequestCount).toBe(0)
    })

    it("не загружает данные когда enabled=false", async (): Promise<void> => {
        let listRequestCount = 0
        server.use(
            http.get("http://localhost:7120/api/v1/reviews/workspace", () => {
                listRequestCount += 1
                return HttpResponse.json(MOCK_LIST_RESPONSE)
            }),
        )

        renderWithProviders(<CcrWorkspaceProbe enabled={false} />)
        expect(screen.getByTestId("workspace-state")).toHaveTextContent("pending")

        await new Promise((resolve): void => {
            setTimeout(resolve, 50)
        })
        expect(listRequestCount).toBe(0)
    })

    it("не загружает context для пустого reviewId (whitespace)", async (): Promise<void> => {
        let contextRequestCount = 0
        server.use(
            http.get("http://localhost:7120/api/v1/reviews/workspace", () => {
                return HttpResponse.json(MOCK_LIST_RESPONSE)
            }),
            http.get("http://localhost:7120/api/v1/reviews/:reviewId/workspace", () => {
                contextRequestCount += 1
                return HttpResponse.json(MOCK_CONTEXT_RESPONSE)
            }),
        )

        renderWithProviders(<CcrWorkspaceProbe reviewId="   " />)

        await waitFor((): void => {
            expect(screen.getByTestId("workspace-state")).toHaveTextContent("loaded")
        })
        expect(contextRequestCount).toBe(0)
    })
})
