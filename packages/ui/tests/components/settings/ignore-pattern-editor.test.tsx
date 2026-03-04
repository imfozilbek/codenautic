import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { IgnorePatternEditor } from "@/components/settings/ignore-pattern-editor"
import { renderWithProviders } from "../../utils/render"

describe("IgnorePatternEditor", (): void => {
    it("рендерит helper и количество паттернов", (): void => {
        renderWithProviders(
            <IgnorePatternEditor
                helperText="Custom helper"
                ignoredPatterns={["/dist", "**/*.snap"]}
                onChange={(_patterns: ReadonlyArray<string>): void => {}}
            />,
        )

        expect(screen.getByLabelText("Ignore patterns")).not.toBeNull()
        expect(screen.getByText("Custom helper")).not.toBeNull()
        expect(screen.getByTestId("ignore-pattern-count")).toHaveTextContent("Patterns: 2")
    })

    it("нормализует и сохраняет паттерны через submit", async (): Promise<void> => {
        const user = userEvent.setup()
        const onChange = vi.fn((_patterns: ReadonlyArray<string>): void => {})

        renderWithProviders(
            <IgnorePatternEditor
                ignoredPatterns={["/dist"]}
                onChange={onChange}
            />,
        )

        const editor = screen.getByLabelText("Ignore patterns")
        await user.click(editor)
        await user.keyboard("{Control>}a{/Control}{Backspace}")
        await user.type(editor, "/vendor\n**/*.snap\n/vendor\n")
        await user.click(screen.getByRole("button", { name: "Save ignore patterns" }))

        expect(onChange).toHaveBeenCalledWith(["/vendor", "**/*.snap"])
    })
})
