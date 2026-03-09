import { describe, expect, it } from "vitest"

import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton"
import { ReviewsSkeleton } from "@/components/skeletons/reviews-skeleton"
import { SettingsSkeleton } from "@/components/skeletons/settings-skeleton"
import { renderWithProviders } from "../utils/render"

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

    it("when rendered, then contains multiple child elements as placeholders", (): void => {
        const { container } = renderWithProviders(<DashboardSkeleton />)

        const wrapper = container.firstElementChild
        expect(wrapper).not.toBeNull()
        expect(wrapper !== null && wrapper.children.length > 0).toBe(true)
    })
})

describe("ReviewsSkeleton", (): void => {
    it("when rendered, then mounts without errors", (): void => {
        const { container } = renderWithProviders(<ReviewsSkeleton />)

        expect(container.firstElementChild).not.toBeNull()
    })

    it("when rendered, then contains filter grid structure", (): void => {
        const { container } = renderWithProviders(<ReviewsSkeleton />)

        const filterGrid = container.querySelector(".grid")
        expect(filterGrid).not.toBeNull()
    })

    it("when rendered, then wraps content in a section element", (): void => {
        const { container } = renderWithProviders(<ReviewsSkeleton />)

        const section = container.querySelector("section")
        expect(section).not.toBeNull()
    })
})

describe("SettingsSkeleton", (): void => {
    it("when rendered, then mounts without errors", (): void => {
        const { container } = renderWithProviders(<SettingsSkeleton />)

        expect(container.firstElementChild).not.toBeNull()
    })

    it("when rendered, then renders settings card placeholders in grid", (): void => {
        const { container } = renderWithProviders(<SettingsSkeleton />)

        const gridContainer = container.querySelector(".grid")
        expect(gridContainer).not.toBeNull()
    })

    it("when rendered, then contains space-y layout for vertical spacing", (): void => {
        const { container } = renderWithProviders(<SettingsSkeleton />)

        const wrapper = container.firstElementChild
        expect(wrapper?.className).toContain("space-y")
    })
})
