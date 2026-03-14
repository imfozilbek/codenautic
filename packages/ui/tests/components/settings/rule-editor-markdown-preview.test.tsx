import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import RuleEditorMarkdownPreview from "@/components/settings/rule-editor-markdown-preview"
import { renderWithProviders } from "../../utils/render"

vi.mock("react-markdown", () => ({
    default: ({ children }: { readonly children?: string }): React.ReactElement => (
        <div data-testid="react-markdown">{children}</div>
    ),
}))

describe("RuleEditorMarkdownPreview", (): void => {
    it("when rendered with content, then renders markdown text", (): void => {
        renderWithProviders(<RuleEditorMarkdownPreview content="Hello **world**" />)

        expect(screen.getByTestId("react-markdown")).not.toBeNull()
        expect(screen.getByText("Hello **world**")).not.toBeNull()
    })

    it("when rendered, then wraps content in an article element", (): void => {
        const { container } = renderWithProviders(
            <RuleEditorMarkdownPreview content="Some content" />,
        )

        const article = container.querySelector("article")
        expect(article).not.toBeNull()
    })

    it("when rendered with empty content, then still renders article wrapper", (): void => {
        const { container } = renderWithProviders(<RuleEditorMarkdownPreview content="" />)

        const article = container.querySelector("article")
        expect(article).not.toBeNull()
    })

    it("when rendered, then article has prose styling classes", (): void => {
        const { container } = renderWithProviders(<RuleEditorMarkdownPreview content="Content" />)

        const article = container.querySelector("article")
        expect(article?.className).toContain("prose")
    })
})
