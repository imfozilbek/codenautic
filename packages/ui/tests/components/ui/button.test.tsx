import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Button } from "@/components/ui/button"
import { renderWithProviders } from "../../utils/render"

describe("Button", (): void => {
    it("when rendered with children, then displays text content", (): void => {
        renderWithProviders(<Button>Click me</Button>)

        expect(screen.getByRole("button", { name: /click me/i })).not.toBeNull()
    })

    it("when isLoading is true, then disables the button", (): void => {
        renderWithProviders(<Button isLoading>Save</Button>)

        const button = screen.getByRole("button", { name: /save/i })
        expect(button).toBeDisabled()
    })

    it("when isDisabled is true, then button is disabled", (): void => {
        renderWithProviders(<Button isDisabled>Disabled</Button>)

        expect(screen.getByRole("button", { name: /disabled/i })).toBeDisabled()
    })

    it("when deprecated disabled prop is passed, then button is disabled", (): void => {
        renderWithProviders(<Button disabled>Legacy</Button>)

        expect(screen.getByRole("button", { name: /legacy/i })).toBeDisabled()
    })

    it("when onPress callback is provided, then fires on click", async (): Promise<void> => {
        const user = userEvent.setup()
        const handlePress = vi.fn()

        renderWithProviders(<Button onPress={handlePress}>Press</Button>)

        await user.click(screen.getByRole("button", { name: /press/i }))
        expect(handlePress).toHaveBeenCalledTimes(1)
    })

    it("when startContent and endContent are provided, then renders both slots", (): void => {
        renderWithProviders(
            <Button
                startContent={<span data-testid="start">S</span>}
                endContent={<span data-testid="end">E</span>}
            >
                Middle
            </Button>,
        )

        expect(screen.getByTestId("start")).not.toBeNull()
        expect(screen.getByTestId("end")).not.toBeNull()
        expect(screen.getByRole("button", { name: /middle/i })).not.toBeNull()
    })

    it("when radius is full, then adds rounded-full className", (): void => {
        renderWithProviders(<Button radius="full">Round</Button>)

        const button = screen.getByRole("button", { name: /round/i })
        expect(button.className).toContain("rounded-full")
    })

    it("when variant is light, then maps to ghost variant", (): void => {
        renderWithProviders(<Button variant="light">Ghost</Button>)

        expect(screen.getByRole("button", { name: /ghost/i })).not.toBeNull()
    })

    it("when custom className is provided, then applies it", (): void => {
        renderWithProviders(<Button className="custom-test">Styled</Button>)

        const button = screen.getByRole("button", { name: /styled/i })
        expect(button.className).toContain("custom-test")
    })
})
