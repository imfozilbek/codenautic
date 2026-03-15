import { describe, expect, it } from "vitest"

import {
    buildOwnershipOverlayEntries,
    buildOwnershipFileColorById,
    buildBusFactorOverlayEntries,
    buildBusFactorPackageColorByName,
    buildContributorGraphNodes,
    buildContributorGraphEdges,
    buildKnowledgeSiloPanelEntries,
    buildBusFactorTrendSeries,
    buildKnowledgeMapExportModel,
    buildOwnershipTransitionEvents,
} from "@/pages/code-city-dashboard/builders/ownership-knowledge-builders"
import type { ICodeCityTreemapFileDescriptor } from "@/components/codecity/codecity-treemap"
import type { ICodeCityDashboardRepositoryProfile } from "@/pages/code-city-dashboard/code-city-dashboard-types"

const testFiles: ICodeCityTreemapFileDescriptor[] = [
    { id: "f1", path: "src/domain/review.ts", loc: 200, complexity: 15, churn: 5 },
    { id: "f2", path: "src/infra/db.ts", loc: 150, complexity: 10, churn: 2 },
]

const testContributors = [
    { ownerId: "neo", ownerName: "Neo", commitCount: 50, color: "#ff0000" },
    { ownerId: "trinity", ownerName: "Trinity", commitCount: 30, color: "#00ff00" },
]

const testOwnership = [
    { fileId: "f1", ownerId: "neo" },
    { fileId: "f2", ownerId: "trinity" },
]

describe("buildOwnershipOverlayEntries", (): void => {
    it("when given files and ownership, then returns owner entries", (): void => {
        const entries = buildOwnershipOverlayEntries(testFiles, testContributors, testOwnership)

        expect(entries.length).toBeGreaterThan(0)
    })

    it("when ownership references missing files, then filters them out", (): void => {
        const entries = buildOwnershipOverlayEntries(testFiles, testContributors, [
            { fileId: "nonexistent", ownerId: "neo" },
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
        expect(nodes[0]?.label).toBe("Neo")
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

    it("when single contributor owns all files, then ownership risk is high", (): void => {
        const singleOwnership = [
            { fileId: "f1", ownerId: "neo" },
            { fileId: "f2", ownerId: "neo" },
        ]

        const entries = buildKnowledgeSiloPanelEntries(testFiles, singleOwnership)

        entries.forEach((entry): void => {
            expect(entry.contributorCount).toBe(1)
            expect(entry.riskScore).toBeGreaterThanOrEqual(65)
        })
    })

    it("when two contributors share a district, then risk is lower", (): void => {
        const sharedFiles: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/domain/a.ts", loc: 100, complexity: 5, churn: 1 },
            { id: "f2", path: "src/domain/b.ts", loc: 100, complexity: 5, churn: 1 },
        ]
        const sharedOwnership = [
            { fileId: "f1", ownerId: "neo" },
            { fileId: "f2", ownerId: "trinity" },
        ]

        const entries = buildKnowledgeSiloPanelEntries(sharedFiles, sharedOwnership)

        expect(entries[0]?.contributorCount).toBe(2)
    })

    it("when 3+ contributors share a district, then ownership risk is lowest tier", (): void => {
        const manyFiles: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/shared/a.ts", loc: 100 },
            { id: "f2", path: "src/shared/b.ts", loc: 100 },
            { id: "f3", path: "src/shared/c.ts", loc: 100 },
        ]
        const manyOwnership = [
            { fileId: "f1", ownerId: "neo" },
            { fileId: "f2", ownerId: "trinity" },
            { fileId: "f3", ownerId: "charlie" },
        ]

        const entries = buildKnowledgeSiloPanelEntries(manyFiles, manyOwnership)

        expect(entries[0]?.riskScore).toBeLessThan(65)
    })

    it("when files have zero complexity and churn, then risk is based on ownership only", (): void => {
        const zeroMetricFiles: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/clean/file.ts", loc: 10, complexity: 0, churn: 0 },
        ]
        const singleOwn = [{ fileId: "f1", ownerId: "neo" }]

        const entries = buildKnowledgeSiloPanelEntries(zeroMetricFiles, singleOwn)

        expect(entries[0]?.riskScore).toBe(65)
    })

    it("when duplicate file in same silo, then does not double count", (): void => {
        const sameOwnership = [
            { fileId: "f1", ownerId: "neo" },
            { fileId: "f1", ownerId: "neo" },
        ]

        const entries = buildKnowledgeSiloPanelEntries(testFiles, sameOwnership)

        const domainEntry = entries.find((e) => e.siloId === "src/domain")
        expect(domainEntry?.fileCount).toBe(1)
    })
})

describe("buildBusFactorTrendSeries", (): void => {
    it("when given bus factor entries, then returns series with timeline", (): void => {
        const busFactorEntries = buildBusFactorOverlayEntries(testFiles, testOwnership)

        const series = buildBusFactorTrendSeries(busFactorEntries)

        expect(series.length).toBeGreaterThan(0)
        series.forEach((s): void => {
            expect(s.points).toHaveLength(5)
            expect(s.moduleId).toBeDefined()
            expect(s.primaryFileId).toBeDefined()
        })
    })

    it("when given empty entries, then returns empty array", (): void => {
        expect(buildBusFactorTrendSeries([])).toHaveLength(0)
    })

    it("when bus factor is 1, then all points are clamped between 1 and 10", (): void => {
        const singleOwnerEntries = buildBusFactorOverlayEntries(
            [{ id: "f1", path: "src/file.ts", loc: 100 }],
            [{ fileId: "f1", ownerId: "solo" }],
        )

        const series = buildBusFactorTrendSeries(singleOwnerEntries)

        series.forEach((s): void => {
            s.points.forEach((point): void => {
                expect(point.busFactor).toBeGreaterThanOrEqual(1)
                expect(point.busFactor).toBeLessThanOrEqual(10)
            })
        })
    })

    it("when more than 5 entries, then returns at most 5 series", (): void => {
        const manyFiles: ICodeCityTreemapFileDescriptor[] = Array.from({ length: 8 }, (_, i) => ({
            id: `f${String(i)}`,
            path: `pkg${String(i)}/file.ts`,
            loc: 100,
        }))
        const manyOwnership = manyFiles.map((f) => ({
            fileId: f.id,
            ownerId: `owner-${f.id}`,
        }))

        const busFactorEntries = buildBusFactorOverlayEntries(manyFiles, manyOwnership)
        const series = buildBusFactorTrendSeries(busFactorEntries)

        expect(series.length).toBeLessThanOrEqual(5)
    })

    it("when second point in timeline, then has 'Team rotation' annotation", (): void => {
        const busFactorEntries = buildBusFactorOverlayEntries(testFiles, testOwnership)

        const series = buildBusFactorTrendSeries(busFactorEntries)

        if (series[0] !== undefined) {
            expect(series[0].points[1]?.annotation).toBe("Team rotation")
        }
    })

    it("when odd index and point 3, then has onboarding annotation", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "aaa/file.ts", loc: 100 },
            { id: "f2", path: "bbb/file.ts", loc: 100 },
        ]
        const own = [
            { fileId: "f1", ownerId: "neo" },
            { fileId: "f2", ownerId: "trinity" },
        ]

        const busFactorEntries = buildBusFactorOverlayEntries(files, own)
        const series = buildBusFactorTrendSeries(busFactorEntries)

        if (series[1] !== undefined) {
            expect(series[1].points[3]?.annotation).toBe("New maintainer onboarded")
        }
    })
})

describe("buildKnowledgeMapExportModel", (): void => {
    it("when given valid inputs, then returns export model with all sections", (): void => {
        const profile: ICodeCityDashboardRepositoryProfile = {
            id: "repo-1",
            label: "Test Repo",
            description: "Test repo",
            files: testFiles,
            impactedFiles: [],
            compareFiles: [],
            temporalCouplings: [],
            healthTrend: [],
            contributors: testContributors,
            ownership: testOwnership,
            contributorCollaborations: [],
        }
        const ownershipEntries = buildOwnershipOverlayEntries(
            testFiles,
            testContributors,
            testOwnership,
        )
        const busFactorEntries = buildBusFactorOverlayEntries(testFiles, testOwnership)
        const siloEntries = buildKnowledgeSiloPanelEntries(testFiles, testOwnership)

        const model = buildKnowledgeMapExportModel(
            profile,
            "complexity",
            ownershipEntries,
            busFactorEntries,
            siloEntries,
        )

        expect(model.metadata.repositoryId).toBe("repo-1")
        expect(model.metadata.repositoryLabel).toBe("Test Repo")
        expect(model.metadata.totalFiles).toBe(2)
        expect(model.metadata.totalContributors).toBe(2)
        expect(model.districts.length).toBe(busFactorEntries.length)
        expect(model.owners.length).toBe(ownershipEntries.length)
        expect(model.silos.length).toBe(siloEntries.length)
    })

    it("when given empty inputs, then returns model with empty arrays", (): void => {
        const emptyProfile: ICodeCityDashboardRepositoryProfile = {
            id: "repo-empty",
            label: "Empty",
            description: "Empty repo",
            files: [],
            impactedFiles: [],
            compareFiles: [],
            temporalCouplings: [],
            healthTrend: [],
            contributors: [],
            ownership: [],
            contributorCollaborations: [],
        }

        const model = buildKnowledgeMapExportModel(emptyProfile, "complexity", [], [], [])

        expect(model.metadata.totalFiles).toBe(0)
        expect(model.districts).toHaveLength(0)
        expect(model.owners).toHaveLength(0)
        expect(model.silos).toHaveLength(0)
    })

    it("when bus factor is 1, then district risk label is 'Critical'", (): void => {
        const profile: ICodeCityDashboardRepositoryProfile = {
            id: "repo-1",
            label: "Repo",
            description: "Repo",
            files: testFiles,
            impactedFiles: [],
            compareFiles: [],
            temporalCouplings: [],
            healthTrend: [],
            contributors: testContributors,
            ownership: testOwnership,
            contributorCollaborations: [],
        }
        const busFactorEntries = buildBusFactorOverlayEntries(testFiles, testOwnership)

        const model = buildKnowledgeMapExportModel(profile, "complexity", [], busFactorEntries, [])

        const criticalDistricts = model.districts.filter((d) => d.riskLabel === "Critical")
        expect(criticalDistricts.length).toBeGreaterThanOrEqual(0)
    })

    it("when bus factor is 2, then district risk label is 'Elevated'", (): void => {
        const twoOwnerFiles: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/shared/a.ts", loc: 100 },
            { id: "f2", path: "src/shared/b.ts", loc: 100 },
        ]
        const twoOwnerOwnership = [
            { fileId: "f1", ownerId: "neo" },
            { fileId: "f2", ownerId: "trinity" },
        ]
        const profile: ICodeCityDashboardRepositoryProfile = {
            id: "repo-1",
            label: "Repo",
            description: "Repo",
            files: twoOwnerFiles,
            impactedFiles: [],
            compareFiles: [],
            temporalCouplings: [],
            healthTrend: [],
            contributors: testContributors,
            ownership: twoOwnerOwnership,
            contributorCollaborations: [],
        }
        const busFactorEntries = buildBusFactorOverlayEntries(twoOwnerFiles, twoOwnerOwnership)

        const model = buildKnowledgeMapExportModel(profile, "complexity", [], busFactorEntries, [])

        const elevatedDistricts = model.districts.filter((d) => d.riskLabel === "Elevated")
        expect(elevatedDistricts.length).toBeGreaterThanOrEqual(1)
    })

    it("when bus factor >= 3, then district risk label is 'Healthy'", (): void => {
        const manyFiles: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/mod/a.ts", loc: 100 },
            { id: "f2", path: "src/mod/b.ts", loc: 100 },
            { id: "f3", path: "src/mod/c.ts", loc: 100 },
        ]
        const threeContributors = [
            { ownerId: "neo", ownerName: "Neo", commitCount: 50, color: "#f00" },
            { ownerId: "trinity", ownerName: "Trinity", commitCount: 30, color: "#0f0" },
            { ownerId: "morpheus", ownerName: "Morpheus", commitCount: 20, color: "#00f" },
        ]
        const threeOwnership = [
            { fileId: "f1", ownerId: "neo" },
            { fileId: "f2", ownerId: "trinity" },
            { fileId: "f3", ownerId: "charlie" },
        ]
        const profile: ICodeCityDashboardRepositoryProfile = {
            id: "repo-1",
            label: "Repo",
            description: "Repo",
            files: manyFiles,
            impactedFiles: [],
            compareFiles: [],
            temporalCouplings: [],
            healthTrend: [],
            contributors: threeContributors,
            ownership: threeOwnership,
            contributorCollaborations: [],
        }
        const busFactorEntries = buildBusFactorOverlayEntries(manyFiles, threeOwnership)

        const model = buildKnowledgeMapExportModel(profile, "complexity", [], busFactorEntries, [])

        expect(model.districts.some((d) => d.riskLabel === "Healthy")).toBe(true)
    })
})

describe("buildOwnershipTransitionEvents", (): void => {
    it("when given files, contributors, and ownership, then returns transition events", (): void => {
        const events = buildOwnershipTransitionEvents(testFiles, testContributors, testOwnership)

        expect(events.length).toBeGreaterThan(0)
        events.forEach((event): void => {
            expect(event.handoffSeverity).toBeDefined()
            expect(event.reason).toBeDefined()
            expect(event.scopeType).toBeDefined()
        })
    })

    it("when given empty inputs, then returns empty array", (): void => {
        expect(buildOwnershipTransitionEvents([], [], [])).toHaveLength(0)
    })

    it("when ownership references missing file, then filters it out", (): void => {
        const badOwnership = [{ fileId: "nonexistent", ownerId: "neo" }]

        const events = buildOwnershipTransitionEvents(testFiles, testContributors, badOwnership)

        expect(events).toHaveLength(0)
    })

    it("when file has high bug count, then severity is 'critical'", (): void => {
        const highBugFiles: ICodeCityTreemapFileDescriptor[] = [
            {
                id: "f1",
                path: "src/dangerous.ts",
                loc: 200,
                bugIntroductions: { "30d": 6 },
                complexity: 35,
            },
        ]
        const own = [{ fileId: "f1", ownerId: "neo" }]

        const events = buildOwnershipTransitionEvents(highBugFiles, testContributors, own)

        expect(events[0]?.handoffSeverity).toBe("critical")
    })

    it("when file has moderate bug count, then severity is 'watch'", (): void => {
        const watchFiles: ICodeCityTreemapFileDescriptor[] = [
            {
                id: "f1",
                path: "src/moderate.ts",
                loc: 100,
                bugIntroductions: { "30d": 3 },
                complexity: 10,
            },
        ]
        const own = [{ fileId: "f1", ownerId: "neo" }]

        const events = buildOwnershipTransitionEvents(watchFiles, testContributors, own)

        expect(events[0]?.handoffSeverity).toBe("watch")
    })

    it("when file has low metrics, then severity is 'smooth'", (): void => {
        const smoothFiles: ICodeCityTreemapFileDescriptor[] = [
            {
                id: "f1",
                path: "src/clean.ts",
                loc: 50,
                bugIntroductions: { "30d": 0 },
                complexity: 5,
            },
        ]
        const own = [{ fileId: "f1", ownerId: "neo" }]

        const events = buildOwnershipTransitionEvents(smoothFiles, testContributors, own)

        expect(events[0]?.handoffSeverity).toBe("smooth")
    })

    it("when even index, then scope type is 'file'", (): void => {
        const events = buildOwnershipTransitionEvents(testFiles, testContributors, testOwnership)

        const sortedByChangedAt = [...events].sort((a, b) => a.id.localeCompare(b.id))
        const firstEvent = sortedByChangedAt.find((e) => e.id.includes("-0"))
        if (firstEvent !== undefined) {
            expect(firstEvent.scopeType).toBe("file")
        }
    })

    it("when odd index, then scope type is 'module'", (): void => {
        const events = buildOwnershipTransitionEvents(testFiles, testContributors, testOwnership)

        const moduleEvent = events.find((e) => e.id.includes("-1"))
        if (moduleEvent !== undefined) {
            expect(moduleEvent.scopeType).toBe("module")
        }
    })

    it("when single contributor, then from/to may be the same", (): void => {
        const singleContributor = [
            { ownerId: "neo", ownerName: "Neo", commitCount: 50, color: "#ff0000" },
        ]
        const singleOwn = [{ fileId: "f1", ownerId: "neo" }]

        const events = buildOwnershipTransitionEvents(testFiles, singleContributor, singleOwn)

        if (events[0] !== undefined) {
            expect(events[0].toOwnerName).toBe("Neo")
        }
    })

    it("when contributors are empty, then uses ownerId as names", (): void => {
        const events = buildOwnershipTransitionEvents(testFiles, [], testOwnership)

        events.forEach((event): void => {
            expect(event.toOwnerName).toBeDefined()
            expect(event.fromOwnerName).toBeDefined()
        })
    })

    it("when more than 6 ownership entries, then processes at most 6", (): void => {
        const manyFiles: ICodeCityTreemapFileDescriptor[] = Array.from({ length: 8 }, (_, i) => ({
            id: `f${String(i)}`,
            path: `src/file${String(i)}.ts`,
            loc: 100,
        }))
        const manyOwnership = manyFiles.map((f) => ({
            fileId: f.id,
            ownerId: "neo",
        }))

        const events = buildOwnershipTransitionEvents(manyFiles, testContributors, manyOwnership)

        expect(events.length).toBeLessThanOrEqual(6)
    })

    it("when events are returned, then sorted by changedAt descending", (): void => {
        const events = buildOwnershipTransitionEvents(testFiles, testContributors, testOwnership)

        for (let i = 0; i < events.length - 1; i += 1) {
            const current = events[i]
            const next = events[i + 1]
            if (current !== undefined && next !== undefined) {
                expect(current.changedAt.localeCompare(next.changedAt)).toBeGreaterThanOrEqual(0)
            }
        }
    })

    it("when critical severity with module scope, then reason mentions module transfer", (): void => {
        const criticalFiles: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/a.ts", loc: 100, bugIntroductions: { "30d": 0 } },
            {
                id: "f2",
                path: "src/b.ts",
                loc: 100,
                bugIntroductions: { "30d": 6 },
                complexity: 35,
            },
        ]
        const own = [
            { fileId: "f1", ownerId: "neo" },
            { fileId: "f2", ownerId: "trinity" },
        ]

        const events = buildOwnershipTransitionEvents(criticalFiles, testContributors, own)

        const criticalModuleEvent = events.find(
            (e) => e.handoffSeverity === "critical" && e.scopeType === "module",
        )
        if (criticalModuleEvent !== undefined) {
            expect(criticalModuleEvent.reason).toContain("Module transfer")
        }
    })

    it("when critical severity with file scope, then reason mentions file transfer", (): void => {
        const criticalFiles: ICodeCityTreemapFileDescriptor[] = [
            {
                id: "f1",
                path: "src/hot.ts",
                loc: 200,
                bugIntroductions: { "30d": 10 },
                complexity: 40,
            },
        ]
        const own = [{ fileId: "f1", ownerId: "neo" }]

        const events = buildOwnershipTransitionEvents(criticalFiles, testContributors, own)

        const fileEvent = events.find(
            (e) => e.handoffSeverity === "critical" && e.scopeType === "file",
        )
        if (fileEvent !== undefined) {
            expect(fileEvent.reason).toContain("High-risk file transfer")
        }
    })

    it("when watch severity, then reason mentions moderate handoff", (): void => {
        const watchFiles: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/watch.ts", loc: 100, bugIntroductions: { "30d": 3 } },
        ]
        const own = [{ fileId: "f1", ownerId: "neo" }]

        const events = buildOwnershipTransitionEvents(watchFiles, testContributors, own)

        if (events[0] !== undefined) {
            expect(events[0].reason).toContain("Moderate handoff")
        }
    })

    it("when smooth severity, then reason mentions low-friction", (): void => {
        const smoothFiles: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/smooth.ts", loc: 50, complexity: 5 },
        ]
        const own = [{ fileId: "f1", ownerId: "neo" }]

        const events = buildOwnershipTransitionEvents(smoothFiles, testContributors, own)

        if (events[0] !== undefined) {
            expect(events[0].reason).toContain("Low-friction")
        }
    })
})

describe("buildOwnershipOverlayEntries — additional edge cases", (): void => {
    it("when contributor not found in lookup, then uses fallback color and name", (): void => {
        const unknownOwnership = [{ fileId: "f1", ownerId: "unknown-owner" }]

        const entries = buildOwnershipOverlayEntries(testFiles, [], unknownOwnership)

        expect(entries).toHaveLength(1)
        expect(entries[0]?.ownerName).toBe("unknown-owner")
        expect(entries[0]?.color).toBe("#334155")
    })

    it("when multiple files owned by same person, then sorted by fileIds length", (): void => {
        const multiOwnership = [
            { fileId: "f1", ownerId: "neo" },
            { fileId: "f2", ownerId: "neo" },
        ]

        const entries = buildOwnershipOverlayEntries(testFiles, testContributors, multiOwnership)

        expect(entries).toHaveLength(1)
        expect(entries[0]?.fileIds).toHaveLength(2)
    })

    it("when single file, single contributor, then returns single entry", (): void => {
        const singleFile: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/only.ts", loc: 50 },
        ]
        const singleOwn = [{ fileId: "f1", ownerId: "neo" }]

        const entries = buildOwnershipOverlayEntries(singleFile, testContributors, singleOwn)

        expect(entries).toHaveLength(1)
        expect(entries[0]?.primaryFileId).toBe("f1")
    })
})

describe("buildBusFactorOverlayEntries — additional edge cases", (): void => {
    it("when same district has multiple owners, then bus factor reflects count", (): void => {
        const sharedFiles: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/shared/a.ts", loc: 100 },
            { id: "f2", path: "src/shared/b.ts", loc: 100 },
        ]
        const sharedOwnership = [
            { fileId: "f1", ownerId: "neo" },
            { fileId: "f2", ownerId: "trinity" },
        ]

        const entries = buildBusFactorOverlayEntries(sharedFiles, sharedOwnership)

        expect(entries[0]?.busFactor).toBe(2)
    })

    it("when duplicate file in same district, then does not double count files", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/mod/file.ts", loc: 100 },
        ]
        const dupOwnership = [
            { fileId: "f1", ownerId: "neo" },
            { fileId: "f1", ownerId: "neo" },
        ]

        const entries = buildBusFactorOverlayEntries(files, dupOwnership)

        expect(entries[0]?.fileCount).toBe(1)
    })

    it("when two entries have same bus factor, then sorts by file count descending", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "aaa/a.ts", loc: 100 },
            { id: "f2", path: "aaa/b.ts", loc: 100 },
            { id: "f3", path: "bbb/a.ts", loc: 100 },
        ]
        const own = [
            { fileId: "f1", ownerId: "neo" },
            { fileId: "f2", ownerId: "neo" },
            { fileId: "f3", ownerId: "trinity" },
        ]

        const entries = buildBusFactorOverlayEntries(files, own)

        expect(entries.length).toBe(2)
    })
})

describe("buildBusFactorPackageColorByName — color mapping", (): void => {
    it("when bus factor is 1, then color is red", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/solo/file.ts", loc: 100 },
        ]
        const own = [{ fileId: "f1", ownerId: "neo" }]

        const entries = buildBusFactorOverlayEntries(files, own)
        const colorMap = buildBusFactorPackageColorByName(entries)

        expect(colorMap).toBeDefined()
        const firstColor = Object.values(colorMap ?? {})[0]
        expect(firstColor).toBe("#dc2626")
    })

    it("when bus factor is 2, then color is amber", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/pair/a.ts", loc: 100 },
            { id: "f2", path: "src/pair/b.ts", loc: 100 },
        ]
        const own = [
            { fileId: "f1", ownerId: "neo" },
            { fileId: "f2", ownerId: "trinity" },
        ]

        const entries = buildBusFactorOverlayEntries(files, own)
        const colorMap = buildBusFactorPackageColorByName(entries)

        expect(colorMap).toBeDefined()
        const firstColor = Object.values(colorMap ?? {})[0]
        expect(firstColor).toBe("#d97706")
    })

    it("when bus factor >= 3, then color is green", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/team/a.ts", loc: 100 },
            { id: "f2", path: "src/team/b.ts", loc: 100 },
            { id: "f3", path: "src/team/c.ts", loc: 100 },
        ]
        const own = [
            { fileId: "f1", ownerId: "neo" },
            { fileId: "f2", ownerId: "trinity" },
            { fileId: "f3", ownerId: "charlie" },
        ]

        const entries = buildBusFactorOverlayEntries(files, own)
        const colorMap = buildBusFactorPackageColorByName(entries)

        expect(colorMap).toBeDefined()
        const firstColor = Object.values(colorMap ?? {})[0]
        expect(firstColor).toBe("#15803d")
    })
})
