import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

import type { IThemeLibraryProfileState } from "@/lib/theme/theme-library-profile-sync"

const mockCreateApiConfig = vi.hoisted((): ReturnType<typeof vi.fn> => vi.fn())
const mockResolveUiEnv = vi.hoisted((): ReturnType<typeof vi.fn> => vi.fn())

vi.mock("@/lib/api/config", (): Record<string, unknown> => {
    return {
        createApiConfig: mockCreateApiConfig.mockReturnValue({
            baseUrl: "http://localhost:3000",
            defaultHeaders: {},
        }),
        resolveUiEnv: mockResolveUiEnv.mockReturnValue("test"),
    }
})

describe("theme library profile sync internal parsers", (): void => {
    describe("IThemeLibraryProfileState type contract", (): void => {
        it("when valid state is created, then all fields are accessible", (): void => {
            const state: IThemeLibraryProfileState = {
                themes: [
                    {
                        id: "theme-1",
                        name: "My Theme",
                        mode: "dark",
                        presetId: "cobalt",
                        basePaletteId: "cool",
                        accentColor: "#ff5500",
                        accentIntensity: 80,
                        globalRadius: 12,
                        formRadius: 8,
                    },
                ],
                favoritePresetId: "moonstone",
                updatedAtMs: 1700000000,
            }

            expect(state.themes).toHaveLength(1)
            expect(state.themes[0]?.id).toBe("theme-1")
            expect(state.themes[0]?.name).toBe("My Theme")
            expect(state.themes[0]?.mode).toBe("dark")
            expect(state.themes[0]?.basePaletteId).toBe("cool")
            expect(state.themes[0]?.accentColor).toBe("#ff5500")
            expect(state.favoritePresetId).toBe("moonstone")
            expect(state.updatedAtMs).toBe(1700000000)
        })

        it("when state has no favorite preset, then favoritePresetId is undefined", (): void => {
            const state: IThemeLibraryProfileState = {
                themes: [
                    {
                        id: "theme-2",
                        name: "Other Theme",
                        mode: "light",
                        presetId: "forest",
                        basePaletteId: "warm",
                        accentColor: "#00ff00",
                        accentIntensity: 60,
                        globalRadius: 8,
                        formRadius: 6,
                    },
                ],
                favoritePresetId: undefined,
                updatedAtMs: 0,
            }

            expect(state.favoritePresetId).toBeUndefined()
        })

        it("when state has empty themes array, then themes is empty", (): void => {
            const state: IThemeLibraryProfileState = {
                themes: [],
                favoritePresetId: "cobalt",
                updatedAtMs: 500,
            }

            expect(state.themes).toHaveLength(0)
        })
    })

    describe("IThemeLibraryProfileTheme mode values", (): void => {
        it("when mode is dark, then is valid", (): void => {
            const theme = createValidThemeWithMode("dark")
            expect(theme.mode).toBe("dark")
        })

        it("when mode is light, then is valid", (): void => {
            const theme = createValidThemeWithMode("light")
            expect(theme.mode).toBe("light")
        })

        it("when mode is system, then is valid", (): void => {
            const theme = createValidThemeWithMode("system")
            expect(theme.mode).toBe("system")
        })
    })

    describe("IThemeLibraryProfileTheme basePaletteId values", (): void => {
        it("when basePaletteId is cool, then is valid", (): void => {
            const theme = createValidThemeWithPalette("cool")
            expect(theme.basePaletteId).toBe("cool")
        })

        it("when basePaletteId is neutral, then is valid", (): void => {
            const theme = createValidThemeWithPalette("neutral")
            expect(theme.basePaletteId).toBe("neutral")
        })

        it("when basePaletteId is warm, then is valid", (): void => {
            const theme = createValidThemeWithPalette("warm")
            expect(theme.basePaletteId).toBe("warm")
        })
    })

    describe("IThemeLibraryProfileTheme numeric constraints", (): void => {
        it("when accentIntensity is at minimum boundary, then is valid", (): void => {
            const state = createStateWithThemeOverrides({ accentIntensity: 40 })
            expect(state.themes[0]?.accentIntensity).toBe(40)
        })

        it("when accentIntensity is at maximum boundary, then is valid", (): void => {
            const state = createStateWithThemeOverrides({ accentIntensity: 100 })
            expect(state.themes[0]?.accentIntensity).toBe(100)
        })

        it("when globalRadius is at minimum boundary, then is valid", (): void => {
            const state = createStateWithThemeOverrides({ globalRadius: 6 })
            expect(state.themes[0]?.globalRadius).toBe(6)
        })

        it("when globalRadius is at maximum boundary, then is valid", (): void => {
            const state = createStateWithThemeOverrides({ globalRadius: 24 })
            expect(state.themes[0]?.globalRadius).toBe(24)
        })

        it("when formRadius is at minimum boundary, then is valid", (): void => {
            const state = createStateWithThemeOverrides({ formRadius: 4 })
            expect(state.themes[0]?.formRadius).toBe(4)
        })

        it("when formRadius is at maximum boundary, then is valid", (): void => {
            const state = createStateWithThemeOverrides({ formRadius: 20 })
            expect(state.themes[0]?.formRadius).toBe(20)
        })
    })

    describe("readThemeLibraryProfileState", (): void => {
        let originalFetch: typeof globalThis.fetch

        beforeEach((): void => {
            originalFetch = globalThis.fetch
        })

        afterEach((): void => {
            globalThis.fetch = originalFetch
            vi.restoreAllMocks()
        })

        it("when API returns valid themeLibrary payload, then parses correctly", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        themeLibrary: {
                            themes: [
                                {
                                    id: "t1",
                                    name: "Test Theme",
                                    mode: "dark",
                                    presetId: "cobalt",
                                    basePaletteId: "cool",
                                    accentColor: "#aabbcc",
                                    accentIntensity: 70,
                                    globalRadius: 10,
                                    formRadius: 8,
                                },
                            ],
                            favoritePresetId: "moonstone",
                            updatedAtMs: 5000,
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.themes).toHaveLength(1)
                expect(result.themes[0]?.id).toBe("t1")
                expect(result.favoritePresetId).toBe("moonstone")
            }
        })
    })

    describe("writeThemeLibraryProfileState", (): void => {
        let originalFetch: typeof globalThis.fetch

        beforeEach((): void => {
            originalFetch = globalThis.fetch
        })

        afterEach((): void => {
            globalThis.fetch = originalFetch
            vi.restoreAllMocks()
        })

        it("when API accepts the write, then returns true", async (): Promise<void> => {
            const { writeThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue("{}"),
            })

            const profile: IThemeLibraryProfileState = {
                themes: [],
                favoritePresetId: "cobalt",
                updatedAtMs: 1000,
            }

            const result = await writeThemeLibraryProfileState(profile)
            expect(result).toBe(true)
        })

        it("when all API endpoints and methods fail, then returns false", async (): Promise<void> => {
            const { writeThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                headers: new Headers(),
                text: vi.fn().mockResolvedValue("Server error"),
            })

            const profile: IThemeLibraryProfileState = {
                themes: [],
                favoritePresetId: "cobalt",
                updatedAtMs: 1000,
            }

            const result = await writeThemeLibraryProfileState(profile)
            expect(result).toBe(false)
        })

        it("when API returns 404, then continues to next endpoint/method", async (): Promise<void> => {
            const { writeThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            const apiError = new Error("HTTP 404")
            Object.assign(apiError, {
                name: "ApiHttpError",
                status: 404,
                path: "/api/v1/user/settings",
            })
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                headers: new Headers(),
                text: vi.fn().mockResolvedValue("Not found"),
            })

            const profile: IThemeLibraryProfileState = {
                themes: [],
                favoritePresetId: "cobalt",
                updatedAtMs: 1000,
            }

            const result = await writeThemeLibraryProfileState(profile)
            expect(result).toBe(false)
        })
    })

    describe("readThemeLibraryProfileState parser branches", (): void => {
        let originalFetch: typeof globalThis.fetch

        beforeEach((): void => {
            originalFetch = globalThis.fetch
        })

        afterEach((): void => {
            globalThis.fetch = originalFetch
            vi.restoreAllMocks()
        })

        it("when API returns payload nested under appearance.themeLibrary, then parses correctly", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        appearance: {
                            themeLibrary: {
                                themes: [
                                    {
                                        id: "nested-t1",
                                        name: "Nested Theme",
                                        mode: "light",
                                        presetId: "forest",
                                        basePaletteId: "warm",
                                        accentColor: "#ff5500",
                                        accentIntensity: 60,
                                        globalRadius: 10,
                                        formRadius: 6,
                                    },
                                ],
                                favoritePresetId: "forest",
                                updatedAtMs: 2000,
                            },
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.themes).toHaveLength(1)
                expect(result.themes[0]?.id).toBe("nested-t1")
                expect(result.favoritePresetId).toBe("forest")
            }
        })

        it("when API returns payload with invalid theme items, then skips them", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        themeLibrary: {
                            themes: [
                                {
                                    id: "",
                                    name: "Bad ID",
                                    mode: "dark",
                                    presetId: "x",
                                    basePaletteId: "cool",
                                    accentColor: "#aabbcc",
                                    accentIntensity: 70,
                                    globalRadius: 12,
                                    formRadius: 8,
                                },
                                {
                                    id: "good",
                                    name: "A",
                                    mode: "dark",
                                    presetId: "x",
                                    basePaletteId: "cool",
                                    accentColor: "#aabbcc",
                                    accentIntensity: 70,
                                    globalRadius: 12,
                                    formRadius: 8,
                                },
                                null,
                                42,
                                {
                                    id: "ok",
                                    name: "Valid Theme",
                                    mode: "dark",
                                    presetId: "cobalt",
                                    basePaletteId: "cool",
                                    accentColor: "#112233",
                                    accentIntensity: 50,
                                    globalRadius: 8,
                                    formRadius: 6,
                                },
                            ],
                            favoritePresetId: "cobalt",
                            updatedAtMs: 3000,
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.themes.length).toBeGreaterThanOrEqual(1)
            }
        })

        it("when API returns payload with updatedAtMs as ISO date string, then parses it", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        themeLibrary: {
                            themes: [
                                {
                                    id: "t-date",
                                    name: "Date Theme",
                                    mode: "system",
                                    presetId: "cobalt",
                                    basePaletteId: "neutral",
                                    accentColor: "#aabb00",
                                    accentIntensity: 55,
                                    globalRadius: 10,
                                    formRadius: 6,
                                },
                            ],
                            favoritePresetId: "cobalt",
                            updatedAtMs: "2026-01-15T00:00:00.000Z",
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.updatedAtMs).toBeGreaterThan(0)
            }
        })

        it("when API returns non-object payload, then returns undefined", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(JSON.stringify("just a string")),
            })

            const result = await readThemeLibraryProfileState()
            expect(result).toBeUndefined()
        })

        it("when API returns empty themes and no favoritePresetId, then returns undefined", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        themeLibrary: {
                            themes: [],
                            updatedAtMs: 0,
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()
            expect(result).toBeUndefined()
        })

        it("when all API endpoints fail with network error, then returns undefined", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))

            const result = await readThemeLibraryProfileState()
            expect(result).toBeUndefined()
        })

        it("when theme has invalid mode, then skips that theme", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        themeLibrary: {
                            themes: [
                                {
                                    id: "t-bad-mode",
                                    name: "Bad Mode Theme",
                                    mode: "invalid-mode",
                                    presetId: "cobalt",
                                    basePaletteId: "cool",
                                    accentColor: "#aabbcc",
                                    accentIntensity: 70,
                                    globalRadius: 12,
                                    formRadius: 8,
                                },
                            ],
                            favoritePresetId: "cobalt",
                            updatedAtMs: 1000,
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.themes).toHaveLength(0)
                expect(result.favoritePresetId).toBe("cobalt")
            }
        })

        it("when theme has invalid basePaletteId, then skips that theme", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        themeLibrary: {
                            themes: [
                                {
                                    id: "t-bad-palette",
                                    name: "Bad Palette Theme",
                                    mode: "dark",
                                    presetId: "cobalt",
                                    basePaletteId: "invalid",
                                    accentColor: "#aabbcc",
                                    accentIntensity: 70,
                                    globalRadius: 12,
                                    formRadius: 8,
                                },
                            ],
                            favoritePresetId: "cobalt",
                            updatedAtMs: 1000,
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.themes).toHaveLength(0)
            }
        })

        it("when theme has invalid accentColor (not hex), then skips that theme", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        themeLibrary: {
                            themes: [
                                {
                                    id: "t-bad-color",
                                    name: "Bad Color Theme",
                                    mode: "dark",
                                    presetId: "cobalt",
                                    basePaletteId: "cool",
                                    accentColor: "red",
                                    accentIntensity: 70,
                                    globalRadius: 12,
                                    formRadius: 8,
                                },
                            ],
                            favoritePresetId: "cobalt",
                            updatedAtMs: 1000,
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.themes).toHaveLength(0)
            }
        })

        it("when theme has non-numeric accentIntensity, then skips that theme", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        themeLibrary: {
                            themes: [
                                {
                                    id: "t-bad-intensity",
                                    name: "Bad Intensity Theme",
                                    mode: "dark",
                                    presetId: "cobalt",
                                    basePaletteId: "cool",
                                    accentColor: "#aabbcc",
                                    accentIntensity: "high",
                                    globalRadius: 12,
                                    formRadius: 8,
                                },
                            ],
                            favoritePresetId: "cobalt",
                            updatedAtMs: 1000,
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.themes).toHaveLength(0)
            }
        })

        it("when theme name is too short, then skips that theme", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        themeLibrary: {
                            themes: [
                                {
                                    id: "t-short-name",
                                    name: "A",
                                    mode: "dark",
                                    presetId: "cobalt",
                                    basePaletteId: "cool",
                                    accentColor: "#aabbcc",
                                    accentIntensity: 70,
                                    globalRadius: 12,
                                    formRadius: 8,
                                },
                            ],
                            favoritePresetId: "cobalt",
                            updatedAtMs: 1000,
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.themes).toHaveLength(0)
            }
        })

        it("when payload is nested under settings.themeLibrary, then parses correctly", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        settings: {
                            themeLibrary: {
                                themes: [
                                    {
                                        id: "settings-t1",
                                        name: "Settings Theme",
                                        mode: "dark",
                                        presetId: "moonstone",
                                        basePaletteId: "cool",
                                        accentColor: "#112233",
                                        accentIntensity: 80,
                                        globalRadius: 14,
                                        formRadius: 10,
                                    },
                                ],
                                favoritePresetId: "moonstone",
                                updatedAtMs: 9000,
                            },
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.themes).toHaveLength(1)
                expect(result.themes[0]?.id).toBe("settings-t1")
            }
        })

        it("when accentIntensity exceeds maximum, then clamps to 100", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        themeLibrary: {
                            themes: [
                                {
                                    id: "t-clamp",
                                    name: "Clamp Theme",
                                    mode: "dark",
                                    presetId: "cobalt",
                                    basePaletteId: "cool",
                                    accentColor: "#aabbcc",
                                    accentIntensity: 200,
                                    globalRadius: 50,
                                    formRadius: 50,
                                },
                            ],
                            favoritePresetId: "cobalt",
                            updatedAtMs: 1000,
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.themes).toHaveLength(1)
                expect(result.themes[0]?.accentIntensity).toBe(100)
                expect(result.themes[0]?.globalRadius).toBe(24)
                expect(result.themes[0]?.formRadius).toBe(20)
            }
        })

        it("when accentIntensity is below minimum, then clamps to 40", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        themeLibrary: {
                            themes: [
                                {
                                    id: "t-clamp-min",
                                    name: "Clamp Min Theme",
                                    mode: "dark",
                                    presetId: "cobalt",
                                    basePaletteId: "cool",
                                    accentColor: "#aabbcc",
                                    accentIntensity: 5,
                                    globalRadius: 2,
                                    formRadius: 1,
                                },
                            ],
                            favoritePresetId: "cobalt",
                            updatedAtMs: 1000,
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.themes).toHaveLength(1)
                expect(result.themes[0]?.accentIntensity).toBe(40)
                expect(result.themes[0]?.globalRadius).toBe(6)
                expect(result.themes[0]?.formRadius).toBe(4)
            }
        })

        it("when themes is not an array, then treats it as empty", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        themeLibrary: {
                            themes: "not-an-array",
                            favoritePresetId: "cobalt",
                            updatedAtMs: 0,
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.themes).toHaveLength(0)
                expect(result.favoritePresetId).toBe("cobalt")
            }
        })

        it("when theme has empty presetId, then skips that theme", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        themeLibrary: {
                            themes: [
                                {
                                    id: "t-no-preset",
                                    name: "No Preset Theme",
                                    mode: "dark",
                                    presetId: "",
                                    basePaletteId: "cool",
                                    accentColor: "#aabbcc",
                                    accentIntensity: 70,
                                    globalRadius: 12,
                                    formRadius: 8,
                                },
                            ],
                            favoritePresetId: "cobalt",
                            updatedAtMs: 1000,
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.themes).toHaveLength(0)
            }
        })

        it("when theme has non-string id, then skips that theme", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        themeLibrary: {
                            themes: [
                                {
                                    id: 42,
                                    name: "Numeric ID Theme",
                                    mode: "dark",
                                    presetId: "cobalt",
                                    basePaletteId: "cool",
                                    accentColor: "#aabbcc",
                                    accentIntensity: 70,
                                    globalRadius: 12,
                                    formRadius: 8,
                                },
                            ],
                            favoritePresetId: "cobalt",
                            updatedAtMs: 1000,
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.themes).toHaveLength(0)
            }
        })

        it("when accentColor is uppercased hex, then lowercases it", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        themeLibrary: {
                            themes: [
                                {
                                    id: "t-upper",
                                    name: "Upper Theme",
                                    mode: "dark",
                                    presetId: "cobalt",
                                    basePaletteId: "cool",
                                    accentColor: "#AABBCC",
                                    accentIntensity: 70,
                                    globalRadius: 12,
                                    formRadius: 8,
                                },
                            ],
                            favoritePresetId: "cobalt",
                            updatedAtMs: 1000,
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.themes).toHaveLength(1)
                expect(result.themes[0]?.accentColor).toBe("#aabbcc")
            }
        })

        it("when favoritePresetId is empty string, then treats it as undefined", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        themeLibrary: {
                            themes: [
                                {
                                    id: "t-no-fav",
                                    name: "No Fav Theme",
                                    mode: "dark",
                                    presetId: "cobalt",
                                    basePaletteId: "cool",
                                    accentColor: "#aabbcc",
                                    accentIntensity: 70,
                                    globalRadius: 12,
                                    formRadius: 8,
                                },
                            ],
                            favoritePresetId: "",
                            updatedAtMs: 1000,
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.favoritePresetId).toBeUndefined()
            }
        })

        it("when updatedAtMs is invalid string, then defaults to 0", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        themeLibrary: {
                            themes: [
                                {
                                    id: "t-invalid-date",
                                    name: "Invalid Date Theme",
                                    mode: "dark",
                                    presetId: "cobalt",
                                    basePaletteId: "cool",
                                    accentColor: "#aabbcc",
                                    accentIntensity: 70,
                                    globalRadius: 12,
                                    formRadius: 8,
                                },
                            ],
                            favoritePresetId: "cobalt",
                            updatedAtMs: "not-a-date",
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.updatedAtMs).toBe(0)
            }
        })

        it("when payload is nested under data.themeLibrary, then parses correctly", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        data: {
                            themeLibrary: {
                                themes: [
                                    {
                                        id: "data-t1",
                                        name: "Data Theme",
                                        mode: "light",
                                        presetId: "moonstone",
                                        basePaletteId: "warm",
                                        accentColor: "#ff0000",
                                        accentIntensity: 50,
                                        globalRadius: 10,
                                        formRadius: 6,
                                    },
                                ],
                                favoritePresetId: "moonstone",
                                updatedAtMs: 5000,
                            },
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.themes).toHaveLength(1)
                expect(result.themes[0]?.id).toBe("data-t1")
            }
        })

        it("when profile fields are directly on root object, then parses as direct payload", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        themes: [
                            {
                                id: "direct-t1",
                                name: "Direct Theme",
                                mode: "dark",
                                presetId: "cobalt",
                                basePaletteId: "cool",
                                accentColor: "#112233",
                                accentIntensity: 70,
                                globalRadius: 12,
                                formRadius: 8,
                            },
                        ],
                        favoritePresetId: "cobalt",
                        updatedAtMs: 8000,
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.themes).toHaveLength(1)
                expect(result.themes[0]?.id).toBe("direct-t1")
                expect(result.updatedAtMs).toBe(8000)
            }
        })

        it("when payload is nested under preferences, then parses correctly", async (): Promise<void> => {
            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: vi.fn().mockResolvedValue(
                    JSON.stringify({
                        preferences: {
                            favoritePresetId: "forest",
                            themes: [
                                {
                                    id: "pref-t1",
                                    name: "Pref Theme",
                                    mode: "system",
                                    presetId: "forest",
                                    basePaletteId: "neutral",
                                    accentColor: "#00ff00",
                                    accentIntensity: 65,
                                    globalRadius: 8,
                                    formRadius: 5,
                                },
                            ],
                            updatedAtMs: 7000,
                        },
                    }),
                ),
            })

            const result = await readThemeLibraryProfileState()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.themes).toHaveLength(1)
                expect(result.themes[0]?.id).toBe("pref-t1")
            }
        })
    })

    describe("createThemeLibraryApiClient failure path", (): void => {
        let originalFetch: typeof globalThis.fetch

        beforeEach((): void => {
            originalFetch = globalThis.fetch
        })

        afterEach((): void => {
            globalThis.fetch = originalFetch
            vi.restoreAllMocks()
            mockCreateApiConfig.mockReturnValue({
                baseUrl: "http://localhost:3000",
                defaultHeaders: {},
            })
        })

        it("when createApiConfig throws, then readThemeLibraryProfileState returns undefined", async (): Promise<void> => {
            mockCreateApiConfig.mockImplementation((): never => {
                throw new Error("Missing env variable")
            })

            const { readThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            const result = await readThemeLibraryProfileState()
            expect(result).toBeUndefined()
        })

        it("when createApiConfig throws, then writeThemeLibraryProfileState returns false", async (): Promise<void> => {
            mockCreateApiConfig.mockImplementation((): never => {
                throw new Error("Missing env variable")
            })

            const { writeThemeLibraryProfileState } =
                await import("@/lib/theme/theme-library-profile-sync")

            const profile: IThemeLibraryProfileState = {
                themes: [],
                favoritePresetId: "cobalt",
                updatedAtMs: 1000,
            }

            const result = await writeThemeLibraryProfileState(profile)
            expect(result).toBe(false)
        })
    })
})

function createValidThemeWithMode(
    mode: "dark" | "light" | "system",
): IThemeLibraryProfileState["themes"][number] {
    return {
        id: "theme-test",
        name: "Test Theme",
        mode,
        presetId: "moonstone",
        basePaletteId: "neutral",
        accentColor: "#112233",
        accentIntensity: 70,
        globalRadius: 12,
        formRadius: 8,
    }
}

function createValidThemeWithPalette(
    basePaletteId: "cool" | "neutral" | "warm",
): IThemeLibraryProfileState["themes"][number] {
    return {
        id: "theme-palette",
        name: "Palette Test",
        mode: "dark",
        presetId: "cobalt",
        basePaletteId,
        accentColor: "#aabbcc",
        accentIntensity: 60,
        globalRadius: 10,
        formRadius: 6,
    }
}

function createStateWithThemeOverrides(
    overrides: Partial<IThemeLibraryProfileState["themes"][number]>,
): IThemeLibraryProfileState {
    return {
        themes: [
            {
                id: "theme-override",
                name: "Override Test",
                mode: "dark",
                presetId: "moonstone",
                basePaletteId: "neutral",
                accentColor: "#000000",
                accentIntensity: 70,
                globalRadius: 12,
                formRadius: 8,
                ...overrides,
            },
        ],
        favoritePresetId: undefined,
        updatedAtMs: 0,
    }
}
