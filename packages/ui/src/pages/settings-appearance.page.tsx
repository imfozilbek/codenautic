import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react"

import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Button, Card, CardBody, CardHeader, Chip, Input } from "@/components/ui"
import {
    readThemeLibraryProfileState,
    writeThemeLibraryProfileState,
    type IThemeLibraryProfileTheme,
} from "@/lib/theme/theme-library-profile-sync"
import { type ThemeMode, type ThemePresetId, useThemeMode } from "@/lib/theme/theme-provider"
import { showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

type TBasePaletteId = "cool" | "neutral" | "warm"

interface IBasePalette {
    /** Цвет фона приложения. */
    readonly background: string
    /** Цвет границы интерфейсных блоков. */
    readonly border: string
    /** Основной цвет текста. */
    readonly foreground: string
    /** Базовый цвет поверхностей. */
    readonly surface: string
    /** Приглушенный цвет поверхностей. */
    readonly surfaceMuted: string
}

interface IBasePaletteConfig {
    /** Описание palette. */
    readonly description: string
    /** Цвета для dark режима. */
    readonly dark: IBasePalette
    /** Идентификатор палитры. */
    readonly id: TBasePaletteId
    /** Подпись палитры. */
    readonly label: string
    /** Цвета для light режима. */
    readonly light: IBasePalette
}

const BASE_PALETTES: ReadonlyArray<IBasePaletteConfig> = [
    {
        dark: {
            background: "#101520",
            border: "#364257",
            foreground: "#eaf0ff",
            surface: "#1a2233",
            surfaceMuted: "#232d42",
        },
        description: "Balanced slate tones for neutral focus",
        id: "neutral",
        label: "Neutral",
        light: {
            background: "#f4f6fa",
            border: "#d5deea",
            foreground: "#1e2533",
            surface: "#ffffff",
            surfaceMuted: "#edf2f8",
        },
    },
    {
        dark: {
            background: "#18140f",
            border: "#4f3d2a",
            foreground: "#f6ecdf",
            surface: "#231c14",
            surfaceMuted: "#32281d",
        },
        description: "Warm paper-like palette for softer visual comfort",
        id: "warm",
        label: "Warm",
        light: {
            background: "#faf4ec",
            border: "#e5d5c0",
            foreground: "#2e251b",
            surface: "#fffaf3",
            surfaceMuted: "#f3e7d8",
        },
    },
    {
        dark: {
            background: "#0f1723",
            border: "#304a64",
            foreground: "#dff2ff",
            surface: "#162334",
            surfaceMuted: "#203246",
        },
        description: "Cool contrast palette with crisp blues",
        id: "cool",
        label: "Cool",
        light: {
            background: "#edf6ff",
            border: "#c8dcf0",
            foreground: "#1a2a3d",
            surface: "#f7fbff",
            surfaceMuted: "#e4eff8",
        },
    },
]

const APPEARANCE_STORAGE_PREFIX = "codenautic:ui:appearance"
const APPEARANCE_ACCENT_STORAGE_KEY = `${APPEARANCE_STORAGE_PREFIX}:accent`
const APPEARANCE_INTENSITY_STORAGE_KEY = `${APPEARANCE_STORAGE_PREFIX}:intensity`
const APPEARANCE_BASE_PALETTE_STORAGE_KEY = `${APPEARANCE_STORAGE_PREFIX}:base-palette`
const APPEARANCE_RADIUS_STORAGE_KEY = `${APPEARANCE_STORAGE_PREFIX}:radius-global`
const APPEARANCE_FORM_RADIUS_STORAGE_KEY = `${APPEARANCE_STORAGE_PREFIX}:radius-form`
const APPEARANCE_LIBRARY_STORAGE_KEY = `${APPEARANCE_STORAGE_PREFIX}:library`
const APPEARANCE_LIBRARY_FAVORITE_PRESET_STORAGE_KEY = `${APPEARANCE_STORAGE_PREFIX}:favorite-preset`
const APPEARANCE_LIBRARY_SYNC_STORAGE_KEY = `${APPEARANCE_STORAGE_PREFIX}:library-sync`

const DEFAULT_ACCENT_COLOR = "#5f6dff"
const DEFAULT_ACCENT_INTENSITY = 76
const DEFAULT_BASE_PALETTE: TBasePaletteId = "neutral"
const DEFAULT_GLOBAL_RADIUS = 14
const DEFAULT_FORM_RADIUS = 12
const MIN_INTENSITY = 40
const MAX_INTENSITY = 100
const MIN_RADIUS = 6
const MAX_RADIUS = 24
const MIN_FORM_RADIUS = 4
const MAX_FORM_RADIUS = 20
const QUICK_PRESET_KEYWORDS: ReadonlyArray<string> = ["default", "sky", "lavender", "mint"]

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

function removeLocalStorageItem(storageKey: string): void {
    const storage = getWindowLocalStorage()
    if (storage === undefined) {
        return
    }

    try {
        storage.removeItem(storageKey)
    } catch {
        return
    }
}

interface IUserThemeLibraryItem {
    /** Идентификатор пользовательской темы. */
    readonly id: string
    /** Название пользовательской темы. */
    readonly name: string
    /** Режим темы. */
    readonly mode: ThemeMode
    /** Пресет темы. */
    readonly presetId: ThemePresetId
    /** Базовый accent цвет. */
    readonly accentColor: string
    /** Интенсивность accent цвета. */
    readonly accentIntensity: number
    /** Базовая палитра. */
    readonly basePaletteId: TBasePaletteId
    /** Глобальный радиус. */
    readonly globalRadius: number
    /** Радиус form-контролов. */
    readonly formRadius: number
}

interface IThemeLibraryImportEnvelope {
    /** Версия структуры payload. */
    readonly version: number
    /** Набор тем для импорта. */
    readonly themes: ReadonlyArray<IUserThemeLibraryItem>
    /** Опциональный favorite preset. */
    readonly favoritePresetId?: ThemePresetId
}

function isHexColor(value: string): boolean {
    return /^#[0-9a-fA-F]{6}$/.test(value)
}

function readStoredHexColor(storageKey: string, fallback: string): string {
    const rawValue = readLocalStorageItem(storageKey)
    if (rawValue === undefined) {
        return fallback
    }

    return isHexColor(rawValue) ? rawValue.toLowerCase() : fallback
}

function readStoredNumber(
    storageKey: string,
    fallback: number,
    min: number,
    max: number,
): number {
    const rawValue = readLocalStorageItem(storageKey)
    if (rawValue === undefined) {
        return fallback
    }

    const parsed = Number(rawValue)
    if (Number.isNaN(parsed) || parsed < min || parsed > max) {
        return fallback
    }

    return parsed
}

function readStoredBasePalette(storageKey: string, fallback: TBasePaletteId): TBasePaletteId {
    const rawValue = readLocalStorageItem(storageKey)
    if (rawValue === "neutral" || rawValue === "warm" || rawValue === "cool") {
        return rawValue
    }

    return fallback
}

function getPaletteDefinition(basePaletteId: TBasePaletteId): IBasePaletteConfig {
    const matchingPalette = BASE_PALETTES.find((palette): boolean => palette.id === basePaletteId)
    if (matchingPalette !== undefined) {
        return matchingPalette
    }

    const fallbackPalette = BASE_PALETTES[0]
    if (fallbackPalette === undefined) {
        throw new Error("BASE_PALETTES must contain at least one palette")
    }

    return fallbackPalette
}

function getRgbComponents(hex: string): { readonly b: number; readonly g: number; readonly r: number } {
    const normalized = hex.replace("#", "")
    const r = Number.parseInt(normalized.slice(0, 2), 16)
    const g = Number.parseInt(normalized.slice(2, 4), 16)
    const b = Number.parseInt(normalized.slice(4, 6), 16)

    return { b, g, r }
}

function toHexColor(value: number): string {
    return value.toString(16).padStart(2, "0")
}

function mixHexColors(baseHex: string, targetHex: string, ratio: number): string {
    const sanitizedRatio = Math.min(Math.max(ratio, 0), 1)
    const base = getRgbComponents(baseHex)
    const target = getRgbComponents(targetHex)

    const mixedR = Math.round(base.r + (target.r - base.r) * sanitizedRatio)
    const mixedG = Math.round(base.g + (target.g - base.g) * sanitizedRatio)
    const mixedB = Math.round(base.b + (target.b - base.b) * sanitizedRatio)

    return `#${toHexColor(mixedR)}${toHexColor(mixedG)}${toHexColor(mixedB)}`
}

function createEffectiveAccentColor(
    accentColor: string,
    accentIntensity: number,
    resolvedMode: "dark" | "light",
): string {
    const target = resolvedMode === "dark" ? "#e7efff" : "#101727"
    const ratio = ((100 - accentIntensity) / 100) * 0.55

    return mixHexColors(accentColor, target, ratio)
}

function toLinearChannel(channel: number): number {
    const normalizedChannel = channel / 255
    if (normalizedChannel <= 0.03928) {
        return normalizedChannel / 12.92
    }
    return ((normalizedChannel + 0.055) / 1.055) ** 2.4
}

function getRelativeLuminance(color: string): number {
    const { r, g, b } = getRgbComponents(color)
    const linearRed = toLinearChannel(r)
    const linearGreen = toLinearChannel(g)
    const linearBlue = toLinearChannel(b)

    return 0.2126 * linearRed + 0.7152 * linearGreen + 0.0722 * linearBlue
}

function getContrastRatio(firstColor: string, secondColor: string): number {
    const luminanceA = getRelativeLuminance(firstColor)
    const luminanceB = getRelativeLuminance(secondColor)
    const lightest = Math.max(luminanceA, luminanceB)
    const darkest = Math.min(luminanceA, luminanceB)

    return (lightest + 0.05) / (darkest + 0.05)
}

function clearAppearanceStorage(): void {
    removeLocalStorageItem(APPEARANCE_ACCENT_STORAGE_KEY)
    removeLocalStorageItem(APPEARANCE_INTENSITY_STORAGE_KEY)
    removeLocalStorageItem(APPEARANCE_BASE_PALETTE_STORAGE_KEY)
    removeLocalStorageItem(APPEARANCE_RADIUS_STORAGE_KEY)
    removeLocalStorageItem(APPEARANCE_FORM_RADIUS_STORAGE_KEY)
}

function createThemeLibraryId(prefix: string): string {
    return `${prefix.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`
}

function normalizeThemeName(value: string): string {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
        return "Custom Theme"
    }
    return trimmed
}

function resolveThemeNameConflict(
    baseName: string,
    existingNames: ReadonlyArray<string>,
): string {
    const normalizedBaseName = normalizeThemeName(baseName)
    const lowerCaseNameSet = new Set<string>(existingNames.map((name): string => name.toLowerCase()))
    if (lowerCaseNameSet.has(normalizedBaseName.toLowerCase()) === false) {
        return normalizedBaseName
    }

    let suffix = 2
    while (suffix < 1000) {
        const candidate = `${normalizedBaseName} (${suffix})`
        if (lowerCaseNameSet.has(candidate.toLowerCase()) === false) {
            return candidate
        }
        suffix += 1
    }

    return `${normalizedBaseName} (${Date.now().toString(36)})`
}

function isThemeModeValue(value: unknown): value is ThemeMode {
    return value === "dark" || value === "light" || value === "system"
}

function isThemePresetIdValue(
    value: unknown,
    availablePresetIds: ReadonlyArray<ThemePresetId>,
): value is ThemePresetId {
    if (typeof value !== "string") {
        return false
    }
    return availablePresetIds.includes(value as ThemePresetId)
}

function isBasePaletteValue(value: unknown): value is TBasePaletteId {
    return value === "cool" || value === "neutral" || value === "warm"
}

function parseThemeLibraryItem(
    value: unknown,
    availablePresetIds: ReadonlyArray<ThemePresetId>,
): IUserThemeLibraryItem | undefined {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return undefined
    }

    const rawValue = value as Record<string, unknown>
    if (typeof rawValue.id !== "string" || rawValue.id.trim().length === 0) {
        return undefined
    }
    if (typeof rawValue.name !== "string" || rawValue.name.trim().length === 0) {
        return undefined
    }
    if (typeof rawValue.accentColor !== "string" || isHexColor(rawValue.accentColor) === false) {
        return undefined
    }
    if (
        typeof rawValue.accentIntensity !== "number"
        || rawValue.accentIntensity < MIN_INTENSITY
        || rawValue.accentIntensity > MAX_INTENSITY
    ) {
        return undefined
    }
    if (
        typeof rawValue.globalRadius !== "number"
        || rawValue.globalRadius < MIN_RADIUS
        || rawValue.globalRadius > MAX_RADIUS
    ) {
        return undefined
    }
    if (
        typeof rawValue.formRadius !== "number"
        || rawValue.formRadius < MIN_FORM_RADIUS
        || rawValue.formRadius > MAX_FORM_RADIUS
    ) {
        return undefined
    }

    if (isThemeModeValue(rawValue.mode) !== true) {
        return undefined
    }
    if (isBasePaletteValue(rawValue.basePaletteId) !== true) {
        return undefined
    }
    if (isThemePresetIdValue(rawValue.presetId, availablePresetIds) !== true) {
        return undefined
    }

    return {
        accentColor: rawValue.accentColor.toLowerCase(),
        accentIntensity: rawValue.accentIntensity,
        basePaletteId: rawValue.basePaletteId,
        formRadius: rawValue.formRadius,
        globalRadius: rawValue.globalRadius,
        id: rawValue.id,
        mode: rawValue.mode,
        name: normalizeThemeName(rawValue.name),
        presetId: rawValue.presetId,
    }
}

function readStoredThemeLibrary(availablePresetIds: ReadonlyArray<ThemePresetId>): ReadonlyArray<IUserThemeLibraryItem> {
    const rawValue = readLocalStorageItem(APPEARANCE_LIBRARY_STORAGE_KEY)
    if (rawValue === undefined) {
        return []
    }

    try {
        const parsed = JSON.parse(rawValue) as unknown
        if (Array.isArray(parsed) === false) {
            return []
        }

        const normalized: Array<IUserThemeLibraryItem> = []
        parsed.forEach((entry): void => {
            const parsedItem = parseThemeLibraryItem(entry, availablePresetIds)
            if (parsedItem !== undefined) {
                normalized.push(parsedItem)
            }
        })

        return normalized
    } catch {
        return []
    }
}

function readStoredFavoritePreset(
    availablePresetIds: ReadonlyArray<ThemePresetId>,
): ThemePresetId | undefined {
    const rawValue = readLocalStorageItem(APPEARANCE_LIBRARY_FAVORITE_PRESET_STORAGE_KEY)
    if (rawValue === undefined) {
        return undefined
    }

    if (availablePresetIds.includes(rawValue as ThemePresetId)) {
        return rawValue as ThemePresetId
    }

    return undefined
}

function readStoredThemeLibraryUpdatedAtMs(): number {
    const rawValue = readLocalStorageItem(APPEARANCE_LIBRARY_SYNC_STORAGE_KEY)
    if (rawValue === undefined) {
        return 0
    }

    try {
        const parsed = JSON.parse(rawValue) as { updatedAtMs?: unknown }
        return typeof parsed.updatedAtMs === "number" && Number.isFinite(parsed.updatedAtMs)
            ? parsed.updatedAtMs
            : 0
    } catch {
        return 0
    }
}

function writeStoredThemeLibraryUpdatedAtMs(updatedAtMs: number): void {
    writeLocalStorageItem(
        APPEARANCE_LIBRARY_SYNC_STORAGE_KEY,
        JSON.stringify({
            updatedAtMs,
        }),
    )
}

function toProfileTheme(theme: IUserThemeLibraryItem): IThemeLibraryProfileTheme {
    return {
        accentColor: theme.accentColor,
        accentIntensity: theme.accentIntensity,
        basePaletteId: theme.basePaletteId,
        formRadius: theme.formRadius,
        globalRadius: theme.globalRadius,
        id: theme.id,
        mode: theme.mode,
        name: theme.name,
        presetId: theme.presetId,
    }
}

function fromProfileTheme(
    theme: IThemeLibraryProfileTheme,
    availablePresetIds: ReadonlyArray<ThemePresetId>,
): IUserThemeLibraryItem | undefined {
    if (availablePresetIds.includes(theme.presetId as ThemePresetId) === false) {
        return undefined
    }

    return {
        accentColor: theme.accentColor,
        accentIntensity: theme.accentIntensity,
        basePaletteId: theme.basePaletteId,
        formRadius: theme.formRadius,
        globalRadius: theme.globalRadius,
        id: theme.id,
        mode: theme.mode,
        name: theme.name,
        presetId: theme.presetId as ThemePresetId,
    }
}

function buildThemeLibraryExportPayload(
    themes: ReadonlyArray<IUserThemeLibraryItem>,
    favoritePresetId: ThemePresetId | undefined,
): IThemeLibraryImportEnvelope {
    return {
        favoritePresetId,
        themes,
        version: 1,
    }
}

function parseThemeLibraryImportPayload(
    rawJson: string,
    availablePresetIds: ReadonlyArray<ThemePresetId>,
): IThemeLibraryImportEnvelope | undefined {
    try {
        const parsed = JSON.parse(rawJson) as unknown
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            return undefined
        }

        const record = parsed as Record<string, unknown>
        if (record.version !== 1) {
            return undefined
        }
        if (Array.isArray(record.themes) === false) {
            return undefined
        }

        const themes: Array<IUserThemeLibraryItem> = []
        record.themes.forEach((entry): void => {
            const parsedTheme = parseThemeLibraryItem(entry, availablePresetIds)
            if (parsedTheme !== undefined) {
                themes.push(parsedTheme)
            }
        })

        const favoritePresetId =
            typeof record.favoritePresetId === "string"
            && availablePresetIds.includes(record.favoritePresetId as ThemePresetId)
                ? (record.favoritePresetId as ThemePresetId)
                : undefined

        return {
            favoritePresetId,
            themes,
            version: 1,
        }
    } catch {
        return undefined
    }
}

function triggerJsonDownload(fileName: string, jsonPayload: string): void {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return
    }
    if (typeof URL.createObjectURL !== "function") {
        return
    }

    const blob = new Blob([jsonPayload], { type: "application/json;charset=utf-8;" })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement("a")

    anchor.href = objectUrl
    anchor.download = fileName
    anchor.style.display = "none"
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)
}

/**
 * Страница управления темой интерфейса.
 *
 * @returns Экран Appearance с mode/preset переключением и live preview.
 */
export function SettingsAppearancePage(): ReactElement {
    const { mode, preset, presets, resolvedMode, setMode, setPreset } = useThemeMode()
    const availablePresetIds = useMemo(
        (): ReadonlyArray<ThemePresetId> => presets.map((themePreset): ThemePresetId => themePreset.id),
        [presets],
    )
    const libraryUpdatedAtMsRef = useRef(readStoredThemeLibraryUpdatedAtMs())
    const pendingLibraryUpdatedAtMsRef = useRef<number | undefined>(undefined)
    const [accentColor, setAccentColor] = useState<string>(() =>
        readStoredHexColor(APPEARANCE_ACCENT_STORAGE_KEY, DEFAULT_ACCENT_COLOR),
    )
    const [accentIntensity, setAccentIntensity] = useState<number>(() =>
        readStoredNumber(
            APPEARANCE_INTENSITY_STORAGE_KEY,
            DEFAULT_ACCENT_INTENSITY,
            MIN_INTENSITY,
            MAX_INTENSITY,
        ),
    )
    const [basePaletteId, setBasePaletteId] = useState<TBasePaletteId>(() =>
        readStoredBasePalette(APPEARANCE_BASE_PALETTE_STORAGE_KEY, DEFAULT_BASE_PALETTE),
    )
    const [globalRadius, setGlobalRadius] = useState<number>(() =>
        readStoredNumber(
            APPEARANCE_RADIUS_STORAGE_KEY,
            DEFAULT_GLOBAL_RADIUS,
            MIN_RADIUS,
            MAX_RADIUS,
        ),
    )
    const [formRadius, setFormRadius] = useState<number>(() =>
        readStoredNumber(
            APPEARANCE_FORM_RADIUS_STORAGE_KEY,
            DEFAULT_FORM_RADIUS,
            MIN_FORM_RADIUS,
            MAX_FORM_RADIUS,
        ),
    )
    const [previewFieldValue, setPreviewFieldValue] = useState("security policy update")
    const [themeLibrary, setThemeLibrary] = useState<ReadonlyArray<IUserThemeLibraryItem>>(() =>
        readStoredThemeLibrary(availablePresetIds),
    )
    const [selectedThemeId, setSelectedThemeId] = useState<string>("")
    const [themeDraftName, setThemeDraftName] = useState<string>("")
    const [themeImportValue, setThemeImportValue] = useState<string>("")
    const [favoritePresetId, setFavoritePresetId] = useState<ThemePresetId | undefined>(() =>
        readStoredFavoritePreset(availablePresetIds),
    )
    const [isLibraryHydrated, setIsLibraryHydrated] = useState(false)
    const [librarySyncStatus, setLibrarySyncStatus] = useState<"error" | "idle" | "synced" | "syncing">("idle")
    const [pendingRandomPresetId, setPendingRandomPresetId] = useState<ThemePresetId | undefined>(undefined)
    const [lastRandomUndoPresetId, setLastRandomUndoPresetId] = useState<ThemePresetId | undefined>(undefined)
    const [lastAppliedRandomPresetId, setLastAppliedRandomPresetId] = useState<ThemePresetId | undefined>(
        undefined,
    )

    const activeBasePalette = useMemo((): IBasePalette => {
        const definition = getPaletteDefinition(basePaletteId)
        return resolvedMode === "dark" ? definition.dark : definition.light
    }, [basePaletteId, resolvedMode])

    const effectiveAccentColor = useMemo(
        (): string => createEffectiveAccentColor(accentColor, accentIntensity, resolvedMode),
        [accentColor, accentIntensity, resolvedMode],
    )

    const contrastRatio = useMemo(
        (): number => getContrastRatio(effectiveAccentColor, activeBasePalette.surface),
        [effectiveAccentColor, activeBasePalette.surface],
    )

    const isAccessibleContrast = contrastRatio >= 4.5

    const accessiblePresetIds = useMemo((): ReadonlyArray<ThemePresetId> => {
        return presets
            .filter((themePreset): boolean => {
                const palette = resolvedMode === "dark" ? themePreset.dark : themePreset.light
                const primaryContrast = getContrastRatio(palette.primary, palette.surface)
                const accentContrast = getContrastRatio(palette.accent, palette.surface)

                return primaryContrast >= 3 && accentContrast >= 2.6
            })
            .map((themePreset): ThemePresetId => themePreset.id)
    }, [presets, resolvedMode])

    const quickPresetOptions = useMemo((): ReadonlyArray<typeof presets[number]> => {
        const selected: Array<typeof presets[number]> = []
        const selectedIds = new Set<string>()

        QUICK_PRESET_KEYWORDS.forEach((keyword): void => {
            const match = presets.find(
                (themePreset): boolean =>
                    themePreset.label.toLowerCase().includes(keyword)
                    || themePreset.id.toLowerCase().includes(keyword),
            )
            if (match !== undefined && selectedIds.has(match.id) === false) {
                selected.push(match)
                selectedIds.add(match.id)
            }
        })

        presets.forEach((themePreset): void => {
            if (selected.length >= 4) {
                return
            }
            if (selectedIds.has(themePreset.id)) {
                return
            }
            selected.push(themePreset)
            selectedIds.add(themePreset.id)
        })

        return selected
    }, [presets])

    const pendingRandomPreset = useMemo(() => {
        if (pendingRandomPresetId === undefined) {
            return undefined
        }
        return presets.find((themePreset): boolean => themePreset.id === pendingRandomPresetId)
    }, [pendingRandomPresetId, presets])

    const lastAppliedRandomPreset = useMemo(() => {
        if (lastAppliedRandomPresetId === undefined) {
            return undefined
        }
        return presets.find((themePreset): boolean => themePreset.id === lastAppliedRandomPresetId)
    }, [lastAppliedRandomPresetId, presets])

    const selectedTheme = useMemo((): IUserThemeLibraryItem | undefined => {
        if (selectedThemeId.length === 0) {
            return undefined
        }
        return themeLibrary.find((themeItem): boolean => themeItem.id === selectedThemeId)
    }, [selectedThemeId, themeLibrary])

    const favoritePresetLabel = useMemo((): string => {
        if (favoritePresetId === undefined) {
            return "none"
        }
        const presetDefinition = presets.find(
            (themePreset): boolean => themePreset.id === favoritePresetId,
        )
        if (presetDefinition === undefined) {
            return favoritePresetId
        }
        return presetDefinition.label
    }, [favoritePresetId, presets])

    const markThemeLibraryDirty = useCallback((): void => {
        pendingLibraryUpdatedAtMsRef.current = Date.now()
    }, [])

    const selectRandomPresetPreview = useCallback((): void => {
        const currentPresetId = preset
        const candidateIds = accessiblePresetIds.filter(
            (presetId): boolean =>
                presetId !== currentPresetId && presetId !== pendingRandomPresetId,
        )
        if (candidateIds.length === 0) {
            showToastInfo("No alternative accessible presets available for random preview.")
            return
        }

        const randomIndex = Math.floor(Math.random() * candidateIds.length)
        const randomPresetId = candidateIds[randomIndex]
        if (randomPresetId === undefined) {
            return
        }
        setPendingRandomPresetId(randomPresetId)
        showToastInfo("Random preset preview generated.")
    }, [accessiblePresetIds, pendingRandomPresetId, preset])

    const handleApplyRandomPreset = (): void => {
        if (pendingRandomPresetId === undefined) {
            return
        }

        const currentPresetId = preset
        setLastRandomUndoPresetId(currentPresetId)
        setLastAppliedRandomPresetId(pendingRandomPresetId)
        setPreset(pendingRandomPresetId)
        setPendingRandomPresetId(undefined)
        showToastSuccess("Random preset applied.")
    }

    const handleUndoRandomPreset = (): void => {
        if (lastRandomUndoPresetId === undefined) {
            return
        }

        setPreset(lastRandomUndoPresetId)
        setLastRandomUndoPresetId(undefined)
        showToastSuccess("Last random preset reverted.")
    }

    const createThemeSnapshot = (nextName: string): IUserThemeLibraryItem => {
        return {
            accentColor,
            accentIntensity,
            basePaletteId,
            formRadius,
            globalRadius,
            id: createThemeLibraryId(nextName),
            mode,
            name: nextName,
            presetId: preset,
        }
    }

    const handleCreateLibraryTheme = (): void => {
        const resolvedName = resolveThemeNameConflict(
            themeDraftName,
            themeLibrary.map((themeItem): string => themeItem.name),
        )
        const snapshot = createThemeSnapshot(resolvedName)

        markThemeLibraryDirty()
        setThemeLibrary((previous): ReadonlyArray<IUserThemeLibraryItem> => [snapshot, ...previous])
        setSelectedThemeId(snapshot.id)
        setThemeDraftName("")
        showToastSuccess(`Theme "${snapshot.name}" saved to library.`)
    }

    const handleRenameLibraryTheme = (): void => {
        if (selectedTheme === undefined) {
            return
        }

        const resolvedName = resolveThemeNameConflict(
            themeDraftName,
            themeLibrary
                .filter((themeItem): boolean => themeItem.id !== selectedTheme.id)
                .map((themeItem): string => themeItem.name),
        )
        markThemeLibraryDirty()
        setThemeLibrary((previous): ReadonlyArray<IUserThemeLibraryItem> =>
            previous.map((themeItem): IUserThemeLibraryItem => {
                if (themeItem.id !== selectedTheme.id) {
                    return themeItem
                }
                return {
                    ...themeItem,
                    name: resolvedName,
                }
            }),
        )
        setThemeDraftName("")
        showToastSuccess("Theme renamed.")
    }

    const handleDuplicateLibraryTheme = (): void => {
        if (selectedTheme === undefined) {
            return
        }

        const baseName = `${selectedTheme.name} Copy`
        const resolvedName = resolveThemeNameConflict(
            baseName,
            themeLibrary.map((themeItem): string => themeItem.name),
        )
        const duplicate: IUserThemeLibraryItem = {
            ...selectedTheme,
            id: createThemeLibraryId(resolvedName),
            name: resolvedName,
        }
        markThemeLibraryDirty()
        setThemeLibrary((previous): ReadonlyArray<IUserThemeLibraryItem> => [duplicate, ...previous])
        setSelectedThemeId(duplicate.id)
        showToastSuccess("Theme duplicated.")
    }

    const handleDeleteLibraryTheme = (): void => {
        if (selectedTheme === undefined) {
            return
        }

        markThemeLibraryDirty()
        setThemeLibrary((previous): ReadonlyArray<IUserThemeLibraryItem> =>
            previous.filter((themeItem): boolean => themeItem.id !== selectedTheme.id),
        )
        setSelectedThemeId("")
        showToastSuccess("Theme removed from library.")
    }

    const handleApplyLibraryTheme = (): void => {
        if (selectedTheme === undefined) {
            return
        }

        setMode(selectedTheme.mode)
        setPreset(selectedTheme.presetId)
        setAccentColor(selectedTheme.accentColor)
        setAccentIntensity(selectedTheme.accentIntensity)
        setBasePaletteId(selectedTheme.basePaletteId)
        setGlobalRadius(selectedTheme.globalRadius)
        setFormRadius(selectedTheme.formRadius)
        setPendingRandomPresetId(undefined)
        setLastRandomUndoPresetId(undefined)
        setLastAppliedRandomPresetId(undefined)
        showToastSuccess(`Theme "${selectedTheme.name}" applied.`)
    }

    const handleExportThemeLibrary = (): void => {
        const payload = buildThemeLibraryExportPayload(themeLibrary, favoritePresetId)
        const jsonPayload = JSON.stringify(payload, null, 2)
        setThemeImportValue(jsonPayload)
        triggerJsonDownload(
            `theme-library-${new Date().toISOString().slice(0, 10)}.json`,
            jsonPayload,
        )
        showToastSuccess("Theme library exported.")
    }

    const handleImportThemeLibrary = (): void => {
        const parsedPayload = parseThemeLibraryImportPayload(themeImportValue, availablePresetIds)
        if (parsedPayload === undefined) {
            showToastInfo("Import skipped. JSON payload does not match theme library schema.")
            return
        }

        markThemeLibraryDirty()
        setThemeLibrary((previous): ReadonlyArray<IUserThemeLibraryItem> => {
            const existingNames = previous.map((themeItem): string => themeItem.name)
            const importedThemes = parsedPayload.themes.map((themeItem): IUserThemeLibraryItem => {
                const resolvedName = resolveThemeNameConflict(themeItem.name, existingNames)
                existingNames.push(resolvedName)
                return {
                    ...themeItem,
                    id: createThemeLibraryId(resolvedName),
                    name: resolvedName,
                }
            })
            return [...importedThemes, ...previous]
        })
        if (parsedPayload.favoritePresetId !== undefined) {
            setFavoritePresetId(parsedPayload.favoritePresetId)
        }
        setThemeImportValue("")
        showToastSuccess("Theme library imported.")
    }

    const handlePinCurrentPreset = (): void => {
        const currentPresetId = preset
        markThemeLibraryDirty()
        setFavoritePresetId(currentPresetId)
        showToastSuccess("Favorite preset pinned.")
    }

    const handleApplyFavoritePreset = (): void => {
        if (favoritePresetId === undefined) {
            return
        }
        setPreset(favoritePresetId)
        showToastSuccess("Favorite preset applied.")
    }

    useEffect((): void => {
        if (typeof document === "undefined") {
            return
        }

        const root = document.documentElement
        const smRadius = Math.max(4, Math.round(globalRadius * 0.56))
        const mdRadius = Math.max(6, globalRadius)
        const lgRadius = Math.max(8, globalRadius + 4)

        root.style.setProperty("--accent", effectiveAccentColor)
        root.style.setProperty("--background", activeBasePalette.background)
        root.style.setProperty("--foreground", activeBasePalette.foreground)
        root.style.setProperty("--surface", activeBasePalette.surface)
        root.style.setProperty("--surface-muted", activeBasePalette.surfaceMuted)
        root.style.setProperty("--border", activeBasePalette.border)
        root.style.setProperty("--radius-sm", `${smRadius}px`)
        root.style.setProperty("--radius-md", `${mdRadius}px`)
        root.style.setProperty("--radius-lg", `${lgRadius}px`)
        root.style.setProperty("--radius-form", `${formRadius}px`)

        writeLocalStorageItem(APPEARANCE_ACCENT_STORAGE_KEY, accentColor)
        writeLocalStorageItem(APPEARANCE_INTENSITY_STORAGE_KEY, String(accentIntensity))
        writeLocalStorageItem(APPEARANCE_BASE_PALETTE_STORAGE_KEY, basePaletteId)
        writeLocalStorageItem(APPEARANCE_RADIUS_STORAGE_KEY, String(globalRadius))
        writeLocalStorageItem(APPEARANCE_FORM_RADIUS_STORAGE_KEY, String(formRadius))
    }, [
        accentColor,
        accentIntensity,
        activeBasePalette.background,
        activeBasePalette.border,
        activeBasePalette.foreground,
        activeBasePalette.surface,
        activeBasePalette.surfaceMuted,
        basePaletteId,
        effectiveAccentColor,
        formRadius,
        globalRadius,
        mode,
        preset,
    ])

    useEffect((): (() => void) | void => {
        if (typeof window === "undefined") {
            return undefined
        }

        const onKeyDown = (event: KeyboardEvent): void => {
            const isRandomHotkey = event.altKey && event.key.toLowerCase() === "r"
            if (isRandomHotkey !== true) {
                return
            }
            event.preventDefault()
            selectRandomPresetPreview()
        }

        window.addEventListener("keydown", onKeyDown)
        return (): void => {
            window.removeEventListener("keydown", onKeyDown)
        }
    }, [selectRandomPresetPreview])

    useEffect((): void => {
        if (selectedThemeId.length === 0) {
            return
        }
        const exists = themeLibrary.some((themeItem): boolean => themeItem.id === selectedThemeId)
        if (exists !== true) {
            setSelectedThemeId("")
        }
    }, [selectedThemeId, themeLibrary])

    useEffect((): void => {
        if (favoritePresetId === undefined) {
            return
        }
        if (availablePresetIds.includes(favoritePresetId) === false) {
            setFavoritePresetId(undefined)
        }
    }, [availablePresetIds, favoritePresetId])

    useEffect((): (() => void) | void => {
        let isMounted = true

        void (async (): Promise<void> => {
            setLibrarySyncStatus("syncing")
            const profileState = await readThemeLibraryProfileState()
            if (isMounted !== true) {
                return
            }

            if (profileState === undefined) {
                setLibrarySyncStatus("idle")
                setIsLibraryHydrated(true)
                return
            }

            const parsedThemes = profileState.themes
                .map((themeItem): IUserThemeLibraryItem | undefined =>
                    fromProfileTheme(themeItem, availablePresetIds),
                )
                .filter((themeItem): themeItem is IUserThemeLibraryItem => themeItem !== undefined)

            if (
                profileState.favoritePresetId !== undefined
                && availablePresetIds.includes(profileState.favoritePresetId as ThemePresetId)
            ) {
                if (
                    profileState.updatedAtMs
                    > (pendingLibraryUpdatedAtMsRef.current ?? libraryUpdatedAtMsRef.current)
                ) {
                    setFavoritePresetId(profileState.favoritePresetId as ThemePresetId)
                }
            }
            if (
                profileState.updatedAtMs
                > (pendingLibraryUpdatedAtMsRef.current ?? libraryUpdatedAtMsRef.current)
            ) {
                setThemeLibrary(parsedThemes)
                setSelectedThemeId(parsedThemes[0]?.id ?? "")
                if (profileState.favoritePresetId === undefined) {
                    setFavoritePresetId(undefined)
                }
                libraryUpdatedAtMsRef.current = profileState.updatedAtMs
                pendingLibraryUpdatedAtMsRef.current = undefined
            }
            setLibrarySyncStatus("synced")
            setIsLibraryHydrated(true)
        })()

        return (): void => {
            isMounted = false
        }
    }, [availablePresetIds])

    useEffect((): (() => void) | void => {
        if (typeof window === "undefined") {
            return undefined
        }

        writeLocalStorageItem(APPEARANCE_LIBRARY_STORAGE_KEY, JSON.stringify(themeLibrary))
        if (favoritePresetId !== undefined) {
            writeLocalStorageItem(APPEARANCE_LIBRARY_FAVORITE_PRESET_STORAGE_KEY, favoritePresetId)
        } else {
            removeLocalStorageItem(APPEARANCE_LIBRARY_FAVORITE_PRESET_STORAGE_KEY)
        }

        const localUpdatedAtMs =
            pendingLibraryUpdatedAtMsRef.current ?? libraryUpdatedAtMsRef.current
        if (localUpdatedAtMs > 0) {
            writeStoredThemeLibraryUpdatedAtMs(localUpdatedAtMs)
        }

        if (isLibraryHydrated !== true) {
            return undefined
        }

        const timer = window.setTimeout((): void => {
            void (async (): Promise<void> => {
                setLibrarySyncStatus("syncing")
                const updatedAtMs = pendingLibraryUpdatedAtMsRef.current ?? Date.now()
                libraryUpdatedAtMsRef.current = updatedAtMs
                pendingLibraryUpdatedAtMsRef.current = undefined
                writeStoredThemeLibraryUpdatedAtMs(updatedAtMs)
                const updated = await writeThemeLibraryProfileState({
                    favoritePresetId,
                    themes: themeLibrary.map((themeItem): IThemeLibraryProfileTheme =>
                        toProfileTheme(themeItem),
                    ),
                    updatedAtMs,
                })
                setLibrarySyncStatus(updated ? "synced" : "error")
            })()
        }, 350)

        return (): void => {
            window.clearTimeout(timer)
        }
    }, [favoritePresetId, isLibraryHydrated, themeLibrary])

    const handleResetTheme = (): void => {
        const defaultPreset = presets.at(0)?.id
        setMode("system")
        if (defaultPreset !== undefined) {
            setPreset(defaultPreset)
        }
        setAccentColor(DEFAULT_ACCENT_COLOR)
        setAccentIntensity(DEFAULT_ACCENT_INTENSITY)
        setBasePaletteId(DEFAULT_BASE_PALETTE)
        setGlobalRadius(DEFAULT_GLOBAL_RADIUS)
        setFormRadius(DEFAULT_FORM_RADIUS)
        markThemeLibraryDirty()
        setFavoritePresetId(undefined)
        setThemeLibrary([])
        setThemeImportValue("")
        setThemeDraftName("")
        setSelectedThemeId("")
        setPendingRandomPresetId(undefined)
        setLastRandomUndoPresetId(undefined)
        setLastAppliedRandomPresetId(undefined)
        clearAppearanceStorage()
        if (typeof window !== "undefined") {
            removeLocalStorageItem(APPEARANCE_LIBRARY_STORAGE_KEY)
            removeLocalStorageItem(APPEARANCE_LIBRARY_FAVORITE_PRESET_STORAGE_KEY)
            removeLocalStorageItem(APPEARANCE_LIBRARY_SYNC_STORAGE_KEY)
        }
        showToastSuccess("Theme reset to defaults.")
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">Appearance settings</h1>
            <p className="text-sm text-[var(--foreground)]/70">
                Switch theme mode and presets in one place. All changes are applied immediately
                without page reload.
            </p>

            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-base font-semibold text-[var(--foreground)]">
                        Theme controls
                    </p>
                    <Button
                        variant="flat"
                        onPress={handleResetTheme}
                    >
                        Reset to default
                    </Button>
                </CardHeader>
                <CardBody className="space-y-3">
                    <ThemeToggle />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--foreground)]/70">
                        <Chip size="sm" variant="flat">
                            mode: {mode}
                        </Chip>
                        <Chip size="sm" variant="flat">
                            preset: {preset}
                        </Chip>
                        <Chip size="sm" variant="flat">
                            resolved: {resolvedMode}
                        </Chip>
                        {lastAppliedRandomPreset !== undefined ? (
                            <Chip size="sm" variant="flat">
                                last random: {lastAppliedRandomPreset.label}
                            </Chip>
                        ) : null}
                    </div>
                    <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-[var(--foreground)]/60">
                            Quick presets
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {quickPresetOptions.map((themePreset): ReactElement => (
                                <Button
                                    key={themePreset.id}
                                    aria-label={`Quick preset ${themePreset.label}`}
                                    radius="full"
                                    size="sm"
                                    variant={themePreset.id === preset ? "solid" : "flat"}
                                    onPress={(): void => {
                                        setPreset(themePreset.id)
                                    }}
                                >
                                    {themePreset.label}
                                </Button>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                aria-keyshortcuts="Alt+R"
                                radius="full"
                                size="sm"
                                variant="flat"
                                onPress={selectRandomPresetPreview}
                            >
                                Random preset (Alt+R)
                            </Button>
                            {lastRandomUndoPresetId !== undefined ? (
                                <Button
                                    radius="full"
                                    size="sm"
                                    variant="flat"
                                    onPress={handleUndoRandomPreset}
                                >
                                    Undo last random
                                </Button>
                            ) : null}
                        </div>
                        {pendingRandomPreset !== undefined ? (
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                                <p className="text-sm font-semibold text-[var(--foreground)]">
                                    Preview preset: {pendingRandomPreset.label}
                                </p>
                                <p className="mt-1 text-xs text-[var(--foreground)]/70">
                                    Apply to switch immediately or cancel to keep current theme.
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <Button
                                        size="sm"
                                        onPress={handleApplyRandomPreset}
                                    >
                                        Apply random preset
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        onPress={(): void => {
                                            setPendingRandomPresetId(undefined)
                                        }}
                                    >
                                        Cancel random preview
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">
                        Advanced controls
                    </p>
                </CardHeader>
                <CardBody className="space-y-4">
                    <div className="grid gap-4 xl:grid-cols-2">
                        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                            <p className="text-sm font-semibold text-[var(--foreground)]">
                                Accent control
                            </p>
                            <div className="flex items-center gap-3">
                                <input
                                    aria-label="Accent color picker"
                                    className="h-10 w-14 cursor-pointer rounded-md border border-[var(--border)] bg-transparent p-1"
                                    type="color"
                                    value={accentColor}
                                    onChange={(event): void => {
                                        setAccentColor(event.currentTarget.value)
                                    }}
                                />
                                <p className="text-xs font-mono text-[var(--foreground)]/70">
                                    {effectiveAccentColor}
                                </p>
                            </div>
                            <label
                                className="text-xs uppercase tracking-[0.12em] text-[var(--foreground)]/60"
                                htmlFor="accent-intensity-slider"
                            >
                                Accent intensity: {accentIntensity}
                            </label>
                            <input
                                aria-label="Accent intensity slider"
                                className="w-full accent-[var(--primary)]"
                                id="accent-intensity-slider"
                                max={MAX_INTENSITY}
                                min={MIN_INTENSITY}
                                type="range"
                                value={accentIntensity}
                                onChange={(event): void => {
                                    setAccentIntensity(Number(event.currentTarget.value))
                                }}
                            />
                        </div>

                        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                            <p className="text-sm font-semibold text-[var(--foreground)]">
                                Base palette
                            </p>
                            <div
                                aria-label="Base palette picker"
                                className="flex flex-wrap gap-2"
                                role="group"
                            >
                                {BASE_PALETTES.map((palette): ReactElement => (
                                    <Button
                                        key={palette.id}
                                        aria-pressed={basePaletteId === palette.id}
                                        radius="full"
                                        size="sm"
                                        variant={basePaletteId === palette.id ? "solid" : "flat"}
                                        onPress={(): void => {
                                            setBasePaletteId(palette.id)
                                        }}
                                    >
                                        {palette.label}
                                    </Button>
                                ))}
                            </div>
                            <p className="text-xs text-[var(--foreground)]/70">
                                {getPaletteDefinition(basePaletteId).description}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                        <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                            <label
                                className="text-xs uppercase tracking-[0.12em] text-[var(--foreground)]/60"
                                htmlFor="global-radius-slider"
                            >
                                Global radius: {globalRadius}px
                            </label>
                            <input
                                aria-label="Global radius slider"
                                className="w-full accent-[var(--primary)]"
                                id="global-radius-slider"
                                max={MAX_RADIUS}
                                min={MIN_RADIUS}
                                type="range"
                                value={globalRadius}
                                onChange={(event): void => {
                                    setGlobalRadius(Number(event.currentTarget.value))
                                }}
                            />
                        </div>
                        <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                            <label
                                className="text-xs uppercase tracking-[0.12em] text-[var(--foreground)]/60"
                                htmlFor="form-radius-slider"
                            >
                                Form radius: {formRadius}px
                            </label>
                            <input
                                aria-label="Form radius slider"
                                className="w-full accent-[var(--primary)]"
                                id="form-radius-slider"
                                max={MAX_FORM_RADIUS}
                                min={MIN_FORM_RADIUS}
                                type="range"
                                value={formRadius}
                                onChange={(event): void => {
                                    setFormRadius(Number(event.currentTarget.value))
                                }}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--foreground)]/70">
                        <Chip size="sm" variant="flat">
                            base: {basePaletteId}
                        </Chip>
                        <Chip size="sm" variant="flat">
                            global radius: {globalRadius}px
                        </Chip>
                        <Chip size="sm" variant="flat">
                            form radius: {formRadius}px
                        </Chip>
                        <Chip
                            color={isAccessibleContrast ? "success" : "warning"}
                            size="sm"
                            variant="flat"
                        >
                            contrast: {contrastRatio.toFixed(2)} ({isAccessibleContrast ? "AA" : "check"})
                        </Chip>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-base font-semibold text-[var(--foreground)]">Theme library</p>
                    <Chip
                        color={
                            librarySyncStatus === "synced"
                                ? "success"
                                : librarySyncStatus === "error"
                                  ? "warning"
                                  : "default"
                        }
                        size="sm"
                        variant="flat"
                    >
                        sync: {librarySyncStatus}
                    </Chip>
                </CardHeader>
                <CardBody className="space-y-4">
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                        <p className="text-sm font-semibold text-[var(--foreground)]">Favorite preset</p>
                        <p className="mt-1 text-xs text-[var(--foreground)]/70">
                            pinned: {favoritePresetLabel}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={handlePinCurrentPreset}
                            >
                                Pin current preset
                            </Button>
                            <Button
                                isDisabled={favoritePresetId === undefined}
                                size="sm"
                                variant="flat"
                                onPress={handleApplyFavoritePreset}
                            >
                                Apply favorite preset
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_auto]">
                        <Input
                            label="Theme name"
                            placeholder="Security Focus Theme"
                            value={themeDraftName}
                            onValueChange={setThemeDraftName}
                        />
                        <div className="flex flex-col gap-1">
                            <label
                                className="text-sm text-[var(--foreground)]/80"
                                htmlFor="theme-library-selected"
                            >
                                Library themes
                            </label>
                            <select
                                aria-label="Theme library selection"
                                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                                id="theme-library-selected"
                                value={selectedThemeId}
                                onChange={(event): void => {
                                    setSelectedThemeId(event.currentTarget.value)
                                }}
                            >
                                <option value="">Select theme</option>
                                {themeLibrary.map((themeItem): ReactElement => (
                                    <option key={themeItem.id} value={themeItem.id}>
                                        {themeItem.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <Button onPress={handleCreateLibraryTheme}>
                                Save current theme
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            isDisabled={selectedTheme === undefined}
                            size="sm"
                            variant="flat"
                            onPress={handleApplyLibraryTheme}
                        >
                            Apply selected
                        </Button>
                        <Button
                            isDisabled={selectedTheme === undefined}
                            size="sm"
                            variant="flat"
                            onPress={handleRenameLibraryTheme}
                        >
                            Rename selected
                        </Button>
                        <Button
                            isDisabled={selectedTheme === undefined}
                            size="sm"
                            variant="flat"
                            onPress={handleDuplicateLibraryTheme}
                        >
                            Duplicate selected
                        </Button>
                        <Button
                            color="danger"
                            isDisabled={selectedTheme === undefined}
                            size="sm"
                            variant="ghost"
                            onPress={handleDeleteLibraryTheme}
                        >
                            Delete selected
                        </Button>
                    </div>

                    <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                            Import / Export JSON
                        </p>
                        <textarea
                            aria-label="Theme library json"
                            className="min-h-28 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs"
                            placeholder='{"version":1,"themes":[...]}'
                            value={themeImportValue}
                            onChange={(event): void => {
                                setThemeImportValue(event.currentTarget.value)
                            }}
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={handleExportThemeLibrary}
                            >
                                Export library JSON
                            </Button>
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={handleImportThemeLibrary}
                            >
                                Import library JSON
                            </Button>
                        </div>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">Live preview</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-[var(--foreground)]/60">
                                Primary action
                            </p>
                            <button
                                className="mt-2 rounded-full border border-[var(--primary)] bg-[var(--primary)] px-3 py-1.5 text-sm text-[var(--primary-foreground)]"
                                style={{ borderRadius: `${globalRadius}px` }}
                                type="button"
                            >
                                Preview button
                            </button>
                            <button
                                className="ml-2 mt-2 rounded-full border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-sm text-[var(--accent-foreground)]"
                                style={{ borderRadius: `${globalRadius}px` }}
                                type="button"
                            >
                                Accent action
                            </button>
                        </div>
                        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-[var(--foreground)]/60">
                                Accent & surface
                            </p>
                            <div className="mt-2 flex gap-2">
                                <span className="h-6 w-6 rounded-full bg-[var(--accent)]" />
                                <span className="h-6 w-6 rounded-full bg-[var(--surface-muted)]" />
                            </div>
                        </div>
                        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-[var(--foreground)]/60">
                                Form controls
                            </p>
                            <Input
                                aria-label="Appearance preview input"
                                className="mt-2"
                                placeholder="Preview input"
                                style={{ borderRadius: `${formRadius}px` }}
                                value={previewFieldValue}
                                onValueChange={setPreviewFieldValue}
                            />
                        </div>
                    </div>
                    <p className="text-xs text-[var(--foreground)]/70">
                        Preset options: {presets.map((themePreset): string => themePreset.label).join(", ")}
                    </p>
                </CardBody>
            </Card>
        </section>
    )
}
