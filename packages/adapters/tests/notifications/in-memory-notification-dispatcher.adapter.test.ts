import {describe, expect, test} from "bun:test"

import {
    NOTIFICATION_ADAPTER_ERROR_CODE,
    NOTIFICATION_CHANNEL,
    NOTIFICATION_DELIVERY_STATUS,
    InMemoryNotificationDispatcherAdapter,
} from "../../src/notifications"

describe("InMemoryNotificationDispatcherAdapter", () => {
    test("dispatches notification and returns deterministic message id", () => {
        const dispatcher = new InMemoryNotificationDispatcherAdapter(
            () => new Date("2026-03-03T10:00:00.000Z"),
        )

        const result = dispatcher.dispatch({
            channel: NOTIFICATION_CHANNEL.SLACK,
            recipient: "team-review",
            body: "Pipeline completed",
            idempotencyKey: "notif-1",
            metadata: {
                reviewId: "rev-1",
            },
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected successful notification dispatch")
        }

        expect(result.value).toEqual({
            status: NOTIFICATION_DELIVERY_STATUS.SENT,
            messageId: "notif-89e27b13fd4b9b4b",
            channel: NOTIFICATION_CHANNEL.SLACK,
            recipient: "team-review",
            dispatchedAt: new Date("2026-03-03T10:00:00.000Z"),
        })
    })

    test("returns duplicate result for repeated idempotency key", () => {
        let callCount = 0
        const dispatcher = new InMemoryNotificationDispatcherAdapter(() => {
            callCount += 1
            return new Date(`2026-03-03T10:00:0${callCount}.000Z`)
        })

        const first = dispatcher.dispatch({
            channel: NOTIFICATION_CHANNEL.EMAIL,
            recipient: "team@example.com",
            body: "First attempt",
            subject: "Subject",
            idempotencyKey: "notif-duplicate",
        })
        const second = dispatcher.dispatch({
            channel: NOTIFICATION_CHANNEL.EMAIL,
            recipient: "team@example.com",
            body: "Second attempt",
            idempotencyKey: "notif-duplicate",
        })

        expect(first.isOk).toBe(true)
        expect(second.isOk).toBe(true)
        if (first.isFail || second.isFail) {
            throw new Error("Expected successful notification dispatch")
        }

        expect(first.value.status).toBe(NOTIFICATION_DELIVERY_STATUS.SENT)
        expect(second.value.status).toBe(NOTIFICATION_DELIVERY_STATUS.DUPLICATE)
        expect(second.value.messageId).toBe(first.value.messageId)
        expect(second.value.dispatchedAt).toEqual(first.value.dispatchedAt)
        expect(callCount).toBe(1)
    })

    test("validates required request fields", () => {
        const dispatcher = new InMemoryNotificationDispatcherAdapter()

        const invalidKey = dispatcher.dispatch({
            channel: NOTIFICATION_CHANNEL.DISCORD,
            recipient: "alerts",
            body: "payload",
            idempotencyKey: " ",
        })
        const invalidRecipient = dispatcher.dispatch({
            channel: NOTIFICATION_CHANNEL.DISCORD,
            recipient: " ",
            body: "payload",
            idempotencyKey: "notif-2",
        })
        const invalidBody = dispatcher.dispatch({
            channel: NOTIFICATION_CHANNEL.DISCORD,
            recipient: "alerts",
            body: " ",
            idempotencyKey: "notif-3",
        })

        expect(invalidKey.isFail).toBe(true)
        expect(invalidRecipient.isFail).toBe(true)
        expect(invalidBody.isFail).toBe(true)
        if (invalidKey.isOk || invalidRecipient.isOk || invalidBody.isOk) {
            throw new Error("Expected invalid notification errors")
        }

        expect(invalidKey.error.code).toBe(NOTIFICATION_ADAPTER_ERROR_CODE.INVALID_REQUEST)
        expect(invalidRecipient.error.code).toBe(NOTIFICATION_ADAPTER_ERROR_CODE.INVALID_REQUEST)
        expect(invalidBody.error.code).toBe(NOTIFICATION_ADAPTER_ERROR_CODE.INVALID_REQUEST)
    })

    test("rejects non-object metadata and allows undefined metadata", () => {
        const dispatcher = new InMemoryNotificationDispatcherAdapter()

        const valid = dispatcher.dispatch({
            channel: NOTIFICATION_CHANNEL.WEBHOOK,
            recipient: "https://hooks.local/abc",
            body: "Payload",
            idempotencyKey: "notif-4",
        })
        const invalid = dispatcher.dispatch({
            channel: NOTIFICATION_CHANNEL.WEBHOOK,
            recipient: "https://hooks.local/abc",
            body: "Payload",
            idempotencyKey: "notif-5",
            metadata: [] as unknown as Readonly<Record<string, unknown>>,
        })

        expect(valid.isOk).toBe(true)
        expect(invalid.isFail).toBe(true)
        if (invalid.isOk) {
            throw new Error("Expected invalid notification metadata")
        }

        expect(invalid.error.code).toBe(NOTIFICATION_ADAPTER_ERROR_CODE.INVALID_REQUEST)
    })
})
