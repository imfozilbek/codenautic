import {describe, expect, test} from "bun:test"

import {RuleCategory} from "../../../src/domain/entities/rule-category.entity"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

describe("RuleCategory", () => {
    test("creates active category with normalized fields", () => {
        const category = new RuleCategory(UniqueId.create("cat-1"), {
            slug: "security-rules",
            name: "  Security Rules  ",
            description: "  Detects security anti-patterns  ",
            isActive: true,
        })

        expect(category.id.value).toBe("cat-1")
        expect(category.slug).toBe("security-rules")
        expect(category.name).toBe("Security Rules")
        expect(category.description).toBe("Detects security anti-patterns")
        expect(category.isActive).toBe(true)
    })

    test("activates and deactivates category", () => {
        const category = new RuleCategory(UniqueId.create(), {
            slug: "maintainability",
            name: "Maintainability",
            description: "Rules about code clarity",
            isActive: false,
        })

        expect(category.isActive).toBe(false)
        category.activate()
        expect(category.isActive).toBe(true)
        category.deactivate()
        expect(category.isActive).toBe(false)
    })

    test("throws for non-kebab slug", () => {
        expect(() => {
            return new RuleCategory(UniqueId.create(), {
                slug: "security rules",
                name: "Security",
                description: "desc",
                isActive: true,
            })
        }).toThrow("Category slug must be kebab-case")
    })

    test("throws for empty or non-string slug", () => {
        expect(() => {
            return new RuleCategory(UniqueId.create(), {
                slug: "   ",
                name: "Security",
                description: "desc",
                isActive: true,
            })
        }).toThrow("Category slug cannot be empty")

        expect(() => {
            return new RuleCategory(UniqueId.create(), {
                slug: 123 as unknown as string,
                name: "Security",
                description: "desc",
                isActive: true,
            })
        }).toThrow("Category slug cannot be empty")
    })

    test("throws for empty fields", () => {
        expect(() => {
            return new RuleCategory(UniqueId.create(), {
                slug: "security",
                name: "",
                description: "desc",
                isActive: true,
            })
        }).toThrow("Category name cannot be empty")

        expect(() => {
            return new RuleCategory(UniqueId.create(), {
                slug: "security",
                name: "Security",
                description: " ",
                isActive: true,
            })
        }).toThrow("Category description cannot be empty")
    })

    test("throws for non-string name and description", () => {
        expect(() => {
            return new RuleCategory(UniqueId.create(), {
                slug: "security",
                name: 123 as unknown as string,
                description: "desc",
                isActive: true,
            })
        }).toThrow("Category name cannot be empty")

        expect(() => {
            return new RuleCategory(UniqueId.create(), {
                slug: "security",
                name: "Security",
                description: 123 as unknown as string,
                isActive: true,
            })
        }).toThrow("Category description cannot be empty")
    })
})
