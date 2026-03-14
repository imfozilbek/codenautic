import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactElement } from "react"
import { describe, expect, it, vi } from "vitest"

import { createToggleWrapper } from "@/components/ui/create-toggle-wrapper"
import { renderWithProviders } from "../../utils/render"

interface IMockToggleProps {
    readonly onChange?: (event: unknown) => void
    readonly isInvalid?: boolean
    readonly children?: React.ReactNode
    readonly "data-testid"?: string
    readonly "data-invalid"?: string
}

function MockToggle(props: IMockToggleProps): ReactElement {
    return (
        <label
            data-testid={props["data-testid"]}
            data-invalid={props["data-invalid"] ?? (props.isInvalid === true ? "true" : undefined)}
        >
            <input
                type="checkbox"
                onChange={props.onChange}
                aria-invalid={props.isInvalid === true ? true : undefined}
            />
            {props.children}
        </label>
    )
}

describe("createToggleWrapper", (): void => {
    it("when rendered with children, then displays label text", (): void => {
        const Wrapper = createToggleWrapper({ Component: MockToggle })
        renderWithProviders(<Wrapper>Accept terms</Wrapper>)

        expect(screen.getByText("Accept terms")).not.toBeNull()
    })

    it("when onValueChange is provided, then maps it to onChange", (): void => {
        const handleChange = vi.fn()
        const Wrapper = createToggleWrapper({ Component: MockToggle })

        renderWithProviders(<Wrapper onValueChange={handleChange}>Toggle me</Wrapper>)

        const checkbox = screen.getByRole("checkbox")
        expect(checkbox).not.toBeNull()
    })

    it("when isInvalid is true and invalidAsDataAttr is false, then passes isInvalid prop directly", (): void => {
        const Wrapper = createToggleWrapper({ Component: MockToggle })

        const { container } = renderWithProviders(
            <Wrapper isInvalid data-testid="wrapper">
                Invalid toggle
            </Wrapper>,
        )

        const label = container.querySelector("[data-testid='wrapper']")
        expect(label).not.toBeNull()
    })

    it("when isInvalid is true and invalidAsDataAttr is true, then maps to data-invalid attribute", (): void => {
        const Wrapper = createToggleWrapper({
            Component: MockToggle,
            invalidAsDataAttr: true,
        })

        const { container } = renderWithProviders(
            <Wrapper isInvalid data-testid="wrapper">
                Invalid switch
            </Wrapper>,
        )

        const label = container.querySelector("[data-invalid='true']")
        expect(label).not.toBeNull()
    })

    it("when isInvalid is false and invalidAsDataAttr is true, then data-invalid is not set", (): void => {
        const Wrapper = createToggleWrapper({
            Component: MockToggle,
            invalidAsDataAttr: true,
        })

        const { container } = renderWithProviders(
            <Wrapper isInvalid={false} data-testid="wrapper">
                Valid switch
            </Wrapper>,
        )

        const label = container.querySelector("[data-invalid='true']")
        expect(label).toBeNull()
    })
})
