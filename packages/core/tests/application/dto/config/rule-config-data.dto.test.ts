import {describe, expect, test} from "bun:test"

import {
    parseRuleConfigList,
} from "../../../../src/application/dto/config/rule-config-data.dto"

describe("rule config dto", () => {
    test("parses rule payload list with normalization", () => {
        const parsed = parseRuleConfigList({
            items: [
                {
                    uuid: "rule-1",
                    title: "Rule title",
                    rule: "Rule body",
                    whyIsThisImportant: "Because",
                    severity: "HIGH",
                    examples: [
                        {
                            snippet: "bad example",
                            isCorrect: false,
                        },
                        {
                            snippet: "good example",
                            isCorrect: true,
                        },
                    ],
                    language: "",
                    buckets: ["bucket-1", "bucket-1", "bucket-2"],
                    scope: "pull-request",
                    plugAndPlay: true,
                },
            ],
        })

        expect(parsed).toEqual([
            {
                uuid: "rule-1",
                title: "Rule title",
                rule: "Rule body",
                whyIsThisImportant: "Because",
                severity: "HIGH",
                examples: [
                    {
                        snippet: "bad example",
                        isCorrect: false,
                    },
                    {
                        snippet: "good example",
                        isCorrect: true,
                    },
                ],
                language: "*",
                buckets: ["bucket-1", "bucket-2"],
                scope: "PULL_REQUEST",
                plugAndPlay: true,
            },
        ])
    })

    test("returns undefined for invalid rule payload", () => {
        expect(parseRuleConfigList("invalid")).toBeUndefined()
        expect(parseRuleConfigList([])).toBeUndefined()
        expect(parseRuleConfigList({})).toBeUndefined()
        expect(parseRuleConfigList({items: []})).toEqual([])
        expect(parseRuleConfigList({items: [{uuid: ""}]})).toBeUndefined()
        expect(parseRuleConfigList({items: ["bad"]})).toBeUndefined()
        expect(parseRuleConfigList({items: [null]})).toBeUndefined()
    })

    test("returns undefined when examples or buckets payload is malformed", () => {
        expect(parseRuleConfigList({
            items: [
                {
                    uuid: "rule-7",
                    title: "Rule title",
                    rule: "Rule body",
                    whyIsThisImportant: "Because",
                    severity: "LOW",
                    examples: "bad",
                    language: "ts",
                    buckets: ["bucket"],
                    scope: "FILE",
                    plugAndPlay: false,
                },
            ],
        })).toBeUndefined()
        expect(parseRuleConfigList({
            items: [
                {
                    uuid: "rule-8",
                    title: "Rule title",
                    rule: "Rule body",
                    whyIsThisImportant: "Because",
                    severity: "LOW",
                    examples: ["bad"],
                    language: "ts",
                    buckets: ["bucket"],
                    scope: "FILE",
                    plugAndPlay: false,
                },
            ],
        })).toBeUndefined()
        expect(parseRuleConfigList({
            items: [
                {
                    uuid: "rule-9",
                    title: "Rule title",
                    rule: "Rule body",
                    whyIsThisImportant: "Because",
                    severity: "LOW",
                    examples: [
                        {
                            snippet: "ok",
                            isCorrect: true,
                        },
                    ],
                    language: "ts",
                    buckets: "bad",
                    scope: "FILE",
                    plugAndPlay: false,
                },
            ],
        })).toBeUndefined()
        expect(parseRuleConfigList({
            items: [
                {
                    uuid: "rule-10",
                    title: "Rule title",
                    rule: "Rule body",
                    whyIsThisImportant: "Because",
                    severity: "LOW",
                    examples: [
                        {
                            snippet: "ok",
                            isCorrect: true,
                        },
                    ],
                    language: "ts",
                    buckets: ["   "],
                    scope: "FILE",
                    plugAndPlay: false,
                },
            ],
        })).toBeUndefined()
    })

    test("returns undefined when language or scope payload is invalid", () => {
        expect(parseRuleConfigList({
            items: [
                {
                    uuid: "rule-11",
                    title: "Rule title",
                    rule: "Rule body",
                    whyIsThisImportant: "Because",
                    severity: "LOW",
                    examples: [
                        {
                            snippet: "ok",
                            isCorrect: true,
                        },
                    ],
                    language: 123,
                    buckets: ["bucket"],
                    scope: "FILE",
                    plugAndPlay: false,
                },
            ],
        })).toBeUndefined()
        expect(parseRuleConfigList({
            items: [
                {
                    uuid: "rule-12",
                    title: "Rule title",
                    rule: "Rule body",
                    whyIsThisImportant: "Because",
                    severity: "LOW",
                    examples: [
                        {
                            snippet: "ok",
                            isCorrect: true,
                        },
                    ],
                    language: "ts",
                    buckets: ["bucket"],
                    scope: 123,
                    plugAndPlay: false,
                },
            ],
        })).toBeUndefined()
        expect(parseRuleConfigList({
            items: [
                {
                    uuid: "rule-13",
                    title: "Rule title",
                    rule: "Rule body",
                    whyIsThisImportant: "Because",
                    severity: "LOW",
                    examples: [
                        {
                            snippet: "ok",
                            isCorrect: true,
                        },
                    ],
                    language: "ts",
                    buckets: ["bucket"],
                    scope: "   ",
                    plugAndPlay: false,
                },
            ],
        })).toBeUndefined()
    })

    test("returns undefined on duplicate uuids", () => {
        const parsed = parseRuleConfigList({
            items: [
                {
                    uuid: "rule-1",
                    title: "Rule title",
                    rule: "Rule body",
                    whyIsThisImportant: "Because",
                    severity: "HIGH",
                    examples: [
                        {
                            snippet: "bad example",
                            isCorrect: false,
                        },
                    ],
                    language: "*",
                    buckets: ["bucket-1"],
                    scope: "FILE",
                    plugAndPlay: false,
                },
                {
                    uuid: "rule-1",
                    title: "Rule title 2",
                    rule: "Rule body 2",
                    whyIsThisImportant: "Because 2",
                    severity: "LOW",
                    examples: [
                        {
                            snippet: "good example",
                            isCorrect: true,
                        },
                    ],
                    language: "*",
                    buckets: ["bucket-2"],
                    scope: "FILE",
                    plugAndPlay: false,
                },
            ],
        })

        expect(parsed).toBeUndefined()
    })

    test("returns undefined when examples or buckets are invalid", () => {
        expect(parseRuleConfigList({
            items: [
                {
                    uuid: "rule-2",
                    title: "Rule title",
                    rule: "Rule body",
                    whyIsThisImportant: "Because",
                    severity: "HIGH",
                    examples: [
                        {
                            snippet: "",
                            isCorrect: true,
                        },
                    ],
                    language: "ts",
                    buckets: ["quality"],
                    scope: "FILE",
                    plugAndPlay: false,
                },
            ],
        })).toBeUndefined()

        expect(parseRuleConfigList({
            items: [
                {
                    uuid: "rule-3",
                    title: "Rule title",
                    rule: "Rule body",
                    whyIsThisImportant: "Because",
                    severity: "HIGH",
                    examples: [
                        {
                            snippet: "ok",
                            isCorrect: true,
                        },
                    ],
                    language: "ts",
                    buckets: [],
                    scope: "FILE",
                    plugAndPlay: false,
                },
            ],
        })).toBeUndefined()
    })

    test("normalizes language and scope values", () => {
        const parsed = parseRuleConfigList({
            items: [
                {
                    uuid: "rule-4",
                    title: "Rule title",
                    rule: "Rule body",
                    whyIsThisImportant: "Because",
                    severity: "LOW",
                    examples: [
                        {
                            snippet: "example",
                            isCorrect: true,
                        },
                    ],
                    language: "TypeScript",
                    buckets: ["architecture"],
                    scope: "CCR",
                    plugAndPlay: true,
                },
            ],
        })

        expect(parsed?.[0]?.language).toBe("typescript")
        expect(parsed?.[0]?.scope).toBe("PULL_REQUEST")
    })

    test("returns undefined for invalid scope and plug-and-play types", () => {
        expect(parseRuleConfigList({
            items: [
                {
                    uuid: "rule-5",
                    title: "Rule title",
                    rule: "Rule body",
                    whyIsThisImportant: "Because",
                    severity: "LOW",
                    examples: [
                        {
                            snippet: "example",
                            isCorrect: true,
                        },
                    ],
                    language: "ts",
                    buckets: ["architecture"],
                    scope: "UNKNOWN",
                    plugAndPlay: true,
                },
            ],
        })).toBeUndefined()

        expect(parseRuleConfigList({
            items: [
                {
                    uuid: "rule-6",
                    title: "Rule title",
                    rule: "Rule body",
                    whyIsThisImportant: "Because",
                    severity: "LOW",
                    examples: [
                        {
                            snippet: "example",
                            isCorrect: true,
                        },
                    ],
                    language: "ts",
                    buckets: ["architecture"],
                    scope: "FILE",
                    plugAndPlay: "yes",
                },
            ],
        })).toBeUndefined()
    })
})
