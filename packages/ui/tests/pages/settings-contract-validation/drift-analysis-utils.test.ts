import { describe, expect, it } from "vitest"

import {
    compareDriftViolations,
    buildArchitectureDifferences,
    resolveArchitectureDifferenceBadgeClass,
    DRIFT_SEVERITY_PRIORITY,
} from "@/pages/settings-contract-validation/drift-analysis-utils"
import type {
    IDriftViolation,
    IArchitectureStructureNode,
} from "@/pages/settings-contract-validation/contract-validation-types"

describe("DRIFT_SEVERITY_PRIORITY", (): void => {
    it("when checked, then critical has highest priority", (): void => {
        expect(DRIFT_SEVERITY_PRIORITY.critical).toBeGreaterThan(DRIFT_SEVERITY_PRIORITY.high)
        expect(DRIFT_SEVERITY_PRIORITY.high).toBeGreaterThan(DRIFT_SEVERITY_PRIORITY.medium)
        expect(DRIFT_SEVERITY_PRIORITY.medium).toBeGreaterThan(DRIFT_SEVERITY_PRIORITY.low)
    })
})

describe("compareDriftViolations", (): void => {
    const critical: IDriftViolation = {
        id: "v1",
        rule: "no-circular",
        severity: "critical",
        affectedFiles: ["a.ts", "b.ts", "c.ts"],
        rationale: "Circular dependency",
    }

    const low: IDriftViolation = {
        id: "v2",
        rule: "naming",
        severity: "low",
        affectedFiles: ["d.ts"],
        rationale: "Naming violation",
    }

    it("when sort mode is 'severity-desc', then critical comes before low", (): void => {
        expect(compareDriftViolations(critical, low, "severity-desc")).toBeLessThan(0)
    })

    it("when sort mode is 'severity-asc', then low comes before critical", (): void => {
        expect(compareDriftViolations(critical, low, "severity-asc")).toBeGreaterThan(0)
    })

    it("when sort mode is 'files-desc', then more files comes first", (): void => {
        expect(compareDriftViolations(critical, low, "files-desc")).toBeLessThan(0)
    })

    it("when sort mode is 'files-asc', then fewer files comes first", (): void => {
        expect(compareDriftViolations(critical, low, "files-asc")).toBeGreaterThan(0)
    })
})

describe("buildArchitectureDifferences", (): void => {
    it("when blueprint and reality match, then returns 'match' status", (): void => {
        const blueprint: IArchitectureStructureNode[] = [
            { id: "1", layer: "domain", module: "review", dependsOn: ["core"] },
        ]
        const reality: IArchitectureStructureNode[] = [
            { id: "1", layer: "domain", module: "review", dependsOn: ["core"] },
        ]

        const differences = buildArchitectureDifferences(blueprint, reality)

        expect(differences).toHaveLength(1)
        expect(differences[0]?.status).toBe("match")
    })

    it("when blueprint has node missing from reality, then returns 'missing' status", (): void => {
        const blueprint: IArchitectureStructureNode[] = [
            { id: "1", layer: "domain", module: "review", dependsOn: [] },
        ]
        const reality: IArchitectureStructureNode[] = []

        const differences = buildArchitectureDifferences(blueprint, reality)

        expect(differences).toHaveLength(1)
        expect(differences[0]?.status).toBe("missing")
    })

    it("when reality has node not in blueprint, then returns 'unexpected' status", (): void => {
        const blueprint: IArchitectureStructureNode[] = []
        const reality: IArchitectureStructureNode[] = [
            { id: "1", layer: "infra", module: "db", dependsOn: [] },
        ]

        const differences = buildArchitectureDifferences(blueprint, reality)

        expect(differences).toHaveLength(1)
        expect(differences[0]?.status).toBe("unexpected")
    })

    it("when both empty, then returns no differences", (): void => {
        const differences = buildArchitectureDifferences([], [])

        expect(differences).toHaveLength(0)
    })

    it("when dependency directions differ, then notes mismatch in description", (): void => {
        const blueprint: IArchitectureStructureNode[] = [
            { id: "1", layer: "app", module: "service", dependsOn: ["domain"] },
        ]
        const reality: IArchitectureStructureNode[] = [
            { id: "1", layer: "app", module: "service", dependsOn: ["infra"] },
        ]

        const differences = buildArchitectureDifferences(blueprint, reality)

        expect(differences[0]?.description).toContain("mismatch")
    })
})

describe("resolveArchitectureDifferenceBadgeClass", (): void => {
    it("when status is 'match', then returns success classes", (): void => {
        expect(resolveArchitectureDifferenceBadgeClass("match")).toContain("success")
    })

    it("when status is 'missing', then returns warning classes", (): void => {
        expect(resolveArchitectureDifferenceBadgeClass("missing")).toContain("warning")
    })

    it("when status is 'unexpected', then returns danger classes", (): void => {
        expect(resolveArchitectureDifferenceBadgeClass("unexpected")).toContain("danger")
    })
})
