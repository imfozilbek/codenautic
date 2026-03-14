import { describe, expect, it } from "vitest"

import { SettingsSkeleton } from "@/components/skeletons/settings-skeleton"
import { renderWithProviders } from "../../utils/render"

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
