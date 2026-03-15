import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SettingsSecurityPage } from "@/pages/settings-security.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsSecurityPage", (): void => {
    it("renders tab list with Privacy, SSO, and Audit Logs tabs", (): void => {
        renderWithProviders(<SettingsSecurityPage />)

        expect(screen.getByRole("tab", { name: "Privacy" })).not.toBeNull()
        expect(screen.getByRole("tab", { name: "SSO" })).not.toBeNull()
        expect(screen.getByRole("tab", { name: "Audit Logs" })).not.toBeNull()
    })

    it("renders first tab panel content by default", (): void => {
        renderWithProviders(<SettingsSecurityPage />)

        expect(screen.getByRole("tabpanel")).not.toBeNull()
    })
})
