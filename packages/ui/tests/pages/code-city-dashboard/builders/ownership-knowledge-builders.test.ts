import { describe, expect, it } from "vitest"

import {
    buildOwnershipOverlayEntries,
    buildOwnershipFileColorById,
    buildBusFactorOverlayEntries,
    buildBusFactorPackageColorByName,
    buildContributorGraphNodes,
    buildContributorGraphEdges,
    buildKnowledgeSiloPanelEntries,
} from "@/pages/code-city-dashboard/builders/ownership-knowledge-builders"
import type { ICodeCityTreemapFileDescriptor } from "@/components/graphs/codecity-treemap"

const testFiles: ICodeCityTreemapFileDescriptor[] = [
    { id: "f1", path: "src/domain/review.ts", loc: 200, complexity: 15, churn: 5 },
    { id: "f2", path: "src/infra/db.ts", loc: 150, complexity: 10, churn: 2 },
]

const testContributors = [
    { ownerId: "alice", ownerName: "Alice", commitCount: 50, color: "#ff0000" },
    { ownerId: "bob", ownerName: "Bob", commitCount: 30, color: "#00ff00" },
]

const testOwnership = [
    { fileId: "f1", ownerId: "alice" },
    { fileId: "f2", ownerId: "bob" },
]

describe("buildOwnershipOverlayEntries", (): void => {
    it("when given files and ownership, then returns owner entries", (): void => {
        const entries = buildOwnershipOverlayEntries(testFiles, testContributors, testOwnership)

        expect(entries.length).toBeGreaterThan(0)
    })

    it("when ownership references missing files, then filters them out", (): void => {
        const entries = buildOwnershipOverlayEntries(testFiles, testContributors, [
            { fileId: "nonexistent", ownerId: "alice" },
        ])

        expect(entries).toHaveLength(0)
    })

    it("when given empty inputs, then returns empty array", (): void => {
        expect(buildOwnershipOverlayEntries([], [], [])).toHaveLength(0)
    })
})

describe("buildOwnershipFileColorById", (): void => {
    it("when enabled with entries, then returns color map", (): void => {
        const entries = buildOwnershipOverlayEntries(testFiles, testContributors, testOwnership)

        const colorMap = buildOwnershipFileColorById(entries, true)

        expect(colorMap).toBeDefined()
    })

    it("when disabled, then returns undefined", (): void => {
        const entries = buildOwnershipOverlayEntries(testFiles, testContributors, testOwnership)

        expect(buildOwnershipFileColorById(entries, false)).toBeUndefined()
    })

    it("when entries are empty, then returns undefined", (): void => {
        expect(buildOwnershipFileColorById([], true)).toBeUndefined()
    })
})

describe("buildBusFactorOverlayEntries", (): void => {
    it("when given files and ownership, then returns district entries", (): void => {
        const entries = buildBusFactorOverlayEntries(testFiles, testOwnership)

        expect(entries.length).toBeGreaterThan(0)
    })

    it("when given entries, then sorts by bus factor ascending", (): void => {
        const entries = buildBusFactorOverlayEntries(testFiles, testOwnership)

        for (let i = 0; i < entries.length - 1; i += 1) {
            const current = entries[i]
            const next = entries[i + 1]
            if (current !== undefined && next !== undefined) {
                expect(current.busFactor).toBeLessThanOrEqual(next.busFactor)
            }
        }
    })

    it("when given empty inputs, then returns empty array", (): void => {
        expect(buildBusFactorOverlayEntries([], [])).toHaveLength(0)
    })
})

describe("buildBusFactorPackageColorByName", (): void => {
    it("when given entries, then returns color map", (): void => {
        const entries = buildBusFactorOverlayEntries(testFiles, testOwnership)
        const colorMap = buildBusFactorPackageColorByName(entries)

        expect(colorMap).toBeDefined()
    })

    it("when given empty entries, then returns undefined", (): void => {
        expect(buildBusFactorPackageColorByName([])).toBeUndefined()
    })
})

describe("buildContributorGraphNodes", (): void => {
    it("when given contributors, then returns graph nodes", (): void => {
        const nodes = buildContributorGraphNodes(testContributors)

        expect(nodes).toHaveLength(2)
        expect(nodes[0]?.label).toBe("Alice")
        expect(nodes[0]?.commitCount).toBe(50)
    })

    it("when given empty contributors, then returns empty array", (): void => {
        expect(buildContributorGraphNodes([])).toHaveLength(0)
    })
})

describe("buildContributorGraphEdges", (): void => {
    it("when given collaborations, then returns graph edges", (): void => {
        const collaborations = [{ sourceOwnerId: "alice", targetOwnerId: "bob", coAuthorCount: 5 }]

        const edges = buildContributorGraphEdges(collaborations)

        expect(edges).toHaveLength(1)
        expect(edges[0]?.coAuthorCount).toBe(5)
    })

    it("when given empty collaborations, then returns empty array", (): void => {
        expect(buildContributorGraphEdges([])).toHaveLength(0)
    })
})

describe("buildKnowledgeSiloPanelEntries", (): void => {
    it("when given files and ownership, then returns silo entries", (): void => {
        const entries = buildKnowledgeSiloPanelEntries(testFiles, testOwnership)

        expect(entries.length).toBeGreaterThan(0)
    })

    it("when given entries, then sorts by riskScore descending", (): void => {
        const entries = buildKnowledgeSiloPanelEntries(testFiles, testOwnership)

        for (let i = 0; i < entries.length - 1; i += 1) {
            const current = entries[i]
            const next = entries[i + 1]
            if (current !== undefined && next !== undefined) {
                expect(current.riskScore).toBeGreaterThanOrEqual(next.riskScore)
            }
        }
    })

    it("when given empty inputs, then returns empty array", (): void => {
        expect(buildKnowledgeSiloPanelEntries([], [])).toHaveLength(0)
    })
})
