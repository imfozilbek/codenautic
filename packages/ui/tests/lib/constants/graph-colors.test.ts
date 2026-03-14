import { describe, expect, it } from "vitest"

import { GRAPH_EXPORT_PALETTE, resolveGraphExportPalette } from "@/lib/constants/graph-colors"

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

describe("palette property access", (): void => {
    it("when palette properties are accessed directly, then return correct values", (): void => {
        expect(GRAPH_EXPORT_PALETTE.knowledgeMap.background).toMatch(/^#[0-9a-f]{6}$/i)
        expect(GRAPH_EXPORT_PALETTE.graphLayout.nodeStroke).toMatch(/^#[0-9a-f]{6}$/i)
        expect(GRAPH_EXPORT_PALETTE.busFactor.seriesColors).toHaveLength(5)
        expect(GRAPH_EXPORT_PALETTE.report.defaultAccentColor).toMatch(/^#[0-9a-f]{6}$/i)
    })
})
