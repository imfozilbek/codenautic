import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SettingsAdoptionAnalyticsPage } from "@/pages/settings-adoption-analytics.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsAdoptionAnalyticsPage", (): void => {
    it("показывает funnel, workflow health и privacy boundary", (): void => {
        renderWithProviders(<SettingsAdoptionAnalyticsPage />)

        expect(screen.getByText("Usage & adoption analytics")).not.toBeNull()
        expect(screen.getByText("Adoption funnel")).not.toBeNull()
        expect(screen.getByText("Workflow health")).not.toBeNull()
        expect(screen.getByText(/aggregated UX telemetry only/)).not.toBeNull()
    })

    it("пересчитывает метрики при смене диапазона", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsAdoptionAnalyticsPage />)

        expect(screen.getByText("1d 9h")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "7d" }))
        expect(screen.getByText("20h")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "90d" }))
        expect(screen.getByText("2d 4h")).not.toBeNull()
    })
})
