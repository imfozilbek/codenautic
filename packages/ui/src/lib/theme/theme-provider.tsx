import {
    type Dispatch,
    type ReactElement,
    type ReactNode,
    type SetStateAction,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import { createApiConfig, resolveUiEnv } from "../api/config"
import { FetchHttpClient, isApiHttpError } from "../api/http-client"
import type { IHttpClient } from "../api/http-client"

/**
 * Доступные режимы темы интерфейса.
 */
export type ThemeMode = "light" | "dark" | "system"

/**
 * Разрешённые режимы после применения system fallback.
 */
export type ThemeResolvedMode = "light" | "dark"

/**
 * Набор CSS переменных для конкретной цветовой схемы.
 */
export interface IThemePalette {
    /** Базовый фон приложения. */
    readonly background: string
    /** Основной текст. */
    readonly foreground: string
    /** Вторичный/приглушённый текст (метки, подписи, secondary UI). */
    readonly mutedForeground: string
    /** Фон поверхностей. */
    readonly surface: string
    /** Поверхность с пониженной контрастностью. */
    readonly surfaceMuted: string
    /** Граница. */
    readonly border: string
    /** Фокус и focus ring. */
    readonly ring: string
    /** Акцентный цвет действий. */
    readonly primary: string
    /** Текст на акценте. */
    readonly primaryForeground: string
    /** Вторичный акцент. */
    readonly accent: string
    /** Текст на вторичном акценте. */
    readonly accentForeground: string
    /** Успех. */
    readonly success: string
    /** Предупреждение. */
    readonly warning: string
    /** Ошибка. */
    readonly danger: string
    /** Фон code-блоков. */
    readonly codeSurface: string
    /** Текст на success-tinted поверхностях (bg-success/10). */
    readonly onSuccess: string
    /** Текст на warning-tinted поверхностях (bg-warning/10). */
    readonly onWarning: string
    /** Текст на danger-tinted поверхностях (bg-danger/10). */
    readonly onDanger: string
    /** Текст на primary-tinted поверхностях (bg-primary/10). */
    readonly onPrimary: string
}

/**
 * Пресет темы для режима light и dark.
 */
export interface IThemePreset {
    /** Уникальный ключ пресета. */
    readonly id: ThemePresetId
    /** Читаемое название пресета. */
    readonly label: string
    /** Короткое описание. */
    readonly description: string
    /** Цвета для светлого режима. */
    readonly light: IThemePalette
    /** Цвета для тёмного режима. */
    readonly dark: IThemePalette
}

/**
 * Набор значений для синхронизации пользовательской темы.
 */
interface IThemeSettingsPayload {
    /** Темная/светлая/системная схема. */
    readonly mode?: string
    /** Код пресета темы. */
    readonly preset?: string
}

/**
 * Результат инициализации темы.
 */
export interface IThemeBootstrapState {
    /** Сохранённый режим (с учётом system). */
    readonly mode: ThemeMode
    /** Сохранённый пресет. */
    readonly preset: ThemePresetId
    /** Физически применённый режим. */
    readonly resolvedMode: ThemeResolvedMode
}

const THEME_MODE_STORAGE_KEY = "codenautic:ui:theme-mode"
const THEME_PRESET_STORAGE_KEY = "codenautic:ui:theme-preset"
const THEME_PROFILE_STORAGE_SYNC_KEY = "codenautic:ui:theme-profile-synced"
const THEME_DEFAULT_MODE: ThemeMode = "system"
const DEFAULT_THEME_PRESET_ID = "moonstone"
const THEME_SETTINGS_TIMEOUT_MS = 2_000
const THEME_SETTINGS_SAVE_DEBOUNCE_MS = 200
const THEME_PROFILE_DEFAULT_UPDATED_AT_MS = 0
const THEME_SETTINGS_ENDPOINTS = ["/api/v1/user/settings", "/api/v1/user/preferences"] as const
const THEME_SETTINGS_WRITE_METHODS = ["PUT", "PATCH", "POST"] as const
const THEME_SETTINGS_PAYLOAD_PATHS = ["theme", "settings", "preferences", "data"] as const

/**
 * Ограниченный профиль темы для API-памяти.
 */
interface IThemeProfile {
    /** Темная/светлая/системная схема. */
    readonly mode: ThemeMode
    /** Код пресета. */
    readonly preset: ThemePresetId
    /** Время синхронизации в миллисекундах. */
    readonly updatedAtMs: number
}

interface IThemeProfileSyncState {
    /** Идентификатор режима. */
    readonly mode: ThemeMode
    /** Идентификатор пресета. */
    readonly preset: ThemePresetId
    /** Время последнего успешного/локального обновления в ms. */
    readonly updatedAtMs: number
}

interface IThemeProfileResponse {
    /** Результат чтения. */
    readonly profile: IThemeSettingsPayload
    /** Время обновления из источника. */
    readonly updatedAtMs: number
}

type TThemeSyncSelection = {
    readonly profile: IThemeProfile
    readonly source: "local" | "remote"
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && Array.isArray(value) === false
}

function isThemeModeValue(rawMode: unknown): rawMode is ThemeMode {
    if (typeof rawMode !== "string") {
        return false
    }
    return isThemeMode(rawMode)
}

function isThemePresetValue(rawPreset: unknown): rawPreset is ThemePresetId {
    if (typeof rawPreset !== "string") {
        return false
    }
    return isThemePreset(rawPreset)
}

function toThemeProfile(value: unknown, fallback: IThemeProfile): IThemeProfile {
    if (isRecord(value) === false) {
        return fallback
    }

    const mode = isThemeModeValue(value.mode) ? value.mode : fallback.mode
    const preset = isThemePresetValue(value.preset) ? value.preset : fallback.preset
    const updatedAtMs = parseUpdatedAtValue(value.updatedAtMs)

    return {
        mode,
        preset,
        updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : fallback.updatedAtMs,
    }
}

function readThemeSettingsPayload(raw: unknown): IThemeSettingsPayload {
    if (isRecord(raw) === false) {
        return {}
    }

    const directPayload = readThemeSettingsPayloadFromObject(raw)
    if (directPayload.mode !== undefined || directPayload.preset !== undefined) {
        return directPayload
    }

    const nestedPayload = readThemeSettingsPayloadFromNestedValues(raw)
    if (nestedPayload.mode !== undefined || nestedPayload.preset !== undefined) {
        return nestedPayload
    }

    return {}
}

function readThemeSettingsPayloadFromObject(raw: Record<string, unknown>): IThemeSettingsPayload {
    const directMode =
        isThemeModeValue(raw.mode) === true
            ? raw.mode
            : isThemeModeValue(raw.themeMode) === true
              ? raw.themeMode
              : undefined
    const directPreset =
        isThemePresetValue(raw.preset) === true
            ? raw.preset
            : isThemePresetValue(raw.themePreset) === true
              ? raw.themePreset
              : undefined

    if (directMode === undefined && directPreset === undefined) {
        return {}
    }

    return {
        mode: directMode,
        preset: directPreset,
    }
}

function readThemeSettingsPayloadFromNestedValues(
    raw: Record<string, unknown>,
): IThemeSettingsPayload {
    for (const path of THEME_SETTINGS_PAYLOAD_PATHS) {
        const nested = raw[path]
        if (isRecord(nested) === false) {
            continue
        }

        const payload = readThemeSettingsPayloadFromObject(nested)
        if (payload.mode !== undefined || payload.preset !== undefined) {
            return payload
        }
    }

    return {}
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

    return THEME_PROFILE_DEFAULT_UPDATED_AT_MS
}

function getWindowLocalStorage(): Storage | undefined {
    if (typeof window === "undefined") {
        return undefined
    }

    try {
        return window.localStorage
    } catch {
        return undefined
    }
}

function readLocalStorageItem(storageKey: string): string | undefined {
    const storage = getWindowLocalStorage()
    if (storage === undefined) {
        return undefined
    }

    try {
        return storage.getItem(storageKey) ?? undefined
    } catch {
        return undefined
    }
}

function writeLocalStorageItem(storageKey: string, value: string): void {
    const storage = getWindowLocalStorage()
    if (storage === undefined) {
        return
    }

    try {
        storage.setItem(storageKey, value)
    } catch {
        return
    }
}

function readThemeProfileSyncState(): IThemeProfileSyncState | undefined {
    const rawState = readLocalStorageItem(THEME_PROFILE_STORAGE_SYNC_KEY)
    if (rawState === undefined) {
        return undefined
    }

    try {
        const parsed = JSON.parse(rawState) as Record<string, unknown>
        const mode = isThemeModeValue(parsed.mode) === true ? parsed.mode : undefined
        const preset = isThemePresetValue(parsed.preset) === true ? parsed.preset : undefined
        const updatedAtMs = parseUpdatedAtValue(parsed.updatedAtMs)

        if (mode === undefined || preset === undefined) {
            return undefined
        }

        return {
            mode,
            preset,
            updatedAtMs,
        }
    } catch {
        return undefined
    }
}

function writeThemeProfileSyncState(profile: IThemeProfile): void {
    const payload = {
        mode: profile.mode,
        preset: profile.preset,
        updatedAtMs: profile.updatedAtMs,
    }

    writeLocalStorageItem(THEME_PROFILE_STORAGE_SYNC_KEY, JSON.stringify(payload))
}

function createThemeSettingsApiClient(): IHttpClient | undefined {
    try {
        const config = createApiConfig(resolveUiEnv(import.meta.env))

        return new FetchHttpClient(config)
    } catch {
        return undefined
    }
}

async function fetchThemeProfileFromApi(
    client: IHttpClient,
    signal: AbortSignal,
    endpoint: string,
): Promise<IThemeProfileResponse | undefined> {
    try {
        const response = await client.request<unknown>({
            method: "GET",
            path: endpoint,
            credentials: "include",
            signal,
        })

        const profile = readThemeSettingsPayload(response)
        const responsePayload = isRecord(response) ? response : ({} as Record<string, unknown>)
        const updatedAtMs = parseUpdatedAtValue(responsePayload.updatedAt)

        if (
            isThemeModeValue(profile.mode) === false &&
            isThemePresetValue(profile.preset) === false
        ) {
            return undefined
        }

        return {
            profile,
            updatedAtMs,
        }
    } catch {
        return undefined
    }
}

async function saveThemeProfileToApi(
    client: IHttpClient,
    signal: AbortSignal,
    endpoint: string,
    profile: IThemeProfile,
): Promise<boolean> {
    const payload: IThemeSettingsPayload = {
        mode: profile.mode,
        preset: profile.preset,
    }

    for (const method of THEME_SETTINGS_WRITE_METHODS) {
        try {
            await client.request<unknown>({
                method,
                path: endpoint,
                body: payload,
                credentials: "include",
                signal,
            })
            return true
        } catch (error: unknown) {
            if (isApiHttpError(error) === true && error.status === 404) {
                return false
            }

            if (isApiHttpError(error) === true && error.status === 405) {
                continue
            }
        }
    }

    return false
}

/**
 * Реестр HeroUI-подобных пресетов.
 */
export const THEME_PRESETS = [
    {
        id: "moonstone",
        label: "Moonstone",
        description: "HeroUI-совместимая teal-палитра с тёплым акцентом.",
        light: {
            background: "oklch(0.9702 0.002 148.67)",
            foreground: "oklch(0.2103 0.002 148.67)",
            mutedForeground: "oklch(0.5517 0.004 148.67)",
            surface: "oklch(1.0 0.001 148.67)",
            surfaceMuted: "oklch(0.94 0.002 148.67)",
            border: "oklch(0.9 0.002 148.67)",
            ring: "oklch(0.7697 0.2124 148.67)",
            primary: "oklch(0.7697 0.2124 148.67)",
            primaryForeground: "oklch(0.15 0.03 148.67)",
            accent: "oklch(0.75 0.15 45)",
            accentForeground: "oklch(0.2 0.03 45)",
            success: "oklch(0.6072 0.1647 149.02)",
            warning: "oklch(0.6972 0.1687 54.22)",
            danger: "oklch(0.5509 0.2166 25.29)",
            codeSurface: "oklch(0.16 0.005 148.67)",
            onSuccess: "oklch(0.35 0.08 149)",
            onWarning: "oklch(0.35 0.08 54)",
            onDanger: "oklch(0.35 0.08 25)",
            onPrimary: "oklch(0.35 0.08 148)",
        },
        dark: {
            background: "oklch(0.12 0.002 148.67)",
            foreground: "oklch(0.9911 0.002 148.67)",
            mutedForeground: "oklch(0.705 0.004 148.67)",
            surface: "oklch(0.2103 0.004 148.67)",
            surfaceMuted: "oklch(0.274 0.002 148.67)",
            border: "oklch(0.28 0.002 148.67)",
            ring: "oklch(0.7697 0.2124 148.67)",
            primary: "oklch(0.7697 0.2124 148.67)",
            primaryForeground: "oklch(0.15 0.03 148.67)",
            accent: "oklch(0.78 0.14 45)",
            accentForeground: "oklch(0.2 0.03 45)",
            success: "oklch(0.7697 0.2124 148.67)",
            warning: "oklch(0.7921 0.1626 67.42)",
            danger: "oklch(0.5931 0.2338 25.42)",
            codeSurface: "oklch(0.16 0.005 148.67)",
            onSuccess: "oklch(0.88 0.06 149)",
            onWarning: "oklch(0.88 0.06 54)",
            onDanger: "oklch(0.88 0.06 25)",
            onPrimary: "oklch(0.88 0.06 148)",
        },
    },
    {
        id: "cobalt",
        label: "Cobalt",
        description: "Технологичный синий с фокусным акцентом.",
        light: {
            background: "oklch(0.987 0.008 258)",
            foreground: "oklch(0.235 0.02 252)",
            mutedForeground: "oklch(0.55 0.015 252)",
            surface: "oklch(0.99 0.004 257)",
            surfaceMuted: "oklch(0.954 0.01 257)",
            border: "oklch(0.878 0.01 252)",
            ring: "oklch(0.682 0.148 257)",
            primary: "oklch(0.67 0.19 268)",
            primaryForeground: "oklch(0.985 0.006 259)",
            accent: "oklch(0.79 0.13 188)",
            accentForeground: "oklch(0.235 0.02 252)",
            success: "oklch(0.74 0.147 151)",
            warning: "oklch(0.82 0.142 84)",
            danger: "oklch(0.66 0.215 24)",
            codeSurface: "oklch(0.16 0.02 255)",
            onSuccess: "oklch(0.35 0.08 151)",
            onWarning: "oklch(0.35 0.08 84)",
            onDanger: "oklch(0.35 0.08 24)",
            onPrimary: "oklch(0.35 0.08 268)",
        },
        dark: {
            background: "oklch(0.2 0.03 255)",
            foreground: "oklch(0.94 0.012 250)",
            mutedForeground: "oklch(0.65 0.015 250)",
            surface: "oklch(0.26 0.03 255)",
            surfaceMuted: "oklch(0.31 0.028 254)",
            border: "oklch(0.43 0.034 252)",
            ring: "oklch(0.75 0.14 260)",
            primary: "oklch(0.78 0.198 268)",
            primaryForeground: "oklch(0.23 0.03 255)",
            accent: "oklch(0.77 0.122 188)",
            accentForeground: "oklch(0.235 0.02 188)",
            success: "oklch(0.76 0.132 149)",
            warning: "oklch(0.83 0.135 78)",
            danger: "oklch(0.73 0.2 25)",
            codeSurface: "oklch(0.16 0.02 255)",
            onSuccess: "oklch(0.88 0.06 149)",
            onWarning: "oklch(0.88 0.06 78)",
            onDanger: "oklch(0.88 0.06 25)",
            onPrimary: "oklch(0.88 0.06 268)",
        },
    },
    {
        id: "forest",
        label: "Forest",
        description: "Природная зелень без перегруза.",
        light: {
            background: "oklch(0.985 0.012 136)",
            foreground: "oklch(0.242 0.025 136)",
            mutedForeground: "oklch(0.55 0.015 136)",
            surface: "oklch(0.99 0.008 136)",
            surfaceMuted: "oklch(0.948 0.014 141)",
            border: "oklch(0.88 0.01 142)",
            ring: "oklch(0.66 0.12 142)",
            primary: "oklch(0.57 0.14 146)",
            primaryForeground: "oklch(0.985 0.01 146)",
            accent: "oklch(0.79 0.1 84)",
            accentForeground: "oklch(0.246 0.028 90)",
            success: "oklch(0.72 0.16 149)",
            warning: "oklch(0.8 0.14 82)",
            danger: "oklch(0.67 0.21 24)",
            codeSurface: "oklch(0.16 0.02 146)",
            onSuccess: "oklch(0.35 0.08 149)",
            onWarning: "oklch(0.35 0.08 82)",
            onDanger: "oklch(0.35 0.08 24)",
            onPrimary: "oklch(0.35 0.08 146)",
        },
        dark: {
            background: "oklch(0.198 0.028 151)",
            foreground: "oklch(0.945 0.012 132)",
            mutedForeground: "oklch(0.65 0.015 132)",
            surface: "oklch(0.262 0.03 144)",
            surfaceMuted: "oklch(0.324 0.028 141)",
            border: "oklch(0.44 0.026 144)",
            ring: "oklch(0.75 0.12 145)",
            primary: "oklch(0.71 0.13 146)",
            primaryForeground: "oklch(0.24 0.03 151)",
            accent: "oklch(0.78 0.09 85)",
            accentForeground: "oklch(0.24 0.02 86)",
            success: "oklch(0.77 0.16 149)",
            warning: "oklch(0.82 0.135 82)",
            danger: "oklch(0.73 0.19 25)",
            codeSurface: "oklch(0.16 0.02 146)",
            onSuccess: "oklch(0.88 0.06 149)",
            onWarning: "oklch(0.88 0.06 82)",
            onDanger: "oklch(0.88 0.06 25)",
            onPrimary: "oklch(0.88 0.06 146)",
        },
    },
    {
        id: "sunrise",
        label: "Sunrise",
        description: "Тёплый янтарный с оранжевыми акцентами.",
        light: {
            background: "oklch(0.99 0.01 68)",
            foreground: "oklch(0.245 0.02 61)",
            mutedForeground: "oklch(0.55 0.015 61)",
            surface: "oklch(0.995 0.008 66)",
            surfaceMuted: "oklch(0.956 0.015 73)",
            border: "oklch(0.886 0.01 70)",
            ring: "oklch(0.68 0.132 72)",
            primary: "oklch(0.67 0.16 74)",
            primaryForeground: "oklch(0.985 0.012 64)",
            accent: "oklch(0.76 0.15 34)",
            accentForeground: "oklch(0.98 0.008 38)",
            success: "oklch(0.72 0.14 149)",
            warning: "oklch(0.81 0.15 63)",
            danger: "oklch(0.64 0.2 24)",
            codeSurface: "oklch(0.16 0.015 68)",
            onSuccess: "oklch(0.35 0.08 149)",
            onWarning: "oklch(0.35 0.08 63)",
            onDanger: "oklch(0.35 0.08 24)",
            onPrimary: "oklch(0.35 0.08 74)",
        },
        dark: {
            background: "oklch(0.208 0.028 58)",
            foreground: "oklch(0.94 0.012 66)",
            mutedForeground: "oklch(0.65 0.015 66)",
            surface: "oklch(0.26 0.027 64)",
            surfaceMuted: "oklch(0.32 0.026 67)",
            border: "oklch(0.415 0.03 64)",
            ring: "oklch(0.73 0.125 70)",
            primary: "oklch(0.71 0.168 74)",
            primaryForeground: "oklch(0.245 0.02 61)",
            accent: "oklch(0.78 0.148 32)",
            accentForeground: "oklch(0.98 0.012 30)",
            success: "oklch(0.77 0.132 149)",
            warning: "oklch(0.83 0.14 62)",
            danger: "oklch(0.74 0.2 26)",
            codeSurface: "oklch(0.16 0.015 68)",
            onSuccess: "oklch(0.88 0.06 149)",
            onWarning: "oklch(0.88 0.06 62)",
            onDanger: "oklch(0.88 0.06 26)",
            onPrimary: "oklch(0.88 0.06 74)",
        },
    },
    {
        id: "graphite",
        label: "Graphite",
        description: "Классическая нейтральная палитра для аналитики.",
        light: {
            background: "oklch(0.985 0.004 240)",
            foreground: "oklch(0.236 0.02 255)",
            mutedForeground: "oklch(0.55 0.01 255)",
            surface: "oklch(0.992 0.004 241)",
            surfaceMuted: "oklch(0.95 0.008 240)",
            border: "oklch(0.885 0.008 244)",
            ring: "oklch(0.675 0.035 250)",
            primary: "oklch(0.65 0.03 250)",
            primaryForeground: "oklch(0.985 0.004 255)",
            accent: "oklch(0.74 0.028 232)",
            accentForeground: "oklch(0.24 0.01 233)",
            success: "oklch(0.72 0.12 150)",
            warning: "oklch(0.8 0.12 85)",
            danger: "oklch(0.66 0.19 24)",
            codeSurface: "oklch(0.16 0.008 240)",
            onSuccess: "oklch(0.35 0.08 150)",
            onWarning: "oklch(0.35 0.08 85)",
            onDanger: "oklch(0.35 0.08 24)",
            onPrimary: "oklch(0.35 0.08 250)",
        },
        dark: {
            background: "oklch(0.18 0.01 236)",
            foreground: "oklch(0.94 0.008 252)",
            mutedForeground: "oklch(0.65 0.01 252)",
            surface: "oklch(0.26 0.014 241)",
            surfaceMuted: "oklch(0.32 0.018 242)",
            border: "oklch(0.44 0.03 244)",
            ring: "oklch(0.7 0.048 248)",
            primary: "oklch(0.72 0.035 250)",
            primaryForeground: "oklch(0.18 0.01 241)",
            accent: "oklch(0.76 0.04 231)",
            accentForeground: "oklch(0.24 0.01 233)",
            success: "oklch(0.76 0.108 151)",
            warning: "oklch(0.82 0.11 84)",
            danger: "oklch(0.73 0.182 25)",
            codeSurface: "oklch(0.16 0.008 240)",
            onSuccess: "oklch(0.88 0.06 151)",
            onWarning: "oklch(0.88 0.06 84)",
            onDanger: "oklch(0.88 0.06 25)",
            onPrimary: "oklch(0.88 0.06 250)",
        },
    },
    {
        id: "aqua",
        label: "Aqua",
        description: "Холодный акцент для спокойного сканирования.",
        light: {
            background: "oklch(0.986 0.01 194)",
            foreground: "oklch(0.24 0.02 204)",
            mutedForeground: "oklch(0.55 0.015 204)",
            surface: "oklch(0.992 0.006 197)",
            surfaceMuted: "oklch(0.956 0.01 197)",
            border: "oklch(0.88 0.008 195)",
            ring: "oklch(0.683 0.127 201)",
            primary: "oklch(0.62 0.16 205)",
            primaryForeground: "oklch(0.985 0.008 207)",
            accent: "oklch(0.79 0.11 173)",
            accentForeground: "oklch(0.236 0.034 181)",
            success: "oklch(0.71 0.128 149)",
            warning: "oklch(0.82 0.14 84)",
            danger: "oklch(0.68 0.215 23)",
            codeSurface: "oklch(0.16 0.02 204)",
            onSuccess: "oklch(0.35 0.08 149)",
            onWarning: "oklch(0.35 0.08 84)",
            onDanger: "oklch(0.35 0.08 23)",
            onPrimary: "oklch(0.35 0.08 205)",
        },
        dark: {
            background: "oklch(0.197 0.028 204)",
            foreground: "oklch(0.94 0.01 205)",
            mutedForeground: "oklch(0.65 0.012 205)",
            surface: "oklch(0.262 0.032 205)",
            surfaceMuted: "oklch(0.323 0.032 204)",
            border: "oklch(0.44 0.033 205)",
            ring: "oklch(0.78 0.145 198)",
            primary: "oklch(0.75 0.16 205)",
            primaryForeground: "oklch(0.22 0.03 205)",
            accent: "oklch(0.81 0.13 175)",
            accentForeground: "oklch(0.23 0.03 181)",
            success: "oklch(0.77 0.142 152)",
            warning: "oklch(0.82 0.14 83)",
            danger: "oklch(0.72 0.19 24)",
            codeSurface: "oklch(0.16 0.02 204)",
            onSuccess: "oklch(0.88 0.06 152)",
            onWarning: "oklch(0.88 0.06 83)",
            onDanger: "oklch(0.88 0.06 24)",
            onPrimary: "oklch(0.88 0.06 205)",
        },
    },
] as const

/**
 * Идентификаторы пресетов автоматически выводятся из реестра.
 */
export type ThemePresetId = (typeof THEME_PRESETS)[number]["id"]

const THEME_CSS_VARIABLES: ReadonlyArray<keyof IThemePalette> = [
    "background",
    "foreground",
    "mutedForeground",
    "surface",
    "surfaceMuted",
    "border",
    "ring",
    "primary",
    "primaryForeground",
    "accent",
    "accentForeground",
    "success",
    "warning",
    "danger",
    "codeSurface",
    "onSuccess",
    "onWarning",
    "onDanger",
    "onPrimary",
]

interface IThemeContext {
    /** Выбранный режим (включая system). */
    readonly mode: ThemeMode
    /** Разрешённый режим с учётом system. */
    readonly resolvedMode: ThemeResolvedMode
    /** Выбранный пресет. */
    readonly preset: ThemePresetId
    /** Каталог пресетов. */
    readonly presets: readonly IThemePreset[]
    /** Установка режима с сохранением в localStorage. */
    readonly setMode: Dispatch<SetStateAction<ThemeMode>>
    /** Установка пресета с сохранением в localStorage. */
    readonly setPreset: Dispatch<SetStateAction<ThemePresetId>>
}

function isThemeMode(rawMode: string): rawMode is ThemeMode {
    return rawMode === "light" || rawMode === "dark" || rawMode === "system"
}

function isThemePreset(rawPreset: string): rawPreset is ThemePresetId {
    return THEME_PRESETS.some((preset): boolean => preset.id === rawPreset)
}

function readStoredThemeMode(): ThemeMode {
    const rawMode = readLocalStorageItem(THEME_MODE_STORAGE_KEY)
    if (rawMode !== undefined && isThemeMode(rawMode) === true) {
        return rawMode
    }

    return THEME_DEFAULT_MODE
}

function readStoredThemePreset(): ThemePresetId {
    const rawPreset = readLocalStorageItem(THEME_PRESET_STORAGE_KEY)
    if (rawPreset !== undefined && isThemePreset(rawPreset) === true) {
        return rawPreset
    }

    return DEFAULT_THEME_PRESET_ID
}

function resolveSystemTheme(mediaQuery?: MediaQueryList): ThemeResolvedMode {
    if (typeof window === "undefined") {
        return "light"
    }

    try {
        const resolvedQuery = mediaQuery ?? window.matchMedia("(prefers-color-scheme: dark)")
        return resolvedQuery.matches === true ? "dark" : "light"
    } catch {
        return "light"
    }
}

function resolveThemeMode(themeMode: ThemeMode, systemTheme: ThemeResolvedMode): ThemeResolvedMode {
    if (themeMode === "system") {
        return systemTheme
    }

    return themeMode
}

function getPresetById(presetId: ThemePresetId): IThemePreset {
    const preset = THEME_PRESETS.find((themePreset): boolean => themePreset.id === presetId)
    if (preset === undefined) {
        return THEME_PRESETS[0]
    }

    return preset
}

/**
 * Конвертирует camelCase ключ палитры в kebab-case CSS-переменную.
 *
 * @example camelToKebab("surfaceMuted") → "surface-muted"
 */
function camelToKebab(str: string): string {
    return str.replace(/[A-Z]/g, (letter): string => `-${letter.toLowerCase()}`)
}

function applyThemeTokens(resolvedMode: ThemeResolvedMode, presetId: ThemePresetId): void {
    const root = document.documentElement
    const preset = getPresetById(presetId)
    const palette = resolvedMode === "dark" ? preset.dark : preset.light

    THEME_CSS_VARIABLES.forEach((cssVariable): void => {
        const value = palette[cssVariable]
        root.style.setProperty(`--${camelToKebab(cssVariable)}`, value)
    })

    root.classList.toggle("dark", resolvedMode === "dark")
    root.dataset.theme = presetId
    root.dataset.mode = resolvedMode
    root.style.colorScheme = resolvedMode
}

function initializeFromStorage(): IThemeBootstrapState {
    const mode = readStoredThemeMode()
    const preset = readStoredThemePreset()
    const resolvedMode = resolveThemeMode(mode, resolveSystemTheme())

    if (typeof window !== "undefined") {
        applyThemeTokens(resolvedMode, preset)
    }

    return {
        mode,
        preset,
        resolvedMode,
    }
}

const ThemeContext = createContext<IThemeContext | undefined>(undefined)

/**
 * Инициализация темы до рендера приложения (для минимизации flash).
 *
 * @returns Состояние выбранной темы.
 */
export function initializeTheme(): IThemeBootstrapState {
    return initializeFromStorage()
}

function selectThemeProfile(
    remoteProfile: IThemeProfileResponse | undefined,
    localProfile: IThemeProfile,
): TThemeSyncSelection {
    if (remoteProfile === undefined) {
        return {
            profile: localProfile,
            source: "local",
        }
    }

    const candidate = toThemeProfile(remoteProfile.profile, localProfile)
    if (
        localProfile.updatedAtMs !== THEME_PROFILE_DEFAULT_UPDATED_AT_MS &&
        candidate.updatedAtMs < localProfile.updatedAtMs
    ) {
        return {
            profile: localProfile,
            source: "local",
        }
    }

    return {
        profile: candidate,
        source: "remote",
    }
}

/**
 * Provider для глобальной настройки темы.
 *
 * @param props Пропсы provider.
 * @returns React элемент.
 */
type TThemeProviderProps = {
    readonly children: ReactNode
    readonly defaultMode?: ThemeMode
    readonly defaultPreset?: ThemePresetId
}

export function ThemeProvider(props: TThemeProviderProps): ReactElement {
    const { children, defaultMode, defaultPreset } = props
    const initialThemeSyncState = readThemeProfileSyncState()

    const [mode, setThemeMode] = useState<ThemeMode>(() => {
        const persistedMode = readStoredThemeMode()
        if (defaultMode !== undefined && isThemeMode(defaultMode) === true) {
            return defaultMode
        }

        return persistedMode
    })
    const [preset, setThemePreset] = useState<ThemePresetId>(() => {
        const persistedPreset = readStoredThemePreset()
        if (isThemePreset(persistedPreset) === true) {
            return persistedPreset
        }

        return defaultPreset ?? DEFAULT_THEME_PRESET_ID
    })
    const [systemMode, setSystemMode] = useState<ThemeResolvedMode>(() => resolveSystemTheme())
    const resolvedMode = useMemo<ThemeResolvedMode>(
        () => resolveThemeMode(mode, systemMode),
        [mode, systemMode],
    )
    const shouldSyncProfileRef = useRef(false)
    const lastSyncSignatureRef = useRef("")
    const profileUpdatedAtRef = useRef(
        initialThemeSyncState?.updatedAtMs ?? THEME_PROFILE_DEFAULT_UPDATED_AT_MS,
    )
    const pendingLocalProfileUpdatedAtRef = useRef<number | undefined>(undefined)

    const setMode = useCallback((nextMode: SetStateAction<ThemeMode>): void => {
        setThemeMode((stateMode): ThemeMode => {
            const modeCandidate =
                nextMode instanceof Function === true ? nextMode(stateMode) : nextMode
            if (isThemeMode(modeCandidate) === true) {
                if (modeCandidate !== stateMode) {
                    pendingLocalProfileUpdatedAtRef.current = Date.now()
                }
                return modeCandidate
            }

            return stateMode
        })
    }, [])

    const setPreset = useCallback((nextPreset: SetStateAction<ThemePresetId>): void => {
        setThemePreset((statePreset): ThemePresetId => {
            const presetCandidate =
                nextPreset instanceof Function === true ? nextPreset(statePreset) : nextPreset
            if (isThemePreset(presetCandidate) === true) {
                if (presetCandidate !== statePreset) {
                    pendingLocalProfileUpdatedAtRef.current = Date.now()
                }
                return presetCandidate
            }

            return statePreset
        })
    }, [])

    useThemeSystemModeSync(setSystemMode)
    useThemeApplyModePresetEffect(
        mode,
        preset,
        resolvedMode,
        profileUpdatedAtRef,
        pendingLocalProfileUpdatedAtRef,
    )
    useThemeSyncFromApiEffect({
        mode,
        preset,
        lastSyncSignatureRef,
        pendingLocalProfileUpdatedAtRef,
        profileUpdatedAtRef,
        setThemeMode,
        setThemePreset,
        shouldSyncProfileRef,
    })
    useThemeSyncToApiEffect({
        mode,
        preset,
        lastSyncSignatureRef,
        pendingLocalProfileUpdatedAtRef,
        profileUpdatedAtRef,
        shouldSyncProfileRef,
    })
    useThemeStorageEffect(setMode, setPreset)

    return (
        <ThemeContext.Provider
            value={{
                mode,
                preset,
                presets: THEME_PRESETS,
                resolvedMode,
                setMode,
                setPreset,
            }}
        >
            {children}
        </ThemeContext.Provider>
    )
}

function useThemeSystemModeSync(setSystemMode: (mode: ThemeResolvedMode) => void): void {
    useEffect((): (() => void) | undefined => {
        if (typeof window === "undefined") {
            return undefined
        }

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        const handleMediaChange = (): void => {
            setSystemMode(resolveSystemTheme(mediaQuery))
        }

        mediaQuery.addEventListener("change", handleMediaChange)
        return (): void => {
            mediaQuery.removeEventListener("change", handleMediaChange)
        }
    }, [setSystemMode])
}

function useThemeApplyModePresetEffect(
    mode: ThemeMode,
    preset: ThemePresetId,
    resolvedMode: ThemeResolvedMode,
    profileUpdatedAtRef?: { current: number },
    pendingLocalProfileUpdatedAtRef?: { current: number | undefined },
): void {
    useEffect((): void => {
        applyThemeTokens(resolvedMode, preset)
        writeLocalStorageItem(THEME_MODE_STORAGE_KEY, mode)
        writeLocalStorageItem(THEME_PRESET_STORAGE_KEY, preset)
        writeThemeProfileSyncState({
            mode,
            preset,
            updatedAtMs:
                pendingLocalProfileUpdatedAtRef?.current ??
                profileUpdatedAtRef?.current ??
                THEME_PROFILE_DEFAULT_UPDATED_AT_MS,
        })
    }, [mode, pendingLocalProfileUpdatedAtRef, preset, profileUpdatedAtRef, resolvedMode])
}

function useThemeSyncFromApiEffect(args: {
    readonly mode: ThemeMode
    readonly preset: ThemePresetId
    readonly lastSyncSignatureRef: { current: string }
    readonly pendingLocalProfileUpdatedAtRef: { current: number | undefined }
    readonly profileUpdatedAtRef: { current: number }
    readonly setThemeMode: (updater: SetStateAction<ThemeMode>) => void
    readonly setThemePreset: (updater: SetStateAction<ThemePresetId>) => void
    readonly shouldSyncProfileRef: { current: boolean }
}): void {
    const {
        mode,
        preset,
        lastSyncSignatureRef,
        pendingLocalProfileUpdatedAtRef,
        profileUpdatedAtRef,
        setThemeMode,
        setThemePreset,
        shouldSyncProfileRef,
    } = args

    useEffect((): (() => void) | undefined => {
        if (typeof window === "undefined") {
            return undefined
        }

        const apiClient = createThemeSettingsApiClient()
        if (apiClient === undefined) {
            shouldSyncProfileRef.current = true
            return undefined
        }

        const abortController = new AbortController()
        const timeoutHandle = window.setTimeout((): void => {
            abortController.abort()
        }, THEME_SETTINGS_TIMEOUT_MS)

        const syncFromProfile = async (): Promise<void> => {
            const localSyncState = readThemeProfileSyncState()
            const localUpdatedAtMs =
                pendingLocalProfileUpdatedAtRef.current ??
                localSyncState?.updatedAtMs ??
                profileUpdatedAtRef.current
            const localProfile = toThemeProfile(
                { mode, preset },
                { mode, preset, updatedAtMs: localUpdatedAtMs },
            )

            let selectedThemeProfile: TThemeSyncSelection = {
                profile: localProfile,
                source: "local",
            }
            for (const endpoint of THEME_SETTINGS_ENDPOINTS) {
                const response = await fetchThemeProfileFromApi(
                    apiClient,
                    abortController.signal,
                    endpoint,
                )
                if (response !== undefined) {
                    selectedThemeProfile = selectThemeProfile(response, localProfile)
                    break
                }
            }

            if (abortController.signal.aborted) {
                return
            }

            if (pendingLocalProfileUpdatedAtRef.current !== undefined) {
                shouldSyncProfileRef.current = true
                return
            }

            const selectedProfile = selectedThemeProfile.profile
            profileUpdatedAtRef.current = selectedProfile.updatedAtMs
            pendingLocalProfileUpdatedAtRef.current = undefined
            lastSyncSignatureRef.current = `${selectedProfile.mode}:${selectedProfile.preset}`

            setThemeMode((_: ThemeMode): ThemeMode => {
                if (selectedProfile.mode !== localProfile.mode) {
                    return selectedProfile.mode
                }

                return localProfile.mode
            })
            setThemePreset((_: ThemePresetId): ThemePresetId => {
                if (selectedProfile.preset !== localProfile.preset) {
                    return selectedProfile.preset
                }

                return localProfile.preset
            })
            writeThemeProfileSyncState({
                ...selectedProfile,
                updatedAtMs: selectedProfile.updatedAtMs,
            })
            shouldSyncProfileRef.current = true
        }

        void syncFromProfile().catch((_error: unknown): void => {
            shouldSyncProfileRef.current = true
        })

        return (): void => {
            clearTimeout(timeoutHandle)
            abortController.abort()
            shouldSyncProfileRef.current = true
        }
    }, [
        lastSyncSignatureRef,
        mode,
        pendingLocalProfileUpdatedAtRef,
        preset,
        profileUpdatedAtRef,
        setThemeMode,
        setThemePreset,
        shouldSyncProfileRef,
    ])
}

function useThemeSyncToApiEffect(args: {
    readonly mode: ThemeMode
    readonly preset: ThemePresetId
    readonly lastSyncSignatureRef: { current: string }
    readonly pendingLocalProfileUpdatedAtRef: { current: number | undefined }
    readonly profileUpdatedAtRef: { current: number }
    readonly shouldSyncProfileRef: { current: boolean }
}): void {
    const {
        mode,
        preset,
        lastSyncSignatureRef,
        pendingLocalProfileUpdatedAtRef,
        profileUpdatedAtRef,
        shouldSyncProfileRef,
    } = args

    useEffect((): (() => void) | undefined => {
        if (typeof window === "undefined") {
            return undefined
        }

        if (shouldSyncProfileRef.current === false) {
            return undefined
        }

        const signature = `${mode}:${preset}`
        if (
            lastSyncSignatureRef.current === signature &&
            pendingLocalProfileUpdatedAtRef.current === undefined
        ) {
            return undefined
        }

        const apiClient = createThemeSettingsApiClient()
        if (apiClient === undefined) {
            const fallbackUpdatedAtMs =
                pendingLocalProfileUpdatedAtRef.current ?? profileUpdatedAtRef.current
            profileUpdatedAtRef.current = fallbackUpdatedAtMs
            pendingLocalProfileUpdatedAtRef.current = undefined
            writeThemeProfileSyncState({
                mode,
                preset,
                updatedAtMs: fallbackUpdatedAtMs,
            })
            lastSyncSignatureRef.current = signature
            return undefined
        }

        const abortController = new AbortController()
        const timeoutHandle = window.setTimeout((): void => {
            abortController.abort()
        }, THEME_SETTINGS_TIMEOUT_MS)
        const timerHandle = window.setTimeout((): void => {
            const updatedAtMs = pendingLocalProfileUpdatedAtRef.current ?? Date.now()
            const profile: IThemeProfile = {
                mode,
                preset,
                updatedAtMs,
            }
            profileUpdatedAtRef.current = updatedAtMs

            void (async (): Promise<void> => {
                let synced = false
                for (const endpoint of THEME_SETTINGS_ENDPOINTS) {
                    if (abortController.signal.aborted) {
                        break
                    }

                    if (
                        (await saveThemeProfileToApi(
                            apiClient,
                            abortController.signal,
                            endpoint,
                            profile,
                        )) === true
                    ) {
                        synced = true
                        break
                    }
                }

                if (synced === false) {
                    writeThemeProfileSyncState(profile)
                }
            })()
            writeThemeProfileSyncState(profile)
            pendingLocalProfileUpdatedAtRef.current = undefined
            lastSyncSignatureRef.current = signature
        }, THEME_SETTINGS_SAVE_DEBOUNCE_MS)

        return (): void => {
            clearTimeout(timeoutHandle)
            clearTimeout(timerHandle)
            abortController.abort()
        }
    }, [
        lastSyncSignatureRef,
        mode,
        pendingLocalProfileUpdatedAtRef,
        preset,
        profileUpdatedAtRef,
        shouldSyncProfileRef,
    ])
}

function useThemeStorageEffect(
    setMode: (value: SetStateAction<ThemeMode>) => void,
    setPreset: (value: SetStateAction<ThemePresetId>) => void,
): void {
    useEffect((): (() => void) | undefined => {
        if (typeof window === "undefined") {
            return undefined
        }

        const handleStorage = (event: StorageEvent): void => {
            if (event.key === THEME_MODE_STORAGE_KEY && event.newValue !== null) {
                if (isThemeMode(event.newValue) === true) {
                    setMode(event.newValue)
                }
            }

            if (event.key === THEME_PRESET_STORAGE_KEY && event.newValue !== null) {
                if (isThemePreset(event.newValue) === true) {
                    setPreset(event.newValue)
                }
            }
        }

        window.addEventListener("storage", handleStorage)
        return (): void => {
            window.removeEventListener("storage", handleStorage)
        }
    }, [setMode, setPreset])
}

/**
 * Получение theme context.
 */
export function useThemeMode(): IThemeContext {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error("useThemeMode must be used inside ThemeProvider")
    }

    return context
}
