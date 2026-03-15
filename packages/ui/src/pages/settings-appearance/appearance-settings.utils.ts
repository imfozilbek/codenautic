/**
 * Утилиты для страницы настроек внешнего вида.
 *
 * Включает функции работы с localStorage, валидацию цветов и числовых значений,
 * WCAG-расчёты контрастности, трансформации цветов и логику Theme Library.
 */

import type { TThemeMode, TThemePreset } from "@/lib/theme/use-theme"
import {
    getWindowLocalStorage,
    safeStorageGet,
    safeStorageRemove,
    safeStorageSet,
} from "@/lib/utils/safe-storage"

import {
    APPEARANCE_ACCENT_STORAGE_KEY,
    APPEARANCE_BASE_PALETTE_STORAGE_KEY,
    APPEARANCE_FORM_RADIUS_STORAGE_KEY,
    APPEARANCE_INTENSITY_STORAGE_KEY,
    APPEARANCE_LIBRARY_FAVORITE_PRESET_STORAGE_KEY,
    APPEARANCE_LIBRARY_STORAGE_KEY,
    APPEARANCE_LIBRARY_SYNC_STORAGE_KEY,
    APPEARANCE_RADIUS_STORAGE_KEY,
    LUMINANCE_BLUE_COEFFICIENT,
    LUMINANCE_GREEN_COEFFICIENT,
    LUMINANCE_RED_COEFFICIENT,
    MAX_FORM_RADIUS,
    MAX_INTENSITY,
    MAX_RADIUS,
    MIN_FORM_RADIUS,
    MIN_INTENSITY,
    MIN_RADIUS,
    SRGB_CHANNEL_MAX,
    SRGB_GAMMA_EXPONENT,
    SRGB_GAMMA_OFFSET,
    SRGB_GAMMA_SCALE,
    SRGB_LINEAR_DIVISOR,
    SRGB_LINEAR_THRESHOLD,
    WCAG_LUMINANCE_OFFSET,
} from "./appearance-settings.constants"

/**
 * Длина одного hex-канала в строковом представлении цвета (например "ff" = 2 символа).
 */
const HEX_CHANNEL_LENGTH = 2

/**
 * Элемент пользовательской библиотеки тем.
 */
export interface IUserThemeLibraryItem {
    /**
     * Идентификатор пользовательской темы.
     */
    readonly id: string
    /**
     * Название пользовательской темы.
     */
    readonly name: string
    /**
     * Режим темы.
     */
    readonly mode: TThemeMode
    /**
     * Пресет темы.
     */
    readonly presetId: TThemePreset
    /**
     * Базовый accent цвет.
     */
    readonly accentColor: string
    /**
     * Интенсивность accent цвета.
     */
    readonly accentIntensity: number
    /**
     * Базовая палитра.
     */
    readonly basePaletteId: "cool" | "neutral" | "warm"
    /**
     * Глобальный радиус.
     */
    readonly globalRadius: number
    /**
     * Радиус form-контролов.
     */
    readonly formRadius: number
}

/**
 * Конверт для импорта/экспорта библиотеки тем в JSON.
 */
export interface IThemeLibraryImportEnvelope {
    /**
     * Версия структуры payload.
     */
    readonly version: number
    /**
     * Набор тем для импорта.
     */
    readonly themes: ReadonlyArray<IUserThemeLibraryItem>
    /**
     * Опциональный favorite preset.
     */
    readonly favoritePresetId?: TThemePreset
}

/**
 * Читает значение из localStorage по ключу.
 *
 * @param storageKey - Ключ в localStorage.
 * @returns Значение или undefined если ключ не найден или недоступен.
 */
export function readLocalStorageItem(storageKey: string): string | undefined {
    return safeStorageGet(getWindowLocalStorage(), storageKey)
}

/**
 * Записывает значение в localStorage по ключу.
 *
 * @param storageKey - Ключ в localStorage.
 * @param value - Значение для записи.
 */
export function writeLocalStorageItem(storageKey: string, value: string): void {
    safeStorageSet(getWindowLocalStorage(), storageKey, value)
}

/**
 * Удаляет значение из localStorage по ключу.
 *
 * @param storageKey - Ключ в localStorage.
 */
export function removeLocalStorageItem(storageKey: string): void {
    safeStorageRemove(getWindowLocalStorage(), storageKey)
}

/**
 * Проверяет, является ли строка валидным hex-цветом (#RRGGBB).
 *
 * @param value - Строка для проверки.
 * @returns true если формат hex-цвета корректен.
 */
export function isHexColor(value: string): boolean {
    return /^#[0-9a-fA-F]{6}$/.test(value)
}

/**
 * Читает hex-цвет из localStorage с fallback.
 *
 * @param storageKey - Ключ в localStorage.
 * @param fallback - Значение по умолчанию при отсутствии или невалидном значении.
 * @returns Hex-цвет в lowercase.
 */
export function readStoredHexColor(storageKey: string, fallback: string): string {
    const rawValue = readLocalStorageItem(storageKey)
    if (rawValue === undefined) {
        return fallback
    }

    return isHexColor(rawValue) ? rawValue.toLowerCase() : fallback
}

/**
 * Читает число из localStorage с валидацией диапазона.
 *
 * @param storageKey - Ключ в localStorage.
 * @param fallback - Значение по умолчанию при невалидном значении.
 * @param min - Минимальное допустимое значение.
 * @param max - Максимальное допустимое значение.
 * @returns Валидное число в заданном диапазоне.
 */
export function readStoredNumber(
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

/**
 * Извлекает RGB-компоненты из hex-цвета.
 *
 * @param hex - Hex-цвет (#RRGGBB).
 * @returns Объект с компонентами r, g, b (0-255).
 */
export function getRgbComponents(hex: string): {
    readonly b: number
    readonly g: number
    readonly r: number
} {
    const normalized = hex.replace("#", "")
    const r = Number.parseInt(normalized.slice(0, HEX_CHANNEL_LENGTH), 16)
    const g = Number.parseInt(normalized.slice(2, 4), 16)
    const b = Number.parseInt(normalized.slice(4, 6), 16)

    return { b, g, r }
}

/**
 * Конвертирует числовое значение канала в двухсимвольный hex.
 *
 * @param value - Числовое значение (0-255).
 * @returns Двухсимвольная hex-строка.
 */
export function toHexColor(value: number): string {
    return value.toString(16).padStart(2, "0")
}

/**
 * Смешивает два hex-цвета с заданным соотношением.
 *
 * @param baseHex - Базовый hex-цвет.
 * @param targetHex - Целевой hex-цвет.
 * @param ratio - Коэффициент смешивания (0 = base, 1 = target).
 * @returns Результирующий hex-цвет.
 */
export function mixHexColors(baseHex: string, targetHex: string, ratio: number): string {
    const sanitizedRatio = Math.min(Math.max(ratio, 0), 1)
    const base = getRgbComponents(baseHex)
    const target = getRgbComponents(targetHex)

    const mixedR = Math.round(base.r + (target.r - base.r) * sanitizedRatio)
    const mixedG = Math.round(base.g + (target.g - base.g) * sanitizedRatio)
    const mixedB = Math.round(base.b + (target.b - base.b) * sanitizedRatio)

    return `#${toHexColor(mixedR)}${toHexColor(mixedG)}${toHexColor(mixedB)}`
}

/**
 * Создаёт эффективный accent-цвет с учётом интенсивности и режима темы.
 *
 * @param accentColor - Базовый accent hex-цвет.
 * @param accentIntensity - Интенсивность (0-100).
 * @param resolvedMode - Режим темы (dark/light).
 * @returns Скорректированный hex-цвет.
 */
export function createEffectiveAccentColor(
    accentColor: string,
    accentIntensity: number,
    resolvedMode: "dark" | "light",
): string {
    const target = resolvedMode === "dark" ? "#e7efff" : "#101727"
    const ratio = ((100 - accentIntensity) / 100) * 0.55

    return mixHexColors(accentColor, target, ratio)
}

/**
 * Линеаризует sRGB-канал по спецификации IEC 61966-2-1.
 *
 * @param channel - Значение канала (0-255).
 * @returns Линеаризованное значение (0-1).
 */
export function toLinearChannel(channel: number): number {
    const normalizedChannel = channel / SRGB_CHANNEL_MAX
    if (normalizedChannel <= SRGB_LINEAR_THRESHOLD) {
        return normalizedChannel / SRGB_LINEAR_DIVISOR
    }
    return ((normalizedChannel + SRGB_GAMMA_OFFSET) / SRGB_GAMMA_SCALE) ** SRGB_GAMMA_EXPONENT
}

/**
 * Извлекает Lightness из OKLCH строки.
 *
 * @param oklchColor - OKLCH-строка (oklch(L C H)).
 * @returns Lightness (0-1) или undefined если не удалось распарсить.
 */
export function parseOklchLightness(oklchColor: string): number | undefined {
    const match = oklchColor.match(/oklch\(\s*([\d.]+)/)
    if (match === null || match[1] === undefined) {
        return undefined
    }

    const lightness = parseFloat(match[1])
    return Number.isNaN(lightness) ? undefined : lightness
}

/**
 * Вычисляет относительную яркость цвета по WCAG 2.x.
 *
 * Поддерживает hex (#RRGGBB) и oklch-формат.
 *
 * @param color - Цвет в hex или oklch формате.
 * @returns Относительная яркость (0-1).
 */
export function getRelativeLuminance(color: string): number {
    const oklchLightness = parseOklchLightness(color)
    if (oklchLightness !== undefined) {
        return oklchLightness ** 3
    }

    const { r, g, b } = getRgbComponents(color)
    const linearRed = toLinearChannel(r)
    const linearGreen = toLinearChannel(g)
    const linearBlue = toLinearChannel(b)

    return (
        LUMINANCE_RED_COEFFICIENT * linearRed +
        LUMINANCE_GREEN_COEFFICIENT * linearGreen +
        LUMINANCE_BLUE_COEFFICIENT * linearBlue
    )
}

/**
 * Вычисляет контрастное соотношение между двумя цветами по WCAG 2.x.
 *
 * @param firstColor - Первый цвет (hex или oklch).
 * @param secondColor - Второй цвет (hex или oklch).
 * @returns Контрастное соотношение (1-21).
 */
export function getContrastRatio(firstColor: string, secondColor: string): number {
    const luminanceA = getRelativeLuminance(firstColor)
    const luminanceB = getRelativeLuminance(secondColor)
    const lightest = Math.max(luminanceA, luminanceB)
    const darkest = Math.min(luminanceA, luminanceB)

    return (lightest + WCAG_LUMINANCE_OFFSET) / (darkest + WCAG_LUMINANCE_OFFSET)
}

/**
 * Очищает все ключи localStorage связанные с appearance-настройками.
 */
export function clearAppearanceStorage(): void {
    removeLocalStorageItem(APPEARANCE_ACCENT_STORAGE_KEY)
    removeLocalStorageItem(APPEARANCE_INTENSITY_STORAGE_KEY)
    removeLocalStorageItem(APPEARANCE_BASE_PALETTE_STORAGE_KEY)
    removeLocalStorageItem(APPEARANCE_RADIUS_STORAGE_KEY)
    removeLocalStorageItem(APPEARANCE_FORM_RADIUS_STORAGE_KEY)
}

/**
 * Создаёт уникальный идентификатор для элемента библиотеки тем.
 *
 * @param prefix - Префикс (обычно имя темы).
 * @returns Уникальный id в формате "prefix-base36timestamp".
 */
export function createThemeLibraryId(prefix: string): string {
    return `${prefix.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`
}

/**
 * Нормализует имя темы: trim + fallback на "Custom Theme".
 *
 * @param value - Исходное имя.
 * @returns Нормализованное имя.
 */
export function normalizeThemeName(value: string): string {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
        return "Custom Theme"
    }
    return trimmed
}

/**
 * Разрешает конфликт имён тем, добавляя числовой суффикс при совпадении.
 *
 * @param baseName - Базовое имя темы.
 * @param existingNames - Массив существующих имён.
 * @returns Уникальное имя.
 */
export function resolveThemeNameConflict(
    baseName: string,
    existingNames: ReadonlyArray<string>,
): string {
    const normalizedBaseName = normalizeThemeName(baseName)
    const lowerCaseNameSet = new Set<string>(
        existingNames.map((name): string => name.toLowerCase()),
    )
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

/**
 * Type guard: проверяет, является ли значение валидным TThemeMode.
 *
 * @param value - Проверяемое значение.
 * @returns true если значение — "dark", "light" или "system".
 */
export function isThemeModeValue(value: unknown): value is TThemeMode {
    return value === "dark" || value === "light" || value === "system"
}

/**
 * Type guard: проверяет, является ли значение валидным TThemePreset.
 *
 * @param value - Проверяемое значение.
 * @param availablePresetIds - Список допустимых preset id.
 * @returns true если значение входит в список доступных preset id.
 */
export function isThemePresetValue(
    value: unknown,
    availablePresetIds: ReadonlyArray<TThemePreset>,
): value is TThemePreset {
    if (typeof value !== "string") {
        return false
    }
    return availablePresetIds.includes(value as TThemePreset)
}

/**
 * Парсит и валидирует элемент библиотеки тем из неизвестного значения.
 *
 * @param value - Сырое значение (из JSON).
 * @param availablePresetIds - Список допустимых preset id.
 * @returns Валидный элемент или undefined при невалидных данных.
 */
export function parseThemeLibraryItem(
    value: unknown,
    availablePresetIds: ReadonlyArray<TThemePreset>,
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
        typeof rawValue.accentIntensity !== "number" ||
        rawValue.accentIntensity < MIN_INTENSITY ||
        rawValue.accentIntensity > MAX_INTENSITY
    ) {
        return undefined
    }
    if (
        typeof rawValue.globalRadius !== "number" ||
        rawValue.globalRadius < MIN_RADIUS ||
        rawValue.globalRadius > MAX_RADIUS
    ) {
        return undefined
    }
    if (
        typeof rawValue.formRadius !== "number" ||
        rawValue.formRadius < MIN_FORM_RADIUS ||
        rawValue.formRadius > MAX_FORM_RADIUS
    ) {
        return undefined
    }

    if (isThemeModeValue(rawValue.mode) !== true) {
        return undefined
    }
    const validBasePaletteIds = ["cool", "neutral", "warm"]
    if (validBasePaletteIds.includes(rawValue.basePaletteId as string) !== true) {
        return undefined
    }
    if (isThemePresetValue(rawValue.presetId, availablePresetIds) !== true) {
        return undefined
    }

    return {
        accentColor: rawValue.accentColor.toLowerCase(),
        accentIntensity: rawValue.accentIntensity,
        basePaletteId: rawValue.basePaletteId as "cool" | "neutral" | "warm",
        formRadius: rawValue.formRadius,
        globalRadius: rawValue.globalRadius,
        id: rawValue.id,
        mode: rawValue.mode,
        name: normalizeThemeName(rawValue.name),
        presetId: rawValue.presetId,
    }
}

/**
 * Читает библиотеку тем из localStorage и валидирует каждый элемент.
 *
 * @param availablePresetIds - Список допустимых preset id.
 * @returns Массив валидных элементов библиотеки.
 */
export function readStoredThemeLibrary(
    availablePresetIds: ReadonlyArray<TThemePreset>,
): ReadonlyArray<IUserThemeLibraryItem> {
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

/**
 * Читает закреплённый (favorite) preset из localStorage.
 *
 * @param availablePresetIds - Список допустимых preset id.
 * @returns TThemePreset или undefined если не найден или невалиден.
 */
export function readStoredFavoritePreset(
    availablePresetIds: ReadonlyArray<TThemePreset>,
): TThemePreset | undefined {
    const rawValue = readLocalStorageItem(APPEARANCE_LIBRARY_FAVORITE_PRESET_STORAGE_KEY)
    if (rawValue === undefined) {
        return undefined
    }

    if (availablePresetIds.includes(rawValue as TThemePreset)) {
        return rawValue as TThemePreset
    }

    return undefined
}

/**
 * Читает timestamp последней синхронизации библиотеки из localStorage.
 *
 * @returns Timestamp в миллисекундах или 0 если не найден.
 */
export function readStoredThemeLibraryUpdatedAtMs(): number {
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

/**
 * Записывает timestamp последней синхронизации библиотеки в localStorage.
 *
 * @param updatedAtMs - Timestamp в миллисекундах.
 */
export function writeStoredThemeLibraryUpdatedAtMs(updatedAtMs: number): void {
    writeLocalStorageItem(
        APPEARANCE_LIBRARY_SYNC_STORAGE_KEY,
        JSON.stringify({
            updatedAtMs,
        }),
    )
}

/**
 * Формирует payload для экспорта библиотеки тем в JSON.
 *
 * @param themes - Массив тем для экспорта.
 * @param favoritePresetId - Закреплённый preset (опционально).
 * @returns Объект-конверт для экспорта.
 */
export function buildThemeLibraryExportPayload(
    themes: ReadonlyArray<IUserThemeLibraryItem>,
    favoritePresetId: TThemePreset | undefined,
): IThemeLibraryImportEnvelope {
    return {
        favoritePresetId,
        themes,
        version: 1,
    }
}

/**
 * Парсит JSON-строку импорта библиотеки тем.
 *
 * @param rawJson - JSON-строка для парсинга.
 * @param availablePresetIds - Список допустимых preset id.
 * @returns Распарсенный конверт или undefined при невалидном JSON.
 */
export function parseThemeLibraryImportPayload(
    rawJson: string,
    availablePresetIds: ReadonlyArray<TThemePreset>,
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
            typeof record.favoritePresetId === "string" &&
            availablePresetIds.includes(record.favoritePresetId as TThemePreset)
                ? (record.favoritePresetId as TThemePreset)
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

/**
 * Инициирует скачивание JSON-файла через программный клик по ссылке.
 *
 * @param fileName - Имя файла для скачивания.
 * @param jsonPayload - JSON-содержимое файла.
 */
export function triggerJsonDownload(fileName: string, jsonPayload: string): void {
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
