import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { RuleEditor } from "@/components/settings/rule-editor"
import { renderWithProviders } from "../utils/render"

describe("RuleEditor", (): void => {
    it("показывает dynamic TipTap loading state и fallback markdown режим", async (): Promise<void> => {
        const user = userEvent.setup()
        const onChange = vi.fn()

        renderWithProviders(
            <RuleEditor
                label="Review rules"
                onChange={onChange}
                value="## Existing rule\n- Keep diff minimal"
            />,
        )

        expect(screen.getByText(/TipTap mode:/)).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Hide preview" }))
        expect(screen.getByText("Preview is hidden")).not.toBeNull()
    })
})
