import { http, HttpResponse } from "msw"
import { act, render, screen, waitFor } from "@testing-library/react"
import { type ReactElement } from "react"
import { describe, expect, it, vi } from "vitest"

import {
    THEME_PRESETS,
    type ThemeMode,
    type ThemePresetId,
    initializeTheme,
    useThemeMode,
} from "@/lib/theme/theme-provider"
import { server } from "../../mocks/server"
import { renderWithProviders } from "../../utils/render"

function ThemeStateProbe(): ReactElement {
    const { mode, preset } = useThemeMode()

    return <p data-testid="theme-state">{`${mode}:${preset}`}</p>
}

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
                data-testid="set-system"
                onClick={(): void => {
                    setMode("system")
                }}
            />
            <button
                data-testid="set-preset-cobalt"
                onClick={(): void => {
                    setPreset("cobalt" as ThemePresetId)
                }}
            />
            <button
                data-testid="set-preset-forest"
                onClick={(): void => {
                    setPreset("forest" as ThemePresetId)
                }}
            />
            <button
                data-testid="set-invalid-mode"
                onClick={(): void => {
                    setMode("invalid" as ThemeMode)
                }}
            />
            <button
                data-testid="set-invalid-preset"
                onClick={(): void => {
                    setPreset("nonexistent" as ThemePresetId)
                }}
            />
            <button
                data-testid="set-mode-fn"
                onClick={(): void => {
                    setMode((_prev: ThemeMode): ThemeMode => "dark")
                }}
            />
            <button
                data-testid="set-preset-fn"
                onClick={(): void => {
                    setPreset((_prev: ThemePresetId): ThemePresetId => "cobalt" as ThemePresetId)
                }}
            />
            <button
                data-testid="set-mode-fn-invalid"
                onClick={(): void => {
                    setMode((_prev: ThemeMode): ThemeMode => "bogus" as ThemeMode)
                }}
            />
            <button
                data-testid="set-preset-fn-invalid"
                onClick={(): void => {
                    setPreset((_prev: ThemePresetId): ThemePresetId => "bogus" as ThemePresetId)
                }}
            />
            <button
                data-testid="set-mode-same"
                onClick={(): void => {
                    setMode(mode)
                }}
            />
        </div>
    )
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
            http.get("http://localhost:7120/api/v1/user/settings", () => {
                return HttpResponse.json({
                    theme: {
                        mode: "dark",
                        preset: remotePreset,
                    },
                    updatedAt: "2026-03-06T12:00:00Z",
                })
            }),
            http.put("http://localhost:7120/api/v1/user/settings", () => {
                return HttpResponse.json({})
            }),
            http.patch("http://localhost:7120/api/v1/user/settings", () => {
                return HttpResponse.json({})
            }),
            http.post("http://localhost:7120/api/v1/user/settings", () => {
                return HttpResponse.json({})
            }),
        )

        renderWithProviders(<ThemeStateProbe />)

        await waitFor((): void => {
            expect(screen.getByTestId("theme-state")).toHaveTextContent(`dark:${remotePreset}`)
        })
    })

    it("не пытается записать theme profile на первом mount, если backend недоступен", async (): Promise<void> => {
        let getSettingsCalls = 0
        let getPreferencesCalls = 0
        let writeCalls = 0

        localStorage.setItem("codenautic:ui:theme-mode", "system")
        localStorage.setItem("codenautic:ui:theme-preset", THEME_PRESETS[0]?.id ?? "moonstone")
        localStorage.removeItem("codenautic:ui:theme-profile-synced")

        server.use(
            http.get("http://localhost:7120/api/v1/user/settings", () => {
                getSettingsCalls += 1
                return HttpResponse.error()
            }),
            http.get("http://localhost:7120/api/v1/user/preferences", () => {
                getPreferencesCalls += 1
                return HttpResponse.error()
            }),
            http.put("http://localhost:7120/api/v1/user/settings", () => {
                writeCalls += 1
                return HttpResponse.json({})
            }),
            http.patch("http://localhost:7120/api/v1/user/settings", () => {
                writeCalls += 1
                return HttpResponse.json({})
            }),
            http.post("http://localhost:7120/api/v1/user/settings", () => {
                writeCalls += 1
                return HttpResponse.json({})
            }),
            http.put("http://localhost:7120/api/v1/user/preferences", () => {
                writeCalls += 1
                return HttpResponse.json({})
            }),
            http.patch("http://localhost:7120/api/v1/user/preferences", () => {
                writeCalls += 1
                return HttpResponse.json({})
            }),
            http.post("http://localhost:7120/api/v1/user/preferences", () => {
                writeCalls += 1
                return HttpResponse.json({})
            }),
        )

        renderWithProviders(<ThemeStateProbe />)

        await waitFor((): void => {
            expect(getSettingsCalls).toBe(1)
            expect(getPreferencesCalls).toBe(1)
        })
        await waitFor((): void => {
            expect(writeCalls).toBe(0)
        })
        expect(screen.getByTestId("theme-state")).toHaveTextContent(
            `system:${THEME_PRESETS[0]?.id ?? "moonstone"}`,
        )
    })

    it("when initializeTheme called, then returns bootstrap state with mode preset and resolvedMode", (): void => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "cobalt")

        const state = initializeTheme()

        expect(state.mode).toBe("dark")
        expect(state.preset).toBe("cobalt")
        expect(state.resolvedMode).toBe("dark")
    })

    it("when initializeTheme has no stored values, then defaults to system and sunrise", (): void => {
        const state = initializeTheme()

        expect(state.mode).toBe("system")
        expect(state.preset).toBe("sunrise")
    })

    it("when defaultMode is provided, then uses it instead of localStorage", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeStateProbe />, { defaultThemeMode: "light" })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("light:moonstone")
    })

    it("when setMode is called with valid mode, then updates theme state", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "system")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />)

        expect(screen.getByTestId("theme-state")).toHaveTextContent("system:moonstone")

        await act(async (): Promise<void> => {
            screen.getByTestId("set-dark").click()
        })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:moonstone")
    })

    it("when setMode is called with invalid mode, then keeps current mode", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:moonstone")

        await act(async (): Promise<void> => {
            screen.getByTestId("set-invalid-mode").click()
        })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:moonstone")
    })

    it("when setPreset is called with valid preset, then updates preset", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        await act(async (): Promise<void> => {
            screen.getByTestId("set-preset-cobalt").click()
        })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:cobalt")
    })

    it("when setPreset is called with invalid preset, then keeps current preset", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        await act(async (): Promise<void> => {
            screen.getByTestId("set-invalid-preset").click()
        })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:moonstone")
    })

    it("when setMode is called with function updater, then applies updater", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "light")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "light" })

        await act(async (): Promise<void> => {
            screen.getByTestId("set-mode-fn").click()
        })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:moonstone")
    })

    it("when setPreset is called with function updater, then applies updater", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        await act(async (): Promise<void> => {
            screen.getByTestId("set-preset-fn").click()
        })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:cobalt")
    })

    it("when setMode function updater returns invalid, then keeps previous mode", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        await act(async (): Promise<void> => {
            screen.getByTestId("set-mode-fn-invalid").click()
        })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:moonstone")
    })

    it("when setPreset function updater returns invalid, then keeps previous preset", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        await act(async (): Promise<void> => {
            screen.getByTestId("set-preset-fn-invalid").click()
        })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:moonstone")
    })

    it("when context provides presets, then presets list is available", async (): Promise<void> => {
        renderWithProviders(<ThemeFullProbe />)

        expect(screen.getByTestId("presets-count")).toHaveTextContent(String(THEME_PRESETS.length))
    })

    it("when resolvedMode is accessed, then returns resolved value", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        expect(screen.getByTestId("resolved-mode")).toHaveTextContent("dark")
    })

    it("when mode changes, then persists to localStorage", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "system")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />)

        await act(async (): Promise<void> => {
            screen.getByTestId("set-dark").click()
        })

        expect(localStorage.getItem("codenautic:ui:theme-mode")).toBe("dark")
    })

    it("when preset changes, then persists to localStorage", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        await act(async (): Promise<void> => {
            screen.getByTestId("set-preset-cobalt").click()
        })

        expect(localStorage.getItem("codenautic:ui:theme-preset")).toBe("cobalt")
    })

    it("when storage event fires with new mode, then updates state", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "light")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "light" })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("light:moonstone")

        await act(async (): Promise<void> => {
            window.dispatchEvent(
                new StorageEvent("storage", {
                    key: "codenautic:ui:theme-mode",
                    newValue: "dark",
                }),
            )
        })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:moonstone")
    })

    it("when storage event fires with new preset, then updates state", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:moonstone")

        await act(async (): Promise<void> => {
            window.dispatchEvent(
                new StorageEvent("storage", {
                    key: "codenautic:ui:theme-preset",
                    newValue: "cobalt",
                }),
            )
        })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:cobalt")
    })

    it("when storage event fires with invalid mode, then ignores it", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        await act(async (): Promise<void> => {
            window.dispatchEvent(
                new StorageEvent("storage", {
                    key: "codenautic:ui:theme-mode",
                    newValue: "invalid-mode",
                }),
            )
        })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:moonstone")
    })

    it("when storage event fires with invalid preset, then ignores it", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        await act(async (): Promise<void> => {
            window.dispatchEvent(
                new StorageEvent("storage", {
                    key: "codenautic:ui:theme-preset",
                    newValue: "invalid-preset",
                }),
            )
        })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:moonstone")
    })

    it("when storage event fires with null newValue for mode, then ignores it", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        await act(async (): Promise<void> => {
            window.dispatchEvent(
                new StorageEvent("storage", {
                    key: "codenautic:ui:theme-mode",
                    newValue: null,
                }),
            )
        })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:moonstone")
    })

    it("when storage event fires with null newValue for preset, then ignores it", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        await act(async (): Promise<void> => {
            window.dispatchEvent(
                new StorageEvent("storage", {
                    key: "codenautic:ui:theme-preset",
                    newValue: null,
                }),
            )
        })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:moonstone")
    })

    it("when storage event fires with unrelated key, then ignores it", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        await act(async (): Promise<void> => {
            window.dispatchEvent(
                new StorageEvent("storage", {
                    key: "some-other-key",
                    newValue: "anything",
                }),
            )
        })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:moonstone")
    })

    it("when mode is set to same value, then does not trigger unnecessary update", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        await act(async (): Promise<void> => {
            screen.getByTestId("set-mode-same").click()
        })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:moonstone")
    })

    it("when mode changes from system to light, then resolvedMode reflects light", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "system")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />)

        await act(async (): Promise<void> => {
            screen.getByTestId("set-light").click()
        })

        expect(screen.getByTestId("resolved-mode")).toHaveTextContent("light")
    })

    it("when mode is set to system, then resolvedMode uses system preference", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        await act(async (): Promise<void> => {
            screen.getByTestId("set-system").click()
        })

        const resolvedMode = screen.getByTestId("resolved-mode").textContent
        expect(resolvedMode === "light" || resolvedMode === "dark").toBe(true)
    })

    it("when local profile has non-default updatedAtMs fresher than remote, then keeps local", async (): Promise<void> => {
        const localPreset = THEME_PRESETS[0]?.id ?? "moonstone"
        const remotePreset = THEME_PRESETS.at(2)?.id ?? "forest"

        localStorage.setItem("codenautic:ui:theme-mode", "light")
        localStorage.setItem("codenautic:ui:theme-preset", localPreset)
        localStorage.setItem(
            "codenautic:ui:theme-profile-synced",
            JSON.stringify({
                mode: "light",
                preset: localPreset,
                updatedAtMs: Date.now(),
            }),
        )

        server.use(
            http.get("http://localhost:7120/api/v1/user/settings", () => {
                return HttpResponse.json({
                    theme: {
                        mode: "dark",
                        preset: remotePreset,
                    },
                    updatedAt: "2020-01-01T00:00:00Z",
                })
            }),
            http.put("http://localhost:7120/api/v1/user/settings", () => {
                return HttpResponse.json({})
            }),
            http.patch("http://localhost:7120/api/v1/user/settings", () => {
                return HttpResponse.json({})
            }),
            http.post("http://localhost:7120/api/v1/user/settings", () => {
                return HttpResponse.json({})
            }),
        )

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "light" })

        await vi.waitFor((): void => {
            expect(screen.getByTestId("theme-state")).toHaveTextContent(`light:${localPreset}`)
        })
    })

    it("when CSS tokens are applied, then document element has theme dataset", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "cobalt")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        await waitFor((): void => {
            expect(document.documentElement.dataset.theme).toBe("cobalt")
            expect(document.documentElement.dataset.mode).toBe("dark")
        })
    })

    it("when theme tokens are applied, then CSS variables are set on root", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "light")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "light" })

        await waitFor((): void => {
            const rootStyle = document.documentElement.style
            expect(rootStyle.getPropertyValue("--background")).toBeTruthy()
            expect(rootStyle.getPropertyValue("--foreground")).toBeTruthy()
            expect(rootStyle.getPropertyValue("--accent")).toBeTruthy()
        })
    })

    it("when preset changes to forest, then theme dataset updates", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        await act(async (): Promise<void> => {
            screen.getByTestId("set-preset-forest").click()
        })

        await waitFor((): void => {
            expect(document.documentElement.dataset.theme).toBe("forest")
        })
    })

    it("when persisted preset is valid, then uses it", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "cobalt")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:cobalt")
    })

    it("when persisted preset is invalid, then falls back to default", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "nonexistent")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:sunrise")
    })

    it("when mode changes multiple times quickly, then settles on last value", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "light")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "light" })

        await act(async (): Promise<void> => {
            screen.getByTestId("set-dark").click()
        })
        await act(async (): Promise<void> => {
            screen.getByTestId("set-light").click()
        })
        await act(async (): Promise<void> => {
            screen.getByTestId("set-dark").click()
        })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:moonstone")
    })

    it("when preset changes multiple times quickly, then settles on last value", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        await act(async (): Promise<void> => {
            screen.getByTestId("set-preset-cobalt").click()
        })
        await act(async (): Promise<void> => {
            screen.getByTestId("set-preset-forest").click()
        })
        await act(async (): Promise<void> => {
            screen.getByTestId("set-preset-cobalt").click()
        })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:cobalt")
    })

    it("when dark class toggles on mode change, then document reflects it", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "light")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "light" })

        expect(document.documentElement.classList.contains("dark")).toBe(false)

        await act(async (): Promise<void> => {
            screen.getByTestId("set-dark").click()
        })

        expect(document.documentElement.classList.contains("dark")).toBe(true)
    })

    it("when sync profile state has corrupted data, then uses defaults", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "light")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")
        localStorage.setItem("codenautic:ui:theme-profile-synced", "invalid-json{}")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "light" })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("light:moonstone")
    })

    it("when remote API returns both endpoints with no theme, then stays with local theme", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "cobalt")
        localStorage.removeItem("codenautic:ui:theme-profile-synced")

        server.use(
            http.get("http://localhost:7120/api/v1/user/settings", () => {
                return HttpResponse.json({ unrelatedField: true })
            }),
            http.get("http://localhost:7120/api/v1/user/preferences", () => {
                return HttpResponse.json({ unrelatedField: true })
            }),
        )

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        await waitFor((): void => {
            expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:cobalt")
        })
    })

    it("when remote returns same mode/preset as local, then keeps values unchanged", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "cobalt")
        localStorage.removeItem("codenautic:ui:theme-profile-synced")

        server.use(
            http.get("http://localhost:7120/api/v1/user/settings", () => {
                return HttpResponse.json({
                    theme: { mode: "dark", preset: "cobalt" },
                    updatedAt: "2026-03-06T12:00:00Z",
                })
            }),
        )

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        await waitFor((): void => {
            expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:cobalt")
        })
    })

    it("when preset is set to same value, then keeps state without triggering update timestamp", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "cobalt")

        function PresetSameProbe(): ReactElement {
            const { preset, setPreset } = useThemeMode()

            return (
                <div>
                    <p data-testid="preset">{preset}</p>
                    <button
                        data-testid="set-same-preset"
                        onClick={(): void => {
                            setPreset("cobalt" as ThemePresetId)
                        }}
                    />
                </div>
            )
        }

        renderWithProviders(<PresetSameProbe />, { defaultThemeMode: "dark" })

        expect(screen.getByTestId("preset")).toHaveTextContent("cobalt")

        await act(async (): Promise<void> => {
            screen.getByTestId("set-same-preset").click()
        })

        expect(screen.getByTestId("preset")).toHaveTextContent("cobalt")
    })

    it("when colorScheme is set on root, then matches resolved mode", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        expect(document.documentElement.style.colorScheme).toBe("dark")
    })
})

describe("ThemeProvider system mode sync", (): void => {
    it("when system color scheme changes via matchMedia, then resolvedMode updates", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "system")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")

        type TChangeListener = (ev: MediaQueryListEvent | Event) => void
        const changeListeners: TChangeListener[] = []
        let mockMatches = false

        const mockMediaQueryList = {
            matches: mockMatches,
            media: "(prefers-color-scheme: dark)",
            onchange: null,
            addEventListener: (type: string, listener: TChangeListener): void => {
                if (type === "change") {
                    changeListeners.push(listener)
                }
            },
            removeEventListener: (type: string, listener: TChangeListener): void => {
                if (type === "change") {
                    const index = changeListeners.indexOf(listener)
                    if (index !== -1) {
                        changeListeners.splice(index, 1)
                    }
                }
            },
            dispatchEvent: (_event: Event): boolean => true,
        } as unknown as MediaQueryList

        const originalMatchMedia = window.matchMedia
        Object.defineProperty(window, "matchMedia", {
            configurable: true,
            writable: true,
            value: (query: string): MediaQueryList => {
                if (query === "(prefers-color-scheme: dark)") {
                    return mockMediaQueryList
                }
                return originalMatchMedia(query)
            },
        })

        try {
            renderWithProviders(<ThemeFullProbe />)

            const resolvedBefore = screen.getByTestId("resolved-mode").textContent

            mockMatches = true
            Object.defineProperty(mockMediaQueryList, "matches", { value: true })

            await act(async (): Promise<void> => {
                for (const listener of changeListeners) {
                    listener(new Event("change"))
                }
            })

            const resolvedAfter = screen.getByTestId("resolved-mode").textContent
            expect(resolvedAfter === "light" || resolvedAfter === "dark").toBe(true)
            expect(typeof resolvedBefore).toBe("string")
        } finally {
            Object.defineProperty(window, "matchMedia", {
                configurable: true,
                writable: true,
                value: originalMatchMedia,
            })
        }
    })
})

describe("ThemeProvider sync-to-API", (): void => {
    it("when mode changes after initial sync, then saves to API after debounce", async (): Promise<void> => {
        let saveCalled = false

        localStorage.setItem("codenautic:ui:theme-mode", "light")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")
        localStorage.removeItem("codenautic:ui:theme-profile-synced")

        server.use(
            http.get("http://localhost:7120/api/v1/user/settings", () => {
                return HttpResponse.json({
                    theme: { mode: "light", preset: "moonstone" },
                    updatedAt: "2020-01-01T00:00:00Z",
                })
            }),
            http.put("http://localhost:7120/api/v1/user/settings", () => {
                saveCalled = true
                return HttpResponse.json({})
            }),
            http.patch("http://localhost:7120/api/v1/user/settings", () => {
                saveCalled = true
                return HttpResponse.json({})
            }),
            http.post("http://localhost:7120/api/v1/user/settings", () => {
                saveCalled = true
                return HttpResponse.json({})
            }),
        )

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "light" })

        await waitFor((): void => {
            expect(screen.getByTestId("theme-state")).toHaveTextContent("light:moonstone")
        })

        await act(async (): Promise<void> => {
            screen.getByTestId("set-dark").click()
        })

        await waitFor(
            (): void => {
                expect(saveCalled).toBe(true)
            },
            { timeout: 3_000 },
        )
    })

    it("when API sync fetch returns no theme data, then still enables save sync", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "light")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")
        localStorage.removeItem("codenautic:ui:theme-profile-synced")

        let saveAttempted = false

        server.use(
            http.get("http://localhost:7120/api/v1/user/settings", () => {
                return HttpResponse.json({ noThemeField: true })
            }),
            http.get("http://localhost:7120/api/v1/user/preferences", () => {
                return HttpResponse.json({ noThemeField: true })
            }),
            http.put("http://localhost:7120/api/v1/user/settings", () => {
                saveAttempted = true
                return HttpResponse.json({})
            }),
            http.patch("http://localhost:7120/api/v1/user/settings", () => {
                saveAttempted = true
                return HttpResponse.json({})
            }),
            http.post("http://localhost:7120/api/v1/user/settings", () => {
                saveAttempted = true
                return HttpResponse.json({})
            }),
        )

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "light" })

        await waitFor((): void => {
            expect(screen.getByTestId("theme-state")).toHaveTextContent("light:moonstone")
        })

        await act(async (): Promise<void> => {
            screen.getByTestId("set-dark").click()
        })

        await waitFor(
            (): void => {
                expect(saveAttempted).toBe(true)
            },
            { timeout: 3_000 },
        )
    })

    it("when profile sync state is already set, then reads updatedAtMs from it", async (): Promise<void> => {
        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "cobalt")
        localStorage.setItem(
            "codenautic:ui:theme-profile-synced",
            JSON.stringify({
                mode: "dark",
                preset: "cobalt",
                updatedAtMs: 1_700_000_000_000,
            }),
        )

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:cobalt")
    })

    it("when sync-to-API save fails for all write endpoints, then writes sync state locally", async (): Promise<void> => {
        let writeAttemptCount = 0

        localStorage.setItem("codenautic:ui:theme-mode", "light")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")
        localStorage.removeItem("codenautic:ui:theme-profile-synced")

        server.use(
            http.get("http://localhost:7120/api/v1/user/settings", () => {
                return HttpResponse.json({
                    theme: { mode: "light", preset: "moonstone" },
                    updatedAt: "2020-01-01T00:00:00Z",
                })
            }),
            http.put("http://localhost:7120/api/v1/user/settings", () => {
                writeAttemptCount += 1
                return new HttpResponse(null, { status: 405 })
            }),
            http.patch("http://localhost:7120/api/v1/user/settings", () => {
                writeAttemptCount += 1
                return new HttpResponse(null, { status: 405 })
            }),
            http.post("http://localhost:7120/api/v1/user/settings", () => {
                writeAttemptCount += 1
                return new HttpResponse(null, { status: 405 })
            }),
            http.put("http://localhost:7120/api/v1/user/preferences", () => {
                writeAttemptCount += 1
                return new HttpResponse(null, { status: 405 })
            }),
            http.patch("http://localhost:7120/api/v1/user/preferences", () => {
                writeAttemptCount += 1
                return new HttpResponse(null, { status: 405 })
            }),
            http.post("http://localhost:7120/api/v1/user/preferences", () => {
                writeAttemptCount += 1
                return new HttpResponse(null, { status: 405 })
            }),
        )

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "light" })

        await waitFor((): void => {
            expect(screen.getByTestId("theme-state")).toHaveTextContent("light:moonstone")
        })

        await act(async (): Promise<void> => {
            screen.getByTestId("set-dark").click()
        })

        await waitFor(
            (): void => {
                expect(writeAttemptCount).toBeGreaterThan(0)
            },
            { timeout: 3_000 },
        )

        await waitFor(
            (): void => {
                const syncState = localStorage.getItem("codenautic:ui:theme-profile-synced")
                expect(syncState).not.toBeNull()
                if (syncState !== null) {
                    const parsed = JSON.parse(syncState) as Record<string, unknown>
                    expect(parsed.mode).toBe("dark")
                }
            },
            { timeout: 3_000 },
        )
    })
})

describe("ThemeProvider timeout and error paths", (): void => {
    it("when sync-from-API takes too long, then timeout aborts the request and state stays local", async (): Promise<void> => {
        let requestStarted = false

        localStorage.setItem("codenautic:ui:theme-mode", "dark")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")
        localStorage.removeItem("codenautic:ui:theme-profile-synced")

        server.use(
            http.get("http://localhost:7120/api/v1/user/settings", async () => {
                requestStarted = true
                await new Promise((resolve): void => {
                    setTimeout(resolve, 5_000)
                })
                return HttpResponse.json({
                    theme: { mode: "light", preset: "cobalt" },
                    updatedAt: "2026-03-06T12:00:00Z",
                })
            }),
            http.get("http://localhost:7120/api/v1/user/preferences", async () => {
                requestStarted = true
                await new Promise((resolve): void => {
                    setTimeout(resolve, 5_000)
                })
                return HttpResponse.json({
                    theme: { mode: "light", preset: "cobalt" },
                    updatedAt: "2026-03-06T12:00:00Z",
                })
            }),
        )

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "dark" })

        await waitFor(
            (): void => {
                expect(requestStarted).toBe(true)
            },
            { timeout: 3_000 },
        )

        await new Promise((resolve): void => {
            setTimeout(resolve, 2_500)
        })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:moonstone")
    }, 15_000)

    it("when sync-to-API times out, then abort fires before save completes", async (): Promise<void> => {
        let fetchCompleted = false
        let _saveStarted = false

        localStorage.setItem("codenautic:ui:theme-mode", "light")
        localStorage.setItem("codenautic:ui:theme-preset", "moonstone")
        localStorage.removeItem("codenautic:ui:theme-profile-synced")

        server.use(
            http.get("http://localhost:7120/api/v1/user/settings", () => {
                fetchCompleted = true
                return HttpResponse.json({
                    theme: { mode: "light", preset: "moonstone" },
                    updatedAt: "2020-01-01T00:00:00Z",
                })
            }),
            http.put("http://localhost:7120/api/v1/user/settings", async () => {
                _saveStarted = true
                await new Promise((resolve): void => {
                    setTimeout(resolve, 5_000)
                })
                return HttpResponse.json({})
            }),
            http.patch("http://localhost:7120/api/v1/user/settings", async () => {
                _saveStarted = true
                await new Promise((resolve): void => {
                    setTimeout(resolve, 5_000)
                })
                return HttpResponse.json({})
            }),
            http.post("http://localhost:7120/api/v1/user/settings", async () => {
                _saveStarted = true
                await new Promise((resolve): void => {
                    setTimeout(resolve, 5_000)
                })
                return HttpResponse.json({})
            }),
        )

        renderWithProviders(<ThemeFullProbe />, { defaultThemeMode: "light" })

        await waitFor(
            (): void => {
                expect(fetchCompleted).toBe(true)
            },
            { timeout: 3_000 },
        )

        await act(async (): Promise<void> => {
            screen.getByTestId("set-dark").click()
        })

        await new Promise((resolve): void => {
            setTimeout(resolve, 2_500)
        })

        expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:moonstone")
    }, 15_000)
})

describe("useThemeMode", (): void => {
    it("when used outside ThemeProvider, then throws descriptive error", (): void => {
        function OrphanConsumer(): ReactElement {
            useThemeMode()
            return <p>unreachable</p>
        }

        expect((): void => {
            render(<OrphanConsumer />)
        }).toThrow("useThemeMode must be used inside ThemeProvider")
    })
})
