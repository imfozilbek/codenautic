import { screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

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
    beforeEach((): void => {
        intersectionObserverState.isIntersecting = false
    })

    it("рендерит CCR список при большом количестве строк", (): void => {
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

    it("триггерит onLoadMore через infinite scroll sentinel", async (): Promise<void> => {
        intersectionObserverState.isIntersecting = true
        const onLoadMore = vi.fn()

        renderWithProviders(
            <ReviewsContent
                hasMore={true}
                isLoadingMore={false}
                rows={createRows(20)}
                onLoadMore={onLoadMore}
            />,
        )

        await waitFor((): void => {
            expect(onLoadMore).toHaveBeenCalled()
        })
    })
})
