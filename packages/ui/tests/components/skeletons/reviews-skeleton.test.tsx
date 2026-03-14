import { describe, expect, it } from "vitest"

import { ReviewsSkeleton } from "@/components/skeletons/reviews-skeleton"
import { renderWithProviders } from "../../utils/render"

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
