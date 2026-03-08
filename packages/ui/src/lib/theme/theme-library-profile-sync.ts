import { createApiConfig, resolveUiEnv } from "../api/config"
import { FetchHttpClient, isApiHttpError, type IHttpClient } from "../api/http-client"

/**
 * Нормализованный профиль библиотеки тем.
 */
export interface IThemeLibraryProfileState {
    /** Список пользовательских тем. */
    readonly themes: ReadonlyArray<IThemeLibraryProfileTheme>
    /** Закреплённый пресет. */
    readonly favoritePresetId: string | undefined
    /** Метка времени последнего обновления профиля. */
    readonly updatedAtMs: number
}

/**
 * Тема в профиле пользователя.
 */
export interface IThemeLibraryProfileTheme {
    /** Уникальный идентификатор темы. */
    readonly id: string
    /** Название темы. */
    readonly name: string
    /** Режим темы. */
    readonly mode: "dark" | "light" | "system"
    /** Идентификатор пресета. */
    readonly presetId: string
    /** Базовая палитра. */
    readonly basePaletteId: "cool" | "neutral" | "warm"
    /** Базовый accent цвет. */
    readonly accentColor: string
    /** Интенсивность accent цвета. */
    readonly accentIntensity: number
    /** Радиус UI-компонентов. */
    readonly globalRadius: number
    /** Радиус form-контролов. */
    readonly formRadius: number
}

const THEME_LIBRARY_ENDPOINTS = ["/api/v1/user/settings", "/api/v1/user/preferences"] as const
const THEME_LIBRARY_WRITE_METHODS = ["PUT", "PATCH", "POST"] as const
const DEFAULT_UPDATED_AT_MS = 0

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && Array.isArray(value) === false
}

function isHexColor(value: string): boolean {
    return /^#[0-9a-fA-F]{6}$/.test(value)
}

function clampNumber(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

function parseUpdatedAtValue(rawValue: unknown): number {
    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
        return rawValue
    }

    if (typeof rawValue === "string") {
        const parsed = Date.parse(rawValue)
        if (Number.isFinite(parsed)) {
            return parsed
        }
    }

    return DEFAULT_UPDATED_AT_MS
}

function parseThemeMode(rawMode: unknown): "dark" | "light" | "system" | undefined {
    if (rawMode === "dark" || rawMode === "light" || rawMode === "system") {
        return rawMode
    }
    return undefined
}

function parseBasePalette(rawPalette: unknown): "cool" | "neutral" | "warm" | undefined {
    if (rawPalette === "cool" || rawPalette === "neutral" || rawPalette === "warm") {
        return rawPalette
    }
    return undefined
}

function parseThemeItem(rawValue: unknown): IThemeLibraryProfileTheme | undefined {
    if (isRecord(rawValue) === false) {
        return undefined
    }

    if (typeof rawValue.id !== "string" || rawValue.id.trim().length === 0) {
        return undefined
    }
    if (typeof rawValue.name !== "string" || rawValue.name.trim().length < 2) {
        return undefined
    }
    if (typeof rawValue.presetId !== "string" || rawValue.presetId.trim().length === 0) {
        return undefined
    }
    if (typeof rawValue.accentColor !== "string" || isHexColor(rawValue.accentColor) === false) {
        return undefined
    }

    const mode = parseThemeMode(rawValue.mode)
    const basePaletteId = parseBasePalette(rawValue.basePaletteId)
    const accentIntensity =
        typeof rawValue.accentIntensity === "number"
            ? clampNumber(rawValue.accentIntensity, 40, 100)
            : undefined
    const globalRadius =
        typeof rawValue.globalRadius === "number"
            ? clampNumber(rawValue.globalRadius, 6, 24)
            : undefined
    const formRadius =
        typeof rawValue.formRadius === "number"
            ? clampNumber(rawValue.formRadius, 4, 20)
            : undefined

    if (
        mode === undefined
        || basePaletteId === undefined
        || accentIntensity === undefined
        || globalRadius === undefined
        || formRadius === undefined
    ) {
        return undefined
    }

    return {
        accentColor: rawValue.accentColor.toLowerCase(),
        accentIntensity,
        basePaletteId,
        formRadius,
        globalRadius,
        id: rawValue.id,
        mode,
        name: rawValue.name.trim(),
        presetId: rawValue.presetId,
    }
}

function parseThemesArray(rawValue: unknown): ReadonlyArray<IThemeLibraryProfileTheme> {
    if (Array.isArray(rawValue) === false) {
        return []
    }

    const parsed: Array<IThemeLibraryProfileTheme> = []
    rawValue.forEach((entry): void => {
        const parsedItem = parseThemeItem(entry)
        if (parsedItem !== undefined) {
            parsed.push(parsedItem)
        }
    })

    return parsed
}

function parseProfilePayload(rawValue: unknown): IThemeLibraryProfileState | undefined {
    if (isRecord(rawValue) === false) {
        return undefined
    }

    const favoritePresetId =
        typeof rawValue.favoritePresetId === "string" && rawValue.favoritePresetId.length > 0
            ? rawValue.favoritePresetId
            : undefined
    const themes = parseThemesArray(rawValue.themes)
    if (themes.length === 0 && favoritePresetId === undefined) {
        return undefined
    }

    return {
        favoritePresetId,
        themes,
        updatedAtMs: parseUpdatedAtValue(rawValue.updatedAtMs),
    }
}

function readProfilePayload(rawValue: unknown): IThemeLibraryProfileState | undefined {
    if (isRecord(rawValue) === false) {
        return undefined
    }

    const payloadCandidates: Array<unknown> = [
        rawValue.themeLibrary,
        rawValue.appearance,
        rawValue.settings,
        rawValue.preferences,
        rawValue.data,
    ]

    const directPayload = parseProfilePayload(rawValue)
    if (directPayload !== undefined) {
        return directPayload
    }

    for (const candidate of payloadCandidates) {
        if (isRecord(candidate) === false) {
            continue
        }

        const nestedDirectPayload = parseProfilePayload(candidate)
        if (nestedDirectPayload !== undefined) {
            return nestedDirectPayload
        }

        const nestedThemeLibraryPayload = parseProfilePayload(candidate.themeLibrary)
        if (nestedThemeLibraryPayload !== undefined) {
            return nestedThemeLibraryPayload
        }
    }

    return undefined
}

function createThemeLibraryApiClient(): IHttpClient | undefined {
    try {
        const config = createApiConfig(resolveUiEnv(import.meta.env))
        return new FetchHttpClient(config)
    } catch {
        return undefined
    }
}

/**
 * Загружает библиотеку пользовательских тем из profile API.
 *
 * @returns Нормализованный профиль, если данные доступны.
 */
export async function readThemeLibraryProfileState(): Promise<IThemeLibraryProfileState | undefined> {
    const client = createThemeLibraryApiClient()
    if (client === undefined) {
        return undefined
    }

    for (const endpoint of THEME_LIBRARY_ENDPOINTS) {
        try {
            const response = await client.request<unknown>({
                method: "GET",
                path: endpoint,
                credentials: "include",
            })
            const parsed = readProfilePayload(response)
            if (parsed !== undefined) {
                return parsed
            }
        } catch {
            continue
        }
    }

    return undefined
}

/**
 * Сохраняет библиотеку пользовательских тем в profile API.
 *
 * @param profile Новое состояние библиотеки тем.
 * @returns True при успешной синхронизации.
 */
export async function writeThemeLibraryProfileState(
    profile: IThemeLibraryProfileState,
): Promise<boolean> {
    const client = createThemeLibraryApiClient()
    if (client === undefined) {
        return false
    }

    const payload = {
        appearance: {
            themeLibrary: profile,
        },
        preferences: {
            themeLibrary: profile,
        },
        settings: {
            themeLibrary: profile,
        },
        themeLibrary: profile,
    }

    for (const endpoint of THEME_LIBRARY_ENDPOINTS) {
        for (const method of THEME_LIBRARY_WRITE_METHODS) {
            try {
                await client.request<unknown>({
                    method,
                    path: endpoint,
                    body: payload,
                    credentials: "include",
                })
                return true
            } catch (error: unknown) {
                if (isApiHttpError(error) && error.status === 404) {
                    continue
                }
                continue
            }
        }
    }

    return false
}
