import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SettingsAppearancePage } from "@/pages/settings-appearance.page"
import { renderWithProviders } from "../utils/render"

const mockSetMode = vi.fn()
const mockSetPreset = vi.fn()

const mockState = {
    mode: "system" as "dark" | "light" | "system",
    preset: "sunrise" as string,
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
            { id: "cobalt", label: "Cobalt" },
            { id: "forest", label: "Forest" },
            { id: "sunrise", label: "Sunrise" },
            { id: "graphite", label: "Graphite" },
            { id: "aqua", label: "Aqua" },
        ],
        resolvedMode: mockState.resolvedMode,
        setMode: (m: string): void => {
            mockState.mode = m as "dark" | "light" | "system"
            mockSetMode(m)
        },
        setPreset: (p: string): void => {
            mockState.preset = p
            mockSetPreset(p)
        },
    }),
}))

describe("SettingsAppearancePage", (): void => {
    it("переключает mode/preset, применяет advanced controls и сбрасывает тему к default", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsAppearancePage />)

        expect(
            screen.getByRole("heading", { level: 1, name: "Appearance settings" }),
        ).not.toBeNull()

        const darkModeButton = screen.getByRole("button", { name: "Use dark theme" })
        const systemModeButton = screen.getByRole("button", { name: "Use system theme" })

        await user.click(darkModeButton)
        await waitFor(() => {
            expect(darkModeButton.getAttribute("aria-pressed")).toBe("true")
        })

        await user.click(
            screen.getByRole("button", { name: "Set Cobalt theme preset" }),
        )
        await waitFor(() => {
            expect(screen.getByText("preset: cobalt")).not.toBeNull()
        })

        await user.click(screen.getByRole("button", { name: "Random preset (Alt+R)" }))
        const applyRandomButton = screen.queryByRole("button", { name: "Apply random preset" })
        if (applyRandomButton !== null) {
            await waitFor(() => {
                expect(screen.getByText(/Preview preset:/)).not.toBeNull()
            })
            await user.click(applyRandomButton)
            await waitFor(() => {
                expect(screen.getByRole("button", { name: "Undo last random" })).not.toBeNull()
            })
            await user.click(screen.getByRole("button", { name: "Undo last random" }))
            await waitFor(() => {
                expect(screen.getByText("preset: cobalt")).not.toBeNull()
            })
            await user.click(
                screen.getByRole("button", { name: "Quick preset Cobalt" }),
            )
        }

        fireEvent.change(screen.getByLabelText("Accent color picker"), {
            target: { value: "#22cc88" },
        })
        fireEvent.change(screen.getByLabelText("Accent intensity slider"), {
            target: { value: "62" },
        })
        fireEvent.change(screen.getByLabelText("Global radius slider"), {
            target: { value: "20" },
        })
        fireEvent.change(screen.getByLabelText("Form radius slider"), {
            target: { value: "15" },
        })

        await waitFor(() => {
            expect(screen.getByText("global radius: 20px")).not.toBeNull()
            expect(screen.getByText("form radius: 15px")).not.toBeNull()
        })
        expect(document.documentElement.style.getPropertyValue("--accent").length).toBeGreaterThan(
            0,
        )
        expect(document.documentElement.style.getPropertyValue("--radius-md")).toBe("20px")

        await user.click(screen.getByRole("button", { name: "Reset to default" }))
        await waitFor(() => {
            expect(systemModeButton.getAttribute("aria-pressed")).toBe("true")
        })

        await user.click(screen.getByRole("button", { name: "Pin current preset" }))
        expect(screen.getByText(/pinned:/)).not.toBeNull()

        await user.type(screen.getByRole("textbox", { name: "Theme name" }), "Security Focus Theme")
        await user.click(screen.getByRole("button", { name: "Save current theme" }))
        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: "Theme library selection" })).not.toBeNull()
            expect(screen.getByRole("option", { name: "Security Focus Theme" })).not.toBeNull()
        })

        await user.click(screen.getByRole("button", { name: "Duplicate selected" }))
        await waitFor(() => {
            expect(screen.getByRole("option", { name: "Security Focus Theme Copy" })).not.toBeNull()
        })

        await user.clear(screen.getByRole("textbox", { name: "Theme name" }))
        await user.type(screen.getByRole("textbox", { name: "Theme name" }), "Security Focus Theme")
        await user.click(screen.getByRole("button", { name: "Rename selected" }))
        await waitFor(() => {
            expect(screen.getByRole("option", { name: "Security Focus Theme (2)" })).not.toBeNull()
        })

        await user.click(screen.getByRole("button", { name: "Export library JSON" }))
        const jsonTextarea = screen.getByRole("textbox", { name: "Theme library json" })
        expect((jsonTextarea as HTMLTextAreaElement).value).toContain('"version": 1')

        const importPayload = JSON.stringify(
            {
                favoritePresetId: "moonstone",
                themes: [
                    {
                        accentColor: "#22cc88",
                        accentIntensity: 64,
                        basePaletteId: "warm",
                        formRadius: 12,
                        globalRadius: 16,
                        id: "import-theme-1",
                        mode: "system",
                        name: "Security Focus Theme",
                        presetId: "moonstone",
                    },
                ],
                version: 1,
            },
            null,
            2,
        )
        fireEvent.change(jsonTextarea, {
            target: { value: importPayload },
        })
        await user.click(screen.getByRole("button", { name: "Import library JSON" }))
        await waitFor(() => {
            expect(screen.getByRole("option", { name: "Security Focus Theme (3)" })).not.toBeNull()
        })
    }, 15000)
})
