import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SystemStateCard } from "@/components/infrastructure/system-state-card"
import { renderWithProviders } from "../utils/render"

describe("SystemStateCard", (): void => {
    it("рендерит empty state с CTA действием", async (): Promise<void> => {
        const user = userEvent.setup()
        const ctaSpy = vi.fn()

        renderWithProviders(
            <SystemStateCard
                ctaLabel="Retry"
                description="No data in this view"
                title="Empty dataset"
                variant="empty"
                onCtaPress={ctaSpy}
            />,
        )

        expect(screen.getByText("Empty state")).not.toBeNull()
        await user.click(screen.getByRole("button", { name: "Retry" }))
        expect(ctaSpy).toHaveBeenCalledTimes(1)
    })

    it("рендерит error state без CTA", (): void => {
        renderWithProviders(
            <SystemStateCard
                description="Request failed due to network timeout."
                title="Cannot load data"
                variant="error"
            />,
        )

        expect(screen.getByText("Error state")).not.toBeNull()
        expect(screen.queryByRole("button")).toBeNull()
    })

    it("when variant is loading, then renders loading state label", (): void => {
        renderWithProviders(
            <SystemStateCard
                description="Fetching data from server."
                title="Loading"
                variant="loading"
            />,
        )

        expect(screen.getByText("Loading state")).toBeDefined()
        expect(screen.getByText("Loading")).toBeDefined()
    })

    it("when variant is partial, then renders partial data state label", (): void => {
        renderWithProviders(
            <SystemStateCard
                description="Some data could not be loaded."
                title="Incomplete data"
                variant="partial"
            />,
        )

        expect(screen.getByText("Partial data state")).toBeDefined()
        expect(screen.getByText("Incomplete data")).toBeDefined()
    })

    it("when ctaLabel provided without onCtaPress, then does not render button", (): void => {
        renderWithProviders(
            <SystemStateCard ctaLabel="Retry" description="Test" title="Test" variant="empty" />,
        )

        expect(screen.queryByRole("button")).toBeNull()
    })
})
