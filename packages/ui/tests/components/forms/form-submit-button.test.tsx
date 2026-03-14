import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FormSubmitButton } from "@/components/forms"
import { renderWithProviders } from "../../utils/render"

describe("FormSubmitButton", (): void => {
    it("when rendered, then shows children text", (): void => {
        renderWithProviders(<FormSubmitButton>Save</FormSubmitButton>)

        expect(screen.getByRole("button", { name: "Save" })).not.toBeNull()
    })

    it("when rendered, then has type submit", (): void => {
        renderWithProviders(<FormSubmitButton>Save</FormSubmitButton>)

        const button = screen.getByRole("button", { name: "Save" })
        expect(button.getAttribute("type")).toBe("submit")
    })

    it("when isSubmitting is true, then shows submittingText", (): void => {
        renderWithProviders(
            <FormSubmitButton isSubmitting submittingText="Saving...">
                Save
            </FormSubmitButton>,
        )

        expect(screen.getByText("Saving...")).not.toBeNull()
    })

    it("when isSubmitting is true, then button is in loading state", (): void => {
        renderWithProviders(<FormSubmitButton isSubmitting>Save</FormSubmitButton>)

        const button = screen.getByRole("button")
        expect(
            button.hasAttribute("disabled") ||
                button.getAttribute("data-disabled") === "true" ||
                button.getAttribute("data-loading") === "true",
        ).toBe(true)
    })

    it("when disabled is true, then button is disabled", (): void => {
        renderWithProviders(<FormSubmitButton disabled>Save</FormSubmitButton>)

        const button = screen.getByRole("button")
        expect(
            button.hasAttribute("disabled") || button.getAttribute("data-disabled") === "true",
        ).toBe(true)
    })

    it("when isSubmitting is true and no submittingText, then shows children", (): void => {
        renderWithProviders(<FormSubmitButton isSubmitting>Save</FormSubmitButton>)

        expect(screen.getByText("Save")).not.toBeNull()
    })
})
