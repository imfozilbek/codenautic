import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ScanErrorRecoveryPage } from "@/pages/scan-error-recovery.page"
import { renderWithProviders } from "../utils/render"

describe("ScanErrorRecoveryPage", (): void => {
    it("показывает route-level recovery flow для scan ошибок", (): void => {
        renderWithProviders(<ScanErrorRecoveryPage />)

        expect(screen.getByRole("heading", { level: 1, name: "Scan error recovery" })).not.toBeNull()
        expect(screen.getByText("Recommended steps")).not.toBeNull()
        expect(screen.getByRole("button", { name: "Open repositories" })).not.toBeNull()
        expect(screen.getByRole("button", { name: "Open jobs center" })).not.toBeNull()
        expect(screen.getByRole("button", { name: "Back to diagnostics" })).not.toBeNull()
    })
})

