import {createHash} from "node:crypto"

import type {
    ISlackEventEnvelopeDTO,
    ISlackProvider,
    IWebhookEventDTO,
} from "@codenautic/core"

import {
    MESSENGER_WEBHOOK_HANDLER_ERROR_CODE,
    MessengerWebhookHandlerError,
} from "./messenger-webhook-handler.error"

const DEFAULT_RETRY_MAX_ATTEMPTS = 3
const DEFAULT_BASE_DELAY_MS = 250
const DEFAULT_MAX_JITTER_MS = 50

/**
 * Supported parse outcomes for messenger webhook processors.
 */
export const MESSENGER_WEBHOOK_PARSE_KIND = {
    EVENT: "EVENT",
    CHALLENGE: "CHALLENGE",
} as const

/**
 * Messenger webhook parse outcome kind.
 */
export type MessengerWebhookParseKind =
    (typeof MESSENGER_WEBHOOK_PARSE_KIND)[keyof typeof MESSENGER_WEBHOOK_PARSE_KIND]

/**
 * Normalized processable messenger webhook event.
 */
export interface IMessengerWebhookParsedEvent {
    /**
     * Stable deduplication key for idempotent processing.
     */
    readonly dedupeKey: string

    /**
     * Platform-level event type.
     */
    readonly eventType: string

    /**
     * Event occurrence timestamp.
     */
    readonly occurredAt: Date

    /**
     * Event payload normalized as plain object.
     */
    readonly payload: Readonly<Record<string, unknown>>

    /**
     * Optional metadata produced by platform parser.
     */
    readonly metadata?: Readonly<Record<string, unknown>>

    /**
     * Optional actor/user identifier.
     */
    readonly actorId?: string

    /**
     * Optional channel/thread identifier.
     */
    readonly channelId?: string

    /**
     * Optional text body.
     */
    readonly text?: string
}

/**
 * Parse result for regular webhook events.
 */
export interface IMessengerWebhookParseEventResult {
    /**
     * Parse outcome kind.
     */
    readonly kind: typeof MESSENGER_WEBHOOK_PARSE_KIND.EVENT

    /**
     * Normalized event data.
     */
    readonly event: IMessengerWebhookParsedEvent
}

/**
 * Parse result for challenge/handshake events.
 */
export interface IMessengerWebhookParseChallengeResult {
    /**
     * Parse outcome kind.
     */
    readonly kind: typeof MESSENGER_WEBHOOK_PARSE_KIND.CHALLENGE

    /**
     * Challenge payload.
     */
    readonly challenge: string
}

/**
 * Supported parse outcomes from platform processor.
 */
export type IMessengerWebhookParseResult =
    | IMessengerWebhookParseEventResult
    | IMessengerWebhookParseChallengeResult

/**
 * Platform processor contract used by unified webhook handler.
 */
export interface IMessengerWebhookProcessor {
    /**
     * Canonical platform identifier handled by this processor.
     */
    readonly platform: string

    /**
     * Verifies external webhook signature.
     *
     * @param event Raw webhook event.
     * @param rawBody Optional original body used by signature algorithm.
     * @returns True when signature is valid.
     */
    verifySignature(event: IWebhookEventDTO, rawBody?: string): boolean

    /**
     * Parses raw webhook event into normalized contract.
     *
     * @param event Raw webhook event.
     * @returns Parse result.
     */
    parseEvent(event: IWebhookEventDTO): IMessengerWebhookParseResult

    /**
     * Processes normalized webhook event.
     *
     * @param event Normalized webhook event.
     * @returns Completion promise.
     */
    processEvent(event: IMessengerWebhookParsedEvent): Promise<void>
}

/**
 * Handler execution status.
 */
export const MESSENGER_WEBHOOK_HANDLE_STATUS = {
    PROCESSED: "PROCESSED",
    DUPLICATE: "DUPLICATE",
    CHALLENGE: "CHALLENGE",
} as const

/**
 * Handler execution status literal.
 */
export type MessengerWebhookHandleStatus =
    (typeof MESSENGER_WEBHOOK_HANDLE_STATUS)[keyof typeof MESSENGER_WEBHOOK_HANDLE_STATUS]

/**
 * Unified webhook handling result.
 */
export interface IMessengerWebhookHandleResult {
    /**
     * Handler execution status.
     */
    readonly status: MessengerWebhookHandleStatus

    /**
     * Canonical platform identifier.
     */
    readonly platform: string

    /**
     * Event dedupe key for event-based outcomes.
     */
    readonly dedupeKey?: string

    /**
     * Challenge payload for challenge-based outcomes.
     */
    readonly challenge?: string

    /**
     * Normalized event for event-based outcomes.
     */
    readonly event?: IMessengerWebhookParsedEvent
}

/**
 * Unified messenger webhook handler options.
 */
export interface IMessengerWebhookHandlerOptions {
    /**
     * Platform processors available for routing.
     */
    readonly processors: readonly IMessengerWebhookProcessor[]

    /**
     * Maximum retry attempts for retryable processing failures.
     */
    readonly retryMaxAttempts?: number

    /**
     * Base delay in milliseconds for exponential backoff.
     */
    readonly baseDelayMs?: number

    /**
     * Maximum jitter in milliseconds added to backoff delay.
     */
    readonly maxJitterMs?: number

    /**
     * Optional sleep implementation used between retries.
     */
    readonly sleep?: (delayMs: number) => Promise<void>

    /**
     * Optional random source used to calculate bounded jitter.
     */
    readonly random?: () => number
}

/**
 * Slack processor factory options.
 */
export interface ICreateSlackWebhookProcessorOptions {
    /**
     * Slack provider implementation used for signature and envelope normalization.
     */
    readonly provider: ISlackProvider

    /**
     * Event callback invoked after successful normalization.
     */
    readonly onEvent: (event: IMessengerWebhookParsedEvent) => Promise<void>
}

/**
 * Unified webhook handler for messenger platforms.
 */
export class MessengerWebhookHandler {
    private readonly processorsByPlatform: ReadonlyMap<string, IMessengerWebhookProcessor>
    private readonly retryMaxAttempts: number
    private readonly baseDelayMs: number
    private readonly maxJitterMs: number
    private readonly sleep: (delayMs: number) => Promise<void>
    private readonly random: () => number
    private readonly processedDedupeKeys: Set<string>
    private readonly inFlightByDedupeKey: Map<string, Promise<void>>

    /**
     * Creates unified messenger webhook handler.
     *
     * @param options Handler options.
     */
    public constructor(options: IMessengerWebhookHandlerOptions) {
        this.processorsByPlatform = buildProcessorsByPlatform(options.processors)
        this.retryMaxAttempts = normalizePositiveInteger(
            options.retryMaxAttempts,
            DEFAULT_RETRY_MAX_ATTEMPTS,
            "retryMaxAttempts",
        )
        this.baseDelayMs = normalizeNonNegativeInteger(
            options.baseDelayMs,
            DEFAULT_BASE_DELAY_MS,
            "baseDelayMs",
        )
        this.maxJitterMs = normalizeNonNegativeInteger(
            options.maxJitterMs,
            DEFAULT_MAX_JITTER_MS,
            "maxJitterMs",
        )
        this.sleep = options.sleep ?? defaultSleep
        this.random = options.random ?? Math.random
        this.processedDedupeKeys = new Set<string>()
        this.inFlightByDedupeKey = new Map<string, Promise<void>>()
    }

    /**
     * Handles one webhook event using platform-specific processor.
     *
     * @param event Raw webhook event DTO.
     * @param rawBody Optional raw body used by platform signature validation.
     * @returns Unified handling result.
     */
    public async handle(event: IWebhookEventDTO, rawBody?: string): Promise<IMessengerWebhookHandleResult> {
        const platform = normalizePlatform(event.platform)
        const processor = this.resolveProcessor(platform)

        if (processor.verifySignature(event, rawBody) === false) {
            throw new MessengerWebhookHandlerError("Webhook signature verification failed", {
                code: MESSENGER_WEBHOOK_HANDLER_ERROR_CODE.INVALID_SIGNATURE,
                isRetryable: false,
                platform,
            })
        }

        const parsedResult = this.parseWebhookEvent(processor, platform, event)
        if (parsedResult.kind === MESSENGER_WEBHOOK_PARSE_KIND.CHALLENGE) {
            return {
                status: MESSENGER_WEBHOOK_HANDLE_STATUS.CHALLENGE,
                platform,
                challenge: parsedResult.challenge,
            }
        }

        const normalizedEvent = parsedResult.event
        if (this.processedDedupeKeys.has(normalizedEvent.dedupeKey)) {
            return createDuplicateResult(platform, normalizedEvent)
        }

        const existingInFlightRequest = this.inFlightByDedupeKey.get(normalizedEvent.dedupeKey)
        if (existingInFlightRequest !== undefined) {
            await existingInFlightRequest
            return createDuplicateResult(platform, normalizedEvent)
        }

        const processPromise = this.executeWithRetry(processor, platform, normalizedEvent)
        this.inFlightByDedupeKey.set(normalizedEvent.dedupeKey, processPromise)

        try {
            await processPromise
            this.processedDedupeKeys.add(normalizedEvent.dedupeKey)
            return {
                status: MESSENGER_WEBHOOK_HANDLE_STATUS.PROCESSED,
                platform,
                dedupeKey: normalizedEvent.dedupeKey,
                event: normalizedEvent,
            }
        } finally {
            this.inFlightByDedupeKey.delete(normalizedEvent.dedupeKey)
        }
    }

    /**
     * Resolves platform processor.
     *
     * @param platform Canonical platform identifier.
     * @returns Platform processor.
     */
    private resolveProcessor(platform: string): IMessengerWebhookProcessor {
        const processor = this.processorsByPlatform.get(platform)
        if (processor === undefined) {
            throw new MessengerWebhookHandlerError(
                `Unsupported messenger platform: ${platform}`,
                {
                    code: MESSENGER_WEBHOOK_HANDLER_ERROR_CODE.UNSUPPORTED_PLATFORM,
                    isRetryable: false,
                    platform,
                },
            )
        }

        return processor
    }

    /**
     * Parses and validates webhook event from processor output.
     *
     * @param processor Platform processor.
     * @param platform Canonical platform identifier.
     * @param event Raw webhook event.
     * @returns Normalized parse result.
     */
    private parseWebhookEvent(
        processor: IMessengerWebhookProcessor,
        platform: string,
        event: IWebhookEventDTO,
    ): IMessengerWebhookParseResult {
        try {
            const parseResult = processor.parseEvent(event)
            return normalizeParseResult(parseResult, platform)
        } catch (error) {
            throw normalizeInvalidEventError(error, platform)
        }
    }

    /**
     * Executes processor callback with retry/backoff semantics.
     *
     * @param processor Platform processor.
     * @param platform Canonical platform identifier.
     * @param event Normalized parsed event.
     * @returns Completion promise.
     */
    private async executeWithRetry(
        processor: IMessengerWebhookProcessor,
        platform: string,
        event: IMessengerWebhookParsedEvent,
    ): Promise<void> {
        let attempt = 1

        while (true) {
            try {
                await processor.processEvent(event)
                return
            } catch (error) {
                const normalizedError = normalizeProcessingError(
                    error,
                    platform,
                    event.dedupeKey,
                )
                if (
                    normalizedError.isRetryable === false
                    || attempt >= this.retryMaxAttempts
                ) {
                    throw normalizedError
                }

                const delayMs = resolveRetryDelayMs(
                    normalizedError,
                    attempt,
                    this.baseDelayMs,
                    this.maxJitterMs,
                    this.random,
                )
                await this.sleep(delayMs)
                attempt += 1
            }
        }
    }
}

/**
 * Creates Slack-backed processor for unified messenger webhook handler.
 *
 * @param options Slack processor options.
 * @returns Slack webhook processor.
 */
export function createSlackWebhookProcessor(
    options: ICreateSlackWebhookProcessorOptions,
): IMessengerWebhookProcessor {
    return {
        platform: "slack",
        verifySignature(event: IWebhookEventDTO, rawBody?: string): boolean {
            return options.provider.verifyEventSignature(event, rawBody)
        },
        parseEvent(event: IWebhookEventDTO): IMessengerWebhookParseResult {
            const envelope = options.provider.parseEventEnvelope(event)
            return mapSlackParseResult(envelope, event)
        },
        processEvent(event: IMessengerWebhookParsedEvent): Promise<void> {
            return options.onEvent(event)
        },
    }
}

/**
 * Maps Slack envelope into generic parse result.
 *
 * @param envelope Normalized Slack envelope.
 * @param event Raw webhook event.
 * @returns Generic parse result.
 */
function mapSlackParseResult(
    envelope: ISlackEventEnvelopeDTO,
    event: IWebhookEventDTO,
): IMessengerWebhookParseResult {
    if (envelope.type === "url_verification") {
        const challenge = normalizeRequiredText(
            envelope.challenge,
            "Slack challenge cannot be empty",
            "slack",
        )

        return {
            kind: MESSENGER_WEBHOOK_PARSE_KIND.CHALLENGE,
            challenge,
        }
    }

    const eventType = normalizeRequiredText(
        envelope.event?.type ?? envelope.type,
        "Slack event type cannot be empty",
        "slack",
    )
    const dedupeKey = buildSlackDedupeKey(envelope, event)
    const occurredAt = resolveSlackOccurredAt(envelope, event.timestamp)
    const payload = toReadonlyRecord(event.payload, "Slack webhook payload must be an object", "slack")

    return {
        kind: MESSENGER_WEBHOOK_PARSE_KIND.EVENT,
        event: {
            dedupeKey,
            eventType,
            occurredAt,
            payload,
            metadata: {
                envelopeType: envelope.type,
                eventId: envelope.eventId,
                eventTime: envelope.eventTime,
                teamId: envelope.teamId,
                apiAppId: envelope.apiAppId,
            },
            actorId: normalizeOptionalText(envelope.event?.user),
            channelId: normalizeOptionalText(envelope.event?.channel),
            text: normalizeOptionalText(envelope.event?.text),
        },
    }
}

/**
 * Creates duplicate result payload.
 *
 * @param platform Canonical platform.
 * @param event Normalized event.
 * @returns Duplicate handling result.
 */
function createDuplicateResult(
    platform: string,
    event: IMessengerWebhookParsedEvent,
): IMessengerWebhookHandleResult {
    return {
        status: MESSENGER_WEBHOOK_HANDLE_STATUS.DUPLICATE,
        platform,
        dedupeKey: event.dedupeKey,
        event,
    }
}

/**
 * Builds immutable processor registry by canonical platform identifier.
 *
 * @param processors Platform processors.
 * @returns Immutable processor registry.
 */
function buildProcessorsByPlatform(
    processors: readonly IMessengerWebhookProcessor[],
): ReadonlyMap<string, IMessengerWebhookProcessor> {
    if (processors.length === 0) {
        throw new MessengerWebhookHandlerError(
            "At least one messenger webhook processor must be configured",
            {
                code: MESSENGER_WEBHOOK_HANDLER_ERROR_CODE.CONFIGURATION,
                isRetryable: false,
            },
        )
    }

    const registry = new Map<string, IMessengerWebhookProcessor>()

    for (const processor of processors) {
        const platform = normalizePlatform(processor.platform)
        if (registry.has(platform)) {
            throw new MessengerWebhookHandlerError(
                `Duplicate messenger webhook processor for platform: ${platform}`,
                {
                    code: MESSENGER_WEBHOOK_HANDLER_ERROR_CODE.CONFIGURATION,
                    isRetryable: false,
                    platform,
                },
            )
        }

        registry.set(platform, processor)
    }

    return registry
}

/**
 * Normalizes and validates parse result.
 *
 * @param parseResult Raw parse result.
 * @param platform Canonical platform identifier.
 * @returns Normalized parse result.
 */
function normalizeParseResult(
    parseResult: IMessengerWebhookParseResult,
    platform: string,
): IMessengerWebhookParseResult {
    if (parseResult.kind === MESSENGER_WEBHOOK_PARSE_KIND.CHALLENGE) {
        return {
            kind: MESSENGER_WEBHOOK_PARSE_KIND.CHALLENGE,
            challenge: normalizeRequiredText(
                parseResult.challenge,
                "Webhook challenge cannot be empty",
                platform,
            ),
        }
    }

    if (parseResult.kind !== MESSENGER_WEBHOOK_PARSE_KIND.EVENT) {
        throw new MessengerWebhookHandlerError("Unsupported parse result kind", {
            code: MESSENGER_WEBHOOK_HANDLER_ERROR_CODE.INVALID_EVENT,
            isRetryable: false,
            platform,
        })
    }

    return {
        kind: MESSENGER_WEBHOOK_PARSE_KIND.EVENT,
        event: normalizeParsedEvent(parseResult.event, platform),
    }
}

/**
 * Validates and normalizes parsed event payload.
 *
 * @param event Parsed event.
 * @param platform Canonical platform identifier.
 * @returns Normalized parsed event.
 */
function normalizeParsedEvent(
    event: IMessengerWebhookParsedEvent,
    platform: string,
): IMessengerWebhookParsedEvent {
    const dedupeKey = normalizeRequiredText(event.dedupeKey, "Webhook dedupeKey cannot be empty", platform)
    const eventType = normalizeRequiredText(event.eventType, "Webhook eventType cannot be empty", platform)
    const occurredAt = normalizeDate(event.occurredAt, "Webhook occurredAt must be a valid date", platform)

    return {
        dedupeKey,
        eventType,
        occurredAt,
        payload: toReadonlyRecord(event.payload, "Webhook payload must be an object", platform),
        metadata: toOptionalReadonlyRecord(
            event.metadata,
            "Webhook metadata must be an object",
            platform,
        ),
        actorId: normalizeOptionalText(event.actorId),
        channelId: normalizeOptionalText(event.channelId),
        text: normalizeOptionalText(event.text),
    }
}

/**
 * Normalizes processor parse failure into typed invalid-event error.
 *
 * @param error Unknown parse failure.
 * @param platform Canonical platform identifier.
 * @returns Normalized typed error.
 */
function normalizeInvalidEventError(error: unknown, platform: string): MessengerWebhookHandlerError {
    if (error instanceof MessengerWebhookHandlerError) {
        return error
    }

    if (error instanceof Error) {
        return new MessengerWebhookHandlerError(error.message, {
            code: MESSENGER_WEBHOOK_HANDLER_ERROR_CODE.INVALID_EVENT,
            isRetryable: false,
            platform,
        })
    }

    return new MessengerWebhookHandlerError("Webhook event parsing failed", {
        code: MESSENGER_WEBHOOK_HANDLER_ERROR_CODE.INVALID_EVENT,
        isRetryable: false,
        platform,
    })
}

/**
 * Normalizes processing failure into typed retry-aware error.
 *
 * @param error Unknown processing failure.
 * @param platform Canonical platform identifier.
 * @param dedupeKey Event dedupe key.
 * @returns Normalized typed error.
 */
function normalizeProcessingError(
    error: unknown,
    platform: string,
    dedupeKey: string,
): MessengerWebhookHandlerError {
    if (error instanceof MessengerWebhookHandlerError) {
        return error
    }

    const isRetryable = resolveRetryable(error)
    const retryAfterMs = readNonNegativeNumberProperty(error, "retryAfterMs")
    const message = error instanceof Error ? error.message : "Webhook processing failed"

    return new MessengerWebhookHandlerError(message, {
        code: isRetryable
            ? MESSENGER_WEBHOOK_HANDLER_ERROR_CODE.UPSTREAM_UNAVAILABLE
            : MESSENGER_WEBHOOK_HANDLER_ERROR_CODE.PROCESSING_FAILED,
        isRetryable,
        retryAfterMs,
        platform,
        dedupeKey,
    })
}

/**
 * Resolves retryable flag from failure object.
 *
 * @param error Unknown failure object.
 * @returns Retryable flag.
 */
function resolveRetryable(error: unknown): boolean {
    const explicitFlag = readBooleanProperty(error, "isRetryable")
    if (explicitFlag !== undefined) {
        return explicitFlag
    }

    const statusCode = readNonNegativeNumberProperty(error, "statusCode")
    if (statusCode !== undefined) {
        return statusCode === 429 || (statusCode >= 500 && statusCode < 600)
    }

    return false
}

/**
 * Resolves retry delay using retry-after hint or exponential backoff with bounded jitter.
 *
 * @param error Typed handler error.
 * @param attempt Current attempt number.
 * @param baseDelayMs Base backoff delay.
 * @param maxJitterMs Maximum jitter value.
 * @param random Random source.
 * @returns Delay in milliseconds.
 */
function resolveRetryDelayMs(
    error: MessengerWebhookHandlerError,
    attempt: number,
    baseDelayMs: number,
    maxJitterMs: number,
    random: () => number,
): number {
    if (error.retryAfterMs !== undefined) {
        return error.retryAfterMs
    }

    const exponentialDelay = baseDelayMs * (2 ** (attempt - 1))
    const jitter = resolveJitter(maxJitterMs, random)
    return exponentialDelay + jitter
}

/**
 * Resolves bounded jitter from random source.
 *
 * @param maxJitterMs Maximum jitter.
 * @param random Random source.
 * @returns Jitter value.
 */
function resolveJitter(maxJitterMs: number, random: () => number): number {
    if (maxJitterMs === 0) {
        return 0
    }

    const randomValue = random()
    if (Number.isFinite(randomValue) === false) {
        return 0
    }

    const boundedRandom = Math.max(0, Math.min(1, randomValue))
    return Math.floor(boundedRandom * (maxJitterMs + 1))
}

/**
 * Builds stable Slack dedupe key.
 *
 * @param envelope Normalized Slack envelope.
 * @param event Raw webhook event.
 * @returns Stable dedupe key.
 */
function buildSlackDedupeKey(
    envelope: ISlackEventEnvelopeDTO,
    event: IWebhookEventDTO,
): string {
    if (normalizeOptionalText(envelope.eventId) !== undefined) {
        return `slack:${envelope.eventId}`
    }

    const serializedPayload = safeSerializePayload(event.payload)
    const fingerprint = createHash("sha256")
        .update(`${event.eventType}:${serializedPayload}:${event.timestamp.toISOString()}`)
        .digest("hex")
        .slice(0, 16)
    return `slack:${fingerprint}`
}

/**
 * Resolves Slack occurrence timestamp.
 *
 * @param envelope Slack envelope.
 * @param fallbackTimestamp Fallback timestamp from webhook DTO.
 * @returns Valid occurrence date.
 */
function resolveSlackOccurredAt(
    envelope: ISlackEventEnvelopeDTO,
    fallbackTimestamp: Date,
): Date {
    if (typeof envelope.eventTime === "number" && Number.isFinite(envelope.eventTime)) {
        return normalizeDate(
            new Date(envelope.eventTime * 1000),
            "Slack event_time must be valid",
            "slack",
        )
    }

    return normalizeDate(
        fallbackTimestamp,
        "Slack webhook timestamp must be valid",
        "slack",
    )
}

/**
 * Serializes payload safely for fallback dedupe generation.
 *
 * @param payload Payload value.
 * @returns Serialized payload.
 */
function safeSerializePayload(payload: unknown): string {
    try {
        return JSON.stringify(payload) ?? "<undefined>"
    } catch {
        return "<unserializable>"
    }
}

/**
 * Normalizes required text value.
 *
 * @param value Candidate text.
 * @param message Validation error message.
 * @param platform Canonical platform identifier.
 * @returns Normalized string.
 */
function normalizeRequiredText(value: unknown, message: string, platform: string): string {
    const normalized = normalizeOptionalText(value)
    if (normalized === undefined) {
        throw new MessengerWebhookHandlerError(message, {
            code: MESSENGER_WEBHOOK_HANDLER_ERROR_CODE.INVALID_EVENT,
            isRetryable: false,
            platform,
        })
    }

    return normalized
}

/**
 * Normalizes optional text value.
 *
 * @param value Candidate value.
 * @returns Trimmed non-empty text or undefined.
 */
function normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== "string") {
        return undefined
    }

    const normalized = value.trim()
    return normalized.length > 0 ? normalized : undefined
}

/**
 * Normalizes raw platform value into canonical key.
 *
 * @param platform Raw platform value.
 * @returns Canonical platform key.
 */
function normalizePlatform(platform: string): string {
    const normalized = platform.trim().toLowerCase()
    if (normalized.length === 0) {
        throw new MessengerWebhookHandlerError("Webhook platform cannot be empty", {
            code: MESSENGER_WEBHOOK_HANDLER_ERROR_CODE.INVALID_EVENT,
            isRetryable: false,
        })
    }

    return normalized
}

/**
 * Converts unknown value into readonly object record.
 *
 * @param value Candidate value.
 * @param message Validation message.
 * @param platform Canonical platform identifier.
 * @returns Readonly object record.
 */
function toReadonlyRecord(
    value: unknown,
    message: string,
    platform: string,
): Readonly<Record<string, unknown>> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new MessengerWebhookHandlerError(message, {
            code: MESSENGER_WEBHOOK_HANDLER_ERROR_CODE.INVALID_EVENT,
            isRetryable: false,
            platform,
        })
    }

    return value as Readonly<Record<string, unknown>>
}

/**
 * Converts unknown value into optional readonly object record.
 *
 * @param value Candidate value.
 * @param message Validation message.
 * @param platform Canonical platform identifier.
 * @returns Optional readonly object record.
 */
function toOptionalReadonlyRecord(
    value: unknown,
    message: string,
    platform: string,
): Readonly<Record<string, unknown>> | undefined {
    if (value === undefined) {
        return undefined
    }

    return toReadonlyRecord(value, message, platform)
}

/**
 * Normalizes date value.
 *
 * @param value Candidate date.
 * @param message Validation message.
 * @param platform Canonical platform identifier.
 * @returns Valid date value.
 */
function normalizeDate(value: unknown, message: string, platform: string): Date {
    if (value instanceof Date === false || Number.isFinite(value.getTime()) === false) {
        throw new MessengerWebhookHandlerError(message, {
            code: MESSENGER_WEBHOOK_HANDLER_ERROR_CODE.INVALID_EVENT,
            isRetryable: false,
            platform,
        })
    }

    return value
}

/**
 * Reads boolean property from unknown object.
 *
 * @param value Unknown object.
 * @param propertyName Property name.
 * @returns Boolean value when available.
 */
function readBooleanProperty(value: unknown, propertyName: string): boolean | undefined {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return undefined
    }

    const propertyValue = (value as Record<string, unknown>)[propertyName]
    return typeof propertyValue === "boolean" ? propertyValue : undefined
}

/**
 * Reads non-negative numeric property from unknown object.
 *
 * @param value Unknown object.
 * @param propertyName Property name.
 * @returns Numeric value when available.
 */
function readNonNegativeNumberProperty(value: unknown, propertyName: string): number | undefined {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return undefined
    }

    const propertyValue = (value as Record<string, unknown>)[propertyName]
    if (typeof propertyValue !== "number" || Number.isFinite(propertyValue) === false) {
        return undefined
    }

    return propertyValue >= 0 ? propertyValue : undefined
}

/**
 * Normalizes positive integer option.
 *
 * @param value Candidate value.
 * @param fallback Fallback value.
 * @param fieldName Option field name.
 * @returns Normalized positive integer.
 */
function normalizePositiveInteger(
    value: number | undefined,
    fallback: number,
    fieldName: string,
): number {
    const resolvedValue = value ?? fallback
    if (Number.isInteger(resolvedValue) === false || resolvedValue <= 0) {
        throw new MessengerWebhookHandlerError(`${fieldName} must be positive integer`, {
            code: MESSENGER_WEBHOOK_HANDLER_ERROR_CODE.CONFIGURATION,
            isRetryable: false,
        })
    }

    return resolvedValue
}

/**
 * Normalizes non-negative integer option.
 *
 * @param value Candidate value.
 * @param fallback Fallback value.
 * @param fieldName Option field name.
 * @returns Normalized non-negative integer.
 */
function normalizeNonNegativeInteger(
    value: number | undefined,
    fallback: number,
    fieldName: string,
): number {
    const resolvedValue = value ?? fallback
    if (Number.isInteger(resolvedValue) === false || resolvedValue < 0) {
        throw new MessengerWebhookHandlerError(`${fieldName} must be non-negative integer`, {
            code: MESSENGER_WEBHOOK_HANDLER_ERROR_CODE.CONFIGURATION,
            isRetryable: false,
        })
    }

    return resolvedValue
}

/**
 * Default async sleep implementation.
 *
 * @param delayMs Delay in milliseconds.
 * @returns Completion promise.
 */
function defaultSleep(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, delayMs)
    })
}
