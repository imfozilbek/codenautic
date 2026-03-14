import { describe, expect, it } from "vitest"

import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton"
import { renderWithProviders } from "../../utils/render"

describe("DashboardSkeleton", (): void => {
    it("when rendered, then mounts without errors", (): void => {
        const { container } = renderWithProviders(<DashboardSkeleton />)

        expect(container.firstElementChild).not.toBeNull()
    })

    it("when rendered, then contains metric card grid structure", (): void => {
        const { container } = renderWithProviders(<DashboardSkeleton />)

        const gridContainer = container.querySelector(".grid")
        expect(gridContainer).not.toBeNull()
    })

    it("when rendered, then contains multiple skeleton placeholders", (): void => {
        const { container } = renderWithProviders(<DashboardSkeleton />)

        const wrapper = container.firstElementChild
        expect(wrapper).not.toBeNull()
        expect(wrapper !== null && wrapper.children.length > 0).toBe(true)
    })
})
