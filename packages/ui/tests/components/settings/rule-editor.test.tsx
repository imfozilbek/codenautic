import { useState, type ReactElement } from "react"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { RuleEditor } from "@/components/settings/rule-editor"
import { renderWithProviders } from "../../utils/render"

function ControlledRuleEditor(props: { readonly initialValue: string }): ReactElement {
    const [value, setValue] = useState<string>(props.initialValue)

    return (
        <RuleEditor
            id="test-rule-editor"
            label="Rule editor"
            onChange={setValue}
            value={value}
        />
    )
}

describe("RuleEditor", (): void => {
    it("обновляет превью при вводе markdown", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ControlledRuleEditor initialValue="# Intro" />)

        const textarea = screen.getByRole("textbox", { name: "Rule editor" })
        await user.type(textarea, " text")

        expect(
            await screen.findByRole("heading", { level: 1, name: "Intro text" }),
        ).not.toBeNull()
    })

    it("добавляет markdown-разметку кнопкой Bold", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ControlledRuleEditor initialValue="rule" />)

        const textarea = screen.getByRole("textbox", { name: "Rule editor" }) as HTMLTextAreaElement
        textarea.setSelectionRange(0, 4)
        const boldButton = screen.getByRole("button", { name: "Bold" })
        await user.click(boldButton)

        expect(screen.getByRole("textbox", { name: "Rule editor" })).toHaveValue("**rule**")
    })

    it("вставляет code block", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ControlledRuleEditor initialValue="snippet" />)

        const textarea = screen.getByRole("textbox", { name: "Rule editor" }) as HTMLTextAreaElement
        await user.click(textarea)
        textarea.setSelectionRange(0, 7)
        const codeButton = screen.getByRole("button", { name: "Code block" })
        await user.click(codeButton)

        expect(screen.getByRole("textbox", { name: "Rule editor" })).toHaveValue(
            "\n```\nsnippet\n```\n",
        )
    })
})
