import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SettingsOrganizationPage } from "@/pages/settings-organization.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsOrganizationPage", (): void => {
    it("рендерит основные секции организации", (): void => {
        renderWithProviders(<SettingsOrganizationPage />)

        expect(screen.getByText("Organization profile")).not.toBeNull()
        expect(screen.getByText("Billing")).not.toBeNull()
        expect(screen.getAllByText("Ari Karimov").length).toBeGreaterThan(0)
        expect(screen.getByText("BYOK")).not.toBeNull()
    })

    it("позволяет редактировать профиль организации", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsOrganizationPage />)

        const organizationNameInput = screen.getByRole("textbox", {
            name: "Organization name",
        })
        await user.clear(organizationNameInput)
        await user.type(organizationNameInput, "Acme Platform Plus")
        await user.click(screen.getByRole("button", { name: "Save profile" }))

        expect((organizationNameInput as HTMLInputElement).value).toBe("Acme Platform Plus")
    })
})
