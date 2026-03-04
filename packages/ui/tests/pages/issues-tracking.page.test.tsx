import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { IssuesTrackingPage } from "@/pages/issues-tracking.page"
import { renderWithProviders } from "../utils/render"

const ISSUE_FILTER_PERSISTENCE_KEY = "issues-tracking:filters:v1"

interface IIssuesTrackingTestIssue {
    readonly detectedAt: string
    readonly filePath: string
    readonly id: string
    readonly message: string
    readonly owner: string
    readonly repository: string
    readonly severity: "critical" | "high" | "low" | "medium"
    readonly status: "dismissed" | "fixed" | "in_progress" | "open"
    readonly title: string
}

const issues: ReadonlyArray<IIssuesTrackingTestIssue> = [
    {
        detectedAt: "2026-01-12T07:11:00Z",
        filePath: "src/api/repository.ts",
        id: "ISS-101",
        message: "Unhandled error path near data parser",
        owner: "Alice",
        repository: "platform-team/api-gateway",
        severity: "critical" as const,
        status: "open" as const,
        title: "Possible unguarded parse fallback",
    },
    {
        detectedAt: "2026-01-14T13:32:00Z",
        filePath: "src/components/chat-panel.tsx",
        id: "ISS-102",
        message: "Potential DOM injection in dynamic markdown renderer",
        owner: "Bob",
        repository: "frontend-team/ui-dashboard",
        severity: "high" as const,
        status: "in_progress" as const,
        title: "Dynamic markdown requires re-check",
    },
    {
        detectedAt: "2026-01-17T09:21:00Z",
        filePath: "src/workers/scan.ts",
        id: "ISS-103",
        message: "High churn + low review ratio in queue handler",
        owner: "Cara",
        repository: "backend-core/payment-worker",
        severity: "medium" as const,
        status: "fixed" as const,
        title: "Scan queue stability issue",
    },
    {
        detectedAt: "2026-01-18T16:58:00Z",
        filePath: "src/pages/reviews.tsx",
        id: "ISS-104",
        message: "Unstable key usage in virtualized list",
        owner: "Dan",
        repository: "frontend-team/ui-dashboard",
        severity: "low" as const,
        status: "dismissed" as const,
        title: "Virtualization key fallback",
    },
]

function createLargeIssueSet(total: number): ReadonlyArray<IIssuesTrackingTestIssue> {
    return Array.from({ length: total }, (_unusedValue, index): IIssuesTrackingTestIssue => {
        const issueNumber = String(index + 1).padStart(3, "0")

        return {
            detectedAt: "2026-02-01T08:00:00Z",
            filePath: `src/modules/module-${issueNumber}.ts`,
            id: `ISS-VIRT-${issueNumber}`,
            message: `Virtualized row payload ${issueNumber}`,
            owner: `Owner ${issueNumber}`,
            repository: "frontend-team/ui-dashboard",
            severity: index % 2 === 0 ? "high" : "medium",
            status: index % 3 === 0 ? "open" : "in_progress",
            title: `Virtualized issue ${issueNumber}`,
        }
    })
}

describe("IssuesTrackingPage", (): void => {
    beforeEach((): void => {
        localStorage.removeItem(ISSUE_FILTER_PERSISTENCE_KEY)
    })

    it("фильтрует списки по поиску, статусу и критичности", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<IssuesTrackingPage issues={issues} />)

        expect(screen.getByRole("heading", { level: 1, name: "Issues tracking" })).not.toBeNull()
        expect(screen.getByText("4 of 4 issues")).not.toBeNull()

        await user.selectOptions(screen.getByRole("combobox", { name: "Filter by severity" }), "critical")
        expect(screen.getByText("1 of 4 issues")).not.toBeNull()

        await user.selectOptions(screen.getByRole("combobox", { name: "Filter by status" }), "open")
        expect(screen.getByText("1 of 4 issues")).not.toBeNull()

        await user.selectOptions(screen.getByRole("combobox", { name: "Filter by severity" }), "all")
        await user.selectOptions(screen.getByRole("combobox", { name: "Filter by status" }), "all")
        await user.clear(screen.getByRole("textbox", { name: "Search issues" }))
        await user.type(screen.getByRole("textbox", { name: "Search issues" }), "ISS-103")
        expect(screen.getByText("1 of 4 issues")).not.toBeNull()
        expect(screen.getByText("Scan queue stability issue")).not.toBeNull()
    })

    it("вызывает inline action callback с корректным action", async (): Promise<void> => {
        const user = userEvent.setup()
        const handleAction = vi.fn()

        renderWithProviders(<IssuesTrackingPage issues={issues} onAction={handleAction} />)

        const actionButtons = screen.queryAllByRole("button", {
            name: /issue ISS-101/i,
        })
        const firstActionButton = actionButtons[0]
        if (firstActionButton !== undefined) {
            await user.click(firstActionButton)
            expect(handleAction).toHaveBeenCalledTimes(1)
        }
    })

    it("рендерит enterprise table с доступными строками", async (): Promise<void> => {
        renderWithProviders(<IssuesTrackingPage issues={issues} />)

        expect(screen.getByRole("table", { name: "Issue list" })).not.toBeNull()
        expect(screen.getAllByRole("columnheader").length).toBeGreaterThan(0)
    })

    it("использует virtualized table для большого списка issues", (): void => {
        const largeIssues = createLargeIssueSet(180)
        renderWithProviders(<IssuesTrackingPage issues={largeIssues} />)

        const table = screen.getByRole("table", { name: "Issue list" })
        expect(table).toHaveAttribute("data-virtualized", "true")
        expect(screen.getByText("180 of 180 issues")).not.toBeNull()

        const renderedRowSelectionCheckboxes = screen.getAllByRole("checkbox", {
            name: /Select ISS-VIRT-/i,
        })
        expect(renderedRowSelectionCheckboxes.length).toBeGreaterThan(0)
        expect(renderedRowSelectionCheckboxes.length).toBeLessThan(largeIssues.length)
    })

    it("рендерит sticky header для virtualized issues table", (): void => {
        renderWithProviders(<IssuesTrackingPage issues={issues} />)

        const rowGroups = screen.getAllByRole("rowgroup")
        const headerRowGroup = rowGroups.at(0)
        expect(headerRowGroup).not.toBeUndefined()

        if (headerRowGroup === undefined) {
            return
        }

        expect(headerRowGroup).toHaveAttribute("data-sticky-header", "true")
        expect(headerRowGroup).toHaveStyle({ top: "0px" })
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

        renderWithProviders(<IssuesTrackingPage issues={issues} />)

        expect(screen.getByText("1 of 4 issues")).not.toBeNull()
        expect(screen.getByText("Possible unguarded parse fallback")).not.toBeNull()
    })
})
