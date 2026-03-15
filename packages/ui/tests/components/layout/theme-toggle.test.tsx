import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ThemeToggle } from "@/components/layout/theme-toggle"
import { renderWithProviders } from "../../utils/render"

describe("ThemeToggle", (): void => {
    it("when rendered, then shows dark, system and light mode buttons", (): void => {
        renderWithProviders(<ThemeToggle />)

        expect(screen.getByLabelText("Use dark theme")).not.toBeNull()
        expect(screen.getByLabelText("Use system theme")).not.toBeNull()
        expect(screen.getByLabelText("Use light theme")).not.toBeNull()
    })

    it("when rendered, then shows radiogroup for theme mode", (): void => {
        renderWithProviders(<ThemeToggle />)

        const radiogroup = screen.getByRole("radiogroup")
        expect(radiogroup).not.toBeNull()
    })

    it("when a mode button is clicked, then updates selected state", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ThemeToggle />, { themeMode: "system" })

        const lightButton = screen.getByLabelText("Use light theme")
        await user.click(lightButton)

        expect(lightButton.getAttribute("aria-pressed")).toBe("true")
    })

    it("when className is provided, then applies it to wrapper", (): void => {
        const { container } = renderWithProviders(<ThemeToggle className="custom-toggle" />)

        const wrapper = container.firstElementChild
        expect(wrapper?.className).toContain("custom-toggle")
    })

    it("when rendered, then shows preset label text", (): void => {
        renderWithProviders(<ThemeToggle />)

        expect(screen.getByText(/Preset:/)).not.toBeNull()
    })

    it("when rendered, then shows sr-only resolved mode announcement", (): void => {
        renderWithProviders(<ThemeToggle />)

        const srAnnouncement = screen.getByText(/Active theme resolved mode is/)
        expect(srAnnouncement).not.toBeNull()
        expect(srAnnouncement.className).toContain("sr-only")
    })
})
