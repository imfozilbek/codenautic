import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SettingsAdoptionAnalyticsPage } from "@/pages/settings-adoption-analytics.page"
import { renderWithProviders } from "../utils/render"

describe("adoption analytics route", (): void => {
    it("рендерит контент adoption analytics с funnel и workflow health", (): void => {
        renderWithProviders(<SettingsAdoptionAnalyticsPage />)

        expect(screen.getByText("Usage & adoption analytics")).not.toBeNull()
        expect(screen.getByText("Adoption funnel")).not.toBeNull()
        expect(screen.getByText("Workflow health")).not.toBeNull()
    })
})
