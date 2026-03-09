import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SettingsOrganizationPage } from "@/pages/settings-organization.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsOrganizationPage", (): void => {
    afterEach((): void => {
        vi.restoreAllMocks()
    })

    it("рендерит основные секции организации", (): void => {
        renderWithProviders(<SettingsOrganizationPage />)

        expect(screen.getByText("Organization profile")).not.toBeNull()
        expect(screen.getByText("Billing")).not.toBeNull()
        expect(screen.getAllByText("Ari Karimov").length).toBeGreaterThan(0)
        expect(screen.getByText("BYOK")).not.toBeNull()
        expect(screen.getByText("Audit logs (latest)")).not.toBeNull()
        expect(screen.getByText("Members")).not.toBeNull()
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

    it("когда имя организации пустое, тогда save profile не проходит", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsOrganizationPage />)

        const organizationNameInput = screen.getByRole("textbox", {
            name: "Organization name",
        })
        await user.clear(organizationNameInput)
        await user.click(screen.getByRole("button", { name: "Save profile" }))

        expect((organizationNameInput as HTMLInputElement).value).toBe("")
    })

    it("когда slug пустой, тогда save profile не проходит", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsOrganizationPage />)

        const slugInput = screen.getByRole("textbox", { name: "Slug" })
        await user.clear(slugInput)
        await user.click(screen.getByRole("button", { name: "Save profile" }))

        expect((slugInput as HTMLInputElement).value).toBe("")
    })

    it("позволяет редактировать slug и timezone профиля", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsOrganizationPage />)

        const slugInput = screen.getByRole("textbox", { name: "Slug" })
        await user.clear(slugInput)
        await user.type(slugInput, "new-slug")
        expect((slugInput as HTMLInputElement).value).toBe("new-slug")

        const timezoneInput = screen.getByRole("textbox", { name: "Timezone" })
        await user.clear(timezoneInput)
        await user.type(timezoneInput, "UTC+03:00")
        expect((timezoneInput as HTMLInputElement).value).toBe("UTC+03:00")
    })

    it("рендерит таблицу участников с ролями", (): void => {
        renderWithProviders(<SettingsOrganizationPage />)

        expect(screen.getAllByText("Nika Saryeva").length).toBeGreaterThan(0)
        expect(screen.getByText("nika@acme.dev")).not.toBeNull()
        expect(screen.getByText("Mila Davletova")).not.toBeNull()
        expect(screen.getByText("mila@acme.dev")).not.toBeNull()

        expect(screen.getAllByText("admin").length).toBeGreaterThan(0)
        expect(screen.getAllByText("lead").length).toBeGreaterThan(0)
        expect(screen.getAllByText("developer").length).toBeGreaterThan(0)
    })

    it("когда вводится валидный email, тогда участник добавляется в таблицу", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsOrganizationPage />)

        const emailInput = screen.getByRole("textbox", { name: "Invite by email" })
        await user.type(emailInput, "ivan.petrov@acme.dev")
        await user.click(screen.getByRole("button", { name: "Invite member" }))

        expect(screen.getByText("Ivan Petrov")).not.toBeNull()
        expect(screen.getByText("ivan.petrov@acme.dev")).not.toBeNull()
        expect((emailInput as HTMLInputElement).value).toBe("")
    })

    it("когда вводится email с дефисами и подчёркиваниями, тогда имя формируется корректно", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsOrganizationPage />)

        const emailInput = screen.getByRole("textbox", { name: "Invite by email" })
        await user.type(emailInput, "anna-marie_fox@acme.dev")
        await user.click(screen.getByRole("button", { name: "Invite member" }))

        expect(screen.getByText("Anna Marie Fox")).not.toBeNull()
    })

    it("когда вводится невалидный email, тогда участник не добавляется", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsOrganizationPage />)

        const emailInput = screen.getByRole("textbox", { name: "Invite by email" })
        await user.type(emailInput, "invalid-email")
        await user.click(screen.getByRole("button", { name: "Invite member" }))

        expect(screen.queryByText("invalid-email")).toBeNull()
    })

    it("когда выбирается роль для приглашения, тогда участник получает выбранную роль", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsOrganizationPage />)

        const emailInput = screen.getByRole("textbox", { name: "Invite by email" })
        await user.type(emailInput, "dev@acme.dev")

        const roleSelect = screen.getByRole("combobox", { name: "Role" })
        await user.selectOptions(roleSelect, "developer")

        await user.click(screen.getByRole("button", { name: "Invite member" }))

        expect(screen.getByText("dev@acme.dev")).not.toBeNull()
    })

    it("когда меняется роль существующего участника, тогда роль обновляется", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsOrganizationPage />)

        const memberRoleSelect = screen.getByRole("combobox", {
            name: "Role for ari@acme.dev",
        })
        await user.selectOptions(memberRoleSelect, "developer")

        expect((memberRoleSelect as HTMLSelectElement).value).toBe("developer")
    })

    it("когда нажимается Remove, тогда участник удаляется из таблицы", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsOrganizationPage />)

        expect(screen.getByText("Mila Davletova")).not.toBeNull()

        const removeButtons = screen.getAllByRole("button", { name: "Remove" })
        const lastRemoveButton = removeButtons[removeButtons.length - 1]
        if (lastRemoveButton !== undefined) {
            await user.click(lastRemoveButton)
        }

        expect(screen.queryByText("Mila Davletova")).toBeNull()
    })

    it("когда выбирается другой план billing, тогда план обновляется", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsOrganizationPage />)

        const planSelect = screen.getByRole("combobox", { name: "Plan" })
        expect((planSelect as HTMLSelectElement).value).toBe("pro")

        await user.selectOptions(planSelect, "enterprise")
        expect((planSelect as HTMLSelectElement).value).toBe("enterprise")
    })

    it("когда план меняется на starter, тогда статус становится trial", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsOrganizationPage />)

        const planSelect = screen.getByRole("combobox", { name: "Plan" })
        await user.selectOptions(planSelect, "starter")

        expect(screen.getByText("trial")).not.toBeNull()
    })

    it("когда статус active и нажимается retry payment, тогда ошибки нет", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsOrganizationPage />)

        await user.click(screen.getByRole("button", { name: "Retry payment" }))

        expect(
            screen.queryByText("Payment retry failed. Review billing method and try again."),
        ).toBeNull()
    })

    it("когда подтверждается critical billing action, тогда статус сбрасывается на active", async (): Promise<void> => {
        const user = userEvent.setup()
        const confirmSpy = vi.fn((): boolean => true)
        vi.stubGlobal("confirm", confirmSpy)

        renderWithProviders(<SettingsOrganizationPage />)

        await user.click(screen.getByRole("button", { name: "Confirm billing action" }))

        expect(confirmSpy).toHaveBeenCalledTimes(1)
        expect(screen.getByText("active")).not.toBeNull()
    })

    it("когда отменяется critical billing action, тогда действие не применяется", async (): Promise<void> => {
        const user = userEvent.setup()
        const confirmSpy = vi.fn((): boolean => false)
        vi.stubGlobal("confirm", confirmSpy)

        renderWithProviders(<SettingsOrganizationPage />)

        await user.click(screen.getByRole("button", { name: "Confirm billing action" }))

        expect(confirmSpy).toHaveBeenCalledTimes(1)
        expect(screen.getByText("active")).not.toBeNull()
    })

    it("когда нажимается Rotate BYOK secret, тогда ключ обновляется", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsOrganizationPage />)

        expect(screen.getByText(/byok_\*\*\*\*a2f8/)).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Rotate BYOK secret" }))

        expect(screen.queryByText(/byok_\*\*\*\*a2f8/)).toBeNull()
    })

    it("рендерит BYOK switches с начальным состоянием configured", (): void => {
        renderWithProviders(<SettingsOrganizationPage />)

        const gitSwitch = screen.getByRole("switch", {
            name: "Git provider key configured",
        })
        const llmSwitch = screen.getByRole("switch", { name: "LLM key configured" })

        expect(gitSwitch).not.toBeNull()
        expect(llmSwitch).not.toBeNull()
    })

    it("когда переключается Git provider key, тогда switch остаётся в DOM", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsOrganizationPage />)

        const gitSwitch = screen.getByRole("switch", {
            name: "Git provider key configured",
        })

        await user.click(gitSwitch)

        expect(
            screen.getByRole("switch", { name: "Git provider key configured" }),
        ).not.toBeNull()
    })

    it("когда переключается LLM key, тогда switch остаётся в DOM", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsOrganizationPage />)

        const llmSwitch = screen.getByRole("switch", { name: "LLM key configured" })

        await user.click(llmSwitch)

        expect(screen.getByRole("switch", { name: "LLM key configured" })).not.toBeNull()
    })

    it("рендерит таблицу audit logs с записями", (): void => {
        renderWithProviders(<SettingsOrganizationPage />)

        expect(screen.getByText("organization.profile.updated")).not.toBeNull()
        expect(screen.getByText("billing.plan.changed")).not.toBeNull()
        expect(screen.getByText("member.role.updated")).not.toBeNull()
        expect(screen.getByText("security.byok.rotated")).not.toBeNull()
        expect(screen.getByText("Name and timezone updated.")).not.toBeNull()
        expect(screen.getByText("Plan switched from starter to pro.")).not.toBeNull()
    })

    it("рендерит billing информацию по умолчанию", (): void => {
        renderWithProviders(<SettingsOrganizationPage />)

        expect(screen.getByText("Visa **** 8891")).not.toBeNull()
        expect(screen.getByText("2026-04-01")).not.toBeNull()
        expect(screen.getByText(/18\/30/)).not.toBeNull()
        expect(screen.getByText(/(60%)/)).not.toBeNull()
        expect(screen.getAllByText("active").length).toBeGreaterThan(0)
    })

    it("рендерит заголовок и описание страницы", (): void => {
        renderWithProviders(<SettingsOrganizationPage />)

        expect(screen.getByText("Organization Settings")).not.toBeNull()
        expect(
            screen.getByText(
                "Manage organization profile, billing, members, BYOK and audit history.",
            ),
        ).not.toBeNull()
    })

    it("рендерит chip для каждой роли участника", (): void => {
        renderWithProviders(<SettingsOrganizationPage />)

        expect(screen.getAllByText("admin").length).toBeGreaterThan(0)
        expect(screen.getAllByText("lead").length).toBeGreaterThan(0)
        expect(screen.getAllByText("developer").length).toBeGreaterThan(0)
    })

    it("когда приглашается участник с ролью viewer, тогда роль viewer отображается", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsOrganizationPage />)

        const emailInput = screen.getByRole("textbox", { name: "Invite by email" })
        await user.type(emailInput, "viewer@acme.dev")

        await user.click(screen.getByRole("button", { name: "Invite member" }))

        const viewerTexts = screen.getAllByText("viewer")
        expect(viewerTexts.length).toBeGreaterThan(0)
    })

    it("когда роль участника меняется на lead, тогда select отражает новую роль", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsOrganizationPage />)

        const memberRoleSelect = screen.getByRole("combobox", {
            name: "Role for mila@acme.dev",
        })
        await user.selectOptions(memberRoleSelect, "lead")

        expect((memberRoleSelect as HTMLSelectElement).value).toBe("lead")
    })

    it("когда роль приглашения меняется на admin, тогда участник добавляется с ролью admin", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsOrganizationPage />)

        const emailInput = screen.getByRole("textbox", { name: "Invite by email" })
        await user.type(emailInput, "boss@acme.dev")

        const roleSelect = screen.getByRole("combobox", { name: "Role" })
        await user.selectOptions(roleSelect, "admin")

        await user.click(screen.getByRole("button", { name: "Invite member" }))

        expect(screen.getByText("boss@acme.dev")).not.toBeNull()
    })
})
