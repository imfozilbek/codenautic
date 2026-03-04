import {describe, expect, test} from "bun:test"

import {RuleCategoryFactory} from "../../../src/domain/factories/rule-category.factory"

describe("RuleCategoryFactory", () => {
    test("creates category with default active flag", () => {
        const factory = new RuleCategoryFactory()
        const category = factory.create({
            slug: "security-hardening",
            name: "Security Hardening",
            description: "Security-focused checks",
        })

        expect(category.slug).toBe("security-hardening")
        expect(category.name).toBe("Security Hardening")
        expect(category.description).toBe("Security-focused checks")
        expect(category.isActive).toBe(true)
    })

    test("reconstitutes category snapshot", () => {
        const factory = new RuleCategoryFactory()
        const category = factory.reconstitute({
            id: "category-1",
            slug: "performance-efficiency",
            name: "Performance & Efficiency",
            description: "Performance-related checks",
            isActive: false,
        })

        expect(category.id.value).toBe("category-1")
        expect(category.slug).toBe("performance-efficiency")
        expect(category.name).toBe("Performance & Efficiency")
        expect(category.description).toBe("Performance-related checks")
        expect(category.isActive).toBe(false)
    })
})
