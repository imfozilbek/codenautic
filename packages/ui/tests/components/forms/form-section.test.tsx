import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FormSection } from "@/components/forms/form-section"
import { renderWithProviders } from "../../utils/render"

describe("FormSection", (): void => {
    it("when rendered, then displays heading", (): void => {
        renderWithProviders(
            <FormSection heading="General Settings">
                <p>Fields</p>
            </FormSection>,
        )

        expect(screen.getByText("General Settings")).not.toBeNull()
    })

    it("when description is provided, then displays it", (): void => {
        renderWithProviders(
            <FormSection description="Configure basic options" heading="General">
                <p>Fields</p>
            </FormSection>,
        )

        expect(screen.getByText("Configure basic options")).not.toBeNull()
    })

    it("when description is not provided, then does not render description paragraph", (): void => {
        const { container } = renderWithProviders(
            <FormSection heading="General">
                <p data-testid="field">Field</p>
            </FormSection>,
        )

        const paragraphs = container.querySelectorAll("p")
        const descriptions = Array.from(paragraphs).filter(
            (p) => p.getAttribute("data-testid") !== "field",
        )
        expect(descriptions.length).toBe(0)
    })

    it("when rendered, then wraps children in section element", (): void => {
        const { container } = renderWithProviders(
            <FormSection heading="Test">
                <p>Child</p>
            </FormSection>,
        )

        expect(container.querySelector("section")).not.toBeNull()
    })

    it("when rendered, then heading is h3", (): void => {
        renderWithProviders(
            <FormSection heading="Settings">
                <p>Content</p>
            </FormSection>,
        )

        expect(screen.getByRole("heading", { level: 3 })).not.toBeNull()
    })
})
