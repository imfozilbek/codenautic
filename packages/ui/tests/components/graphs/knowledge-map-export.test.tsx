import { describe, expect, it, vi } from "vitest"

import {
    buildKnowledgeMapExportFileName,
    buildKnowledgeMapExportSvg,
    exportKnowledgeMapAsSvg,
    type IKnowledgeMapExportModel,
} from "@/components/graphs/knowledge-map-export"
import {
    KNOWLEDGE_MAP_BACKGROUND,
    KNOWLEDGE_MAP_FALLBACK_COLOR,
    KNOWLEDGE_MAP_HEADER_TITLE,
    KNOWLEDGE_MAP_METADATA_TEXT,
    KNOWLEDGE_MAP_SECTION_FILL,
    KNOWLEDGE_MAP_SECTION_STROKE,
    KNOWLEDGE_MAP_SECTION_TITLE,
    KNOWLEDGE_MAP_SUBTITLE,
} from "@/lib/constants/graph-colors"

function createTestModel(
    overrides: Partial<IKnowledgeMapExportModel> = {},
): IKnowledgeMapExportModel {
    return {
        metadata: {
            repositoryId: "repo-1",
            repositoryLabel: "My Repo",
            metricLabel: "complexity",
            generatedAt: "2026-01-01T00:00:00Z",
            totalFiles: 42,
            totalContributors: 5,
        },
        owners: [
            { ownerName: "Alice", color: "#ff0000", fileCount: 12 },
            { ownerName: "Bob", color: "#00ff00", fileCount: 8 },
        ],
        districts: [
            { districtLabel: "src/api", busFactor: 1, riskLabel: "critical" },
            { districtLabel: "src/core", busFactor: 3, riskLabel: "low" },
        ],
        silos: [{ siloLabel: "Auth Module", riskScore: 85, contributorCount: 1, fileCount: 15 }],
        ...overrides,
    }
}

describe("buildKnowledgeMapExportFileName", (): void => {
    it("when repositoryLabel is normal text, then returns kebab-case with knowledge-map suffix", (): void => {
        expect(buildKnowledgeMapExportFileName("My Repo")).toBe("my-repo-knowledge-map")
    })

    it("when repositoryLabel is empty, then returns default with suffix", (): void => {
        expect(buildKnowledgeMapExportFileName("")).toBe("graph-export-knowledge-map")
    })

    it("when repositoryLabel has special characters, then normalizes and appends suffix", (): void => {
        expect(buildKnowledgeMapExportFileName("Repo!@#Test")).toBe("repo-test-knowledge-map")
    })

    it("when repositoryLabel has only spaces, then returns default with suffix", (): void => {
        expect(buildKnowledgeMapExportFileName("   ")).toBe("graph-export-knowledge-map")
    })
})

describe("buildKnowledgeMapExportSvg", (): void => {
    it("when model is provided, then produces valid SVG with header title", (): void => {
        const model = createTestModel()
        const svg = buildKnowledgeMapExportSvg(model)
        expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>')
        expect(svg).toContain(`fill="${KNOWLEDGE_MAP_BACKGROUND}"`)
        expect(svg).toContain(`fill="${KNOWLEDGE_MAP_HEADER_TITLE}"`)
        expect(svg).toContain("Knowledge Map Snapshot")
        expect(svg).toContain("My Repo")
    })

    it("when model is provided, then includes subtitle", (): void => {
        const model = createTestModel()
        const svg = buildKnowledgeMapExportSvg(model)
        expect(svg).toContain(`fill="${KNOWLEDGE_MAP_SUBTITLE}"`)
        expect(svg).toContain("Exported for architecture documentation")
    })

    it("when model has metadata, then renders all metadata rows", (): void => {
        const model = createTestModel()
        const svg = buildKnowledgeMapExportSvg(model)
        expect(svg).toContain("Repository ID: repo-1")
        expect(svg).toContain("Metric: complexity")
        expect(svg).toContain("Generated at: 2026-01-01T00:00:00Z")
        expect(svg).toContain("Total files: 42")
        expect(svg).toContain("Contributors: 5")
        expect(svg).toContain(`fill="${KNOWLEDGE_MAP_METADATA_TEXT}"`)
    })

    it("when model has owners, then renders ownership legend entries", (): void => {
        const model = createTestModel()
        const svg = buildKnowledgeMapExportSvg(model)
        expect(svg).toContain("Alice")
        expect(svg).toContain("files 12")
        expect(svg).toContain("Bob")
        expect(svg).toContain("files 8")
        expect(svg).toContain('fill="#ff0000"')
        expect(svg).toContain('fill="#00ff00"')
    })

    it("when owner color is invalid, then uses fallback color", (): void => {
        const model = createTestModel({
            owners: [{ ownerName: "Charlie", color: "not-a-color", fileCount: 5 }],
        })
        const svg = buildKnowledgeMapExportSvg(model)
        expect(svg).toContain(`fill="${KNOWLEDGE_MAP_FALLBACK_COLOR}"`)
    })

    it("when owner color is valid 3-char hex, then uses it directly", (): void => {
        const model = createTestModel({
            owners: [{ ownerName: "Dan", color: "#f00", fileCount: 3 }],
        })
        const svg = buildKnowledgeMapExportSvg(model)
        expect(svg).toContain('fill="#f00"')
    })

    it("when model has districts, then renders bus factor risk entries", (): void => {
        const model = createTestModel()
        const svg = buildKnowledgeMapExportSvg(model)
        expect(svg).toContain("src/api")
        expect(svg).toContain("bus factor 1")
        expect(svg).toContain("critical")
        expect(svg).toContain("src/core")
        expect(svg).toContain("bus factor 3")
        expect(svg).toContain("low")
    })

    it("when model has silos, then renders silo summary entries", (): void => {
        const model = createTestModel()
        const svg = buildKnowledgeMapExportSvg(model)
        expect(svg).toContain("Auth Module")
        expect(svg).toContain("risk 85")
        expect(svg).toContain("contributors 1")
        expect(svg).toContain("files 15")
    })

    it("when model has more than 8 owners, then limits legend entries to first 8", (): void => {
        const manyOwners = Array.from(
            { length: 12 },
            (
                _value,
                index,
            ): {
                ownerName: string
                color: string
                fileCount: number
            } => ({
                ownerName: `Owner${String(index)}`,
                color: "#aabbcc",
                fileCount: index + 1,
            }),
        )
        const model = createTestModel({ owners: manyOwners })
        const svg = buildKnowledgeMapExportSvg(model)
        const ownerLegendPattern = /Owner\d+ • files \d+/g
        const legendMatches = svg.match(ownerLegendPattern) ?? []
        expect(legendMatches).toHaveLength(8)
        expect(legendMatches[0]).toContain("Owner0")
        expect(legendMatches[7]).toContain("Owner7")
    })

    it("when model has section containers, then renders section fill and stroke", (): void => {
        const model = createTestModel()
        const svg = buildKnowledgeMapExportSvg(model)
        expect(svg).toContain(`fill="${KNOWLEDGE_MAP_SECTION_FILL}"`)
        expect(svg).toContain(`stroke="${KNOWLEDGE_MAP_SECTION_STROKE}"`)
        expect(svg).toContain(`fill="${KNOWLEDGE_MAP_SECTION_TITLE}"`)
    })

    it("when metadata contains special characters, then escapes them in SVG", (): void => {
        const model = createTestModel({
            metadata: {
                repositoryId: "repo-<test>",
                repositoryLabel: "Repo & Sons",
                metricLabel: '"quoted"',
                generatedAt: "2026-01-01",
                totalFiles: 10,
                totalContributors: 2,
            },
        })
        const svg = buildKnowledgeMapExportSvg(model)
        expect(svg).toContain("Repo &amp; Sons")
        expect(svg).toContain("repo-&lt;test&gt;")
    })

    it("when model has metadata, then includes JSON metadata element", (): void => {
        const model = createTestModel()
        const svg = buildKnowledgeMapExportSvg(model)
        expect(svg).toContain("<metadata>")
        expect(svg).toContain("</metadata>")
    })

    it("when owners list is empty, then does not render owner legend entries", (): void => {
        const model = createTestModel({ owners: [] })
        const svg = buildKnowledgeMapExportSvg(model)
        expect(svg).toContain("Legend — Ownership")
        expect(svg).not.toContain("files 12")
    })

    it("when districts list is empty, then does not render district risk entries", (): void => {
        const model = createTestModel({ districts: [] })
        const svg = buildKnowledgeMapExportSvg(model)
        expect(svg).toContain("Legend — Bus Factor Risk")
        expect(svg).not.toContain("bus factor")
    })

    it("when silos list is empty, then does not render silo entries", (): void => {
        const model = createTestModel({ silos: [] })
        const svg = buildKnowledgeMapExportSvg(model)
        expect(svg).toContain("Knowledge Silos")
        expect(svg).not.toContain("risk 85")
    })
})

describe("exportKnowledgeMapAsSvg", (): void => {
    it("when called, then triggers download with SVG blob", (): void => {
        const clickSpy = vi.fn()
        const removeSpy = vi.fn()
        const revokeObjectURLSpy = vi
            .spyOn(URL, "revokeObjectURL")
            .mockImplementation((): void => {})
        const createObjectURLSpy = vi
            .spyOn(URL, "createObjectURL")
            .mockReturnValue("blob:km-test-url")
        const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue({
            set href(_value: string) {
                /* noop */
            },
            set download(_value: string) {
                /* noop */
            },
            click: clickSpy,
            remove: removeSpy,
        } as unknown as HTMLAnchorElement)
        vi.spyOn(document.body, "append").mockImplementation((): void => {})

        const model = createTestModel()
        exportKnowledgeMapAsSvg(model)

        expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
        expect(clickSpy).toHaveBeenCalledTimes(1)
        expect(removeSpy).toHaveBeenCalledTimes(1)
        expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1)

        createObjectURLSpy.mockRestore()
        createElementSpy.mockRestore()
        revokeObjectURLSpy.mockRestore()
    })
})
