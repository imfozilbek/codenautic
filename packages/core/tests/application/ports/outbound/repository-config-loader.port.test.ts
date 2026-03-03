import {describe, expect, test} from "bun:test"

import type {IRepositoryConfigLoader, IReviewConfigDTO} from "../../../../src"

class InMemoryRepositoryConfigLoader implements IRepositoryConfigLoader {
    public loadConfig(_repositoryId: string): Promise<Partial<IReviewConfigDTO> | null> {
        return Promise.resolve({
            severityThreshold: "MEDIUM",
            ignorePaths: ["README.md"],
            maxSuggestionsPerFile: 5,
        })
    }

    public loadDefault(): Promise<Partial<IReviewConfigDTO> | null> {
        return Promise.resolve({
            severityThreshold: "LOW",
            ignorePaths: ["**/*.snap"],
            maxSuggestionsPerFile: 10,
        })
    }

    public loadOrganization(
        _organizationId: string,
        _teamId: string,
    ): Promise<Partial<IReviewConfigDTO> | null> {
        return Promise.resolve({
            severityThreshold: "MEDIUM",
            maxSuggestionsPerCCR: 50,
            customRuleIds: ["rule-org-1"],
        })
    }

    public loadRepository(_repositoryId: string): Promise<Partial<IReviewConfigDTO> | null> {
        return Promise.resolve({
            severityThreshold: "HIGH",
            cadence: "strict",
        })
    }
}

describe("IRepositoryConfigLoader contract", () => {
    test("returns repo config through loadConfig", async () => {
        const loader = new InMemoryRepositoryConfigLoader()
        const repositoryLayer = await loader.loadConfig("repo-1")

        expect(repositoryLayer?.severityThreshold).toBe("MEDIUM")
    })

    test("returns layered partial review config entries", async () => {
        const loader = new InMemoryRepositoryConfigLoader()

        const defaultLayer = await loader.loadDefault()
        const organizationLayer = await loader.loadOrganization("org-1", "team-1")
        const repositoryLayer = await loader.loadRepository("repo-1")

        expect(defaultLayer?.severityThreshold).toBe("LOW")
        expect(organizationLayer?.customRuleIds).toEqual(["rule-org-1"])
        expect(repositoryLayer?.cadence).toBe("strict")
    })
})
