import {describe, expect, test} from "bun:test"

import {UserFactory} from "../../../src/domain/factories/user.factory"
import {UserPreferences} from "../../../src/domain/value-objects/user-preferences.value-object"

describe("UserFactory", () => {
    test("creates user entity with stable defaults", () => {
        const factory = new UserFactory()
        const user = factory.create({
            email: "user@example.com",
            displayName: "User",
            roles: ["MEMBER"],
            preferences: {language: "en", receiveEmailNotifications: true, theme: "DARK"},
            authProviders: ["github"],
        })

        expect(user.email).toBe("user@example.com")
        expect(user.displayName).toBe("User")
        expect(user.roles).toHaveLength(1)
        expect(user.preferences.toJSON()).toEqual({
            theme: "DARK",
            language: "en",
            receiveEmailNotifications: true,
        })
    })

    test("reconstitutes user from persisted snapshot", () => {
        const factory = new UserFactory()
        const user = factory.reconstitute({
            id: "u-123",
            email: "USER@Example.COM",
            displayName: "Replayed User",
            roles: ["OWNER", "MEMBER"],
            preferences: {
                language: "fr-FR",
                theme: "LIGHT",
                receiveEmailNotifications: false,
            },
            authProviders: ["gitlab", "github"],
        })

        expect(user.id.value).toBe("u-123")
        expect(user.email).toBe("user@example.com")
        expect(user.roles).toHaveLength(2)
        expect(user.authProviders).toEqual(["gitlab", "github"])
        expect(user.preferences.toJSON()).toEqual({
            language: "fr-fr",
            theme: "LIGHT",
            receiveEmailNotifications: false,
        })
    })

    test("normalizes auth providers when creating", () => {
        const factory = new UserFactory()
        const user = factory.create({
            email: "user@example.com",
            displayName: "User",
            roles: ["MEMBER"],
            preferences: UserPreferences.create(),
            authProviders: ["github", "GITHUB", "gitlab"],
        })

        expect(user.authProviders).toEqual(["github", "gitlab"])
    })
})
