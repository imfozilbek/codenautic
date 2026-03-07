import {describe, expect, test} from "bun:test"

import {
    InboxDeduplicator,
    OUTBOX_WRITER_STATUS,
    OutboxWriter,
} from "../../src/messaging"

/**
 * Creates deterministic clock from ISO timeline.
 *
 * @param timeline Ordered ISO date strings.
 * @returns Clock function.
 */
function createClock(timeline: readonly string[]): () => Date {
    const values = [...timeline]
    const fallback = values[values.length - 1] ?? "2026-03-07T00:00:00.000Z"

    return (): Date => {
        const next = values.shift()
        if (next !== undefined) {
            return new Date(next)
        }

        return new Date(fallback)
    }
}

describe("Messaging idempotency adapters", () => {
    test("writes outbox message idempotently by message key", () => {
        const writer = new OutboxWriter(() => new Date("2026-03-07T10:00:00.000Z"))

        const first = writer.write({
            messageKey: " msg-1 ",
            eventType: " review.completed ",
            payload: {
                reviewId: "R-1",
            },
        })
        const second = writer.write({
            messageKey: "msg-1",
            eventType: "review.completed",
            payload: {
                reviewId: "R-2",
            },
        })

        expect(first.isDuplicate).toBe(false)
        expect(second.isDuplicate).toBe(true)
        expect(second.record.messageId).toBe(first.record.messageId)
        expect(second.record.eventType).toBe("review.completed")
        expect(second.record.payload).toEqual({
            reviewId: "R-1",
        })

        const pending = writer.findPending()
        expect(pending).toHaveLength(1)
        expect(pending[0]?.messageKey).toBe("msg-1")
    })

    test("keeps outbox retry state consistent across failures and duplicates", () => {
        const writer = new OutboxWriter(
            createClock([
                "2026-03-07T12:00:00.000Z",
                "2026-03-07T12:01:00.000Z",
                "2026-03-07T12:02:00.000Z",
            ]),
        )

        writer.write({
            messageKey: "msg-2",
            eventType: "review.failed",
            payload: {
                reviewId: "R-2",
            },
            maxRetries: 2.8,
        })

        writer.markFailed("msg-2")
        const afterFirstFailure = writer.findByMessageKey("msg-2")
        expect(afterFirstFailure).not.toBeNull()
        expect(afterFirstFailure?.status).toBe(OUTBOX_WRITER_STATUS.PENDING)
        expect(afterFirstFailure?.retryCount).toBe(1)
        expect(afterFirstFailure?.maxRetries).toBe(2)

        const duplicate = writer.write({
            messageKey: "msg-2",
            eventType: "review.failed",
            payload: {
                reviewId: "R-2",
            },
        })
        expect(duplicate.isDuplicate).toBe(true)
        expect(duplicate.record.retryCount).toBe(1)

        writer.markFailed("msg-2")
        const failed = writer.findByMessageKey("msg-2")
        expect(failed?.status).toBe(OUTBOX_WRITER_STATUS.FAILED)
        expect(failed?.retryCount).toBe(2)

        expect(() => writer.markSent("msg-2")).toThrow(
            "Failed outbox message cannot be marked as sent",
        )
        expect(writer.findPending()).toHaveLength(0)
    })

    test("supports pending queries and no-op transitions for unknown keys", () => {
        const writer = new OutboxWriter(() => new Date("2026-03-07T13:00:00.000Z"))

        writer.write({
            messageKey: "msg-a",
            eventType: "event.a",
            payload: {
                value: "A",
            },
        })
        writer.write({
            messageKey: "msg-b",
            eventType: "event.b",
            payload: {
                value: "B",
            },
        })
        writer.markSent("msg-a")
        writer.markSent("msg-a")
        writer.markFailed("msg-a")
        writer.markFailed("unknown")
        writer.markSent("unknown")

        expect(writer.findPending(1)).toHaveLength(1)
        expect(writer.findPending(0)).toHaveLength(0)
    })

    test("validates outbox inputs", () => {
        const writer = new OutboxWriter()

        expect(() =>
            writer.write({
                messageKey: " ",
                eventType: "event.x",
                payload: {
                    ok: true,
                },
            }),
        ).toThrow("messageKey cannot be empty")

        expect(() =>
            writer.write({
                messageKey: "msg-x",
                eventType: " ",
                payload: {
                    ok: true,
                },
            }),
        ).toThrow("eventType cannot be empty")

        expect(() =>
            writer.write({
                messageKey: "msg-x",
                eventType: "event.x",
                payload: [] as unknown as Record<string, unknown>,
            }),
        ).toThrow("payload must be JSON object")

        expect(() =>
            writer.write({
                messageKey: "msg-x",
                eventType: "event.x",
                payload: {
                    ok: true,
                },
                maxRetries: 0,
            }),
        ).toThrow("maxRetries must be greater than zero")

        expect(() =>
            writer.write({
                messageKey: "msg-x",
                eventType: "event.x",
                payload: {
                    ok: true,
                },
                maxRetries: Number.NaN,
            }),
        ).toThrow("maxRetries must be finite number")

        expect(() => writer.findPending(Number.NaN)).toThrow("limit must be finite number")
    })

    test("deduplicates inbox processing by message key", () => {
        const deduplicator = new InboxDeduplicator(() => new Date("2026-03-07T14:00:00.000Z"))

        const first = deduplicator.process({
            messageKey: " broker-1 ",
            eventType: " review.completed ",
        })
        const second = deduplicator.process({
            messageKey: "broker-1",
            eventType: "review.failed",
        })

        expect(first.isDuplicate).toBe(false)
        expect(second.isDuplicate).toBe(true)
        expect(second.record.messageId).toBe(first.record.messageId)
        expect(second.record.eventType).toBe("review.completed")
        expect(deduplicator.isDuplicate("broker-1")).toBe(true)
        expect(deduplicator.isDuplicate("unknown")).toBe(false)

        const existing = deduplicator.findByMessageKey("broker-1")
        expect(existing?.messageId).toBe(first.record.messageId)
    })

    test("validates inbox inputs and record lookups", () => {
        const deduplicator = new InboxDeduplicator()

        expect(deduplicator.findByMessageKey("known")).toBeNull()
        expect(
            deduplicator.process({
                messageKey: "fresh",
                eventType: "event.fresh",
            }).isDuplicate,
        ).toBe(false)

        expect(() =>
            deduplicator.process({
                messageKey: " ",
                eventType: "event.x",
            }),
        ).toThrow("messageKey cannot be empty")

        expect(() =>
            deduplicator.process({
                messageKey: "key",
                eventType: " ",
            }),
        ).toThrow("eventType cannot be empty")

        expect(() => deduplicator.isDuplicate(" ")).toThrow("messageKey cannot be empty")
        expect(() => deduplicator.findByMessageKey(" ")).toThrow("messageKey cannot be empty")
    })

    test("keeps outbox and inbox flow idempotent end-to-end by message key", () => {
        const outboxWriter = new OutboxWriter(() => new Date("2026-03-07T15:00:00.000Z"))
        const inboxDeduplicator = new InboxDeduplicator(() => new Date("2026-03-07T15:01:00.000Z"))

        const writeResult = outboxWriter.write({
            messageKey: "flow-1",
            eventType: "pipeline.completed",
            payload: {
                pipelineId: "P-1",
            },
        })

        const firstProcess = inboxDeduplicator.process({
            messageKey: writeResult.record.messageKey,
            eventType: writeResult.record.eventType,
        })
        const secondProcess = inboxDeduplicator.process({
            messageKey: writeResult.record.messageKey,
            eventType: writeResult.record.eventType,
        })

        expect(firstProcess.isDuplicate).toBe(false)
        expect(secondProcess.isDuplicate).toBe(true)
    })
})
