import {describe, expect, test} from "bun:test"

import {MemberRole} from "../../../src/domain/value-objects/member-role.value-object"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"
import {User, type IUserProps} from "../../../src/domain/entities/user.entity"
import {UserPreferences} from "../../../src/domain/value-objects/user-preferences.value-object"

describe("User", () => {
    test("normalizes and deduplicates incoming state", () => {
        const user = new User(UniqueId.create(), {
            email: "  USER@Example.Com ",
            displayName: "  CodeNautic Owner ",
            roles: [MemberRole.create("ADMIN"), MemberRole.create("OWNER"), MemberRole.create("ADMIN")],
            preferences: UserPreferences.create(),
            authProviders: [" github ", "gitlab", "github"],
        })

        expect(user.email).toBe("user@example.com")
        expect(user.displayName).toBe("CodeNautic Owner")
        expect(user.roles).toHaveLength(2)
        expect(user.roles.map((role) => role.toString())).toEqual([
            "ADMIN",
            "OWNER",
        ])
        expect(user.authProviders).toEqual(["github", "gitlab"])
    })

    test("throws on invalid email", () => {
        expect(() => {
            const props: IUserProps = {
                email: "not-an-email",
                displayName: "User",
                roles: [MemberRole.create("MEMBER")],
                preferences: UserPreferences.create(),
                authProviders: ["github"],
            }
            void new User(UniqueId.create(), props)
        }).toThrow("Invalid email")
    })

    test("throws on empty display name", () => {
        expect(() => {
            const props: IUserProps = {
                email: "user@example.com",
                displayName: "    ",
                roles: [MemberRole.create("MEMBER")],
                preferences: UserPreferences.create(),
                authProviders: ["github"],
            }
            void new User(UniqueId.create(), props)
        }).toThrow("Display name cannot be empty")
    })

    test("throws when auth provider input contains empty values", () => {
        expect(() => {
            const props: IUserProps = {
                email: "user@example.com",
                displayName: "User",
                roles: [MemberRole.create("MEMBER")],
                preferences: UserPreferences.create(),
                authProviders: ["github", "  "],
            }
            void new User(UniqueId.create(), props)
        }).toThrow("Auth provider cannot be empty")
    })

    test("updates preferences using value object", () => {
        const user = new User(UniqueId.create(), {
            email: "user@example.com",
            displayName: "User",
            roles: [MemberRole.create("MEMBER")],
            preferences: UserPreferences.create({language: "en"}),
            authProviders: ["github"],
        })
        const updatedPreferences = UserPreferences.create({
            language: "ru-RU",
            receiveEmailNotifications: false,
        })

        user.updatePreferences(updatedPreferences)

        expect(user.preferences.toJSON().language).toBe("ru-ru")
        expect(user.preferences.receiveEmailNotifications).toBe(false)
    })

    test("checks role hierarchy in permission checks", () => {
        const user = new User(UniqueId.create(), {
            email: "user@example.com",
            displayName: "User",
            roles: [MemberRole.create("ADMIN")],
            preferences: UserPreferences.create(),
            authProviders: ["github"],
        })

        expect(user.hasRole(MemberRole.create("MEMBER"))).toBe(true)
        expect(user.hasRole(MemberRole.create("ADMIN"))).toBe(true)
        expect(user.hasRole(MemberRole.create("OWNER"))).toBe(false)
    })
})
