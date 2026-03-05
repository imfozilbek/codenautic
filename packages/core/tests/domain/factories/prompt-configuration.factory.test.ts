import {describe, expect, test} from "bun:test"

import {PromptConfigurationFactory} from "../../../src/domain/factories/prompt-configuration.factory"

describe("PromptConfigurationFactory", () => {
    test("creates configuration with defaults and trimmed maps", () => {
        const factory = new PromptConfigurationFactory()
        const configuration = factory.create({
            templateId: "template-1",
            name: "  review config  ",
            defaults: {
                " user ": "global",
                "  level ": 1,
            },
            overrides: {
                " mode ": "override",
            },
        })

        expect(configuration.id.value).toHaveLength(36)
        expect(configuration.isGlobal).toBe(true)
        expect(configuration.name).toBe("review config")
        expect(configuration.defaults).toEqual({
            user: "global",
            level: 1,
        })
        expect(configuration.overrides).toEqual({
            mode: "override",
        })
    })

    test("drops empty keys from variable maps", () => {
        const factory = new PromptConfigurationFactory()
        const configuration = factory.create({
            templateId: "template-1",
            name: "Trim map",
            defaults: {
                "  ": "skip",
                "\n\t": "skip",
                " valid ": "ok",
            },
            overrides: {
                "": "skip",
                " mode ": "override",
            },
        })

        expect(configuration.defaults).toEqual({
            valid: "ok",
        })
        expect(configuration.overrides).toEqual({
            mode: "override",
        })
    })

    test("creates scoped configuration with organizationId", () => {
        const factory = new PromptConfigurationFactory()
        const configuration = factory.create({
            templateId: "template-2",
            name: "Scoped config",
            isGlobal: false,
            organizationId: "org-2",
        })

        expect(configuration.isGlobal).toBe(false)
        expect(configuration.organizationId?.value).toBe("org-2")
    })

    test("reconstitutes persisted configuration", () => {
        const factory = new PromptConfigurationFactory()
        const configuration = factory.reconstitute({
            id: "configuration-1",
            templateId: "template-3",
            name: "Replayed config",
            defaults: {
                level: 1,
            },
            overrides: {},
            isGlobal: true,
        })

        expect(configuration.id.value).toBe("configuration-1")
        expect(configuration.name).toBe("Replayed config")
        expect(configuration.templateId.value).toBe("template-3")
        expect(configuration.defaults).toEqual({level: 1})
    })

    test("throws for invalid scoped configuration", () => {
        const factory = new PromptConfigurationFactory()
        expect(() => {
            return factory.create({
                templateId: "template-4",
                name: "Invalid",
                isGlobal: false,
            })
        }).toThrow("Non-global configuration must have organizationId")
    })
})
