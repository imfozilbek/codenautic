import {describe, expect, test} from "bun:test"

import {
    PromptTemplate,
    PROMPT_TEMPLATE_CATEGORY,
    PROMPT_TEMPLATE_TYPE,
    type PromptTemplateCategory,
    type PromptTemplateType,
} from "../../../src/domain/entities/prompt-template.entity"
import {OrganizationId} from "../../../src/domain/value-objects/organization-id.value-object"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

describe("PromptTemplate", () => {
    test("creates template with normalized and unique fields", () => {
        const template = new PromptTemplate(UniqueId.create("template-1"), {
            name: "  Review Summary  ",
            category: "  cross-file  " as PromptTemplateCategory,
            type: "  system  " as PromptTemplateType,
            content: "  Hello {{name}}  ",
            variables: [
                {name: " name "},
                {name: "name"},
                {name: "severity"},
            ],
            version: 2,
            isGlobal: true,
        })

        expect(template.id.value).toBe("template-1")
        expect(template.name).toBe("Review Summary")
        expect(template.category).toBe(PROMPT_TEMPLATE_CATEGORY.CROSS_FILE)
        expect(template.type).toBe(PROMPT_TEMPLATE_TYPE.SYSTEM)
        expect(template.content).toBe("Hello {{name}}")
        expect(template.version).toBe(2)
        expect(template.isGlobal).toBe(true)
        expect(template.variables).toEqual([
            {name: "name"},
            {name: "severity"},
        ])
    })

    test("defaults organization scope rule for global templates", () => {
        const template = new PromptTemplate(UniqueId.create("template-2"), {
            name: "Global template",
            category: PROMPT_TEMPLATE_CATEGORY.RULES,
            type: PROMPT_TEMPLATE_TYPE.SYSTEM,
            content: "Hello",
            variables: [],
            version: 1,
            isGlobal: true,
        })

        expect(template.organizationId).toBeUndefined()
    })

    test("accepts safeguard category", () => {
        const template = new PromptTemplate(UniqueId.create("template-2a"), {
            name: "Safeguard template",
            category: PROMPT_TEMPLATE_CATEGORY.SAFEGUARD,
            type: PROMPT_TEMPLATE_TYPE.SYSTEM,
            content: "Validate suggestions",
            variables: [],
            version: 1,
            isGlobal: true,
        })

        expect(template.category).toBe(PROMPT_TEMPLATE_CATEGORY.SAFEGUARD)
    })

    test("throws when global template has organizationId", () => {
        expect(() => {
            return new PromptTemplate(UniqueId.create("template-3"), {
                name: "Invalid global",
                category: PROMPT_TEMPLATE_CATEGORY.RULES,
                type: PROMPT_TEMPLATE_TYPE.USER,
                content: "Hello",
                variables: [],
                version: 1,
                isGlobal: true,
                organizationId: OrganizationId.create("org"),
            })
        }).toThrow("Global template cannot have organizationId")
    })

    test("throws for non-global template without organizationId", () => {
        expect(() => {
            return new PromptTemplate(UniqueId.create("template-4"), {
                name: "Scoped template",
                category: PROMPT_TEMPLATE_CATEGORY.OUTPUT,
                type: PROMPT_TEMPLATE_TYPE.USER,
                content: "Hello",
                variables: [],
                version: 1,
                isGlobal: false,
            })
        }).toThrow("Non-global template must have organizationId")
    })

    test("throws for invalid category, type, and content", () => {
        expect(() => {
            return new PromptTemplate(UniqueId.create("template-5"), {
                name: "Bad",
                category: "invalid" as PromptTemplateCategory,
                type: PROMPT_TEMPLATE_TYPE.SYSTEM,
                content: "Hello",
                variables: [],
                version: 1,
                isGlobal: true,
            })
        }).toThrow("Unknown prompt template category: invalid")

        expect(() => {
            return new PromptTemplate(UniqueId.create("template-6"), {
                name: "Bad",
                category: PROMPT_TEMPLATE_CATEGORY.RULES,
                type: "unknown" as "system",
                content: "Hello",
                variables: [],
                version: 1,
                isGlobal: true,
            })
        }).toThrow("Unknown prompt template type: unknown")

        expect(() => {
            return new PromptTemplate(UniqueId.create("template-7"), {
                name: "Bad",
                category: PROMPT_TEMPLATE_CATEGORY.RULES,
                type: PROMPT_TEMPLATE_TYPE.USER,
                content: "   ",
                variables: [],
                version: 1,
                isGlobal: true,
            })
        }).toThrow("Prompt template content cannot be empty")
    })

    test("throws for empty template name", () => {
        expect(() => {
            return new PromptTemplate(UniqueId.create("template-8"), {
                name: "   ",
                category: PROMPT_TEMPLATE_CATEGORY.RULES,
                type: PROMPT_TEMPLATE_TYPE.SYSTEM,
                content: "Hello",
                variables: [],
                version: 1,
                isGlobal: true,
            })
        }).toThrow("Prompt template name cannot be empty")
    })

    test("throws for empty variable name", () => {
        expect(() => {
            return new PromptTemplate(UniqueId.create("template-9"), {
                name: "Vars",
                category: PROMPT_TEMPLATE_CATEGORY.RULES,
                type: PROMPT_TEMPLATE_TYPE.SYSTEM,
                content: "Hello",
                variables: [{name: "   "}],
                version: 1,
                isGlobal: true,
            })
        }).toThrow("Template variable name cannot be empty")
    })
})
