import { act, screen, waitFor } from "@testing-library/react"
import { type ReactElement } from "react"
import { describe, expect, it, vi } from "vitest"

import { type ThemePresetId, useThemeMode } from "@/lib/theme/theme-provider"
import { renderWithProviders } from "../../utils/render"

vi.mock("@/lib/theme/theme-settings-api", async (importOriginal) => {
    const original = await importOriginal<typeof import("@/lib/theme/theme-settings-api")>()
    return {
        ...original,
        createThemeSettingsApiClient: vi.fn(() => undefined),
    }
})

function ThemeFullProbe(): ReactElement {
    const { mode, preset, resolvedMode, presets, setMode, setPreset } = useThemeMode()

    return (
        <div>
            <p data-testid="theme-state">{`${mode}:${preset}`}</p>
            <p data-testid="resolved-mode">{resolvedMode}</p>
            <p data-testid="presets-count">{presets.length}</p>
            <button
                data-testid="set-dark"
                onClick={(): void => {
                    setMode("dark")
                }}
            />
            <button
                data-testid="set-light"
                onClick={(): void => {
                    setMode("light")
                }}
            />
            <button
                data-testid="set-preset-cobalt"
                onClick={(): void => {
                    setPreset("cobalt" as ThemePresetId)
                }}
            />
        </div>
    )
}

describe("ThemeProvider when API client is unavailable", (): void => {
    it("when API client returns undefined in sync-from-API, then keeps local values", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "cobalt")
        localStorage.removeItem("codenautic:ui:theme-profile-synced")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:cobalt")
    })

    it("when API client returns undefined in sync-to-API, then writes fallback sync state locally", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "light")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")
        localStorage.removeItem("codenautic:ui:theme-profile-synced")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "light" })

        await act(async (): Promise<void> => {
            screen.getByTestId("set-dark").click()
        })

        await waitFor((): void => {
            const syncState = localStorage.getItem("codenautic:ui:theme-profile-synced")
            expect(syncState).not.toBeNull()
            if (syncState !== null) {
                const parsed = JSON.parse(syncState) as Record<string, unknown>
                expect(parsed.mode).toBe("dark")
            }
        })
    })

    it("when preset changes without API, then persists sync state locally", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")
        localStorage.removeItem("codenautic:ui:theme-profile-synced")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        await act(async (): Promise<void> => {
            screen.getByTestId("set-preset-cobalt").click()
        })

        await waitFor((): void => {
            const syncState = localStorage.getItem("codenautic:ui:theme-profile-synced")
            expect(syncState).not.toBeNull()
            if (syncState !== null) {
                const parsed = JSON.parse(syncState) as Record<string, unknown>
                expect(parsed.preset).toBe("cobalt")
            }
        })
    })
})
