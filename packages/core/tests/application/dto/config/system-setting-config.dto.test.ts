import {describe, expect, test} from "bun:test"

import {
    parseSystemSettingConfigList,
} from "../../../../src/application/dto/config/system-setting-config.dto"

describe("system setting config dto", () => {
    test("parses valid system settings list", () => {
        const parsed = parseSystemSettingConfigList({
            items: [
                {
                    key: "review.defaults",
                    value: {maxSuggestionsPerCCR: 30},
                },
                {
                    key: "review.blocking_severities",
                    value: ["CRITICAL", "HIGH"],
                },
            ],
        })

        expect(parsed).toEqual([
            {
                key: "review.defaults",
                value: {maxSuggestionsPerCCR: 30},
            },
            {
                key: "review.blocking_severities",
                value: ["CRITICAL", "HIGH"],
            },
        ])
    })

    test("returns undefined on duplicate key", () => {
        const parsed = parseSystemSettingConfigList({
            items: [
                {
                    key: "review.defaults",
                    value: {maxSuggestionsPerCCR: 30},
                },
                {
                    key: "Review.Defaults",
                    value: {maxSuggestionsPerCCR: 40},
                },
            ],
        })

        expect(parsed).toBeUndefined()
    })

    test("returns undefined for invalid payload shape", () => {
        expect(parseSystemSettingConfigList(null)).toBeUndefined()
        expect(parseSystemSettingConfigList({})).toBeUndefined()
        expect(parseSystemSettingConfigList({items: {}})).toBeUndefined()
        expect(parseSystemSettingConfigList({items: ["invalid"]})).toBeUndefined()
        expect(parseSystemSettingConfigList({items: [null]})).toBeUndefined()
    })

    test("returns undefined for invalid item fields", () => {
        expect(parseSystemSettingConfigList({
            items: [
                {
                    key: "",
                    value: {maxSuggestionsPerCCR: 30},
                },
            ],
        })).toBeUndefined()
        expect(parseSystemSettingConfigList({
            items: [
                {
                    key: "review.defaults",
                },
            ],
        })).toBeUndefined()
    })
})
