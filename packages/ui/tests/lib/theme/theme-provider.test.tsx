import { http, HttpResponse } from "msw"
import { screen, waitFor } from "@testing-library/react"
import { type ReactElement } from "react"
import { describe, expect, it } from "vitest"

import { THEME_PRESETS, initializeTheme, useThemeMode } from "@/lib/theme/theme-provider"
import { server } from "../../mocks/server"
import { renderWithProviders } from "../../utils/render"

function ThemeStateProbe(): ReactElement {
    const { mode, preset } = useThemeMode()

    return <p data-testid="theme-state">{`${mode}:${preset}`}</p>
}

describe("ThemeProvider", (): void => {
    it("не падает при initializeTheme, если localStorage недоступен", (): void => {
        const localStorageDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage")
        if (localStorageDescriptor === undefined) {
            throw new Error("window.localStorage descriptor is required for this test")
        }

        Object.defineProperty(window, "localStorage", {
            configurable: true,
            get(): Storage {
                throw new DOMException("Access denied", "SecurityError")
            },
        })

        try {
            expect((): void => {
                initializeTheme()
            }).not.toThrow()
        } finally {
            Object.defineProperty(window, "localStorage", localStorageDescriptor)
        }
    })

    it("предпочитает более свежий удалённый профиль темы локальному дефолту", async (): Promise<void> => {
        const remotePreset = THEME_PRESETS.at(1)?.id ?? THEME_PRESETS[0].id

        localStorage.setItem("codenautic:ui:theme-mode", "system")
        localStorage.setItem("codenautic:ui:theme-preset", THEME_PRESETS[0]?.id ?? "moonstone")
        localStorage.removeItem("codenautic:ui:theme-profile-synced")

        server.use(
            http.get("http://localhost:3000/api/v1/user/settings", () => {
                return HttpResponse.json({
                    theme: {
                        mode: "dark",
                        preset: remotePreset,
                    },
                    updatedAt: "2026-03-06T12:00:00Z",
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

        renderWithProviders(<ThemeStateProbe />)

        await waitFor((): void => {
            expect(screen.getByTestId("theme-state")).toHaveTextContent(`dark:${remotePreset}`)
        })
    })
})
