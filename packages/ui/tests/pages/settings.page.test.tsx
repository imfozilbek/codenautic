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

    it("рендерит overview и quick setup ссылки", (): void => {
        renderWithProviders(<SettingsPage />)

        expect(screen.getByRole("heading", { level: 1, name: "Settings" })).not.toBeNull()
        expect(screen.getByText("Quick setup")).not.toBeNull()
        expect(screen.getByRole("link", { name: "Code Review configuration" })).not.toBeNull()
        expect(screen.getByRole("link", { name: "LLM providers" })).not.toBeNull()
        expect(screen.getByRole("link", { name: "Git providers" })).not.toBeNull()
        expect(screen.getByRole("link", { name: "Webhook management" })).not.toBeNull()
        expect(screen.getByRole("link", { name: "Organization settings" })).not.toBeNull()
    })
})
