import { describe, expect, it } from "vitest"

import type { ICodeCityTreemapFileLinkResolver } from "@/components/codecity/codecity-treemap"

import {
    isCodeCityMetric,
    resolveRepositoryOptions,
    createRepositoryFilesLink,
    resolveDistrictName,
    resolveOnboardingAreaFromTourStep,
    resolveDashboardMetricLabel,
    resolveDashboardProfile,
} from "@/pages/code-city-dashboard/code-city-dashboard-utils"
import type { ICodeCityDashboardRepositoryProfile } from "@/pages/code-city-dashboard/code-city-dashboard-types"

describe("isCodeCityMetric", (): void => {
    it("when value is 'complexity', then returns true", (): void => {
        expect(isCodeCityMetric("complexity")).toBe(true)
    })

    it("when value is 'coverage', then returns true", (): void => {
        expect(isCodeCityMetric("coverage")).toBe(true)
    })

    it("when value is 'churn', then returns true", (): void => {
        expect(isCodeCityMetric("churn")).toBe(true)
    })

    it("when value is unknown, then returns false", (): void => {
        expect(isCodeCityMetric("bugs")).toBe(false)
    })
})

describe("resolveRepositoryOptions", (): void => {
    it("when given profiles, then returns array of ids", (): void => {
        const profiles: ReadonlyArray<ICodeCityDashboardRepositoryProfile> = [
            {
                id: "repo-1",
                label: "Repo 1",
                description: "",
                files: [],
                impactedFiles: [],
                compareFiles: [],
                temporalCouplings: [],
                healthTrend: [],
                contributors: [],
                ownership: [],
                contributorCollaborations: [],
            },
            {
                id: "repo-2",
                label: "Repo 2",
                description: "",
                files: [],
                impactedFiles: [],
                compareFiles: [],
                temporalCouplings: [],
                healthTrend: [],
                contributors: [],
                ownership: [],
                contributorCollaborations: [],
            },
        ]

        const result = resolveRepositoryOptions(profiles)

        expect(result).toEqual(["repo-1", "repo-2"])
    })

    it("when given empty array, then returns empty array", (): void => {
        const result = resolveRepositoryOptions([])

        expect(result).toEqual([])
    })
})

describe("createRepositoryFilesLink", (): void => {
    it("when given repository id and file, then returns correct URL", (): void => {
        const linkFn = createRepositoryFilesLink("my-org/my-repo")
        const file: ICodeCityTreemapFileLinkResolver = {
            fileId: "src/index.ts",
            fileName: "index.ts",
            path: "src/index.ts",
        }
        const result = linkFn(file)

        expect(result).toContain("/repositories/")
        expect(result).toContain("file=")
    })

    it("when repository id has special chars, then encodes them", (): void => {
        const linkFn = createRepositoryFilesLink("org/repo with spaces")
        const file: ICodeCityTreemapFileLinkResolver = {
            fileId: "src/file.ts",
            fileName: "file.ts",
            path: "src/file.ts",
        }
        const result = linkFn(file)

        expect(result).toContain("repo%20with%20spaces")
    })
})

describe("resolveDistrictName", (): void => {
    it("when path has directory, then returns directory part", (): void => {
        expect(resolveDistrictName("src/components/button.ts")).toBe("src/components")
    })

    it("when path has no directory, then returns 'root'", (): void => {
        expect(resolveDistrictName("index.ts")).toBe("root")
    })

    it("when path uses backslashes, then normalizes to forward slashes", (): void => {
        expect(resolveDistrictName("src\\components\\button.ts")).toBe("src/components")
    })

    it("when path starts with slash, then preserves it", (): void => {
        expect(resolveDistrictName("/src/file.ts")).toBe("/src")
    })

    it("when path has trailing whitespace, then trims it", (): void => {
        expect(resolveDistrictName("  src/file.ts  ")).toBe("src")
    })
})

describe("resolveOnboardingAreaFromTourStep", (): void => {
    it("when step is 'controls', then returns 'controls'", (): void => {
        expect(resolveOnboardingAreaFromTourStep("controls")).toBe("controls")
    })

    it("when step is 'city-3d', then returns 'city-3d'", (): void => {
        expect(resolveOnboardingAreaFromTourStep("city-3d")).toBe("city-3d")
    })

    it("when step is 'root-cause', then returns 'root-cause'", (): void => {
        expect(resolveOnboardingAreaFromTourStep("root-cause")).toBe("root-cause")
    })

    it("when step is unknown, then returns undefined", (): void => {
        expect(resolveOnboardingAreaFromTourStep("unknown")).toBeUndefined()
    })
})

describe("resolveDashboardMetricLabel", (): void => {
    it("when metric is 'complexity', then returns 'Complexity'", (): void => {
        expect(resolveDashboardMetricLabel("complexity")).toBe("Complexity")
    })

    it("when metric is 'coverage', then returns 'Coverage'", (): void => {
        expect(resolveDashboardMetricLabel("coverage")).toBe("Coverage")
    })

    it("when metric is 'churn', then returns 'Churn'", (): void => {
        expect(resolveDashboardMetricLabel("churn")).toBe("Churn")
    })
})

describe("resolveDashboardProfile", (): void => {
    it("when repository id is unknown, then returns default profile", (): void => {
        const result = resolveDashboardProfile("nonexistent-repo")

        expect(result).toBeDefined()
        expect(result.id).toBeDefined()
    })
})
