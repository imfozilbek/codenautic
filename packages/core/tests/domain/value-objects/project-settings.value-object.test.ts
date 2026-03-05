import {describe, expect, test} from "bun:test"

import {PROJECT_CADENCE, ProjectSettings} from "../../../src/domain/value-objects/project-settings.value-object"

describe("ProjectSettings", () => {
    test("creates defaults when input is empty", () => {
        const settings = ProjectSettings.create()

        expect(settings.severity).toBe("LOW")
        expect(settings.ignorePaths).toEqual([])
        expect(settings.cadence).toBe(PROJECT_CADENCE.AUTOMATIC)
        expect(settings.limits).toEqual({})
        expect(settings.customRuleIds).toEqual([])
        expect(settings.promptOverrides).toEqual({})
    })

    test("normalizes and deduplicates arrays", () => {
        const settings = ProjectSettings.create({
            severity: "high",
            ignorePaths: [" src/** ", "dist", "src/**"],
        })

        expect(settings.severity).toBe("HIGH")
        expect(settings.ignorePaths).toEqual(["src/**", "dist"])
    })

    test("normalizes severity from trimmed input", () => {
        const settings = ProjectSettings.create({
            severity: "  low ",
        })

        expect(settings.severity).toBe("LOW")
    })

    test("throws on unknown severity", () => {
        expect(() => {
            ProjectSettings.create({
                severity: "unknown",
            })
        }).toThrow("Unknown severity level")
    })

    test("throws on unknown cadence", () => {
        expect(() => {
            ProjectSettings.create({cadence: "weird"})
        }).toThrow("Unknown project cadence")
    })

    test("merges overrides with replace semantics", () => {
        const settings = ProjectSettings.create({
            ignorePaths: ["src/**"],
            limits: {maxFiles: 10},
            customRuleIds: ["r1"],
        }).merge({
            ignorePaths: ["lib/**"],
            limits: {maxFiles: 20},
        })

        expect(settings.ignorePaths).toEqual(["lib/**"])
        expect(settings.limits).toEqual({maxFiles: 20})
        expect(settings.customRuleIds).toEqual(["r1"])
    })

    test("throws when limits contains non-number", () => {
        expect(() => {
            ProjectSettings.create({
                limits: {maxFiles: Number.NaN},
            })
        }).toThrow("Project limit maxFiles must be a number")
    })

    test("throws on empty ignorePaths and rule ids", () => {
        expect(() => {
            ProjectSettings.create({
                ignorePaths: ["   "],
            })
        }).toThrow("ignorePaths contains empty value")

        expect(() => {
            ProjectSettings.create({
                customRuleIds: ["   "],
            })
        }).toThrow("Project rule id cannot be empty")
    })

    test("throws on invalid limits and promptOverrides shape", () => {
        expect(() => {
            ProjectSettings.create({
                limits: null as unknown as Record<string, number>,
            })
        }).toThrow("Project limits must be an object")

        expect(() => {
            ProjectSettings.create({
                limits: {"  ": 1},
            })
        }).toThrow("Project limit key cannot be empty")

        expect(() => {
            ProjectSettings.create({
                promptOverrides: "invalid" as unknown as Record<string, unknown>,
            })
        }).toThrow("Project promptOverrides must be an object")
    })

    test("serializes settings to JSON snapshot", () => {
        const settings = ProjectSettings.create({
            severity: "HIGH",
            ignorePaths: ["src/**"],
            cadence: PROJECT_CADENCE.MANUAL,
            limits: {
                maxReviewsPerWindow: 5,
            },
            customRuleIds: ["rule-1"],
            promptOverrides: {
                severity: {
                    threshold: "HIGH",
                },
            },
        })

        expect(settings.toJSON()).toEqual({
            severity: "HIGH",
            ignorePaths: ["src/**"],
            cadence: PROJECT_CADENCE.MANUAL,
            limits: {
                maxReviewsPerWindow: 5,
            },
            customRuleIds: ["rule-1"],
            promptOverrides: {
                severity: {
                    threshold: "HIGH",
                },
            },
        })
    })
})
