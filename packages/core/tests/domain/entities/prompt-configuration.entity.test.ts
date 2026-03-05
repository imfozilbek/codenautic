import {describe, expect, test} from "bun:test"

import {PromptConfiguration} from "../../../src/domain/entities/prompt-configuration.entity"
import {OrganizationId} from "../../../src/domain/value-objects/organization-id.value-object"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

describe("PromptConfiguration", () => {
    test("normalizes map keys and trims name", () => {
        const templateId = UniqueId.create("template-1")
        const configuration = new PromptConfiguration(UniqueId.create("configuration-1"), {
            templateId,
            name: "  Review config  ",
            defaults: {
                " user ": "global",
                "  severity ": "medium",
            },
            overrides: {
                " user ": "scoped",
                " flags ": true,
            },
            isGlobal: true,
        })

        expect(configuration.name).toBe("Review config")
        expect(configuration.templateId.value).toBe("template-1")
        expect(configuration.defaults).toEqual({
            user: "global",
            severity: "medium",
        })
        expect(configuration.overrides).toEqual({
            user: "scoped",
            flags: true,
        })
    })

    test("defaults empty maps for missing defaults and overrides", () => {
        const configuration = new PromptConfiguration(UniqueId.create("configuration-1a"), {
            templateId: UniqueId.create("template-1a"),
            name: "Config",
            defaults: undefined as unknown as Record<string, unknown>,
            overrides: null as unknown as Record<string, unknown>,
            isGlobal: true,
        })

        expect(configuration.defaults).toEqual({})
        expect(configuration.overrides).toEqual({})
    })

    test("defaults organization scope for global configurations", () => {
        const configuration = new PromptConfiguration(UniqueId.create("configuration-2"), {
            templateId: UniqueId.create("template-2"),
            name: "Global config",
            defaults: {},
            overrides: {},
            isGlobal: true,
        })

        expect(configuration.isGlobal).toBe(true)
        expect(configuration.organizationId).toBeUndefined()
    })

    test("throws when global configuration has organizationId", () => {
        expect(() => {
            return new PromptConfiguration(UniqueId.create("configuration-3"), {
                templateId: UniqueId.create("template-3"),
                name: "Invalid global config",
                defaults: {},
                overrides: {},
                isGlobal: true,
                organizationId: OrganizationId.create("org-1"),
            })
        }).toThrow("Global configuration cannot have organizationId")
    })

    test("throws when non-global configuration has no organizationId", () => {
        expect(() => {
            return new PromptConfiguration(UniqueId.create("configuration-4"), {
                templateId: UniqueId.create("template-4"),
                name: "Scoped config",
                defaults: {},
                overrides: {},
                isGlobal: false,
            })
        }).toThrow("Non-global configuration must have organizationId")
    })

    test("throws for empty configuration name", () => {
        expect(() => {
            return new PromptConfiguration(UniqueId.create("configuration-5"), {
                templateId: UniqueId.create("template-5"),
                name: "   ",
                defaults: {},
                overrides: {},
                isGlobal: true,
            })
        }).toThrow("Prompt configuration name cannot be empty")
    })
})
