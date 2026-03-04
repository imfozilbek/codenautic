import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SettingsTokenUsagePage } from "@/pages/settings-token-usage.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsTokenUsagePage", (): void => {
    it("показывает freshness/provenance и обновляет data window по range фильтру", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsTokenUsagePage />)

        expect(screen.getByText("Token Usage")).not.toBeNull()
        expect(screen.getByText("Usage freshness")).not.toBeNull()
        expect(screen.getByText("Explainability for token cost signal")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Open provenance" }))
        expect(screen.getByText("Source data provenance")).not.toBeNull()
        expect(screen.getByText("token-usage-range:7d (Last 7 days)")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "30d" }))
        expect(screen.getByText("token-usage-range:30d (Last 30 days)")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Why this score?" }))
        expect(screen.getByText("Explainability")).not.toBeNull()
        await user.click(screen.getByRole("button", { name: "Export explanation snippet" }))
        expect(screen.getByLabelText("Explainability export snippet")).not.toBeNull()
    })

    it("показывает статус действий refresh/rescan", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsTokenUsagePage />)

        await user.click(screen.getByRole("button", { name: "Refresh" }))
        expect(screen.getByText("Token usage refresh requested.")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Rescan" }))
        expect(screen.getByText("Token usage rescan queued from settings.")).not.toBeNull()
    })
})
