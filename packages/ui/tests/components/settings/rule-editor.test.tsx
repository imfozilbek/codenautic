import { useState, type ReactElement } from "react"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { RuleEditor } from "@/components/settings/rule-editor"
import { renderWithProviders } from "../../utils/render"

function ControlledRuleEditor(
    props: {
        readonly initialValue: string
        readonly maxLength?: number
        readonly showPreview?: boolean
        readonly placeholder?: string
    },
): ReactElement {
    const [value, setValue] = useState<string>(props.initialValue)

    return (
        <RuleEditor
            id="test-rule-editor"
            label="Rule editor"
            maxLength={props.maxLength}
            onChange={setValue}
            placeholder={props.placeholder}
            showPreview={props.showPreview}
            value={value}
        />
    )
}

describe("RuleEditor", (): void => {
    it("обновляет превью при вводе markdown", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ControlledRuleEditor initialValue="# Intro" />)

        const textarea = screen.getByRole("textbox", {
            name: "Rule editor",
        })
        await user.type(textarea, " text")

        expect(await screen.findByRole("heading", { level: 1, name: "Intro text" })).not.toBeNull()
    })

    it("добавляет markdown-разметку кнопкой Bold", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ControlledRuleEditor initialValue="rule" />)

        const textarea = screen.getByRole<HTMLTextAreaElement>("textbox", {
            name: "Rule editor",
        })
        textarea.setSelectionRange(0, 4)
        const boldButton = screen.getByRole("button", { name: "Bold" })
        await user.click(boldButton)

        expect(screen.getByRole("textbox", { name: "Rule editor" })).toHaveValue("**rule**")
    })

    it("вставляет code block", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ControlledRuleEditor initialValue="snippet" />)

        const textarea = screen.getByRole<HTMLTextAreaElement>("textbox", {
            name: "Rule editor",
        })
        await user.click(textarea)
        textarea.setSelectionRange(0, 7)
        const codeButton = screen.getByRole("button", { name: "Code block" })
        await user.click(codeButton)

        expect(screen.getByRole("textbox", { name: "Rule editor" })).toHaveValue(
            "\n```\nsnippet\n```\n",
        )
    })

    it("when Italic button is clicked with selection, then wraps text in single asterisks", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ControlledRuleEditor initialValue="emphasis" />)

        const textarea = screen.getByRole<HTMLTextAreaElement>("textbox", {
            name: "Rule editor",
        })
        textarea.setSelectionRange(0, 8)
        const italicButton = screen.getByRole("button", { name: "Italic" })
        await user.click(italicButton)

        expect(screen.getByRole("textbox", { name: "Rule editor" })).toHaveValue("*emphasis*")
    })

    it("when Heading button is clicked on plain text, then adds ## prefix", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ControlledRuleEditor initialValue="Section title" />)

        const textarea = screen.getByRole<HTMLTextAreaElement>("textbox", {
            name: "Rule editor",
        })
        textarea.setSelectionRange(0, 13)
        const headingButton = screen.getByRole("button", { name: "Heading" })
        await user.click(headingButton)

        expect(screen.getByRole("textbox", { name: "Rule editor" })).toHaveValue(
            "## Section title",
        )
    })

    it("when Heading button is clicked on text already prefixed with ##, then removes ## prefix", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ControlledRuleEditor initialValue="## Section title" />)

        const textarea = screen.getByRole<HTMLTextAreaElement>("textbox", {
            name: "Rule editor",
        })
        textarea.setSelectionRange(0, 16)
        const headingButton = screen.getByRole("button", { name: "Heading" })
        await user.click(headingButton)

        expect(screen.getByRole("textbox", { name: "Rule editor" })).toHaveValue("Section title")
    })

    it("when Bold button is clicked with no selection, then inserts **text** placeholder", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ControlledRuleEditor initialValue="" />)

        const textarea = screen.getByRole<HTMLTextAreaElement>("textbox", {
            name: "Rule editor",
        })
        await user.click(textarea)
        textarea.setSelectionRange(0, 0)
        const boldButton = screen.getByRole("button", { name: "Bold" })
        await user.click(boldButton)

        expect(screen.getByRole("textbox", { name: "Rule editor" })).toHaveValue("**text**")
    })

    it("when Code block button is clicked with no selection, then inserts code placeholder", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ControlledRuleEditor initialValue="" />)

        const textarea = screen.getByRole<HTMLTextAreaElement>("textbox", {
            name: "Rule editor",
        })
        await user.click(textarea)
        textarea.setSelectionRange(0, 0)
        const codeButton = screen.getByRole("button", { name: "Code block" })
        await user.click(codeButton)

        expect(screen.getByRole("textbox", { name: "Rule editor" })).toHaveValue(
            "\n```\ncode\n```\n",
        )
    })

    it("when showPreview is false, then renders 'Preview is hidden' text", (): void => {
        renderWithProviders(<ControlledRuleEditor initialValue="test" showPreview={false} />)

        expect(screen.getByText("Preview is hidden")).not.toBeNull()
    })

    it("when Hide preview button is clicked, then shows 'Preview is hidden' and toggles back", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ControlledRuleEditor initialValue="# Hello" />)

        const toggleButton = screen.getByRole("button", { name: "Hide preview" })
        await user.click(toggleButton)

        expect(screen.getByText("Preview is hidden")).not.toBeNull()
        expect(screen.getByRole("button", { name: "Show preview" })).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Show preview" }))

        expect(screen.queryByText("Preview is hidden")).toBeNull()
    })

    it("when maxLength is provided, then renders max length indicator", (): void => {
        renderWithProviders(<ControlledRuleEditor initialValue="abc" maxLength={100} />)

        expect(screen.getByText("3 symbols")).not.toBeNull()
        expect(screen.getByText("Max 100 symbols")).not.toBeNull()
    })

    it("when maxLength is not provided, then does not render max length indicator", (): void => {
        renderWithProviders(<ControlledRuleEditor initialValue="abc" />)

        expect(screen.getByText("3 symbols")).not.toBeNull()
        expect(screen.queryByText(/Max \d+ symbols/u)).toBeNull()
    })

    it("when value exceeds maxLength, then max length text uses danger styling", (): void => {
        const onChange = vi.fn()
        renderWithProviders(
            <RuleEditor
                label="Rule editor"
                maxLength={5}
                onChange={onChange}
                value="this is longer than five"
            />,
        )

        const maxLengthEl = screen.getByText("Max 5 symbols")
        expect(maxLengthEl.className).toContain("text-danger")
    })

    it("when custom placeholder is provided, then textarea shows it", (): void => {
        renderWithProviders(
            <ControlledRuleEditor initialValue="" placeholder="Write rules here..." />,
        )

        const textarea = screen.getByRole("textbox", { name: "Rule editor" })
        expect(textarea).toHaveAttribute("placeholder", "Write rules here...")
    })

    it("when no id is provided, then generates a fallback id", (): void => {
        const onChange = vi.fn()
        renderWithProviders(
            <RuleEditor label="Unnamed editor" onChange={onChange} value="" />,
        )

        const textarea = screen.getByRole("textbox", { name: "Unnamed editor" })
        expect(textarea.id).toContain("rule-editor-")
        expect(textarea.id).toContain("-input")
    })

    it("when Italic button is clicked with no selection, then inserts *text* placeholder", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ControlledRuleEditor initialValue="" />)

        const textarea = screen.getByRole<HTMLTextAreaElement>("textbox", {
            name: "Rule editor",
        })
        await user.click(textarea)
        textarea.setSelectionRange(0, 0)
        const italicButton = screen.getByRole("button", { name: "Italic" })
        await user.click(italicButton)

        expect(screen.getByRole("textbox", { name: "Rule editor" })).toHaveValue("*text*")
    })
})
