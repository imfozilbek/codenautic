import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SettingsRulesLibraryPage } from "@/pages/settings-rules-library.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsRulesLibraryPage", (): void => {
    it("покрывает browse import create и test сценарий библиотеки правил", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsRulesLibraryPage />)

        expect(screen.getByRole("heading", { level: 1, name: "Rules library" })).not.toBeNull()

        await user.type(screen.getByRole("textbox", { name: "Search rules" }), "Unsafe eval")
        expect(screen.getByText("Unsafe eval guard")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Import" }))
        expect(screen.getByRole("button", { name: "Imported" })).not.toBeNull()

        await user.type(screen.getByRole("textbox", { name: "Rule name" }), "Block console log")
        await user.type(
            screen.getByRole("textbox", { name: "Description" }),
            "Disallow console.log in production changes",
        )
        await user.type(
            screen.getByRole("textbox", { name: "Rule expression" }),
            "console.log(",
        )
        await user.click(screen.getByRole("button", { name: "Create custom rule" }))

        expect(screen.getByText("Block console log")).not.toBeNull()

        await user.type(
            screen.getByRole("textbox", { name: "Sample input" }),
            "if (debug) { console.log('leak') }",
        )
        await user.click(screen.getByRole("button", { name: "Test selected rule" }))

        expect(screen.getByText("Rule matched")).not.toBeNull()
    })
})
