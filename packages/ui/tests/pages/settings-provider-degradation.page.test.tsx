import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SettingsProviderDegradationPage } from "@/pages/settings-provider-degradation.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsProviderDegradationPage", (): void => {
    it("переключает degraded mode и queue/retry критичных действий", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsProviderDegradationPage />)

        expect(
            screen.getByRole("heading", { level: 1, name: "Provider degradation mode" }),
        ).not.toBeNull()
        expect(screen.getByText("Operational mode")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Simulate outage" }))
        await waitFor(() => {
            expect(screen.getByText("Degraded mode active")).not.toBeNull()
        })
        expect(screen.getByText("Review generation")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Queue critical action" }))
        expect(screen.getByText("CCR finalization webhook")).not.toBeNull()
        expect(screen.getByText("Status: queued")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Retry queued actions" }))
        await waitFor(() => {
            expect(screen.getByText("Status: retrying")).not.toBeNull()
        })

        await user.click(screen.getByRole("button", { name: "Mark operational" }))
        await waitFor(() => {
            expect(screen.getByText("Operational mode")).not.toBeNull()
        })
    })
})
