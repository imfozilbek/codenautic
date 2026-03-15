import { screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { SettingsPage } from "@/pages/settings.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsPage", (): void => {
    beforeEach((): void => {
        window.localStorage.setItem("codenautic:rbac:role", "admin")
    })

    afterEach((): void => {
        window.localStorage.removeItem("codenautic:rbac:role")
    })

    it("renders overview heading and description", (): void => {
        renderWithProviders(<SettingsPage />)

        const heading = screen.getByRole("heading", { level: 1, name: "Settings" })

        expect(heading).not.toBeNull()
        expect(heading.className).toContain("text-foreground")
        expect(
            screen.getAllByText("Workspace defaults, appearance, and notification preferences.")
                .length,
        ).toBeGreaterThan(0)
    })

    it("renders grouped settings cards with canonical labels", (): void => {
        renderWithProviders(<SettingsPage />)

        expect(screen.getByText("Configuration")).not.toBeNull()
        expect(screen.getAllByText("Providers").length).toBeGreaterThan(0)
        expect(screen.getByText("Security & Compliance")).not.toBeNull()
        expect(screen.getAllByText("Organization").length).toBeGreaterThan(0)
    })

    it("renders navigation links from shared data", (): void => {
        renderWithProviders(<SettingsPage />)

        expect(screen.getByRole("link", { name: "Code Review" })).not.toBeNull()
        expect(screen.getByRole("link", { name: "Contract Validation" })).not.toBeNull()
        expect(screen.getByRole("link", { name: "Integrations" })).not.toBeNull()
        expect(screen.getByRole("link", { name: "Billing" })).not.toBeNull()
    })

    it("filters out General self-link from the Configuration group", (): void => {
        renderWithProviders(<SettingsPage />)

        const settingsSelfLinks = screen.queryAllByRole("link", { name: "Settings" })
        expect(settingsSelfLinks.length).toBe(0)
    })
})
