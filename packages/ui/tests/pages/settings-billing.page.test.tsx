import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SettingsBillingPage } from "@/pages/settings-billing.page"
import { renderWithProviders } from "../utils/render"

afterEach((): void => {
    vi.restoreAllMocks()
})

describe("SettingsBillingPage", (): void => {
    it("управляет lifecycle state, paywall и entitlement lock/unlock", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsBillingPage />)

        expect(screen.getByRole("heading", { level: 1, name: "Billing lifecycle" })).not.toBeNull()
        expect(screen.getByText("Current plan:")).not.toBeNull()

        await user.selectOptions(screen.getByRole("combobox", { name: "Billing status" }), "past_due")
        await user.click(screen.getByRole("button", { name: "Apply billing change" }))

        await waitFor(() => {
            expect(screen.getByText("Payment overdue")).not.toBeNull()
        })
        expect(screen.getAllByText("Locked").length).toBeGreaterThan(0)

        await user.click(screen.getByRole("button", { name: "Mark invoice as paid" }))
        await waitFor(() => {
            expect(screen.getByText("Billing status is healthy")).not.toBeNull()
        })
    })

    it("подтверждает downgrade и фиксирует outcome в истории", async (): Promise<void> => {
        const user = userEvent.setup()
        const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
        renderWithProviders(<SettingsBillingPage />)

        await user.selectOptions(screen.getByRole("combobox", { name: "Billing plan" }), "starter")
        await user.click(screen.getByRole("button", { name: "Apply billing change" }))

        expect(confirmSpy).toHaveBeenCalledTimes(1)
        await waitFor(() => {
            expect(screen.getByText("Current plan:")).not.toBeNull()
            expect(screen.getByText("starter")).not.toBeNull()
        })
        expect(screen.getByText(/Applied starter \/ active successfully/)).not.toBeNull()
    })
})
