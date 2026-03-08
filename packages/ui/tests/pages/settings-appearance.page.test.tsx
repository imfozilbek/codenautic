import { http, HttpResponse } from "msw"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SettingsAppearancePage } from "@/pages/settings-appearance.page"
import { THEME_PRESETS } from "@/lib/theme/theme-provider"
import { server } from "../mocks/server"
import { renderWithProviders } from "../utils/render"

describe("SettingsAppearancePage", (): void => {
    it(
        "переключает mode/preset, применяет advanced controls и сбрасывает тему к default",
        async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsAppearancePage />)

        expect(screen.getByRole("heading", { level: 1, name: "Appearance settings" })).not.toBeNull()

        const darkModeButton = screen.getByRole("button", { name: "Use dark theme" })
        const systemModeButton = screen.getByRole("button", { name: "Use system theme" })

        await user.click(darkModeButton)
        await waitFor(() => {
            expect(darkModeButton.getAttribute("aria-pressed")).toBe("true")
        })

        const secondPreset = THEME_PRESETS.at(1)
        if (secondPreset !== undefined) {
            await user.click(
                screen.getByRole("button", { name: `Set ${secondPreset.label} theme preset` }),
            )
            await waitFor(() => {
                expect(screen.getByText(`preset: ${secondPreset.id}`)).not.toBeNull()
            })
        }

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
            if (secondPreset !== undefined) {
                await user.click(screen.getByRole("button", { name: "Undo last random" }))
                await waitFor(() => {
                    expect(screen.getByText(`preset: ${secondPreset.id}`)).not.toBeNull()
                })
                await user.click(
                    screen.getByRole("button", { name: `Quick preset ${secondPreset.label}` }),
                )
            }
        }

        fireEvent.change(screen.getByLabelText("Accent color picker"), {
            target: { value: "#22cc88" },
        })
        fireEvent.change(screen.getByLabelText("Accent intensity slider"), {
            target: { value: "62" },
        })
        await user.click(screen.getByRole("button", { name: "Warm" }))
        fireEvent.change(screen.getByLabelText("Global radius slider"), {
            target: { value: "20" },
        })
        fireEvent.change(screen.getByLabelText("Form radius slider"), {
            target: { value: "15" },
        })

        await waitFor(() => {
            expect(screen.getByText("base: warm")).not.toBeNull()
            expect(screen.getByText("global radius: 20px")).not.toBeNull()
            expect(screen.getByText("form radius: 15px")).not.toBeNull()
        })
        expect(document.documentElement.style.getPropertyValue("--accent").length).toBeGreaterThan(0)
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
            expect(
                screen.getByRole("combobox", { name: "Theme library selection" }),
            ).not.toBeNull()
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
        expect((jsonTextarea as HTMLTextAreaElement).value).toContain("\"version\": 1")

        const importPayload = JSON.stringify(
            {
                favoritePresetId: THEME_PRESETS.at(0)?.id,
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
                        presetId: THEME_PRESETS.at(0)?.id,
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
        },
        15000,
    )

    it("не перетирает более свежую локальную библиотеку тем устаревшим remote profile", async (): Promise<void> => {
        const localTheme = {
            accentColor: "#22cc88",
            accentIntensity: 64,
            basePaletteId: "warm",
            formRadius: 12,
            globalRadius: 16,
            id: "local-theme-1",
            mode: "system",
            name: "Local Fortress",
            presetId: THEME_PRESETS.at(0)?.id ?? "moonstone",
        }

        localStorage.setItem("codenautic:ui:appearance:library", JSON.stringify([localTheme]))
        localStorage.setItem(
            "codenautic:ui:appearance:library-sync",
            JSON.stringify({
                updatedAtMs: Date.parse("2026-03-07T10:00:00Z"),
            }),
        )

        server.use(
            http.get("http://localhost:3000/api/v1/user/settings", () => {
                return HttpResponse.json({
                    appearance: {
                        themeLibrary: {
                            favoritePresetId: THEME_PRESETS.at(1)?.id,
                            themes: [
                                {
                                    ...localTheme,
                                    id: "remote-theme-1",
                                    name: "Remote Legacy",
                                },
                            ],
                            updatedAtMs: Date.parse("2026-03-01T10:00:00Z"),
                        },
                    },
                })
            }),
            http.put("http://localhost:3000/api/v1/user/settings", () => {
                return HttpResponse.json({})
            }),
            http.patch("http://localhost:3000/api/v1/user/settings", () => {
                return HttpResponse.json({})
            }),
            http.post("http://localhost:3000/api/v1/user/settings", () => {
                return HttpResponse.json({})
            }),
        )

        renderWithProviders(<SettingsAppearancePage />)

        await waitFor((): void => {
            expect(screen.getByRole("option", { name: "Local Fortress" })).not.toBeNull()
        })
        expect(screen.queryByRole("option", { name: "Remote Legacy" })).toBeNull()
    })
})
