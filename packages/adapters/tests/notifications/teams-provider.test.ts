import {describe, expect, test} from "bun:test"
import {
    NOTIFICATION_CHANNEL,
    NOTIFICATION_EVENT,
    NOTIFICATION_URGENCY,
    type INotificationPayload,
} from "@codenautic/core"

import {
    TEAMS_PROVIDER_ERROR_CODE,
    TeamsProvider,
    TeamsProviderError,
    type ITeamsCreateActivityRequest,
    type ITeamsCreateActivityResponse,
    type ITeamsRestClient,
} from "../../src/notifications"

type ITeamsFailure = Error | (Error & {statusCode?: number; retryAfterMs?: number})

class FakeTeamsClient implements ITeamsRestClient {
    public readonly calls: ITeamsCreateActivityRequest[]
    private readonly responses: Array<ITeamsCreateActivityResponse | ITeamsFailure>

    public constructor(
        responses: Array<ITeamsCreateActivityResponse | ITeamsFailure>,
    ) {
        this.calls = []
        this.responses = [...responses]
    }

    public createActivity(request: ITeamsCreateActivityRequest): Promise<ITeamsCreateActivityResponse> {
        this.calls.push(request)
        const response = this.responses.shift()
        if (response instanceof Error) {
            return Promise.reject(response)
        }

        return Promise.resolve(response ?? {id: "activity-1"})
    }
}

function createTeamsPayload(
    overrides: Partial<INotificationPayload> = {},
): INotificationPayload {
    return {
        channel: NOTIFICATION_CHANNEL.TEAMS,
        event: NOTIFICATION_EVENT.REVIEW_COMPLETED,
        recipients: ["19:conversation-a", "19:conversation-b", "19:conversation-a"],
        title: "Review completed",
        body: "Merge request is ready",
        urgency: NOTIFICATION_URGENCY.NORMAL,
        ...overrides,
    }
}

function createTeamsApiError(
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

describe("TeamsProvider", () => {
    test("sends one Teams activity per unique recipient and suppresses duplicate dedupe key", async () => {
        const client = new FakeTeamsClient([
            {id: "activity-1"},
            {id: "activity-2"},
        ])
        const provider = new TeamsProvider({
            client,
        })
        const payload = createTeamsPayload({
            dedupeKey: "review:123",
        })

        await provider.send(payload)
        await provider.send(payload)

        expect(client.calls).toHaveLength(2)
        expect(client.calls[0]).toEqual({
            conversationId: "19:conversation-a",
            text: "**Review completed**\n\nMerge request is ready",
        })
        expect(client.calls[1]?.conversationId).toBe("19:conversation-b")
    })

    test("derives deterministic dedupe key when payload does not provide one", async () => {
        const client = new FakeTeamsClient([{id: "activity-1"}])
        const provider = new TeamsProvider({
            client,
        })
        const payload = createTeamsPayload({
            recipients: ["19:conversation-a"],
        })

        await provider.send(payload)
        await provider.send(payload)

        expect(client.calls).toHaveLength(1)
    })

    test("retries rate-limited Teams API failures with retry-after hint", async () => {
        const sleepCalls: number[] = []
        const client = new FakeTeamsClient([
            createTeamsApiError("rate limited", {
                statusCode: 429,
                retryAfterMs: 2_000,
            }),
            {id: "activity-1"},
        ])
        const provider = new TeamsProvider({
            client,
            sleep(delayMs: number): Promise<void> {
                sleepCalls.push(delayMs)
                return Promise.resolve()
            },
        })

        await provider.send(
            createTeamsPayload({
                recipients: ["19:conversation-a"],
                dedupeKey: "rate-limit",
            }),
        )

        expect(client.calls).toHaveLength(2)
        expect(sleepCalls).toEqual([2_000])
    })

    test("retries retryable upstream failures before succeeding", async () => {
        const sleepCalls: number[] = []
        const client = new FakeTeamsClient([
            createTeamsApiError("upstream unavailable", {
                statusCode: 503,
            }),
            {id: "activity-2"},
        ])
        const provider = new TeamsProvider({
            client,
            sleep(delayMs: number): Promise<void> {
                sleepCalls.push(delayMs)
                return Promise.resolve()
            },
        })

        await provider.send(
            createTeamsPayload({
                recipients: ["19:conversation-a"],
                dedupeKey: "retry-upstream",
            }),
        )

        expect(client.calls).toHaveLength(2)
        expect(sleepCalls).toEqual([250])
    })

    test("throws typed error for non-retryable authentication failures", async () => {
        const client = new FakeTeamsClient([
            createTeamsApiError("unauthorized", {
                statusCode: 401,
            }),
        ])
        const provider = new TeamsProvider({
            client,
        })

        const error = await captureRejectedError(() =>
            provider.send(
                createTeamsPayload({
                    recipients: ["19:conversation-a"],
                    dedupeKey: "auth-failure",
                }),
            ),
        )

        expect(error).toBeInstanceOf(TeamsProviderError)
        expect(error).toMatchObject({
            code: TEAMS_PROVIDER_ERROR_CODE.AUTHENTICATION,
            isRetryable: false,
            statusCode: 401,
        })
    })

    test("validates constructor options and payload invariants", async () => {
        expect(() => {
            return new TeamsProvider({})
        }).toThrow("Teams bot token is required when client is not provided")

        expect(() => {
            return new TeamsProvider({
                client: new FakeTeamsClient([]),
                retryMaxAttempts: 0,
            })
        }).toThrow("retryMaxAttempts must be positive integer")

        const provider = new TeamsProvider({
            client: new FakeTeamsClient([]),
        })

        const error = await captureRejectedError(() =>
            provider.send(
                createTeamsPayload({
                    recipients: [" ", " "],
                }),
            ),
        )

        expect(error).toBeInstanceOf(TeamsProviderError)
        expect(error).toMatchObject({
            code: TEAMS_PROVIDER_ERROR_CODE.INVALID_PAYLOAD,
            isRetryable: false,
        })
    })
})
