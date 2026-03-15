import { describe, expect, it } from "vitest"

import {
    buildOnboardingProgressModules,
    buildExploreModePaths,
    buildHotAreaHighlights,
} from "@/pages/code-city-dashboard/builders/explore-onboarding-builders"
import type { ICodeCityTreemapFileDescriptor } from "@/components/codecity/codecity-treemap"

describe("buildOnboardingProgressModules", (): void => {
    it("when no areas explored, then all modules are incomplete", (): void => {
        const modules = buildOnboardingProgressModules([])

        expect(modules.length).toBeGreaterThan(0)
        modules.forEach((module): void => {
            expect(module.isComplete).toBe(false)
        })
    })

    it("when all areas explored, then all modules are complete", (): void => {
        const modules = buildOnboardingProgressModules([])
        const allIds = modules.map((module): string => module.id)
        const completedModules = buildOnboardingProgressModules(allIds)

        completedModules.forEach((module): void => {
            expect(module.isComplete).toBe(true)
        })
    })
})

describe("buildExploreModePaths", (): void => {
    const files: ICodeCityTreemapFileDescriptor[] = [
        { id: "f1", path: "src/api/handler.ts", loc: 100 },
        { id: "f2", path: "src/ui/component.tsx", loc: 80 },
        { id: "f3", path: "src/domain/core.ts", loc: 60 },
    ]

    it("when given files, then returns 3 explore paths", (): void => {
        const paths = buildExploreModePaths(files)

        expect(paths).toHaveLength(3)
    })

    it("when given files, then paths have distinct roles", (): void => {
        const paths = buildExploreModePaths(files)
        const roles = paths.map((path): string => path.role)

        expect(roles).toContain("backend")
        expect(roles).toContain("frontend")
        expect(roles).toContain("architect")
    })

    it("when given empty files, then returns paths with empty chains", (): void => {
        const paths = buildExploreModePaths([])

        expect(paths).toHaveLength(3)
        paths.forEach((path): void => {
            expect(path.fileChainIds).toHaveLength(0)
        })
    })
})

describe("buildHotAreaHighlights", (): void => {
    const files: ICodeCityTreemapFileDescriptor[] = [
        {
            id: "f1",
            path: "src/review.ts",
            loc: 200,
            complexity: 30,
            bugIntroductions: { "30d": 5 },
        },
        { id: "f2", path: "src/db.ts", loc: 100, complexity: 10, bugIntroductions: { "30d": 1 } },
        { id: "f3", path: "src/utils.ts", loc: 50, complexity: 5, bugIntroductions: { "30d": 0 } },
        { id: "f4", path: "src/config.ts", loc: 30, complexity: 2, bugIntroductions: { "30d": 0 } },
        { id: "f5", path: "src/index.ts", loc: 10, complexity: 1, bugIntroductions: { "30d": 0 } },
    ]

    it("when given files, then returns at most 4 highlights", (): void => {
        const highlights = buildHotAreaHighlights(files)

        expect(highlights.length).toBeLessThanOrEqual(4)
    })

    it("when given files, then first highlight has 'critical' severity", (): void => {
        const highlights = buildHotAreaHighlights(files)

        expect(highlights[0]?.severity).toBe("critical")
    })

    it("when given empty files, then returns empty array", (): void => {
        expect(buildHotAreaHighlights([])).toHaveLength(0)
    })
})
