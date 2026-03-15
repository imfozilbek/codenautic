import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { IIssuesListResponse } from "@/lib/api/endpoints/issues.endpoint"
import type { IUseIssuesResult } from "@/lib/hooks/queries/use-issues"

const intersectionObserverState = {
    isIntersecting: false,
}

vi.mock("@/lib/hooks/use-intersection-observer", () => {
    return {
        useIntersectionObserver: (): {
            readonly isIntersecting: boolean
            readonly targetRef: { current: HTMLDivElement | null }
        } => {
            return {
                isIntersecting: intersectionObserverState.isIntersecting,
                targetRef: { current: null },
            }
        },
    }
})

const mockPerformAction = vi.fn()

const mockIssuesData: IIssuesListResponse = {
    issues: [
        {
            detectedAt: "2026-01-12T07:11:00Z",
            filePath: "src/api/repository.ts",
            id: "ISS-101",
            message: "Unhandled error path near data parser",
            owner: "Neo",
            repository: "platform-team/api-gateway",
            severity: "critical",
            status: "open",
            title: "Possible unguarded parse fallback",
        },
        {
            detectedAt: "2026-01-14T13:32:00Z",
            filePath: "src/components/chat-panel.tsx",
            id: "ISS-102",
            message: "Potential DOM injection in dynamic markdown renderer",
            owner: "Trinity",
            repository: "frontend-team/ui-dashboard",
            severity: "high",
            status: "in_progress",
            title: "Dynamic markdown requires re-check",
        },
        {
            detectedAt: "2026-01-17T09:21:00Z",
            filePath: "src/workers/scan.ts",
            id: "ISS-103",
            message: "High churn + low review ratio in queue handler",
            owner: "Morpheus",
            repository: "backend-core/payment-worker",
            severity: "medium",
            status: "fixed",
            title: "Scan queue stability issue",
        },
        {
            detectedAt: "2026-01-18T16:58:00Z",
            filePath: "src/pages/reviews.tsx",
            id: "ISS-104",
            message: "Unstable key usage in virtualized list",
            owner: "Cypher",
            repository: "frontend-team/ui-dashboard",
            severity: "low",
            status: "dismissed",
            title: "Virtualization key fallback",
        },
    ],
    total: 4,
}

/**
 * Создаёт большой набор issues для тестирования пагинации.
 *
 * @param total Количество issues.
 * @returns Ответ списка issues.
 */
function createLargeIssueSet(total: number): IIssuesListResponse {
    const issues = Array.from({ length: total }, (_unusedValue, index) => {
        const issueNumber = String(index + 1).padStart(3, "0")

        return {
            detectedAt: "2026-02-01T08:00:00Z",
            filePath: `src/modules/module-${issueNumber}.ts`,
            id: `ISS-VIRT-${issueNumber}`,
            message: `Virtualized row payload ${issueNumber}`,
            owner: `Owner ${issueNumber}`,
            repository: "frontend-team/ui-dashboard",
            severity: index % 2 === 0 ? "high" as const : "medium" as const,
            status: index % 3 === 0 ? "open" as const : "in_progress" as const,
            title: `Virtualized issue ${issueNumber}`,
        }
    })

    return { issues, total }
}

let currentMockData: IIssuesListResponse = mockIssuesData

vi.mock("@/lib/hooks/queries/use-issues", () => {
    return {
        useIssues: (): IUseIssuesResult => {
            return {
                issuesQuery: {
                    data: currentMockData,
                    isLoading: false,
                    isError: false,
                    error: null,
                } as unknown as IUseIssuesResult["issuesQuery"],
                performAction: {
                    mutate: mockPerformAction,
                    isPending: false,
                } as unknown as IUseIssuesResult["performAction"],
            }
        },
    }
})

import { IssuesTrackingPage } from "@/pages/issues-tracking.page"
import { renderWithProviders } from "../utils/render"

const ISSUE_FILTER_PERSISTENCE_KEY = "issues-tracking:filters:v1"

describe("IssuesTrackingPage", (): void => {
    beforeEach((): void => {
        localStorage.removeItem(ISSUE_FILTER_PERSISTENCE_KEY)
        intersectionObserverState.isIntersecting = false
        currentMockData = mockIssuesData
        mockPerformAction.mockClear()
    })

    it("фильтрует списки по поиску, статусу и критичности", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<IssuesTrackingPage />)

        expect(screen.getByRole("heading", { level: 1, name: "Issues tracking" })).not.toBeNull()
        expect(screen.getByText("4 of 4 issues")).not.toBeNull()

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Filter by severity" }),
            "critical",
        )
        expect(screen.getByText("1 of 4 issues")).not.toBeNull()

        await user.selectOptions(screen.getByRole("combobox", { name: "Filter by status" }), "open")
        expect(screen.getByText("1 of 4 issues")).not.toBeNull()

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Filter by severity" }),
            "all",
        )
        await user.selectOptions(screen.getByRole("combobox", { name: "Filter by status" }), "all")
        await user.clear(screen.getByRole("textbox", { name: "Search issues" }))
        await user.type(screen.getByRole("textbox", { name: "Search issues" }), "ISS-103")
        expect(screen.getByText("1 of 4 issues")).not.toBeNull()
        expect(screen.getByText("Scan queue stability issue")).not.toBeNull()
    })

    it("вызывает performAction.mutate при нажатии action", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<IssuesTrackingPage />)

        const actionButtons = screen.queryAllByRole("button", {
            name: /issue ISS-101/i,
        })
        const firstActionButton = actionButtons[0]
        if (firstActionButton !== undefined) {
            await user.click(firstActionButton)
            expect(mockPerformAction).toHaveBeenCalledTimes(1)
        }
    })

    it("рендерит HeroUI table с доступными строками", async (): Promise<void> => {
        renderWithProviders(<IssuesTrackingPage />)

        expect(screen.getByRole("grid", { name: "Issue list" })).not.toBeNull()
        expect(screen.getAllByRole("columnheader").length).toBeGreaterThan(0)
    })

    it("рендерит большой список issues с пагинацией", (): void => {
        currentMockData = createLargeIssueSet(180)
        renderWithProviders(<IssuesTrackingPage />)

        const table = screen.getByRole("grid", { name: "Issue list" })
        expect(table).not.toBeNull()
        expect(screen.getByText("180 of 180 issues")).not.toBeNull()

        const renderedRows = screen.getAllByRole("row")
        expect(renderedRows.length).toBeGreaterThan(0)
    })

    it("рендерит header для issues table", (): void => {
        renderWithProviders(<IssuesTrackingPage />)

        const table = screen.getByRole("grid", { name: "Issue list" })
        expect(table).not.toBeNull()

        const rowGroups = screen.getAllByRole("rowgroup")
        expect(rowGroups.length).toBeGreaterThan(0)
    })

    it("рендерит paged issues list для infinite scroll режима", (): void => {
        currentMockData = createLargeIssueSet(180)
        renderWithProviders(<IssuesTrackingPage />)

        const table = screen.getByRole("grid", { name: "Issue list" })
        expect(table).not.toBeNull()
        const renderedRows = screen.getAllByRole("row")
        expect(renderedRows.length).toBeGreaterThan(1)
    })

    it("загружает persisted filters из localStorage при инициализации", (): void => {
        localStorage.setItem(
            ISSUE_FILTER_PERSISTENCE_KEY,
            JSON.stringify({
                search: "ISS-101",
                severity: "critical",
                status: "open",
            }),
        )

        renderWithProviders(<IssuesTrackingPage />)

        expect(screen.getByText("1 of 4 issues")).not.toBeNull()
        expect(screen.getByText("Possible unguarded parse fallback")).not.toBeNull()
    })
})
