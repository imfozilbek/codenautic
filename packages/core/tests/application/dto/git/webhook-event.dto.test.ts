import {describe, expect, test} from "bun:test"

import type {IWebhookEventDTO} from "../../../../src/application/dto/git/webhook-event.dto"

describe("IWebhookEventDTO", () => {
    test("supports webhook payload with unknown body", () => {
        const event: IWebhookEventDTO = {
            eventType: "merge_request",
            payload: {
                action: "open",
                id: 123,
            },
            signature: "sha256=abc",
            platform: "gitlab",
            timestamp: new Date("2026-03-03T08:00:00.000Z"),
        }

        expect(event.eventType).toBe("merge_request")
        expect(event.platform).toBe("gitlab")
        expect(event.timestamp.toISOString()).toBe("2026-03-03T08:00:00.000Z")
    })
})
