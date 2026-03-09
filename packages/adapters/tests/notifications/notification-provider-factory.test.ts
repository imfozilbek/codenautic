import {describe, expect, test} from "bun:test"

import {NOTIFICATION_CHANNEL} from "@codenautic/core"

import {
    NOTIFICATION_PROVIDER_FACTORY_ERROR_CODE,
    NotificationProviderFactory,
    NotificationProviderFactoryError,
    normalizeNotificationProviderChannel,
} from "../../src/notifications"
import {createNotificationProviderMock} from "../helpers/provider-factories"

describe("NotificationProviderFactory", () => {
    test("normalizes notification channel aliases to canonical values", () => {
        expect(normalizeNotificationProviderChannel("slack")).toBe(NOTIFICATION_CHANNEL.SLACK)
        expect(normalizeNotificationProviderChannel(" MS-Teams ")).toBe(NOTIFICATION_CHANNEL.TEAMS)
        expect(normalizeNotificationProviderChannel("mail")).toBe(NOTIFICATION_CHANNEL.EMAIL)
        expect(normalizeNotificationProviderChannel("hook")).toBe(NOTIFICATION_CHANNEL.WEBHOOK)
    })

    test("creates configured provider for canonical and alias channel values", () => {
        const slackProvider = createNotificationProviderMock(NOTIFICATION_CHANNEL.SLACK)
        const teamsProvider = createNotificationProviderMock(NOTIFICATION_CHANNEL.TEAMS)
        const factory = new NotificationProviderFactory({
            slack: slackProvider,
            teams: teamsProvider,
        })

        expect(factory.create("SLACK")).toBe(slackProvider)
        expect(factory.create("teams")).toBe(teamsProvider)
        expect(factory.create("microsoft-teams")).toBe(teamsProvider)
    })

    test("throws typed error for unknown channel values", () => {
        expect(() => {
            return normalizeNotificationProviderChannel("discord")
        }).toThrowError(NotificationProviderFactoryError)

        try {
            normalizeNotificationProviderChannel("discord")
            throw new Error("Expected NotificationProviderFactoryError to be thrown")
        } catch (error: unknown) {
            expect(error).toMatchObject({
                name: "NotificationProviderFactoryError",
                code: NOTIFICATION_PROVIDER_FACTORY_ERROR_CODE.UNKNOWN_CHANNEL,
                channel: "discord",
                message: "Unknown notification channel: discord",
            })
        }
    })

    test("throws typed error when known channel is not configured", () => {
        const factory = new NotificationProviderFactory({
            slack: createNotificationProviderMock(NOTIFICATION_CHANNEL.SLACK),
        })

        try {
            factory.create("EMAIL")
            throw new Error("Expected NotificationProviderFactoryError to be thrown")
        } catch (error: unknown) {
            expect(error).toMatchObject({
                name: "NotificationProviderFactoryError",
                code: NOTIFICATION_PROVIDER_FACTORY_ERROR_CODE.PROVIDER_NOT_CONFIGURED,
                channel: "EMAIL",
                message: "Notification provider is not configured for channel: EMAIL",
            })
        }
    })

    test("throws typed error for misconfigured provider channel mismatch", () => {
        expect(() => {
            return new NotificationProviderFactory({
                slack: createNotificationProviderMock(NOTIFICATION_CHANNEL.EMAIL),
            })
        }).toThrowError(NotificationProviderFactoryError)

        try {
            new NotificationProviderFactory({
                slack: createNotificationProviderMock(NOTIFICATION_CHANNEL.EMAIL),
            })
            throw new Error("Expected NotificationProviderFactoryError to be thrown")
        } catch (error: unknown) {
            expect(error).toMatchObject({
                name: "NotificationProviderFactoryError",
                code: NOTIFICATION_PROVIDER_FACTORY_ERROR_CODE.PROVIDER_CHANNEL_MISMATCH,
                channel: "SLACK",
                expectedChannel: NOTIFICATION_CHANNEL.SLACK,
                actualChannel: NOTIFICATION_CHANNEL.EMAIL,
                message: "Notification provider for slot SLACK is misconfigured: expected SLACK, received EMAIL",
            })
        }
    })

    test("preserves empty channel input in public error message", () => {
        try {
            normalizeNotificationProviderChannel("   ")
            throw new Error("Expected NotificationProviderFactoryError to be thrown")
        } catch (error: unknown) {
            expect(error).toMatchObject({
                code: NOTIFICATION_PROVIDER_FACTORY_ERROR_CODE.UNKNOWN_CHANNEL,
                channel: "   ",
                message: "Unknown notification channel: <empty>",
            })
        }
    })
})
