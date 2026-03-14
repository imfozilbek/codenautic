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
