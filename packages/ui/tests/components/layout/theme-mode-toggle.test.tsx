import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ThemeModeToggle } from "@/components/layout/theme-mode-toggle"
import { renderWithProviders } from "../../utils/render"

describe("ThemeModeToggle", (): void => {
    it("when rendered, then shows radiogroup with three mode buttons", (): void => {
        renderWithProviders(<ThemeModeToggle />)

        const radiogroup = screen.getByRole("radiogroup", {
            name: "Theme mode",
        })
        expect(radiogroup).not.toBeNull()

        const buttons = screen.getAllByRole("button")
        expect(buttons.length).toBeGreaterThanOrEqual(3)
    })

    it("when rendered, then shows dark, system and light mode buttons with aria-labels", (): void => {
        renderWithProviders(<ThemeModeToggle />)

        expect(screen.getByLabelText("Use dark theme")).not.toBeNull()
        expect(screen.getByLabelText("Use system theme")).not.toBeNull()
        expect(screen.getByLabelText("Use light theme")).not.toBeNull()
    })

    it("when a mode button is clicked, then updates selected state", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<ThemeModeToggle />, { themeMode: "system" })

        const lightButton = screen.getByLabelText("Use light theme")
        await user.click(lightButton)

        expect(lightButton.getAttribute("aria-pressed")).toBe("true")
    })

    it("when className is provided, then applies it to wrapper div", (): void => {
        const { container } = renderWithProviders(
            <ThemeModeToggle className="custom-theme-class" />,
        )

        const wrapper = container.firstElementChild
        expect(wrapper?.className).toContain("custom-theme-class")
    })

    it("when rendered, then shows sr-only resolved mode announcement", (): void => {
        renderWithProviders(<ThemeModeToggle />)

        const srAnnouncement = screen.getByText(/Active theme resolved mode is/)
        expect(srAnnouncement).not.toBeNull()
        expect(srAnnouncement.className).toContain("sr-only")
    })
})
