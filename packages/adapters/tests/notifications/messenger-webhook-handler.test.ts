import {createHmac} from "node:crypto"

import {describe, expect, test} from "bun:test"
import type {IWebhookEventDTO} from "@codenautic/core"

import {
    MESSENGER_WEBHOOK_HANDLE_STATUS,
    MESSENGER_WEBHOOK_HANDLER_ERROR_CODE,
    MESSENGER_WEBHOOK_PARSE_KIND,
    MessengerWebhookHandler,
    MessengerWebhookHandlerError,
    SlackProvider,
    createSlackWebhookProcessor,
    type IMessengerWebhookHandleResult,
    type IMessengerWebhookParseResult,
    type IMessengerWebhookParsedEvent,
    type IMessengerWebhookProcessor,
    type ISlackPostMessageRequest,
    type ISlackPostMessageResponse,
    type ISlackWebApiClient,
} from "../../src/notifications"

type ProcessHandler = (event: IMessengerWebhookParsedEvent) => Promise<void>

interface IFakeProcessorOptions {
    readonly platform?: string
    readonly verifyResult?: boolean
    readonly parseResult?: IMessengerWebhookParseResult
    readonly parseError?: Error
    readonly processHandlers?: readonly ProcessHandler[]
}

class FakeMessengerWebhookProcessor implements IMessengerWebhookProcessor {
    public readonly platform: string
    public readonly verifyCalls: readonly {readonly rawBody?: string}[]
    public readonly parseCalls: readonly IWebhookEventDTO[]
    public readonly processCalls: readonly IMessengerWebhookParsedEvent[]

    private readonly verifyResult: boolean
    private readonly parseResult: IMessengerWebhookParseResult
    private readonly parseError?: Error
    private readonly processHandlers: ProcessHandler[]

    public constructor(options: IFakeProcessorOptions = {}) {
        this.platform = options.platform ?? "slack"
        this.verifyResult = options.verifyResult ?? true
        this.parseResult = options.parseResult ?? {
            kind: MESSENGER_WEBHOOK_PARSE_KIND.EVENT,
            event: createParsedEvent(),
        }
        this.parseError = options.parseError
        this.verifyCalls = []
        this.parseCalls = []
        this.processCalls = []
        this.processHandlers = [...(options.processHandlers ?? [])]
    }

    public verifySignature(_event: IWebhookEventDTO, rawBody?: string): boolean {
        ;(this.verifyCalls as {rawBody?: string}[]).push({rawBody})
        return this.verifyResult
    }

    public parseEvent(event: IWebhookEventDTO): IMessengerWebhookParseResult {
        ;(this.parseCalls as IWebhookEventDTO[]).push(event)
        if (this.parseError !== undefined) {
            throw this.parseError
        }

        return this.parseResult
    }

    public async processEvent(event: IMessengerWebhookParsedEvent): Promise<void> {
        ;(this.processCalls as IMessengerWebhookParsedEvent[]).push(event)

        const nextHandler = this.processHandlers.shift()
        if (nextHandler !== undefined) {
            await nextHandler(event)
        }
    }
}

class FakeSlackClient implements ISlackWebApiClient {
    public readonly chat = {
        postMessage: (_request: ISlackPostMessageRequest): Promise<ISlackPostMessageResponse> => {
            return Promise.resolve({ok: true})
        },
    }
}

function createWebhookEvent(overrides: Partial<IWebhookEventDTO> = {}): IWebhookEventDTO {
    return {
        eventType: "event_callback",
        payload: {
            type: "event_callback",
            event_id: "Ev123",
            event_time: 1_773_020_000,
            event: {
                type: "app_mention",
                channel: "C123",
                user: "U123",
                text: "hello bot",
                event_ts: "1773020000.000100",
            },
        },
        signature: "signature",
        platform: "slack",
        timestamp: new Date("2026-03-10T10:00:00.000Z"),
        ...overrides,
    }
}

function createParsedEvent(overrides: Partial<IMessengerWebhookParsedEvent> = {}): IMessengerWebhookParsedEvent {
    return {
        dedupeKey: "slack:Ev123",
        eventType: "app_mention",
        occurredAt: new Date("2026-03-10T10:00:00.000Z"),
        payload: {
            text: "hello bot",
        },
        metadata: {},
        actorId: "U123",
        channelId: "C123",
        text: "hello bot",
        ...overrides,
    }
}

function createDeferredPromise<TValue>(): {
    readonly promise: Promise<TValue>
    resolve(value: TValue): void
    reject(reason: unknown): void
} {
    let resolveValue: ((value: TValue) => void) | null = null
    let rejectValue: ((reason: unknown) => void) | null = null

    const promise = new Promise<TValue>((resolve, reject) => {
        resolveValue = resolve
        rejectValue = reject
    })

    return {
        promise,
        resolve(value: TValue): void {
            if (resolveValue !== null) {
                resolveValue(value)
            }
        },
        reject(reason: unknown): void {
            if (rejectValue !== null) {
                rejectValue(reason)
            }
        },
    }
}

async function expectRejectToMatch(
    execution: Promise<unknown>,
    expectation: Partial<MessengerWebhookHandlerError>,
): Promise<void> {
    try {
        await execution
        throw new Error("Expected MessengerWebhookHandlerError to be thrown")
    } catch (error) {
        expect(error).toBeInstanceOf(MessengerWebhookHandlerError)
        expect(error).toMatchObject(expectation)
    }
}

function createRetryableFailure(message: string): Error & {isRetryable: boolean} {
    return Object.assign(new Error(message), {isRetryable: true})
}

function createSignedSlackEvent(
    payload: Readonly<Record<string, unknown>>,
    options: {
        readonly secret?: string
        readonly timestamp?: Date
    } = {},
): {
    readonly event: IWebhookEventDTO
    readonly rawBody: string
} {
    const secret = options.secret ?? "signing-secret"
    const timestamp = options.timestamp ?? new Date("2026-03-10T10:00:00.000Z")
    const rawBody = JSON.stringify(payload)
    const timestampSeconds = Math.floor(timestamp.getTime() / 1000)
    const signature = `v0=${createHmac("sha256", secret)
        .update(`v0:${timestampSeconds}:${rawBody}`)
        .digest("hex")}`

    return {
        rawBody,
        event: createWebhookEvent({
            payload,
            signature,
            timestamp,
        }),
    }
}

describe("MessengerWebhookHandler", () => {
    test("processes supported platform event and returns normalized contract", async () => {
        const processor = new FakeMessengerWebhookProcessor()
        const handler = new MessengerWebhookHandler({
            processors: [processor],
        })

        const result = await handler.handle(createWebhookEvent(), "raw-payload")

        expect(result).toEqual({
            status: MESSENGER_WEBHOOK_HANDLE_STATUS.PROCESSED,
            platform: "slack",
            dedupeKey: "slack:Ev123",
            event: createParsedEvent(),
        })
        expect(processor.verifyCalls).toEqual([{rawBody: "raw-payload"}])
        expect(processor.parseCalls).toHaveLength(1)
        expect(processor.processCalls).toEqual([createParsedEvent()])
    })

    test("returns challenge response without invoking processing pipeline", async () => {
        const processor = new FakeMessengerWebhookProcessor({
            parseResult: {
                kind: MESSENGER_WEBHOOK_PARSE_KIND.CHALLENGE,
                challenge: "challenge-token",
            },
        })
        const handler = new MessengerWebhookHandler({
            processors: [processor],
        })

        const result = await handler.handle(createWebhookEvent())

        expect(result).toEqual({
            status: MESSENGER_WEBHOOK_HANDLE_STATUS.CHALLENGE,
            platform: "slack",
            challenge: "challenge-token",
        } as IMessengerWebhookHandleResult)
        expect(processor.processCalls).toHaveLength(0)
    })

    test("ensures idempotent processing for concurrent and repeated dedupe keys", async () => {
        const deferred = createDeferredPromise<void>()
        const processor = new FakeMessengerWebhookProcessor({
            processHandlers: [
                async () => deferred.promise,
            ],
        })
        const handler = new MessengerWebhookHandler({
            processors: [processor],
        })

        const firstExecution = handler.handle(createWebhookEvent())
        const secondExecution = handler.handle(createWebhookEvent())

        deferred.resolve(undefined)

        const firstResult = await firstExecution
        const secondResult = await secondExecution
        const thirdResult = await handler.handle(createWebhookEvent())

        expect(firstResult.status).toBe(MESSENGER_WEBHOOK_HANDLE_STATUS.PROCESSED)
        expect(secondResult.status).toBe(MESSENGER_WEBHOOK_HANDLE_STATUS.DUPLICATE)
        expect(thirdResult.status).toBe(MESSENGER_WEBHOOK_HANDLE_STATUS.DUPLICATE)
        expect(processor.processCalls).toHaveLength(1)
    })

    test("retries retryable failures with exponential backoff and bounded jitter", async () => {
        const sleepCalls: number[] = []
        const randomValues = [0.5, 0.1]
        const processor = new FakeMessengerWebhookProcessor({
            processHandlers: [
                () => Promise.reject(createRetryableFailure("temporary one")),
                () => Promise.reject(createRetryableFailure("temporary two")),
                () => Promise.resolve(),
            ],
        })
        const handler = new MessengerWebhookHandler({
            processors: [processor],
            retryMaxAttempts: 3,
            baseDelayMs: 100,
            maxJitterMs: 50,
            random: (): number => {
                const value = randomValues.shift()
                return value ?? 0
            },
            sleep: (delayMs: number): Promise<void> => {
                sleepCalls.push(delayMs)
                return Promise.resolve()
            },
        })

        const result = await handler.handle(createWebhookEvent())

        expect(result.status).toBe(MESSENGER_WEBHOOK_HANDLE_STATUS.PROCESSED)
        expect(processor.processCalls).toHaveLength(3)
        expect(sleepCalls).toEqual([125, 205])
    })

    test("throws typed errors for unsupported platform and invalid signature", async () => {
        const processor = new FakeMessengerWebhookProcessor()
        const handler = new MessengerWebhookHandler({
            processors: [processor],
        })

        await expectRejectToMatch(handler.handle(createWebhookEvent({platform: "discord"})), {
            code: MESSENGER_WEBHOOK_HANDLER_ERROR_CODE.UNSUPPORTED_PLATFORM,
            isRetryable: false,
            platform: "discord",
        })

        const invalidSignatureHandler = new MessengerWebhookHandler({
            processors: [
                new FakeMessengerWebhookProcessor({
                    verifyResult: false,
                }),
            ],
        })

        await expectRejectToMatch(invalidSignatureHandler.handle(createWebhookEvent()), {
            code: MESSENGER_WEBHOOK_HANDLER_ERROR_CODE.INVALID_SIGNATURE,
            isRetryable: false,
            platform: "slack",
        })
    })

    test("throws upstream unavailable error after retry exhaustion", async () => {
        const sleepCalls: number[] = []
        const processor = new FakeMessengerWebhookProcessor({
            processHandlers: [
                () => Promise.reject(createRetryableFailure("provider unavailable")),
                () => Promise.reject(createRetryableFailure("provider unavailable")),
            ],
        })
        const handler = new MessengerWebhookHandler({
            processors: [processor],
            retryMaxAttempts: 2,
            baseDelayMs: 250,
            maxJitterMs: 0,
            sleep: (delayMs: number): Promise<void> => {
                sleepCalls.push(delayMs)
                return Promise.resolve()
            },
        })

        await expectRejectToMatch(handler.handle(createWebhookEvent()), {
            code: MESSENGER_WEBHOOK_HANDLER_ERROR_CODE.UPSTREAM_UNAVAILABLE,
            isRetryable: true,
            dedupeKey: "slack:Ev123",
            platform: "slack",
        })
        expect(sleepCalls).toEqual([250])
    })

    test("createSlackWebhookProcessor maps Slack envelopes into normalized handler events", async () => {
        const mappedEvents: IMessengerWebhookParsedEvent[] = []
        const slackProvider = new SlackProvider({
            client: new FakeSlackClient(),
            token: "xoxb-test",
            signingSecret: "signing-secret",
            now: () => new Date("2026-03-10T10:02:00.000Z"),
        })
        const processor = createSlackWebhookProcessor({
            provider: slackProvider,
            onEvent: (event: IMessengerWebhookParsedEvent): Promise<void> => {
                mappedEvents.push(event)
                return Promise.resolve()
            },
        })
        const handler = new MessengerWebhookHandler({
            processors: [processor],
        })
        const {event, rawBody} = createSignedSlackEvent({
            type: "event_callback",
            event_id: "Ev999",
            event_time: 1_773_020_000,
            event: {
                type: "app_mention",
                channel: "C777",
                user: "U777",
                text: "deploy status",
                thread_ts: "1773020000.000200",
                event_ts: "1773020000.000200",
            },
        })

        const result = await handler.handle(event, rawBody)

        expect(result).toMatchObject({
            status: MESSENGER_WEBHOOK_HANDLE_STATUS.PROCESSED,
            platform: "slack",
            dedupeKey: "slack:Ev999",
            event: {
                eventType: "app_mention",
                channelId: "C777",
                actorId: "U777",
                text: "deploy status",
            },
        })
        expect(mappedEvents).toHaveLength(1)
        expect(mappedEvents[0]?.dedupeKey).toBe("slack:Ev999")
    })
})
