import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"

import { SettingsAppearancePage } from "@/pages/settings-appearance.page"
import { renderWithProviders } from "../utils/render"

const { store } = vi.hoisted(() => {
    const listeners = new Set<() => void>()
    let snapshot = { mode: "system", preset: "sunrise" }
    return {
        store: {
            setMode(m: string): void {
                snapshot = { ...snapshot, mode: m }
                listeners.forEach((cb): void => { cb() })
            },
            setPreset(p: string): void {
                snapshot = { ...snapshot, preset: p }
                listeners.forEach((cb): void => { cb() })
            },
            subscribe(cb: () => void): () => void {
                listeners.add(cb)
                return (): void => { listeners.delete(cb) }
            },
            getSnapshot(): { mode: string; preset: string } {
                return snapshot
            },
            reset(): void {
                snapshot = { mode: "system", preset: "sunrise" }
            },
        },
    }
})

vi.mock("@/lib/theme/use-theme", () => ({
    useTheme: (): {
        mode: string
        preset: string
        presets: ReadonlyArray<{ readonly id: string; readonly label: string }>
        resolvedMode: "dark" | "light"
        setMode: (m: string) => void
        setPreset: (p: string) => void
    } => {
        const snap = React.useSyncExternalStore(
            store.subscribe,
            store.getSnapshot,
            store.getSnapshot,
        )
        return {
            mode: snap.mode,
            preset: snap.preset,
            presets: [
                { id: "moonstone", label: "Moonstone" },
                { id: "cobalt", label: "Cobalt" },
                { id: "forest", label: "Forest" },
                { id: "sunrise", label: "Sunrise" },
                { id: "graphite", label: "Graphite" },
                { id: "aqua", label: "Aqua" },
            ],
            resolvedMode: snap.mode === "dark" ? "dark" : "light",
            setMode: store.setMode,
            setPreset: store.setPreset,
        }
    },
}))

describe("SettingsAppearancePage", (): void => {
    beforeEach((): void => {
        store.reset()
    })

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
        }

        const accentPicker = screen.getByLabelText<HTMLInputElement>("Accent color picker")
        fireEvent.input(accentPicker, { target: { value: "#ff5500" } })

        const intensitySlider = screen.getByLabelText<HTMLInputElement>(
            "Accent intensity slider",
        )
        fireEvent.change(intensitySlider, { target: { value: "80" } })

        const globalRadiusSlider = screen.getByLabelText<HTMLInputElement>(
            "Global radius slider",
        )
        fireEvent.change(globalRadiusSlider, { target: { value: "20" } })

        const formRadiusSlider = screen.getByLabelText<HTMLInputElement>(
            "Form radius slider",
        )
        fireEvent.change(formRadiusSlider, { target: { value: "15" } })

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

        await user.click(screen.getByRole("button", { name: "Rename selected" }))
        await user.click(screen.getByRole("button", { name: "Duplicate selected" }))
        await user.click(screen.getByRole("button", { name: "Apply selected" }))
        await user.click(screen.getByRole("button", { name: "Delete selected" }))

        const exportButton = screen.getByRole("button", { name: "Export library JSON" })
        await user.click(exportButton)

        const jsonInput = screen.getByLabelText<HTMLTextAreaElement>(
            "Theme library json",
        )
        const THEME_LIBRARY_JSON = JSON.stringify({
            themes: [
                {
                    accentColor: "#123456",
                    accentIntensity: 50,
                    basePaletteId: "neutral",
                    formRadius: 10,
                    globalRadius: 14,
                    id: "imported-theme-1",
                    mode: "dark",
                    name: "Imported Test Theme",
                    presetId: "cobalt",
                },
            ],
            version: 1,
        })
        fireEvent.change(jsonInput, { target: { value: THEME_LIBRARY_JSON } })

        await user.click(screen.getByRole("button", { name: "Import library JSON" }))

        expect(screen.getByText(/Imported Test Theme/)).not.toBeNull()
    })
})
