import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ReviewsTable, type IReviewRow } from "@/components/reviews/reviews-table"
import { renderWithProviders } from "../../utils/render"

function createRow(overrides: Partial<IReviewRow> = {}): IReviewRow {
    return {
        assignee: "Neo",
        comments: 5,
        id: "CCR-001",
        repository: "repo-core",
        status: "new",
        title: "Refactor auth middleware",
        updatedAt: "2026-03-01 10:12",
        ...overrides,
    }
}

describe("ReviewsTable", (): void => {
    it("when rows provided, then renders table with column headers", (): void => {
        const rows: ReadonlyArray<IReviewRow> = [createRow()]

        renderWithProviders(<ReviewsTable rows={rows} />)

        expect(screen.getByRole("grid", { name: "CCR reviews table" })).not.toBeNull()
        expect(screen.getByText("CCR")).not.toBeNull()
        expect(screen.getByText("Title")).not.toBeNull()
        expect(screen.getByText("Repository")).not.toBeNull()
        expect(screen.getByText("Assignee")).not.toBeNull()
        expect(screen.getByText("Comments")).not.toBeNull()
        expect(screen.getByText("Updated")).not.toBeNull()
        expect(screen.getByText("Status")).not.toBeNull()
    })

    it("when rows provided, then renders row data with status badge", (): void => {
        const rows: ReadonlyArray<IReviewRow> = [
            createRow({
                id: "CCR-101",
                title: "Fix auth bug",
                status: "approved",
                assignee: "Trinity",
            }),
        ]

        renderWithProviders(<ReviewsTable rows={rows} />)

        expect(screen.getByText("CCR-101")).not.toBeNull()
        expect(screen.getByText("Fix auth bug")).not.toBeNull()
        expect(screen.getByText("Trinity")).not.toBeNull()
        expect(screen.getByText("Approved")).not.toBeNull()
    })

    it("when multiple rows provided, then renders all rows", (): void => {
        const rows: ReadonlyArray<IReviewRow> = [
            createRow({ id: "CCR-201", title: "First review" }),
            createRow({ id: "CCR-202", title: "Second review", status: "rejected" }),
            createRow({ id: "CCR-203", title: "Third review", status: "queued" }),
        ]

        renderWithProviders(<ReviewsTable rows={rows} />)

        expect(screen.getByText("CCR-201")).not.toBeNull()
        expect(screen.getByText("CCR-202")).not.toBeNull()
        expect(screen.getByText("CCR-203")).not.toBeNull()
        expect(screen.getByText("Rejected")).not.toBeNull()
        expect(screen.getByText("Queued")).not.toBeNull()
    })

    it("when rows is empty, then renders empty content message", (): void => {
        renderWithProviders(<ReviewsTable rows={[]} />)

        expect(screen.getByText("No CCRs found for this filter set")).not.toBeNull()
    })

    it("when row has link, then CCR id is rendered as a link", (): void => {
        const rows: ReadonlyArray<IReviewRow> = [createRow({ id: "CCR-301" })]

        renderWithProviders(<ReviewsTable rows={rows} />)

        const link = screen.getByText("CCR-301")
        expect(link).not.toBeNull()
        expect(link.closest("a")).not.toBeNull()
    })
})
