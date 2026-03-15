import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const capturedInfiniteScrollProps = vi.hoisted(() => ({
    next: undefined as (() => void) | undefined,
}))

vi.mock("react-infinite-scroll-component", () => ({
    default: ({
        children,
        next,
    }: {
        readonly children: React.ReactNode
        readonly dataLength: number
        readonly hasMore: boolean
        readonly loader: React.ReactNode
        readonly next: () => void
    }): React.ReactElement => {
        capturedInfiniteScrollProps.next = next
        return <div data-testid="infinite-scroll">{children}</div>
    },
}))

vi.mock("usehooks-ts", () => ({
    useDebounceValue: <T,>(value: T): [T, unknown] => {
        return [value, (): void => {}]
    },
}))

import { ReviewsContent, type IReviewRow } from "@/components/reviews/reviews-content"
import { renderWithProviders } from "../utils/render"

function createRows(total: number): ReadonlyArray<IReviewRow> {
    return Array.from({ length: total }, (_unusedValue, index): IReviewRow => {
        const suffix = String(index + 1).padStart(3, "0")
        return {
            assignee: `Engineer ${suffix}`,
            comments: (index % 7) + 1,
            id: `CCR-VIRT-${suffix}`,
            repository: "platform/ui",
            status: index % 2 === 0 ? "in_progress" : "queued",
            title: `Virtualized review ${suffix}`,
            updatedAt: `2026-03-${String((index % 28) + 1).padStart(2, "0")} 10:00`,
        }
    })
}

describe("ReviewsContent", (): void => {
    it("when rendered with many rows, then displays CCR table", (): void => {
        const rows = createRows(180)

        renderWithProviders(
            <ReviewsContent
                hasMore={false}
                isLoadingMore={false}
                rows={rows}
                onLoadMore={(): void => {}}
            />,
        )

        const table = screen.getByRole("grid", { name: "CCR management table" })
        expect(table).not.toBeNull()

        const renderedRows = screen.getAllByRole("row")
        expect(renderedRows.length).toBeGreaterThan(0)
    })

    it("when infinite scroll triggers, then calls onLoadMore", (): void => {
        const onLoadMore = vi.fn()

        renderWithProviders(
            <ReviewsContent
                hasMore={true}
                isLoadingMore={false}
                rows={createRows(20)}
                onLoadMore={onLoadMore}
            />,
        )

        if (capturedInfiniteScrollProps.next !== undefined) {
            capturedInfiniteScrollProps.next()
        }

        expect(onLoadMore).toHaveBeenCalled()
    })
})
