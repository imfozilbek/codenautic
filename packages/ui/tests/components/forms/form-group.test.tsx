import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FormGroup } from "@/components/forms/form-group"
import { renderWithProviders } from "../../utils/render"

describe("FormGroup", (): void => {
    it("when rendered with children, then renders them", (): void => {
        renderWithProviders(
            <FormGroup>
                <p data-testid="child">Field content</p>
            </FormGroup>,
        )

        expect(screen.getByTestId("child")).not.toBeNull()
    })

    it("when withDivider is true, then renders hr separator", (): void => {
        const { container } = renderWithProviders(
            <FormGroup withDivider>
                <p>Fields</p>
            </FormGroup>,
        )

        expect(container.querySelector("hr")).not.toBeNull()
    })

    it("when withDivider is false, then does not render hr", (): void => {
        const { container } = renderWithProviders(
            <FormGroup>
                <p>Fields</p>
            </FormGroup>,
        )

        expect(container.querySelector("hr")).toBeNull()
    })

    it("when multiple children provided, then wraps them in spacing container", (): void => {
        const { container } = renderWithProviders(
            <FormGroup>
                <input data-testid="a" />
                <input data-testid="b" />
            </FormGroup>,
        )

        const wrapper = container.querySelector(".space-y-3")
        expect(wrapper).not.toBeNull()
        expect(wrapper?.children.length).toBe(2)
    })
})
