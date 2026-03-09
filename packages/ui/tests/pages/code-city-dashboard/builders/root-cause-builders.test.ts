import { describe, expect, it } from "vitest"

import {
    buildRootCauseIssues,
    resolveCausalCouplingType,
    buildCausalCouplings,
} from "@/pages/code-city-dashboard/builders/root-cause-builders"
import type { ICodeCityTreemapFileDescriptor } from "@/components/graphs/codecity-treemap"

describe("resolveCausalCouplingType", (): void => {
    it("when strength >= 0.75, then returns 'dependency'", (): void => {
        expect(resolveCausalCouplingType(0.75)).toBe("dependency")
        expect(resolveCausalCouplingType(1.0)).toBe("dependency")
    })

    it("when strength >= 0.5 and < 0.75, then returns 'temporal'", (): void => {
        expect(resolveCausalCouplingType(0.5)).toBe("temporal")
        expect(resolveCausalCouplingType(0.74)).toBe("temporal")
    })

    it("when strength < 0.5, then returns 'ownership'", (): void => {
        expect(resolveCausalCouplingType(0.49)).toBe("ownership")
        expect(resolveCausalCouplingType(0)).toBe("ownership")
    })
})

describe("buildRootCauseIssues", (): void => {
    const files: ICodeCityTreemapFileDescriptor[] = [
        { id: "f1", path: "src/domain/review.ts", loc: 100 },
        { id: "f2", path: "src/infra/db.ts", loc: 80 },
    ]

    it("when given at least 2 files, then returns 2 root-cause issues", (): void => {
        const issues = buildRootCauseIssues(files)

        expect(issues).toHaveLength(2)
    })

    it("when given files, then first issue has 3 chain elements", (): void => {
        const issues = buildRootCauseIssues(files)

        expect(issues[0]?.chain).toHaveLength(3)
    })

    it("when given files, then second issue has 2 chain elements", (): void => {
        const issues = buildRootCauseIssues(files)

        expect(issues[1]?.chain).toHaveLength(2)
    })

    it("when given empty files, then returns empty array", (): void => {
        const issues = buildRootCauseIssues([])

        expect(issues).toHaveLength(0)
    })

    it("when given single file, then returns 2 issues using same file", (): void => {
        const issues = buildRootCauseIssues([files[0] as ICodeCityTreemapFileDescriptor])

        expect(issues).toHaveLength(2)
    })
})

describe("buildCausalCouplings", (): void => {
    it("when given temporal couplings, then maps to causal coupling descriptors", (): void => {
        const temporalCouplings = [
            { sourceFileId: "f1", targetFileId: "f2", strength: 0.8 },
            { sourceFileId: "f2", targetFileId: "f3", strength: 0.4 },
        ]

        const couplings = buildCausalCouplings(temporalCouplings)

        expect(couplings).toHaveLength(2)
        expect(couplings[0]?.couplingType).toBe("dependency")
        expect(couplings[1]?.couplingType).toBe("ownership")
    })

    it("when given empty array, then returns empty array", (): void => {
        expect(buildCausalCouplings([])).toHaveLength(0)
    })
})
