/**
 * Константы для страницы настроек внешнего вида.
 *
 * Включает storage keys, значения по умолчанию, лимиты, WCAG-константы
 * и конфигурацию quick presets.
 */

import type { SupportedLocale } from "@/lib/i18n"

/**
 * Общий префикс для всех ключей localStorage раздела appearance.
 */
export const APPEARANCE_STORAGE_PREFIX = "cn:appearance"

/**
 * Ключ localStorage для accent-цвета.
 */
export const APPEARANCE_ACCENT_STORAGE_KEY = `${APPEARANCE_STORAGE_PREFIX}:accent`

/**
 * Ключ localStorage для интенсивности accent-цвета.
 */
export const APPEARANCE_INTENSITY_STORAGE_KEY = `${APPEARANCE_STORAGE_PREFIX}:intensity`

/**
 * Ключ localStorage для базовой палитры.
 */
export const APPEARANCE_BASE_PALETTE_STORAGE_KEY = `${APPEARANCE_STORAGE_PREFIX}:base-palette`

/**
 * Ключ localStorage для глобального радиуса.
 */
export const APPEARANCE_RADIUS_STORAGE_KEY = `${APPEARANCE_STORAGE_PREFIX}:radius-global`

/**
 * Ключ localStorage для радиуса form-контролов.
 */
export const APPEARANCE_FORM_RADIUS_STORAGE_KEY = `${APPEARANCE_STORAGE_PREFIX}:radius-form`

/**
 * Ключ localStorage для пользовательской библиотеки тем.
 */
export const APPEARANCE_LIBRARY_STORAGE_KEY = `${APPEARANCE_STORAGE_PREFIX}:library`

/**
 * Ключ localStorage для закреплённого (favorite) пресета.
 */
export const APPEARANCE_LIBRARY_FAVORITE_PRESET_STORAGE_KEY = `${APPEARANCE_STORAGE_PREFIX}:favorite-preset`

/**
 * Ключ localStorage для timestamp последней синхронизации библиотеки.
 */
export const APPEARANCE_LIBRARY_SYNC_STORAGE_KEY = `${APPEARANCE_STORAGE_PREFIX}:library-sync`

/**
 * Accent-цвет по умолчанию (hex).
 */
export const DEFAULT_ACCENT_COLOR = "#5f6dff"

/**
 * Интенсивность accent-цвета по умолчанию (процент).
 */
export const DEFAULT_ACCENT_INTENSITY = 76

/**
 * Глобальный радиус скруглений по умолчанию (px).
 */
export const DEFAULT_GLOBAL_RADIUS = 14

/**
 * Радиус form-контролов по умолчанию (px).
 */
export const DEFAULT_FORM_RADIUS = 12

/**
 * Минимальная интенсивность accent-цвета (процент).
 */
export const MIN_INTENSITY = 40

/**
 * Максимальная интенсивность accent-цвета (процент).
 */
export const MAX_INTENSITY = 100

/**
 * Минимальный глобальный радиус (px).
 */
export const MIN_RADIUS = 6

/**
 * Максимальный глобальный радиус (px).
 */
export const MAX_RADIUS = 24

/**
 * Минимальный радиус form-контролов (px).
 */
export const MIN_FORM_RADIUS = 4

/**
 * Максимальный радиус form-контролов (px).
 */
export const MAX_FORM_RADIUS = 20

/**
 * Ключевые слова для выбора quick-preset тем (по подстроке в label/id).
 */
export const QUICK_PRESET_KEYWORDS: ReadonlyArray<string> = ["default", "sky", "lavender", "mint"]

/**
 * sRGB channel normalization divisor (8-bit to [0, 1]).
 */
export const SRGB_CHANNEL_MAX = 255

/**
 * sRGB linearization threshold (IEC 61966-2-1).
 */
export const SRGB_LINEAR_THRESHOLD = 0.03928

/**
 * sRGB linearization divisor for values below threshold.
 */
export const SRGB_LINEAR_DIVISOR = 12.92

/**
 * sRGB linearization offset for values above threshold.
 */
export const SRGB_GAMMA_OFFSET = 0.055

/**
 * sRGB linearization scale for values above threshold.
 */
export const SRGB_GAMMA_SCALE = 1.055

/**
 * sRGB linearization exponent (gamma).
 */
export const SRGB_GAMMA_EXPONENT = 2.4

/**
 * WCAG 2.x relative luminance offset for contrast ratio.
 */
export const WCAG_LUMINANCE_OFFSET = 0.05

/**
 * ITU-R BT.709 red coefficient for relative luminance.
 */
export const LUMINANCE_RED_COEFFICIENT = 0.2126

/**
 * ITU-R BT.709 green coefficient for relative luminance.
 */
export const LUMINANCE_GREEN_COEFFICIENT = 0.7152

/**
 * ITU-R BT.709 blue coefficient for relative luminance.
 */
export const LUMINANCE_BLUE_COEFFICIENT = 0.0722

/**
 * Человекочитаемые метки для поддерживаемых локалей.
 */
export const LOCALE_LABELS: Readonly<Record<SupportedLocale, string>> = {
    en: "English",
    ru: "Русский",
}

/**
 * Дата для preview форматирования в секции выбора языка.
 */
export const LOCALE_DATE_PREVIEW = new Date("2026-03-09T14:30:00")

/**
 * Число для preview форматирования в секции выбора языка.
 */
export const LOCALE_NUMBER_PREVIEW = 1234567.89
