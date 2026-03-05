import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SessionRecoveryPage } from "@/pages/session-recovery.page"
import { renderWithProviders } from "../utils/render"

describe("SessionRecoveryPage", (): void => {
    it("показывает route-level recovery flow для session expiry", (): void => {
        renderWithProviders(<SessionRecoveryPage />)

        expect(screen.getByRole("heading", { level: 1, name: "Session recovery flow" })).not.toBeNull()
        expect(screen.getByText("Recovery steps")).not.toBeNull()
        expect(screen.getByRole("button", { name: "Open organization settings" })).not.toBeNull()
        expect(screen.getByRole("button", { name: "Re-authenticate" })).not.toBeNull()
        expect(screen.getByRole("button", { name: "Back to diagnostics" })).not.toBeNull()
    })
})

