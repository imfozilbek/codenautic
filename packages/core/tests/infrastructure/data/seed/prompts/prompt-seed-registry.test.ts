import {describe, expect, test} from "bun:test"

import {PROMPT_TEMPLATE_CATEGORY, PROMPT_TEMPLATE_TYPE} from "../../../../../src/domain/entities/prompt-template.entity"
import {
    definePromptSeedRegistry,
    type PromptCategory,
    PROMPT_SEED_REGISTRY,
    type PromptType,
} from "../../../../../src/infrastructure/data/seed/prompts/prompt-seed-registry"

describe("prompt seed registry", () => {
    test("normalizes valid prompt seed entries", () => {
        const registry = definePromptSeedRegistry([
            {
                name: "  code-review-system  ",
                category: "  rules  " as PromptCategory,
                type: "  system  " as PromptType,
                content: "  Analyze {{ code }}  ",
                variables: [" code ", "repository", "code"],
            },
        ])

        expect(registry).toEqual([
            {
                name: "code-review-system",
                category: PROMPT_TEMPLATE_CATEGORY.RULES,
                type: PROMPT_TEMPLATE_TYPE.SYSTEM,
                content: "Analyze {{ code }}",
                variables: ["code", "repository"],
            },
        ])
    })

    test("throws when seed entries are duplicated by name, category and type", () => {
        expect(() => {
            definePromptSeedRegistry([
                {
                    name: "cross-file-analysis-system",
                    category: PROMPT_TEMPLATE_CATEGORY.CROSS_FILE,
                    type: PROMPT_TEMPLATE_TYPE.SYSTEM,
                    content: "first",
                    variables: [],
                },
                {
                    name: "  Cross-File-Analysis-System  ",
                    category: PROMPT_TEMPLATE_CATEGORY.CROSS_FILE,
                    type: PROMPT_TEMPLATE_TYPE.SYSTEM,
                    content: "second",
                    variables: [],
                },
            ])
        }).toThrow("Duplicate prompt seed registry entry")
    })

    test("throws when category is invalid", () => {
        expect(() => {
            definePromptSeedRegistry([
                {
                    name: "invalid-category",
                    category: "wrong" as typeof PROMPT_TEMPLATE_CATEGORY.RULES,
                    type: PROMPT_TEMPLATE_TYPE.USER,
                    content: "content",
                    variables: [],
                },
            ])
        }).toThrow("Unknown prompt seed category")
    })

    test("throws when variable name is empty", () => {
        expect(() => {
            definePromptSeedRegistry([
                {
                    name: "invalid-vars",
                    category: PROMPT_TEMPLATE_CATEGORY.SAFEGUARD,
                    type: PROMPT_TEMPLATE_TYPE.USER,
                    content: "content",
                    variables: ["  "],
                },
            ])
        }).toThrow("Prompt seed variable name cannot be empty")
    })

    test("exposes empty immutable default registry", () => {
        expect(PROMPT_SEED_REGISTRY).toEqual([])
        expect(Object.isFrozen(PROMPT_SEED_REGISTRY)).toBe(true)
    })
})
