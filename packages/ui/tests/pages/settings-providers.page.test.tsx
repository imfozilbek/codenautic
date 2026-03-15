import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SettingsProvidersPage } from "@/pages/settings-providers.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsProvidersPage", (): void => {
    it("renders tab list with LLM, Git, and Keys tabs", (): void => {
        renderWithProviders(<SettingsProvidersPage />)

        expect(screen.getByRole("tab", { name: "LLM" })).not.toBeNull()
        expect(screen.getByRole("tab", { name: "Git" })).not.toBeNull()
        expect(screen.getByRole("tab", { name: "Keys" })).not.toBeNull()
    })

    it("renders first tab panel content by default", (): void => {
        renderWithProviders(<SettingsProvidersPage />)

        expect(screen.getByRole("tabpanel")).not.toBeNull()
    })
})
