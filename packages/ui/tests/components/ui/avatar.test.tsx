import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Avatar } from "@/components/ui/avatar"
import { renderWithProviders } from "../../utils/render"

describe("Avatar", (): void => {
    it("when name is provided, then renders fallback initials", (): void => {
        renderWithProviders(<Avatar name="John Doe" />)

        expect(screen.getByText("JO")).not.toBeNull()
    })

    it("when fallback text is provided, then renders first 2 characters uppercased", (): void => {
        renderWithProviders(<Avatar fallback="admin" />)

        expect(screen.getByText("AD")).not.toBeNull()
    })

    it("when label is provided, then uses label for fallback", (): void => {
        renderWithProviders(<Avatar label="test user" />)

        expect(screen.getByText("TE")).not.toBeNull()
    })

    it("when src is provided, then renders avatar with image slot", (): void => {
        const { container } = renderWithProviders(
            <Avatar src="https://example.com/avatar.png" name="User" />,
        )

        const avatar =
            container.querySelector("[data-slot='avatar']") ?? container.querySelector("span")
        expect(avatar).not.toBeNull()
    })

    it("when no name or fallback, then renders avatar container without fallback text", (): void => {
        const { container } = renderWithProviders(<Avatar />)

        expect(container.firstChild).not.toBeNull()
        expect(container.querySelector("[data-slot='avatar-fallback']")).toBeNull()
    })

    it("when name has single character, then renders one character uppercased", (): void => {
        renderWithProviders(<Avatar name="x" />)

        expect(screen.getByText("X")).not.toBeNull()
    })
})
