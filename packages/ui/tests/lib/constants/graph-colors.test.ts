import { describe, expect, it } from "vitest"

import {
    GRAPH_EXPORT_PALETTE,
    resolveGraphExportPalette,
    KNOWLEDGE_MAP_BACKGROUND,
    GRAPH_EXPORT_NODE_STROKE,
    BUS_FACTOR_SERIES_COLORS,
    REPORT_DEFAULT_ACCENT_COLOR,
} from "@/lib/constants/graph-colors"

describe("GRAPH_EXPORT_PALETTE", (): void => {
    it("when accessed, then contains all domain groups", (): void => {
        expect(GRAPH_EXPORT_PALETTE.knowledgeMap).toBeDefined()
        expect(GRAPH_EXPORT_PALETTE.graphLayout).toBeDefined()
        expect(GRAPH_EXPORT_PALETTE.forecast).toBeDefined()
        expect(GRAPH_EXPORT_PALETTE.busFactor).toBeDefined()
        expect(GRAPH_EXPORT_PALETTE.report).toBeDefined()
    })

    it("when knowledgeMap group is accessed, then all values are HEX", (): void => {
        for (const value of Object.values(GRAPH_EXPORT_PALETTE.knowledgeMap)) {
            expect(value).toMatch(/^#[0-9a-f]{6}$/i)
        }
    })

    it("when busFactor series is accessed, then contains 5 colors", (): void => {
        expect(GRAPH_EXPORT_PALETTE.busFactor.seriesColors).toHaveLength(5)
        for (const color of GRAPH_EXPORT_PALETTE.busFactor.seriesColors) {
            expect(color).toMatch(/^#[0-9a-f]{6}$/i)
        }
    })

    it("when resolveGraphExportPalette is called, then returns same palette", (): void => {
        const resolved = resolveGraphExportPalette()
        expect(resolved).toBe(GRAPH_EXPORT_PALETTE)
    })
})

describe("deprecated re-exports", (): void => {
    it("when legacy constants are imported, then match palette values", (): void => {
        expect(KNOWLEDGE_MAP_BACKGROUND).toBe(GRAPH_EXPORT_PALETTE.knowledgeMap.background)
        expect(GRAPH_EXPORT_NODE_STROKE).toBe(GRAPH_EXPORT_PALETTE.graphLayout.nodeStroke)
        expect(BUS_FACTOR_SERIES_COLORS).toBe(GRAPH_EXPORT_PALETTE.busFactor.seriesColors)
        expect(REPORT_DEFAULT_ACCENT_COLOR).toBe(GRAPH_EXPORT_PALETTE.report.defaultAccentColor)
    })
})
