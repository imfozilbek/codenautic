import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FormLayout } from "@/components/forms/form-layout"
import { renderWithProviders } from "../../utils/render"

describe("FormLayout", (): void => {
    it("when rendered, then displays page title as h1", (): void => {
        renderWithProviders(
            <FormLayout title="Account Settings">
                <p>Form content</p>
            </FormLayout>,
        )

        expect(screen.getByRole("heading", { level: 1, name: "Account Settings" })).not.toBeNull()
    })

    it("when description is provided, then displays it", (): void => {
        renderWithProviders(
            <FormLayout description="Manage your account" title="Settings">
                <p>Content</p>
            </FormLayout>,
        )

        expect(screen.getByText("Manage your account")).not.toBeNull()
    })

    it("when description is not provided, then does not render description", (): void => {
        const { container } = renderWithProviders(
            <FormLayout title="Settings">
                <p data-testid="content">Content</p>
            </FormLayout>,
        )

        const allParagraphs = container.querySelectorAll("p")
        const nonContent = Array.from(allParagraphs).filter(
            (p) => p.getAttribute("data-testid") !== "content",
        )
        expect(nonContent.length).toBe(0)
    })

    it("when actions are provided, then renders actions section", (): void => {
        renderWithProviders(
            <FormLayout actions={<button type="button">Save</button>} title="Settings">
                <p>Content</p>
            </FormLayout>,
        )

        expect(screen.getByRole("button", { name: "Save" })).not.toBeNull()
    })

    it("when actions are not provided, then does not render actions section", (): void => {
        const { container } = renderWithProviders(
            <FormLayout title="Settings">
                <p>Content</p>
            </FormLayout>,
        )

        expect(container.querySelector(".border-t")).toBeNull()
    })

    it("when rendered, then children are visible", (): void => {
        renderWithProviders(
            <FormLayout title="Settings">
                <p data-testid="child">Field area</p>
            </FormLayout>,
        )

        expect(screen.getByTestId("child")).not.toBeNull()
    })
})
