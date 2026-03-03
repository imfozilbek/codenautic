import {describe, expect, test} from "bun:test"

import {USER_THEME, UserPreferences} from "../../../src/domain/value-objects/user-preferences.value-object"

describe("UserPreferences", () => {
    test("creates default preferences when input is absent", () => {
        const preferences = UserPreferences.create()

        expect(preferences.theme).toBe(USER_THEME.SYSTEM)
        expect(preferences.language).toBe("en")
        expect(preferences.receiveEmailNotifications).toBe(true)
    })

    test("normalizes input values and trims language", () => {
        const preferences = UserPreferences.create({
            theme: " dark ",
            language: "Ru-Ru",
            receiveEmailNotifications: false,
        })

        expect(preferences.theme).toBe(USER_THEME.DARK)
        expect(preferences.language).toBe("ru-ru")
        expect(preferences.receiveEmailNotifications).toBe(false)
    })

    test("falls back to system theme for unknown values", () => {
        const preferences = UserPreferences.create({
            theme: "unsupported",
            language: "en",
        })

        expect(preferences.theme).toBe(USER_THEME.SYSTEM)
    })

    test("throws for unsupported language", () => {
        expect(() => {
            UserPreferences.create({language: "english"})
        }).toThrow("Unsupported language: english")

        expect(() => {
            UserPreferences.create({language: ""})
        }).toThrow("Language cannot be empty")
    })

    test("serializes to plain object", () => {
        const preferences = UserPreferences.create({
            theme: USER_THEME.LIGHT,
            language: "fr-FR",
            receiveEmailNotifications: false,
        })

        expect(preferences.toJSON()).toEqual({
            theme: USER_THEME.LIGHT,
            language: "fr-fr",
            receiveEmailNotifications: false,
        })
    })
})
