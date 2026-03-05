import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SettingsWebhooksPage } from "@/pages/settings-webhooks.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsWebhooksPage", (): void => {
    it("рендерит webhook endpoints и delivery logs", (): void => {
        renderWithProviders(<SettingsWebhooksPage />)

        expect(screen.getByRole("heading", { level: 1, name: "Webhook Management" })).not.toBeNull()
        expect(screen.getByText("https://hooks.acme.dev/code-review")).not.toBeNull()
        expect(screen.getByRole("button", { name: /whsec_\*{4}32af/ })).not.toBeNull()
        expect(screen.getByText("Delivered review.completed payload.")).not.toBeNull()
    })

    it("позволяет фильтровать endpoints по поиску", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        const searchInput = screen.getByPlaceholderText("Search URL or event...")
        await user.type(searchInput, "provider-health")

        expect(screen.getByText("https://hooks.acme.dev/provider-health")).not.toBeNull()
        expect(screen.queryByText("https://hooks.acme.dev/code-review")).toBeNull()
    })
})
