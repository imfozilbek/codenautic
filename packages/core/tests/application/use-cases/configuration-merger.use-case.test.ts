import {describe, expect, test} from "bun:test"

import {
    ConfigurationMergerUseCase,
    type IConfigurationMergerInput,
} from "../../../src/application/use-cases/configuration-merger.use-case"

describe("ConfigurationMergerUseCase", () => {
    test("merges layers with repo-over-org-over-default precedence", async () => {
        const useCase = new ConfigurationMergerUseCase()
        const input: IConfigurationMergerInput = {
            default: {
                severityThreshold: "LOW",
                limits: {
                    base: 10,
                    nested: {
                        level: "default",
                    },
                },
                ignorePaths: ["dist/**"],
                promptOverrides: {
                    categories: {
                        descriptions: {
                            bug: "default",
                        },
                    },
                    severity: {
                        flags: {
                            low: "default-low",
                        },
                    },
                    runtime: {
                        mode: "default",
                    },
                    levels: ["default"],
                },
            },
            org: {
                limits: {
                    orgLimit: 20,
                    nested: {
                        enabled: true,
                    },
                },
                ignorePaths: ["vendor/**"],
                promptOverrides: {
                    categories: {
                        descriptions: {
                            performance: "org-performance",
                        },
                    },
                    runtime: {
                        mode: "org",
                    },
                },
            },
            repo: {
                limits: {
                    nested: {
                        level: "repo",
                    },
                },
                ignorePaths: ["src/**"],
                promptOverrides: {
                    severity: {
                        flags: {
                            high: "repo-high",
                        },
                    },
                    generation: {
                        main: "repo-generation",
                    },
                    runtime: {
                        max: 3,
                    },
                    levels: ["repo"],
                },
            },
        }

        const result = await useCase.execute(input)

        expect(result.isOk).toBe(true)
        expect(result.value.severityThreshold).toBe("LOW")
        expect(result.value.limits).toEqual({
            base: 10,
            orgLimit: 20,
            nested: {
                level: "repo",
                enabled: true,
            },
        })
        expect(result.value.ignorePaths).toEqual(["src/**"])
        expect(result.value.promptOverrides).toEqual({
            categories: {
                descriptions: {
                    bug: "default",
                    performance: "org-performance",
                },
            },
            severity: {
                flags: {
                    low: "default-low",
                    high: "repo-high",
                },
            },
            generation: {
                main: "repo-generation",
            },
            runtime: {
                mode: "org",
                max: 3,
            },
            levels: ["repo"],
        } as Record<string, unknown>)
    })

    test("keeps default layer when optional layers are omitted", async () => {
        const useCase = new ConfigurationMergerUseCase()
        const result = await useCase.execute({
            default: {
                severityThreshold: "MEDIUM",
                nested: {
                    level: "base",
                },
            },
        })

        expect(result.isOk).toBe(true)
        expect(result.value.severityThreshold).toBe("MEDIUM")
        expect(result.value.nested).toEqual({level: "base"})
    })

    test("does not mutate source payloads", async () => {
        const useCase = new ConfigurationMergerUseCase()
        const defaultConfig: Record<string, unknown> = {
            nested: {
                levels: ["a", "b"],
            },
        }
        const orgConfig: Record<string, unknown> = {
            nested: {
                enabled: true,
                levels: ["c"],
            },
        }
        const repoConfig: Record<string, unknown> = {
            nested: {
                value: 42,
            },
        }

        const input: IConfigurationMergerInput = {
            default: defaultConfig,
            org: orgConfig,
            repo: repoConfig,
        }

        await useCase.execute(input)

        expect(defaultConfig).toEqual({
            nested: {
                levels: ["a", "b"],
            },
        })
        expect(orgConfig).toEqual({
            nested: {
                enabled: true,
                levels: ["c"],
            },
        })
        expect(repoConfig).toEqual({
            nested: {
                value: 42,
            },
        })
    })

    test("replaces arrays instead of concatenating", async () => {
        const useCase = new ConfigurationMergerUseCase()
        const result = await useCase.execute({
            default: {
                flags: ["one", "two"],
                nested: {
                    items: [1, 2, 3],
                },
            },
            org: {
                flags: ["three"],
            },
            repo: {
                nested: {
                    items: ["repo"],
                },
            },
        })

        expect(result.isOk).toBe(true)
        expect(result.value.flags).toEqual(["three"])
        expect(result.value.nested).toEqual({
            items: ["repo"],
        })
    })

    test("keeps current value when incoming is undefined", async () => {
        const useCase = new ConfigurationMergerUseCase()
        const result = await useCase.execute({
            default: {
                flags: ["base"],
            },
            org: {
                flags: undefined,
            },
        })

        expect(result.isOk).toBe(true)
        expect(result.value.flags).toEqual(["base"])
    })
})
