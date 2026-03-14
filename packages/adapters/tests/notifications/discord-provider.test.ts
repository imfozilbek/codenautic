import {describe, expect, test} from "bun:test"
import {
    NOTIFICATION_CHANNEL,
    NOTIFICATION_EVENT,
    NOTIFICATION_URGENCY,
    type INotificationPayload,
} from "@codenautic/core"

import {
    DISCORD_PROVIDER_ERROR_CODE,
    DiscordProvider,
    DiscordProviderError,
    type IDiscordCreateMessageRequest,
    type IDiscordCreateMessageResponse,
    type IDiscordRestClient,
} from "../../src/notifications"

type IDiscordFailure = Error | (Error & {statusCode?: number; retryAfterMs?: number})

class FakeDiscordClient implements IDiscordRestClient {
    public readonly calls: IDiscordCreateMessageRequest[]
    private readonly responses: Array<IDiscordCreateMessageResponse | IDiscordFailure>

    public constructor(
        responses: Array<IDiscordCreateMessageResponse | IDiscordFailure>,
    ) {
        this.calls = []
        this.responses = [...responses]
    }

    public createMessage(request: IDiscordCreateMessageRequest): Promise<IDiscordCreateMessageResponse> {
        this.calls.push(request)
        const response = this.responses.shift()
        if (response instanceof Error) {
            return Promise.reject(response)
        }

        return Promise.resolve(response ?? {id: "msg-1"})
    }
}

function createDiscordPayload(
    overrides: Partial<INotificationPayload> = {},
): INotificationPayload {
    return {
        channel: NOTIFICATION_CHANNEL.WEBHOOK,
        event: NOTIFICATION_EVENT.REVIEW_COMPLETED,
        recipients: ["123", "456", "123"],
        title: "Review completed",
        body: "Merge request is ready",
        urgency: NOTIFICATION_URGENCY.NORMAL,
        ...overrides,
    }
}

function createDiscordApiError(
    message: string,
    details: {
        readonly statusCode?: number
        readonly retryAfterMs?: number
    } = {},
): Error & {statusCode?: number; retryAfterMs?: number} {
    return Object.assign(new Error(message), details)
}

async function captureRejectedError(execute: () => Promise<unknown>): Promise<Error> {
    try {
        await execute()
    } catch (error) {
        if (error instanceof Error) {
            return error
        }
    }

    throw new Error("Expected promise to reject with Error")
}

describe("DiscordProvider", () => {
    test("sends one Discord message per unique recipient and suppresses duplicate dedupe key", async () => {
        const client = new FakeDiscordClient([
            {id: "msg-1"},
            {id: "msg-2"},
        ])
        const provider = new DiscordProvider({
            client,
        })
        const payload = createDiscordPayload({
            dedupeKey: "review:123",
        })

        await provider.send(payload)
        await provider.send(payload)

        expect(client.calls).toHaveLength(2)
        expect(client.calls[0]).toEqual({
            channelId: "123",
            content: "**Review completed**\nMerge request is ready",
            allowedMentions: {
                parse: [],
            },
        })
        expect(client.calls[1]?.channelId).toBe("456")
    })

    test("derives deterministic dedupe key when payload does not provide one", async () => {
        const client = new FakeDiscordClient([{id: "msg-1"}])
        const provider = new DiscordProvider({
            client,
        })
        const payload = createDiscordPayload({
            recipients: ["123"],
        })

        await provider.send(payload)
        await provider.send(payload)

        expect(client.calls).toHaveLength(1)
    })

    test("retries rate-limited Discord API failures with retry-after hint", async () => {
        const sleepCalls: number[] = []
        const client = new FakeDiscordClient([
            createDiscordApiError("rate limited", {
                statusCode: 429,
                retryAfterMs: 1_500,
            }),
            {id: "msg-1"},
        ])
        const provider = new DiscordProvider({
            client,
            sleep(delayMs: number): Promise<void> {
                sleepCalls.push(delayMs)
                return Promise.resolve()
            },
        })

        await provider.send(
            createDiscordPayload({
                recipients: ["123"],
                dedupeKey: "rate-limit",
            }),
        )

        expect(client.calls).toHaveLength(2)
        expect(sleepCalls).toEqual([1_500])
    })

    test("retries retryable upstream failures before succeeding", async () => {
        const sleepCalls: number[] = []
        const client = new FakeDiscordClient([
            createDiscordApiError("upstream unavailable", {
                statusCode: 503,
            }),
            {id: "msg-2"},
        ])
        const provider = new DiscordProvider({
            client,
            sleep(delayMs: number): Promise<void> {
                sleepCalls.push(delayMs)
                return Promise.resolve()
            },
        })

        await provider.send(
            createDiscordPayload({
                recipients: ["123"],
                dedupeKey: "retry-upstream",
            }),
        )

        expect(client.calls).toHaveLength(2)
        expect(sleepCalls).toEqual([250])
    })

    test("throws typed error for non-retryable authentication failures", async () => {
        const client = new FakeDiscordClient([
            createDiscordApiError("unauthorized", {
                statusCode: 401,
            }),
        ])
        const provider = new DiscordProvider({
            client,
        })

        const error = await captureRejectedError(() =>
            provider.send(
                createDiscordPayload({
                    recipients: ["123"],
                    dedupeKey: "auth-failure",
                }),
            ),
        )

        expect(error).toBeInstanceOf(DiscordProviderError)
        expect(error).toMatchObject({
            code: DISCORD_PROVIDER_ERROR_CODE.AUTHENTICATION,
            isRetryable: false,
            statusCode: 401,
        })
    })

    test("validates constructor options and payload invariants", async () => {
        expect(() => {
            return new DiscordProvider({})
        }).toThrow("Discord bot token is required when client is not provided")

        expect(() => {
            return new DiscordProvider({
                client: new FakeDiscordClient([]),
                retryMaxAttempts: 0,
            })
        }).toThrow("retryMaxAttempts must be positive integer")

        const provider = new DiscordProvider({
            client: new FakeDiscordClient([]),
        })

        const error = await captureRejectedError(() =>
            provider.send(
                createDiscordPayload({
                    recipients: [" ", " "],
                }),
            ),
        )

        expect(error).toBeInstanceOf(DiscordProviderError)
        expect(error).toMatchObject({
            code: DISCORD_PROVIDER_ERROR_CODE.INVALID_PAYLOAD,
            isRetryable: false,
        })
    })
})
