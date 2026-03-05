import {describe, expect, test} from "bun:test"

import {parsePromptTemplateConfigList} from "../../../../src/application/dto/config/prompt-template-config.dto"

describe("prompt template config dto", () => {
    test("parses prompt template list with normalization", () => {
        const parsed = parsePromptTemplateConfigList({
            items: [
                {
                    name: "review-summary",
                    category: "SAFEGUARD",
                    type: "SYSTEM",
                    content: "System prompt content",
                    variables: ["rules", "rules", "files"],
                },
            ],
        })

        expect(parsed).toEqual([
            {
                name: "review-summary",
                category: "safeguard",
                type: "system",
                content: "System prompt content",
                variables: ["rules", "files"],
            },
        ])
    })

    test("returns undefined for invalid payloads", () => {
        expect(parsePromptTemplateConfigList("invalid")).toBeUndefined()
        expect(parsePromptTemplateConfigList([])).toBeUndefined()
        expect(parsePromptTemplateConfigList({})).toBeUndefined()
        expect(parsePromptTemplateConfigList({items: [{}]})).toBeUndefined()
        expect(parsePromptTemplateConfigList({items: ["bad"]})).toBeUndefined()
        expect(parsePromptTemplateConfigList({
            items: [
                {
                    name: "bad",
                    category: "unknown",
                    type: "system",
                    content: "x",
                    variables: [],
                },
            ],
        })).toBeUndefined()
        expect(parsePromptTemplateConfigList({
            items: [
                {
                    name: "bad-type",
                    category: "analysis",
                    type: "invalid",
                    content: "x",
                    variables: [],
                },
            ],
        })).toBeUndefined()
        expect(parsePromptTemplateConfigList({
            items: [
                {
                    name: "bad-vars",
                    category: "analysis",
                    type: "system",
                    content: "x",
                    variables: ["", "ok"],
                },
            ],
        })).toBeUndefined()
        expect(parsePromptTemplateConfigList({
            items: [
                {
                    name: "bad-vars-type",
                    category: "analysis",
                    type: "system",
                    content: "x",
                    variables: "oops",
                },
            ],
        })).toBeUndefined()
        expect(parsePromptTemplateConfigList({
            items: [
                {
                    name: "bad-content",
                    category: "analysis",
                    type: "system",
                    content: "",
                    variables: [],
                },
            ],
        })).toBeUndefined()
    })

    test("returns undefined on duplicate template names", () => {
        const parsed = parsePromptTemplateConfigList({
            items: [
                {
                    name: "dup",
                    category: "analysis",
                    type: "system",
                    content: "x",
                    variables: [],
                },
                {
                    name: "DUP",
                    category: "analysis",
                    type: "system",
                    content: "y",
                    variables: [],
                },
            ],
        })

        expect(parsed).toBeUndefined()
    })
})
