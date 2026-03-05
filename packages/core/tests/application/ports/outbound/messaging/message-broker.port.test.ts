import {describe, expect, test} from "bun:test"

import {
    toMessageBrokerEnvelope,
} from "../../../../../src/application/ports/outbound/messaging/message-broker.port"
import {
    OutboxMessage,
    OUTBOX_MESSAGE_STATUS,
} from "../../../../../src/domain/entities/outbox-message.entity"
import {UniqueId} from "../../../../../src/domain/value-objects/unique-id.value-object"

describe("message broker port", () => {
    test("serializes outbox message to broker envelope", () => {
        const message = new OutboxMessage(UniqueId.create("msg-1"), {
            eventType: "review.completed",
            payload: JSON.stringify({reviewId: "r-1"}),
            status: OUTBOX_MESSAGE_STATUS.PENDING,
            retryCount: 0,
            maxRetries: 1,
        })

        const envelope = toMessageBrokerEnvelope(message)

        expect(envelope).toEqual({
            messageId: "msg-1",
            eventType: "review.completed",
            payload: {
                reviewId: "r-1",
            },
        })
    })

    test("throws when payload is not an object", () => {
        const message = new OutboxMessage(UniqueId.create("msg-2"), {
            eventType: "review.completed",
            payload: JSON.stringify(["bad"]),
            status: OUTBOX_MESSAGE_STATUS.PENDING,
            retryCount: 0,
            maxRetries: 1,
        })

        expect(() => {
            toMessageBrokerEnvelope(message)
        }).toThrow("Outbox payload must be JSON object")
    })
})
