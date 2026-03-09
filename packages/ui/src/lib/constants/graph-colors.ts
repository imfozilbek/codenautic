/**
 * Семантическая палитра для SVG-экспорта графов и chart-визуализаций.
 * Группирует цвета по домену: knowledge map, graph export, forecast, bus factor, report.
 */
export const GRAPH_EXPORT_PALETTE = {
    /** Цвета SVG-экспорта knowledge map snapshot. */
    knowledgeMap: {
        background: "#020617",
        sectionFill: "#0f172a",
        sectionStroke: "#1e293b",
        headerTitle: "#f8fafc",
        subtitle: "#94a3b8",
        sectionTitle: "#e2e8f0",
        metadataText: "#cbd5e1",
        fallbackColor: "#94a3b8",
    },
    /** Цвета SVG-экспорта graph layout (узлы + рёбра). */
    graphLayout: {
        background: "#020617",
        emptyBackground: "#0f172a",
        emptyText: "#f8fafc",
        titleText: "#e2e8f0",
        nodeFill: "#111827",
        nodeStroke: "#38bdf8",
        nodeLabel: "#e2e8f0",
        edgeStroke: "#22c55e",
        edgeLabel: "#94a3b8",
    },
    /** Цвета trend forecast chart. */
    forecast: {
        zoneFill: "#e2e8f0",
        confidenceFill: "#67e8f9",
        historicalStroke: "#0f172a",
        lineStroke: "#0891b2",
    },
    /** Палитра серий bus factor trend chart. */
    busFactor: {
        seriesColors: ["#0284c7", "#7c3aed", "#059669", "#d97706", "#dc2626"] as const,
    },
    /** Цвет акцента по умолчанию для report template branding. */
    report: {
        defaultAccentColor: "#2563eb",
    },
} as const

/**
 * Возвращает текущую палитру SVG-экспорта.
 * На данном этапе возвращает статические значения.
 * В будущем — theme-aware resolver через CSS custom properties.
 *
 * @returns Полная палитра для SVG-генератора.
 */
export function resolveGraphExportPalette(): typeof GRAPH_EXPORT_PALETTE {
    return GRAPH_EXPORT_PALETTE
}

/* ── Обратная совместимость: именованные re-exports ── */

/** @deprecated Используй `GRAPH_EXPORT_PALETTE.knowledgeMap.background`. */
export const KNOWLEDGE_MAP_BACKGROUND = GRAPH_EXPORT_PALETTE.knowledgeMap.background
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.knowledgeMap.sectionFill`. */
export const KNOWLEDGE_MAP_SECTION_FILL = GRAPH_EXPORT_PALETTE.knowledgeMap.sectionFill
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.knowledgeMap.sectionStroke`. */
export const KNOWLEDGE_MAP_SECTION_STROKE = GRAPH_EXPORT_PALETTE.knowledgeMap.sectionStroke
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.knowledgeMap.headerTitle`. */
export const KNOWLEDGE_MAP_HEADER_TITLE = GRAPH_EXPORT_PALETTE.knowledgeMap.headerTitle
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.knowledgeMap.subtitle`. */
export const KNOWLEDGE_MAP_SUBTITLE = GRAPH_EXPORT_PALETTE.knowledgeMap.subtitle
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.knowledgeMap.sectionTitle`. */
export const KNOWLEDGE_MAP_SECTION_TITLE = GRAPH_EXPORT_PALETTE.knowledgeMap.sectionTitle
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.knowledgeMap.metadataText`. */
export const KNOWLEDGE_MAP_METADATA_TEXT = GRAPH_EXPORT_PALETTE.knowledgeMap.metadataText
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.knowledgeMap.fallbackColor`. */
export const KNOWLEDGE_MAP_FALLBACK_COLOR = GRAPH_EXPORT_PALETTE.knowledgeMap.fallbackColor
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.graphLayout.background`. */
export const GRAPH_EXPORT_BACKGROUND = GRAPH_EXPORT_PALETTE.graphLayout.background
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.graphLayout.emptyBackground`. */
export const GRAPH_EXPORT_EMPTY_BACKGROUND = GRAPH_EXPORT_PALETTE.graphLayout.emptyBackground
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.graphLayout.emptyText`. */
export const GRAPH_EXPORT_EMPTY_TEXT = GRAPH_EXPORT_PALETTE.graphLayout.emptyText
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.graphLayout.titleText`. */
export const GRAPH_EXPORT_TITLE_TEXT = GRAPH_EXPORT_PALETTE.graphLayout.titleText
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.graphLayout.nodeFill`. */
export const GRAPH_EXPORT_NODE_FILL = GRAPH_EXPORT_PALETTE.graphLayout.nodeFill
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.graphLayout.nodeStroke`. */
export const GRAPH_EXPORT_NODE_STROKE = GRAPH_EXPORT_PALETTE.graphLayout.nodeStroke
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.graphLayout.nodeLabel`. */
export const GRAPH_EXPORT_NODE_LABEL = GRAPH_EXPORT_PALETTE.graphLayout.nodeLabel
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.graphLayout.edgeStroke`. */
export const GRAPH_EXPORT_EDGE_STROKE = GRAPH_EXPORT_PALETTE.graphLayout.edgeStroke
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.graphLayout.edgeLabel`. */
export const GRAPH_EXPORT_EDGE_LABEL = GRAPH_EXPORT_PALETTE.graphLayout.edgeLabel
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.forecast.zoneFill`. */
export const FORECAST_ZONE_FILL = GRAPH_EXPORT_PALETTE.forecast.zoneFill
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.forecast.confidenceFill`. */
export const FORECAST_CONFIDENCE_FILL = GRAPH_EXPORT_PALETTE.forecast.confidenceFill
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.forecast.historicalStroke`. */
export const FORECAST_HISTORICAL_STROKE = GRAPH_EXPORT_PALETTE.forecast.historicalStroke
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.forecast.lineStroke`. */
export const FORECAST_LINE_STROKE = GRAPH_EXPORT_PALETTE.forecast.lineStroke
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.busFactor.seriesColors`. */
export const BUS_FACTOR_SERIES_COLORS = GRAPH_EXPORT_PALETTE.busFactor.seriesColors
/** @deprecated Используй `GRAPH_EXPORT_PALETTE.report.defaultAccentColor`. */
export const REPORT_DEFAULT_ACCENT_COLOR = GRAPH_EXPORT_PALETTE.report.defaultAccentColor
