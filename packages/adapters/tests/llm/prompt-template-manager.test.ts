import {describe, expect, test} from "bun:test"

import {
    PROMPT_TEMPLATE_MANAGER_ERROR_CODE,
    PromptTemplateManager,
    PromptTemplateManagerError,
} from "../../src/llm"

describe("PromptTemplateManager", () => {
    test("registers templates and lists them in alphabetical order", () => {
        const manager = new PromptTemplateManager()

        manager.registerTemplate("review.summary", "Summary: {{summary}}")
        manager.registerTemplate("review.intro", "Intro: {{intro}}")

        expect(manager.listTemplates().map((entry): string => entry.name)).toEqual([
            "review.intro",
            "review.summary",
        ])
    })

    test("checks existence and removes templates", () => {
        const manager = new PromptTemplateManager()

        manager.registerTemplate("review.summary", "Summary: {{summary}}")

        expect(manager.hasTemplate("review.summary")).toBe(true)
        expect(manager.removeTemplate("review.summary")).toBe(true)
        expect(manager.hasTemplate("review.summary")).toBe(false)
        expect(manager.removeTemplate("review.summary")).toBe(false)
    })

    test("renders template with string, number, and boolean variables", () => {
        const manager = new PromptTemplateManager()

        manager.registerTemplate(
            "review.metrics",
            "File {{filePath}} has score {{score}} and critical={{isCritical}}",
        )

        const rendered = manager.renderTemplate("review.metrics", {
            filePath: "src/main.ts",
            score: 91,
            isCritical: false,
        })

        expect(rendered).toBe("File src/main.ts has score 91 and critical=false")
    })

    test("renders repeated placeholders and trims placeholder whitespace", () => {
        const manager = new PromptTemplateManager()

        manager.registerTemplate(
            "review.repeated",
            "{{ value }} :: {{value}} :: {{  value  }}",
        )

        const rendered = manager.renderTemplate("review.repeated", {
            value: "X",
        })

        expect(rendered).toBe("X :: X :: X")
    })

    test("renders object and array variables as JSON", () => {
        const manager = new PromptTemplateManager()

        manager.registerTemplate(
            "review.context",
            "Object={{obj}} Array={{arr}} Null={{n}}",
        )

        const rendered = manager.renderTemplate("review.context", {
            obj: {
                a: 1,
            },
            arr: [1, 2],
            n: null,
        })

        expect(rendered).toBe("Object={\"a\":1} Array=[1,2] Null=null")
    })

    test("throws typed error when template is missing", () => {
        const manager = new PromptTemplateManager()

        try {
            manager.renderTemplate("unknown.template", {})
        } catch (error) {
            expect(error).toBeInstanceOf(PromptTemplateManagerError)
            if (error instanceof PromptTemplateManagerError) {
                expect(error.code).toBe(PROMPT_TEMPLATE_MANAGER_ERROR_CODE.TEMPLATE_NOT_FOUND)
                expect(error.templateName).toBe("unknown.template")
            }
            return
        }

        throw new Error("Expected renderTemplate to throw for missing template")
    })

    test("throws typed error when required variable is missing", () => {
        const manager = new PromptTemplateManager()

        manager.registerTemplate("review.summary", "Summary {{summary}} by {{author}}")

        try {
            manager.renderTemplate("review.summary", {
                summary: "ok",
            })
        } catch (error) {
            expect(error).toBeInstanceOf(PromptTemplateManagerError)
            if (error instanceof PromptTemplateManagerError) {
                expect(error.code).toBe(PROMPT_TEMPLATE_MANAGER_ERROR_CODE.MISSING_VARIABLE)
                expect(error.variableName).toBe("author")
                expect(error.templateName).toBe("review.summary")
            }
            return
        }

        throw new Error("Expected renderTemplate to throw for missing variable")
    })

    test("throws typed validation errors for invalid registration input", () => {
        const manager = new PromptTemplateManager()

        expect(() => manager.registerTemplate(" ", "x")).toThrow(PromptTemplateManagerError)
        expect(() => manager.registerTemplate("review.summary", " ")).toThrow(
            PromptTemplateManagerError,
        )

        manager.registerTemplate("review.summary", "Summary {{summary}}")

        try {
            manager.registerTemplate("review.summary", "Summary {{summary}}")
        } catch (error) {
            expect(error).toBeInstanceOf(PromptTemplateManagerError)
            if (error instanceof PromptTemplateManagerError) {
                expect(error.code).toBe(
                    PROMPT_TEMPLATE_MANAGER_ERROR_CODE.TEMPLATE_ALREADY_EXISTS,
                )
                expect(error.templateName).toBe("review.summary")
            }
            return
        }

        throw new Error("Expected duplicate registerTemplate call to throw")
    })
})
