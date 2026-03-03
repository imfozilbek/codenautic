import {describe, expect, test} from "bun:test"

import {OrgSettings} from "../../../src/domain/value-objects/org-settings.value-object"

describe("OrgSettings", () => {
    test("creates empty settings by default", () => {
        const settings = OrgSettings.create()

        expect(settings.toJSON()).toEqual({})
        expect(settings.has("missing")).toBe(false)
    })

    test("normalizes keys and accepts primitive values", () => {
        const settings = OrgSettings.create({
            " review_window ": 14,
            "reviewNotifications": true,
            "defaultLanguage": "en",
        })

        expect(settings.toJSON()).toEqual({
            review_window: 14,
            reviewNotifications: true,
            defaultLanguage: "en",
        })
        expect(settings.get("defaultLanguage")).toBe("en")
    })

    test("merges settings with partial update", () => {
        const settings = OrgSettings.create({maxMembers: 10})
        const updated = settings.merge({maxMembers: 20, review: true})

        expect(updated.toJSON()).toEqual({
            maxMembers: 20,
            review: true,
        })
    })

    test("throws on non-object input", () => {
        expect(() => {
            OrgSettings.create("wrong" as unknown as Record<string, unknown>)
        }).toThrow("OrgSettings must be an object")
    })

    test("throws on invalid value type", () => {
        expect(() => {
            OrgSettings.create({complex: {a: 1}})
        }).toThrow("OrgSettings value for complex must be boolean, number, or string")
    })

    test("throws on empty key", () => {
        expect(() => {
            OrgSettings.create({"": "x"} as Record<string, unknown>)
        }).toThrow("OrgSettings key cannot be empty")
    })
})
