/**
 * UI-уровневые константы для chart-контейнеров (Tailwind утилиты и CSS-переменные).
 */

/**
 * Предустановленные высоты для chart-контейнеров.
 */
export const CHART_HEIGHT = {
    xs: "h-48",
    sm: "h-56",
    md: "h-60",
    lg: "h-64",
    xl: "h-72",
} as const

/**
 * Порог устаревания данных в минутах (для stale indicator).
 */
export const CHART_STALE_THRESHOLD_MINUTES = 45

/**
 * Множитель для расчёта violation score.
 */
export const VIOLATION_SCORE_MULTIPLIER = 5

/**
 * Fallback цвет для chart элементов через CSS-переменную.
 */
export const CHART_FALLBACK_COLOR = "var(--chart-primary)"

/**
 * @deprecated Перенесён в `chart-recharts-defaults.ts`. Используй импорт оттуда.
 */
export { CHART_STROKE_WIDTH } from "./chart-recharts-defaults"

/**
 * @deprecated Перенесён в `chart-recharts-defaults.ts`. Используй импорт оттуда.
 */
export { CHART_GRID_DASH } from "./chart-recharts-defaults"

/**
 * @deprecated Перенесён в `chart-recharts-defaults.ts`. Используй импорт оттуда.
 */
export { CHART_FILL_OPACITY } from "./chart-recharts-defaults"

/**
 * @deprecated Перенесён в `chart-recharts-defaults.ts`. Используй импорт оттуда.
 */
export { PIE_OUTER_RADIUS } from "./chart-recharts-defaults"
