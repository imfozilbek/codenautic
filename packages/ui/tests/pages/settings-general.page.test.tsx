import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SettingsGeneralPage } from "@/pages/settings-general.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsGeneralPage", (): void => {
    it("renders tab list with Appearance and Notifications tabs", (): void => {
        renderWithProviders(<SettingsGeneralPage />)

        expect(screen.getByRole("tab", { name: "Appearance" })).not.toBeNull()
        expect(screen.getByRole("tab", { name: "Notifications" })).not.toBeNull()
    })

    it("renders first tab panel content by default", (): void => {
        renderWithProviders(<SettingsGeneralPage />)

        expect(screen.getByRole("tabpanel")).not.toBeNull()
    })
})
