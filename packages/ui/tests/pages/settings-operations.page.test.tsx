import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SettingsOperationsPage } from "@/pages/settings-operations.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsOperationsPage", (): void => {
    it("renders tab list with Health, Concurrency, and Jobs tabs", (): void => {
        renderWithProviders(<SettingsOperationsPage />)

        expect(screen.getByRole("tab", { name: "Health" })).not.toBeNull()
        expect(screen.getByRole("tab", { name: "Concurrency" })).not.toBeNull()
        expect(screen.getByRole("tab", { name: "Jobs" })).not.toBeNull()
    })

    it("renders first tab panel content by default", (): void => {
        renderWithProviders(<SettingsOperationsPage />)

        expect(screen.getByRole("tabpanel")).not.toBeNull()
    })
})
