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
})
