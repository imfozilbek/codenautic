import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { HelpDiagnosticsPage, runDiagnosticsChecks } from "@/pages/help-diagnostics.page"
import { renderWithProviders } from "../utils/render"

describe("HelpDiagnosticsPage", (): void => {
    it("фильтрует knowledge base по search и category", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<HelpDiagnosticsPage />)

        expect(screen.getByText("Help & diagnostics center")).not.toBeNull()

        await user.type(screen.getByRole("textbox", { name: "Help search" }), "provider")
        await user.selectOptions(screen.getByRole("combobox", { name: "Help category" }), "providers")

        expect(screen.getByText("Provider outage playbook")).not.toBeNull()
        expect(
            screen.getAllByRole("link", { name: "Open article / diagnostics" }).length,
        ).toBe(1)

        await user.clear(screen.getByRole("textbox", { name: "Help search" }))
        await user.type(screen.getByRole("textbox", { name: "Help search" }), "no-match-query")
        expect(screen.getByText("No matching help content")).not.toBeNull()
    })

    it("запускает diagnostics checks и генерирует redacted support bundle", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<HelpDiagnosticsPage />)

        await user.click(screen.getByRole("button", { name: "Run diagnostics" }))
        expect(screen.getByText("Auth/session state")).not.toBeNull()
        expect(screen.getByText("Network availability")).not.toBeNull()
        expect(screen.getByText("Suggested actions")).not.toBeNull()
        expect(screen.getByLabelText("Diagnostics suggested actions")).not.toBeNull()
        expect(screen.getAllByRole("button", { name: "Open action" }).length).toBeGreaterThan(0)

        await user.click(screen.getByRole("button", { name: "Generate redacted bundle" }))
        expect(screen.getByText("Redacted support bundle is ready to attach to support ticket.")).not
            .toBeNull()
        expect(screen.getByRole("textbox", { name: "Support bundle payload" })).not.toBeNull()
    })

    it("помечает provider/feature checks как pending до завершения загрузки query", (): void => {
        const checks = runDiagnosticsChecks({
            featureFlagsPending: true,
            featureFlagsReady: false,
            hasSessionToken: true,
            networkOnline: true,
            providerConnectedCount: 0,
            providerDegradedCount: 0,
            providersPending: true,
            webGlReady: true,
        })

        const providerCheck = checks.find((check): boolean => check.id === "diag-provider")
        const flagsCheck = checks.find((check): boolean => check.id === "diag-flags")

        expect(providerCheck?.status).toBe("pending")
        expect(providerCheck?.details).toContain("still loading")
        expect(flagsCheck?.status).toBe("pending")
        expect(flagsCheck?.details).toContain("still loading")
    })
})
