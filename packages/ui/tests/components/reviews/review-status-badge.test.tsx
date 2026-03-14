import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ReviewStatusBadge } from "@/components/reviews/review-status-badge"
import type { TReviewStatus } from "@/lib/types/ccr-types"
import { renderWithProviders } from "../../utils/render"

describe("ReviewStatusBadge", (): void => {
    it("when status is approved, then renders Approved label", (): void => {
        renderWithProviders(<ReviewStatusBadge status="approved" />)

        expect(screen.getByText("Approved")).not.toBeNull()
    })

    it("when status is rejected, then renders Rejected label", (): void => {
        renderWithProviders(<ReviewStatusBadge status="rejected" />)

        expect(screen.getByText("Rejected")).not.toBeNull()
    })

    it("when status is in_progress, then renders In progress label", (): void => {
        renderWithProviders(<ReviewStatusBadge status="in_progress" />)

        expect(screen.getByText("In progress")).not.toBeNull()
    })

    it("when status is new, then renders New label", (): void => {
        renderWithProviders(<ReviewStatusBadge status="new" />)

        expect(screen.getByText("New")).not.toBeNull()
    })

    it("when status is queued, then renders Queued label", (): void => {
        renderWithProviders(<ReviewStatusBadge status="queued" />)

        expect(screen.getByText("Queued")).not.toBeNull()
    })

    it("when rendered with each status, then renders a chip element", (): void => {
        const statuses: ReadonlyArray<TReviewStatus> = [
            "approved",
            "in_progress",
            "new",
            "queued",
            "rejected",
        ]

        for (const status of statuses) {
            const { unmount } = renderWithProviders(<ReviewStatusBadge status={status} />)
            const chip = screen.getByText(
                status === "in_progress"
                    ? "In progress"
                    : status.charAt(0).toUpperCase() + status.slice(1),
            )
            expect(chip).not.toBeNull()
            unmount()
        }
    })
})
