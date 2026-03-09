import { fireEvent, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { CcrManagementPage } from "@/pages/ccr-management.page"
import { DashboardMissionControlPage } from "@/pages/dashboard-mission-control.page"
import { HelpDiagnosticsPage } from "@/pages/help-diagnostics.page"
import { SettingsContractValidationPage } from "@/pages/settings-contract-validation.page"
import { SettingsPage } from "@/pages/settings.page"
import { renderWithProviders } from "../utils/render"

function createPseudoLocaleString(base: string): string {
    const expanded = `${base} ${base} ${base}`
    return `[[!! ${expanded} !!]]`
}

describe("system e2e regression suite: a11y + i18n", (): void => {
    it("покрывает keyboard-only navigation на dashboard/reviews/settings маршрутах", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<DashboardMissionControlPage />)
        expect(
            await screen.findByRole("heading", { level: 1, name: "Dashboard Mission Control" }),
        ).not.toBeNull()
        await user.tab()
        expect(document.activeElement).not.toBe(document.body)

        renderWithProviders(
            <CcrManagementPage
                repository="all"
                search=""
                status="all"
                team="all"
                onFilterChange={(): void => {
                    return
                }}
            />,
        )
        expect(screen.getByRole("heading", { level: 1, name: "CCR Management" })).not.toBeNull()
        await user.tab()
        expect(document.activeElement).not.toBe(document.body)

        renderWithProviders(<SettingsPage />)
        expect(screen.getByRole("heading", { level: 1, name: "Settings" })).not.toBeNull()
        await user.tab()
        expect(document.activeElement).not.toBe(document.body)
    })

    it("проверяет ARIA роли/лейблы и pseudo-locale устойчивость длинных строк", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsContractValidationPage />)

        const contractTextbox = screen.getByRole("textbox", { name: "Contract json" })
        const longPseudoLocalePayload = createPseudoLocaleString(
            '{"schema":"codenautic.contract.v1","version":2,"type":"rules-library","payload":{"title":"long"}}',
        )
        await user.clear(contractTextbox)
        fireEvent.change(contractTextbox, {
            target: { value: longPseudoLocalePayload },
        })

        const validateButton = screen.getByRole("button", { name: "Validate contract" })
        expect(validateButton).not.toBeNull()
        await user.click(validateButton)

        expect(screen.getByText("Contract validation errors")).not.toBeNull()
        expect(screen.getByRole("list", { name: "Contract errors list" })).not.toBeNull()
    })

    it("проходит критический help diagnostics self-serve flow без потери a11y семантики", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<HelpDiagnosticsPage />)

        expect(
            screen.getByRole("heading", { level: 1, name: "Help & diagnostics center" }),
        ).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Run diagnostics" }))
        expect(screen.getByLabelText("Diagnostics checks list")).not.toBeNull()
        expect(screen.getByLabelText("Diagnostics suggested actions")).not.toBeNull()

        await user.tab()
        expect(document.activeElement).not.toBe(document.body)

        await user.click(screen.getByRole("button", { name: "Generate redacted bundle" }))
        expect(
            screen.getByText("Redacted support bundle is ready to attach to support ticket."),
        ).not.toBeNull()

        const bundleTextbox = screen.getByRole("textbox", { name: "Support bundle payload" })
        const payload = JSON.parse((bundleTextbox as HTMLTextAreaElement).value) as {
            readonly redactedClient: {
                readonly clientFamily: string
                readonly language: string
                readonly userAgent?: string
            }
        }
        expect(payload.redactedClient.clientFamily.length).toBeGreaterThan(0)
        expect(payload.redactedClient.language.length).toBeGreaterThan(0)
        expect(payload.redactedClient.userAgent).toBeUndefined()
    })
})
