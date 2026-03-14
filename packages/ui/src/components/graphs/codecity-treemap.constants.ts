/**
 * Метрики для цветовой индикации CodeCity treemap.
 */
export const CODE_CITY_METRICS = ["complexity", "coverage", "churn"] as const

/**
 * Временные диапазоны для heatmap по bug introductions.
 */
export const CODE_CITY_BUG_HEAT_RANGES = ["7d", "30d", "90d"] as const

/**
 * Уровни CCR-влияния для файлов.
 */
export const CODE_CITY_IMPACT_LEVELS = ["changed", "impacted", "ripple"] as const

/**
 * Тип метрики для цветовой индикации.
 */
export type ICodeCityTreemapMetric = (typeof CODE_CITY_METRICS)[number]

/**
 * Тип временного диапазона bug heat.
 */
export type ICodeCityBugHeatRange = (typeof CODE_CITY_BUG_HEAT_RANGES)[number]

/**
 * Тип уровня CCR-влияния.
 */
export type ICodeCityTreemapImpactLevel = (typeof CODE_CITY_IMPACT_LEVELS)[number]

/**
 * Маппинг метрик на ключи локализации.
 */
export const CODE_CITY_METRIC_LABEL_KEYS: Record<ICodeCityTreemapMetric, string> = {
    complexity: "code-city:treemap.metrics.complexity",
    coverage: "code-city:treemap.metrics.coverage",
    churn: "code-city:treemap.metrics.churn",
}

/**
 * Маппинг временных диапазонов bug heat на ключи локализации.
 */
export const CODE_CITY_BUG_HEAT_RANGE_LABEL_KEYS: Record<ICodeCityBugHeatRange, string> = {
    "7d": "code-city:treemap.bugHeatRanges.7d",
    "30d": "code-city:treemap.bugHeatRanges.30d",
    "90d": "code-city:treemap.bugHeatRanges.90d",
}

/**
 * Маппинг уровней влияния на ключи локализации.
 */
export const CODE_CITY_IMPACT_LABEL_KEYS: Record<ICodeCityTreemapImpactLevel, string> = {
    changed: "code-city:treemap.impactLabels.changed",
    impacted: "code-city:treemap.impactLabels.impacted",
    ripple: "code-city:treemap.impactLabels.ripple",
}

/**
 * Числовые приоритеты уровней влияния для разрешения конфликтов.
 */
export const CODE_CITY_IMPACT_PRIORITIES: Record<ICodeCityTreemapImpactLevel, number> = {
    changed: 3,
    impacted: 2,
    ripple: 1,
}

/**
 * Цвета для визуальной индикации уровней CCR-влияния.
 */
export const CODE_CITY_IMPACT_COLOR: Record<ICodeCityTreemapImpactLevel, string> = {
    changed: "hsl(348, 83%, 58%)",
    impacted: "hsl(35, 96%, 59%)",
    ripple: "hsl(212, 86%, 57%)",
}

/**
 * Цвет маркера сравнения для файлов с увеличением LOC.
 */
export const CODE_CITY_COMPARISON_DELTA_COLOR_GROWTH = "hsl(4, 82%, 58%)"

/**
 * Цвет маркера сравнения для файлов с уменьшением LOC.
 */
export const CODE_CITY_COMPARISON_DELTA_COLOR_SHRINK = "hsl(142, 69%, 47%)"

/**
 * Высота по умолчанию для контейнера treemap.
 */
export const DEFAULT_HEIGHT = "420px"

/**
 * Метрика по умолчанию для цветовой кодировки.
 */
export const DEFAULT_METRIC: ICodeCityTreemapMetric = "complexity"

/**
 * Идентификатор DOM-элемента селектора метрик.
 */
export const DEFAULT_METRIC_SELECTOR_ID = "codecity-metric-selector"

/**
 * Идентификатор DOM-элемента селектора bug heat диапазона.
 */
export const DEFAULT_BUG_HEAT_SELECTOR_ID = "codecity-bug-heat-selector"

/**
 * Флаг по умолчанию для отображения temporal coupling overlay.
 */
export const DEFAULT_TEMPORAL_COUPLING_OVERLAY_ENABLED = true

/**
 * Временной диапазон bug heat по умолчанию.
 */
export const DEFAULT_BUG_HEAT_RANGE: ICodeCityBugHeatRange = "30d"

/**
 * Высота маркера сравнения LOC в пикселях.
 */
export const CODE_CITY_COMPARISON_MARKER_HEIGHT = 4

/**
 * Максимальное число файлов для keyboard tab stops.
 */
export const MAX_KEYBOARD_FILE_TAB_STOPS = 40
