import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SettingsTeamPage } from "@/pages/settings-team.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsTeamPage", (): void => {
    it("позволяет создать команду, добавить участника, назначить репозиторий и сменить роль", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsTeamPage />)

        expect(screen.getByRole("heading", { level: 1, name: "Team management" })).not.toBeNull()

        await user.type(screen.getByRole("textbox", { name: "Team name" }), "Platform Enablement")
        await user.type(
            screen.getByRole("textbox", { name: "Description" }),
            "Owns shared delivery standards.",
        )
        await user.click(screen.getByRole("button", { name: "Create team" }))

        expect(screen.getByRole("button", { name: /Platform Enablement/ })).not.toBeNull()
        expect(screen.getByText("Active team: Platform Enablement")).not.toBeNull()

        await user.type(screen.getByRole("textbox", { name: "Invite member by email" }), "anya@acme.dev")
        await user.selectOptions(screen.getByRole("combobox", { name: "Invite role" }), "developer")
        await user.click(screen.getByRole("button", { name: "Add member" }))

        expect(screen.getByText("anya@acme.dev")).not.toBeNull()

        const mobileRepositoryCheckbox = screen.getByRole("checkbox", { name: "mobile-app" })
        await user.click(mobileRepositoryCheckbox)
        expect((mobileRepositoryCheckbox as HTMLInputElement).checked).toBe(true)

        const memberRoleSelect = screen.getByRole("combobox", {
            name: "Role for member anya@acme.dev",
        })
        await user.selectOptions(memberRoleSelect, "lead")
        expect((memberRoleSelect as HTMLSelectElement).value).toBe("lead")
    })
})
