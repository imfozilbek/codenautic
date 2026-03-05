import {describe, expect, test} from "bun:test"

import {ConfigurationValidatorUseCase} from "../../../src/application/use-cases/configuration-validator.use-case"

describe("ConfigurationValidatorUseCase", () => {
    test("validates required fields and normalizes values", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "high",
            ignorePaths: [" src/** ", "dist/**"],
            maxSuggestionsPerFile: 7,
            maxSuggestionsPerCCR: 20,
            cadence: " standard ",
            customRuleIds: [" rule-1 ", "rule-2 "],
            promptOverrides: {
                categories: {
                    descriptions: {
                        bug: " bug guidance ",
                        performance: " perf guidance ",
                    },
                },
                severity: {
                    flags: {
                        high: " high guidance ",
                    },
                },
                generation: {
                    main: " main guidance ",
                },
                templates: {
                    hallucinationCheck: " hallucination guidance ",
                },
            },
        })

        expect(result.isOk).toBe(true)
        expect(result.value.severityThreshold).toBe("HIGH")
        expect(result.value.ignorePaths).toEqual(["src/**", "dist/**"])
        expect(result.value.promptOverrides).toEqual({
            categories: {
                descriptions: {
                    bug: "bug guidance",
                    performance: "perf guidance",
                },
            },
            severity: {
                flags: {
                    high: "high guidance",
                },
            },
            generation: {
                main: "main guidance",
            },
            templates: {
                hallucinationCheck: "hallucination guidance",
            },
        })
    })

    test("preserves unknown top-level fields", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "MEDIUM",
            ignorePaths: [],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: ["rule-1"],
            adapterFeature: true,
            nested: {
                enabled: true,
            },
        })

        expect(result.isOk).toBe(true)
        expect(result.value.adapterFeature).toBe(true)
        expect(result.value.nested).toEqual({enabled: true})
    })

    test("returns detailed error for invalid payload shape", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute("invalid")

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toEqual([
            {
                field: "config",
                message: "must be a non-null object",
            },
        ])
    })

    test("returns detailed field errors when schema constraints fail", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "warning",
            ignorePaths: [""],
            maxSuggestionsPerFile: 0,
            maxSuggestionsPerCCR: 0.5,
            cadence: " ",
            customRuleIds: [""],
            promptOverrides: {
                categories: {
                    descriptions: {
                        bug: "",
                    },
                },
                severity: {
                    flags: {
                        critical: 1,
                    },
                },
                generation: "invalid",
                templates: {
                    hallucinationCheck: 1,
                },
            },
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toContainEqual({
            field: "severityThreshold",
            message: "must be one of LOW | MEDIUM | HIGH | CRITICAL",
        })
        expect(result.error.fields).toContainEqual({
            field: "ignorePaths",
            message: "must contain only non-empty strings",
        })
        expect(result.error.fields).toContainEqual({
            field: "maxSuggestionsPerFile",
            message: "must be an integer greater than or equal to 1",
        })
        expect(result.error.fields).toContainEqual({
            field: "promptOverrides.categories.descriptions.bug",
            message: "must be a non-empty string when provided",
        })
        expect(result.error.fields).toContainEqual({
            field: "promptOverrides.severity.flags.critical",
            message: "must be a non-empty string when provided",
        })
        expect(result.error.fields).toContainEqual({
            field: "promptOverrides.generation",
            message: "must be an object with optional main field",
        })
        expect(result.error.fields).toContainEqual({
            field: "promptOverrides.templates.hallucinationCheck",
            message: "must be a non-empty string when provided",
        })
    })

    test("supports reviewDepthStrategy and directories with defaults", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: ["src/**"],
            maxSuggestionsPerFile: 4,
            maxSuggestionsPerCCR: 10,
            cadence: "standard",
            customRuleIds: ["rule-1"],
            directories: [
                {
                    path: "src/core",
                    config: {
                        reviewDepthStrategy: "always-heavy",
                        maxSuggestionsPerFile: 2,
                    },
                },
            ],
        })

        expect(result.isOk).toBe(true)
        expect(result.value.reviewDepthStrategy).toBe("auto")
        expect(result.value.directories).toHaveLength(1)
        expect(result.value.directories?.[0]?.path).toBe("src/core")
        expect(result.value.directories?.[0]?.config.reviewDepthStrategy).toBe("always-heavy")
        expect(result.value.directories?.[0]?.config.maxSuggestionsPerFile).toBe(2)
    })

    test("applies valid optional directory overrides and nested prompt overrides", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "MEDIUM",
            ignorePaths: [],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: [],
            directories: [
                {
                    path: "src",
                    config: {
                        severityThreshold: "CRITICAL",
                        ignorePaths: [" docs/** "],
                        maxSuggestionsPerFile: 3,
                        maxSuggestionsPerCCR: 4,
                        cadence: " urgent ",
                        customRuleIds: [" rule-x "],
                        reviewDepthStrategy: "always-light",
                        promptOverrides: {
                            categories: {
                                descriptions: {
                                    bug: " bug notes ",
                                    security: " security notes ",
                                },
                            },
                            severity: {
                                flags: {
                                    critical: " critical flag ",
                                },
                            },
                            generation: {
                                main: " generation notes ",
                            },
                            templates: {
                                hallucinationCheck: " hallucination note ",
                            },
                        },
                    },
                },
            ],
            extra: {
                list: [{id: 1}],
            },
        })

        const value = unwrapOk(result)
        const directories = requireDefined(value.directories, "Expected directories")
        expect(directories).toHaveLength(1)
        const directory = requireDefined(directories[0], "Expected directory config")
        const directoryConfig = directory.config
        expect(directoryConfig.severityThreshold).toBe("CRITICAL")
        expect(directoryConfig.ignorePaths).toEqual(["docs/**"])
        expect(directoryConfig.maxSuggestionsPerFile).toBe(3)
        expect(directoryConfig.maxSuggestionsPerCCR).toBe(4)
        expect(directoryConfig.cadence).toBe("urgent")
        expect(directoryConfig.customRuleIds).toEqual(["rule-x"])
        expect(directoryConfig.reviewDepthStrategy).toBe("always-light")
        const promptOverrides = requireDefined(
            directoryConfig.promptOverrides,
            "Expected prompt overrides",
        )
        const categories = requireDefined(promptOverrides.categories, "Expected categories overrides")
        const descriptions = requireDefined(
            categories.descriptions,
            "Expected category descriptions",
        )
        const severity = requireDefined(promptOverrides.severity, "Expected severity overrides")
        const flags = requireDefined(severity.flags, "Expected severity flags")
        const generation = requireDefined(promptOverrides.generation, "Expected generation overrides")
        const templates = requireDefined(promptOverrides.templates, "Expected templates overrides")
        expect(descriptions.bug).toBe("bug notes")
        expect(flags.critical).toBe("critical flag")
        expect(generation.main).toBe("generation notes")
        expect(templates.hallucinationCheck).toBe("hallucination note")
        expect(value.extra).toEqual({list: [{id: 1}]})
    })

    test("collects validation errors for unsupported reviewDepthStrategy", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: ["src/**"],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: ["rule-1"],
            reviewDepthStrategy: "always-medium",
            directories: [],
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toContainEqual({
            field: "reviewDepthStrategy",
            message: "must be one of auto | always-light | always-heavy",
        })
    })

    test("returns error when reviewDepthStrategy is not a string", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: ["src/**"],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: ["rule-1"],
            reviewDepthStrategy: 123,
            directories: [],
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toContainEqual({
            field: "reviewDepthStrategy",
            message: "must be one of auto | always-light | always-heavy",
        })
    })

    test("returns error when severityThreshold is not a string", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: 5,
            ignorePaths: [],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: [],
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields).toContainEqual({
                field: "severityThreshold",
                message: "must be a string",
            })
        }
    })

    test("returns error when directories is not an array", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: [],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: [],
            directories: {},
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields).toContainEqual({
                field: "directories",
                message: "must be an array of directory configs",
            })
        }
    })

    test("returns error when directory config shape is invalid", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: [],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: [],
            directories: [null],
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields).toContainEqual({
                field: "directories[]",
                message: "must be an object with path and config",
            })
        }
    })

    test("returns error when directory config payload is missing", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: [],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: [],
            directories: [
                {
                    path: "src",
                },
            ],
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields).toContainEqual({
                field: "directories[].config",
                message: "must be an object",
            })
        }
    })

    test("returns error when directory config payload is not an object", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: [],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: [],
            directories: [
                {
                    path: "src",
                    config: [],
                },
            ],
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields).toContainEqual({
                field: "directories[].config",
                message: "must be an object",
            })
        }
    })

    test("returns error when directory path is empty", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: [],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: [],
            directories: [
                {
                    path: " ",
                    config: {},
                },
            ],
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields).toContainEqual({
                field: "directories[].path",
                message: "must be a non-empty string",
            })
        }
    })

    test("returns error when directory path is not a string", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: [],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: [],
            directories: [
                {
                    path: 123,
                    config: {},
                },
            ],
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields).toContainEqual({
                field: "directories[].path",
                message: "must be a non-empty string",
            })
        }
    })

    test("returns errors for invalid prompt override shapes", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: [],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: [],
            promptOverrides: "invalid",
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields).toContainEqual({
                field: "promptOverrides",
                message: "must be an object with optional nested sections",
            })
        }
    })

    test("allows empty prompt override sections", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: [],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: [],
            promptOverrides: {},
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected success result")
        }
        expect(result.value.promptOverrides).toEqual({})
    })

    test("returns errors for invalid prompt override sections", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: [],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: [],
            promptOverrides: {
                categories: "bad",
                severity: "bad",
                generation: "bad",
            },
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields).toContainEqual({
                field: "promptOverrides.categories",
                message: "must be an object with optional descriptions",
            })
            expect(result.error.fields).toContainEqual({
                field: "promptOverrides.severity",
                message: "must be an object with optional flags",
            })
            expect(result.error.fields).toContainEqual({
                field: "promptOverrides.generation",
                message: "must be an object with optional main field",
            })
        }
    })

    test("returns empty prompt overrides when nested sections are missing", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: [],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: [],
            promptOverrides: {
                categories: {},
                severity: {},
                generation: {},
            },
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected success result")
        }
        expect(result.value.promptOverrides).toEqual({})
    })

    test("returns errors for invalid prompt override descriptions and flags", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: [],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: [],
            promptOverrides: {
                categories: {
                    descriptions: "bad",
                },
                severity: {
                    flags: "bad",
                },
            },
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields).toContainEqual({
                field: "promptOverrides.categories.descriptions",
                message: "must be an object with optional string fields",
            })
            expect(result.error.fields).toContainEqual({
                field: "promptOverrides.severity.flags",
                message: "must be an object with optional string fields",
            })
        }
    })

    test("returns errors for invalid prompt override field values", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: [],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: [],
            promptOverrides: {
                categories: {
                    descriptions: {
                        bug: " ",
                    },
                },
                generation: {
                    main: 123,
                },
            },
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields).toContainEqual({
                field: "promptOverrides.categories.descriptions.bug",
                message: "must be a non-empty string when provided",
            })
            expect(result.error.fields).toContainEqual({
                field: "promptOverrides.generation.main",
                message: "must be a non-empty string when provided",
            })
        }
    })

    test("ignores non-string optional directory overrides", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: [],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: [],
            directories: [
                {
                    path: "src",
                    config: {
                        severityThreshold: 1,
                        reviewDepthStrategy: 123,
                    },
                },
            ],
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected success result")
        }
        const config = result.value.directories?.[0]?.config
        if (config === undefined) {
            throw new Error("Expected directory config to be present")
        }
        expect(config.severityThreshold).toBeUndefined()
        expect(config.reviewDepthStrategy).toBeUndefined()
    })

    test("keeps optional directory strategy undefined when not provided", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: [],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: [],
            directories: [
                {
                    path: "src",
                    config: {
                        maxSuggestionsPerFile: 2,
                    },
                },
            ],
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected success result")
        }
        const config = result.value.directories?.[0]?.config
        if (config === undefined) {
            throw new Error("Expected directory config to be present")
        }
        expect(config.reviewDepthStrategy).toBeUndefined()
    })
    test("ignores invalid optional directory override values", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: [],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: [],
            directories: [
                {
                    path: "src",
                    config: {
                        severityThreshold: "warning",
                        ignorePaths: "invalid",
                        maxSuggestionsPerFile: 0,
                        maxSuggestionsPerCCR: -1,
                        cadence: " ",
                        customRuleIds: [""],
                        reviewDepthStrategy: "unknown",
                    },
                },
            ],
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected success result")
        }

        const config = result.value.directories?.[0]?.config
        if (config === undefined) {
            throw new Error("Expected directory config to be present")
        }

        expect(config.severityThreshold).toBeUndefined()
        expect(config.ignorePaths).toBeUndefined()
        expect(config.maxSuggestionsPerFile).toBeUndefined()
        expect(config.maxSuggestionsPerCCR).toBeUndefined()
        expect(config.cadence).toBeUndefined()
        expect(config.customRuleIds).toBeUndefined()
        expect(config.reviewDepthStrategy).toBeUndefined()
    })

    test("returns error when directory config is explicitly undefined", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: [],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: [],
            directories: [
                {
                    path: "src",
                    config: undefined,
                },
            ],
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields).toContainEqual({
                field: "directories[].config",
                message: "must be an object",
            })
        }
    })
})

function unwrapOk<T>(result: {readonly isFail: boolean; readonly value: T}): T {
    if (result.isFail) {
        throw new Error("Expected successful result")
    }

    return result.value
}

function requireDefined<T>(value: T | undefined, message: string): T {
    if (value === undefined) {
        throw new Error(message)
    }

    return value
}
