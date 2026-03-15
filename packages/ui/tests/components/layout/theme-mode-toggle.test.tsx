import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi, beforeEach } from "vitest"

import { ThemeModeToggle } from "@/components/layout/theme-mode-toggle"
import { renderWithProviders } from "../../utils/render"

const mockSetMode = vi.fn()
const mockSetPreset = vi.fn()

const mockState = {
    mode: "system" as "dark" | "light" | "system",
    preset: "sunrise" as const,
    resolvedMode: "light" as "dark" | "light",
}

vi.mock("@/lib/theme/use-theme", () => ({
    useTheme: (): {
        mode: "dark" | "light" | "system"
        preset: string
        presets: ReadonlyArray<{ readonly id: string; readonly label: string }>
        resolvedMode: "dark" | "light"
        setMode: (m: string) => void
        setPreset: (p: string) => void
    } => ({
        mode: mockState.mode,
        preset: mockState.preset,
        presets: [
            { id: "moonstone", label: "Moonstone" },
            { id: "sunrise", label: "Sunrise" },
        ],
        resolvedMode: mockState.resolvedMode,
        setMode: mockSetMode,
        setPreset: mockSetPreset,
    }),
}))

describe("ThemeModeToggle", (): void => {
    beforeEach((): void => {
        mockState.mode = "system"
        mockState.preset = "sunrise"
        mockState.resolvedMode = "light"
        mockSetMode.mockClear()
        mockSetPreset.mockClear()
    })

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

    it("when a mode button is clicked, then calls setMode", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<ThemeModeToggle />)

        const lightButton = screen.getByLabelText("Use light theme")
        await user.click(lightButton)

        expect(mockSetMode).toHaveBeenCalledWith("light")
    })

    it("when className is provided, then applies it to wrapper div", (): void => {
        const { container } = renderWithProviders(
            <ThemeModeToggle className="custom-theme-class" />,
        )

        const wrapper = container.querySelector(".custom-theme-class")
        expect(wrapper).not.toBeNull()
    })

    it("when rendered, then shows sr-only resolved mode announcement", (): void => {
        renderWithProviders(<ThemeModeToggle />)

        const srAnnouncement = screen.getByText(/Active theme resolved mode is/)
        expect(srAnnouncement).not.toBeNull()
        expect(srAnnouncement.className).toContain("sr-only")
    })
})
