import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SettingsCodeReviewPage } from "@/pages/settings-code-review.page"
import { renderWithProviders } from "../utils/render"

describe("settings code review page", (): void => {
    it("рендерит новый rule editor", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsCodeReviewPage />)

        const heading = screen.getByRole("heading", { name: "Code Review Configuration" })
        expect(heading).not.toBeNull()

        const ruleEditorInput = screen.getByRole<HTMLTextAreaElement>("textbox", {
            name: "Review rules",
        })
        expect(ruleEditorInput).not.toBeNull()

        await user.type(ruleEditorInput, " additional rule")
        expect(ruleEditorInput.value).toContain("additional rule")
    })
})
