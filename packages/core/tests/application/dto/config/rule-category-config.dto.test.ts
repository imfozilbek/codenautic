import {describe, expect, test} from "bun:test"

import {
    parseRuleCategoryConfigList,
} from "../../../../src/application/dto/config/rule-category-config.dto"

describe("rule category config dto", () => {
    test("parses valid category list", () => {
        const raw = {
            items: [
                {
                    slug: "style-conventions",
                    name: "Style & Conventions",
                    description: "Consistent formatting.",
                    weight: 3,
                },
                {
                    slug: "error-handling",
                    name: "Error Handling",
                    description: "Handle errors explicitly.",
                },
            ],
        }

        const parsed = parseRuleCategoryConfigList(raw)

        expect(parsed).toEqual([
            {
                slug: "style-conventions",
                name: "Style & Conventions",
                description: "Consistent formatting.",
            },
            {
                slug: "error-handling",
                name: "Error Handling",
                description: "Handle errors explicitly.",
            },
        ])
    })

    test("returns undefined on invalid slug", () => {
        const parsed = parseRuleCategoryConfigList({
            items: [
                {
                    slug: "Invalid Slug",
                    name: "Bad",
                    description: "desc",
                },
            ],
        })

        expect(parsed).toBeUndefined()
    })

    test("returns undefined on duplicate slug", () => {
        const parsed = parseRuleCategoryConfigList({
            items: [
                {
                    slug: "error-handling",
                    name: "Errors",
                    description: "desc",
                },
                {
                    slug: "error-handling",
                    name: "Errors 2",
                    description: "desc",
                },
            ],
        })

        expect(parsed).toBeUndefined()
    })

    test("returns undefined for invalid payload shape", () => {
        expect(parseRuleCategoryConfigList(null)).toBeUndefined()
        expect(parseRuleCategoryConfigList({})).toBeUndefined()
        expect(parseRuleCategoryConfigList({items: {}})).toBeUndefined()
        expect(parseRuleCategoryConfigList({items: ["invalid"]})).toBeUndefined()
    })

    test("returns undefined for invalid item fields", () => {
        expect(parseRuleCategoryConfigList({
            items: [
                {
                    slug: "valid-slug",
                    name: 123,
                    description: "desc",
                },
            ],
        })).toBeUndefined()
        expect(parseRuleCategoryConfigList({
            items: [
                {
                    slug: "valid-slug",
                    name: "Name",
                    description: "   ",
                },
            ],
        })).toBeUndefined()
    })
})
