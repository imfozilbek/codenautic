/**
 * Семантическая палитра для CodeCity 3D-визуализации.
 * Группирует цвета по домену: сцена, coverage, causal-дуги, impact, bug emission.
 */
export const CODECITY_PALETTE = {
    /** Цвета 3D-сцены: фон, сетка, районы, навигация. */
    scene: {
        background: "#020617",
        gridLine: "#334155",
        gridDivision: "#1e293b",
        districtFloor: "#0f172a",
        districtLabel: "#94a3b8",
        navigationTrail: "#e2e8f0",
        breadcrumbSphere: "#f8fafc",
        breadcrumbEmissive: "#bae6fd",
    },
    /** Цвета зданий по уровню test coverage. */
    coverage: {
        high: "#22c55e",
        medium: "#14b8a6",
        low: "#fb923c",
        critical: "#ef4444",
        undefined: "#facc15",
    },
    /** Цвета causal-дуг по типу coupling-связи. */
    causal: {
        dependency: "#fb923c",
        ownership: "#22c55e",
        default: "#38bdf8",
    },
    /** Цвета impact analysis для зданий. */
    impact: {
        changed: "#fb7185",
        impacted: "#22d3ee",
        ripple: "#38bdf8",
        neutral: "#0f172a",
    },
    /** Цвета bug emission particles по severity. */
    bug: {
        high: "#ef4444",
        medium: "#f97316",
        low: "#facc15",
    },
} as const

/**
 * Возвращает текущую CodeCity палитру.
 * На данном этапе возвращает статические значения.
 * В будущем — theme-aware resolver через CSS custom properties.
 *
 * @returns Полная палитра CodeCity для Three.js.
 */
export function resolveCodeCityPalette(): typeof CODECITY_PALETTE {
    return CODECITY_PALETTE
}

/* ── Обратная совместимость: именованные re-exports ── */

/** @deprecated Используй `CODECITY_PALETTE.causal.dependency`. */
export const CAUSAL_ARC_COLOR_DEPENDENCY = CODECITY_PALETTE.causal.dependency
/** @deprecated Используй `CODECITY_PALETTE.causal.ownership`. */
export const CAUSAL_ARC_COLOR_OWNERSHIP = CODECITY_PALETTE.causal.ownership
/** @deprecated Используй `CODECITY_PALETTE.causal.default`. */
export const CAUSAL_ARC_COLOR_DEFAULT = CODECITY_PALETTE.causal.default
/** @deprecated Используй `CODECITY_PALETTE.coverage.undefined`. */
export const BUILDING_COLOR_UNDEFINED_COVERAGE = CODECITY_PALETTE.coverage.undefined
/** @deprecated Используй `CODECITY_PALETTE.coverage.high`. */
export const BUILDING_COLOR_HIGH_COVERAGE = CODECITY_PALETTE.coverage.high
/** @deprecated Используй `CODECITY_PALETTE.coverage.medium`. */
export const BUILDING_COLOR_MEDIUM_COVERAGE = CODECITY_PALETTE.coverage.medium
/** @deprecated Используй `CODECITY_PALETTE.coverage.low`. */
export const BUILDING_COLOR_LOW_COVERAGE = CODECITY_PALETTE.coverage.low
/** @deprecated Используй `CODECITY_PALETTE.coverage.critical`. */
export const BUILDING_COLOR_CRITICAL_COVERAGE = CODECITY_PALETTE.coverage.critical
/** @deprecated Используй `CODECITY_PALETTE.bug.high`. */
export const BUG_EMISSION_COLOR_HIGH = CODECITY_PALETTE.bug.high
/** @deprecated Используй `CODECITY_PALETTE.bug.medium`. */
export const BUG_EMISSION_COLOR_MEDIUM = CODECITY_PALETTE.bug.medium
/** @deprecated Используй `CODECITY_PALETTE.bug.low`. */
export const BUG_EMISSION_COLOR_LOW = CODECITY_PALETTE.bug.low
/** @deprecated Используй `CODECITY_PALETTE.impact.changed`. */
export const IMPACT_EMISSIVE_CHANGED = CODECITY_PALETTE.impact.changed
/** @deprecated Используй `CODECITY_PALETTE.impact.impacted`. */
export const IMPACT_EMISSIVE_IMPACTED = CODECITY_PALETTE.impact.impacted
/** @deprecated Используй `CODECITY_PALETTE.impact.ripple`. */
export const IMPACT_EMISSIVE_RIPPLE = CODECITY_PALETTE.impact.ripple
/** @deprecated Используй `CODECITY_PALETTE.impact.neutral`. */
export const IMPACT_EMISSIVE_NEUTRAL = CODECITY_PALETTE.impact.neutral
/** @deprecated Используй `CODECITY_PALETTE.scene.background`. */
export const SCENE_BACKGROUND = CODECITY_PALETTE.scene.background
/** @deprecated Используй `CODECITY_PALETTE.scene.gridLine`. */
export const SCENE_GRID_LINE = CODECITY_PALETTE.scene.gridLine
/** @deprecated Используй `CODECITY_PALETTE.scene.gridDivision`. */
export const SCENE_GRID_DIVISION = CODECITY_PALETTE.scene.gridDivision
/** @deprecated Используй `CODECITY_PALETTE.scene.districtFloor`. */
export const SCENE_DISTRICT_FLOOR = CODECITY_PALETTE.scene.districtFloor
/** @deprecated Используй `CODECITY_PALETTE.scene.districtLabel`. */
export const SCENE_DISTRICT_LABEL = CODECITY_PALETTE.scene.districtLabel
/** @deprecated Используй `CODECITY_PALETTE.scene.navigationTrail`. */
export const SCENE_NAVIGATION_TRAIL = CODECITY_PALETTE.scene.navigationTrail
/** @deprecated Используй `CODECITY_PALETTE.scene.breadcrumbSphere`. */
export const SCENE_BREADCRUMB_SPHERE = CODECITY_PALETTE.scene.breadcrumbSphere
/** @deprecated Используй `CODECITY_PALETTE.scene.breadcrumbEmissive`. */
export const SCENE_BREADCRUMB_EMISSIVE = CODECITY_PALETTE.scene.breadcrumbEmissive
