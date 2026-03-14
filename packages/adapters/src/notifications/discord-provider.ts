import {createHash} from "node:crypto"

import {
    NOTIFICATION_CHANNEL,
    type INotificationPayload,
    type INotificationProvider,
} from "@codenautic/core"

import {
    DISCORD_PROVIDER_ERROR_CODE,
    DiscordProviderError,
} from "./discord-provider.error"

const DEFAULT_DISCORD_BASE_URL = "https://discord.com/api/v10"
const DEFAULT_RETRY_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_BASE_DELAY_MS = 250

interface IDiscordAllowedMentions {
    readonly parse?: readonly string[]
}

interface IDiscordMessageReference {
    readonly messageId: string
    readonly failIfNotExists?: boolean
}

interface INormalizedDiscordSendRequest {
    readonly dedupeKey: string
    readonly recipients: readonly string[]
    readonly request: Omit<IDiscordCreateMessageRequest, "channelId">
}

/**
 * Minimal Discord create-message request used by the adapter.
 */
export interface IDiscordCreateMessageRequest {
    /**
     * Discord destination channel identifier.
     */
    readonly channelId: string

    /**
     * Message content.
     */
    readonly content: string

    /**
     * Optional mention parsing controls.
     */
    readonly allowedMentions?: IDiscordAllowedMentions

    /**
     * Optional parent message reference.
     */
    readonly messageReference?: IDiscordMessageReference
}

/**
 * Minimal Discord create-message response used by the adapter.
 */
export interface IDiscordCreateMessageResponse {
    /**
     * Discord message identifier.
     */
    readonly id?: string
}

/**
 * Minimal Discord REST client contract used by the adapter.
 */
export interface IDiscordRestClient {
    /**
     * Creates one message in destination channel.
     *
     * @param request Discord create-message request.
     * @returns Discord API response.
     */
    createMessage(request: IDiscordCreateMessageRequest): Promise<IDiscordCreateMessageResponse>
}

/**
 * Discord provider constructor options.
 */
export interface IDiscordProviderOptions {
    /**
     * Discord bot token used when REST client is created internally.
     */
    readonly botToken?: string

    /**
     * Optional alternative Discord API base URL.
     */
    readonly baseUrl?: string

    /**
     * Optional injected Discord-compatible client for tests.
     */
    readonly client?: IDiscordRestClient

    /**
     * Maximum retry attempts for retryable upstream failures.
     */
    readonly retryMaxAttempts?: number

    /**
     * Optional sleep implementation used between retries.
     */
    readonly sleep?: (delayMs: number) => Promise<void>
}

/**
 * Discord implementation of notification delivery via Bot API.
 */
export class DiscordProvider implements INotificationProvider {
    public readonly channel = NOTIFICATION_CHANNEL.WEBHOOK

    private readonly client: IDiscordRestClient
    private readonly retryMaxAttempts: number
    private readonly sleep: (delayMs: number) => Promise<void>
    private readonly sentDedupeKeys: Set<string>
    private readonly inFlightByDedupeKey: Map<string, Promise<void>>

    /**
     * Creates Discord provider.
     *
     * @param options Provider configuration.
     */
    public constructor(options: IDiscordProviderOptions) {
        this.client = options.client ?? createDiscordRestClient(options)
        this.retryMaxAttempts = normalizeRetryMaxAttempts(options.retryMaxAttempts)
        this.sleep = options.sleep ?? defaultSleep
        this.sentDedupeKeys = new Set<string>()
        this.inFlightByDedupeKey = new Map<string, Promise<void>>()
    }

    /**
     * Sends Discord notification idempotently by dedupe key.
     *
     * @param payload Shared notification payload.
     * @returns Completion promise.
     */
    public async send(payload: INotificationPayload): Promise<void> {
        const normalized = normalizeDiscordSendRequest(payload)

        if (this.sentDedupeKeys.has(normalized.dedupeKey)) {
            return
        }

        const existingRequest = this.inFlightByDedupeKey.get(normalized.dedupeKey)
        if (existingRequest !== undefined) {
            await existingRequest
            return
        }

        const requestPromise = this.dispatchDiscordRequest(normalized)
        this.inFlightByDedupeKey.set(normalized.dedupeKey, requestPromise)

        try {
            await requestPromise
            this.sentDedupeKeys.add(normalized.dedupeKey)
        } finally {
            this.inFlightByDedupeKey.delete(normalized.dedupeKey)
        }
    }

    /**
     * Dispatches one deduplicated notification request to all recipients.
     *
     * @param normalized Normalized Discord send request.
     * @returns Completion promise.
     */
    private async dispatchDiscordRequest(normalized: INormalizedDiscordSendRequest): Promise<void> {
        for (const recipient of normalized.recipients) {
            await this.executeRequest(async () => {
                const response = await this.client.createMessage({
                    channelId: recipient,
                    ...normalized.request,
                })

                assertDiscordCreateMessageResponse(response, normalized.dedupeKey)
            }, normalized.dedupeKey)
        }
    }

    /**
     * Executes Discord request with retry semantics.
     *
     * @param operation Deferred Discord API call.
     * @param dedupeKey Delivery dedupe key.
     * @returns Completion promise.
     */
    private async executeRequest(
        operation: () => Promise<void>,
        dedupeKey: string,
    ): Promise<void> {
        let attempt = 1

        while (true) {
            try {
                await operation()
                return
            } catch (error: unknown) {
                const normalizedError = normalizeDiscordError(error, dedupeKey)
                if (normalizedError.isRetryable === false || attempt >= this.retryMaxAttempts) {
                    throw normalizedError
                }

                await this.sleep(resolveRetryDelayMs(normalizedError, attempt))
                attempt += 1
            }
        }
    }
}

/**
 * Creates Discord fetch-backed REST client.
 *
 * @param options Provider options.
 * @returns Discord-compatible client.
 */
function createDiscordRestClient(options: IDiscordProviderOptions): IDiscordRestClient {
    const botToken = normalizeOptionalText(options.botToken)
    if (botToken === undefined) {
        throw new DiscordProviderError("Discord bot token is required when client is not provided", {
            code: DISCORD_PROVIDER_ERROR_CODE.CONFIGURATION,
            isRetryable: false,
        })
    }

    const baseUrl = normalizeOptionalText(options.baseUrl) ?? DEFAULT_DISCORD_BASE_URL

    return {
        async createMessage(request: IDiscordCreateMessageRequest): Promise<IDiscordCreateMessageResponse> {
            const response = await fetch(`${baseUrl}/channels/${encodeURIComponent(request.channelId)}/messages`, {
                method: "POST",
                headers: {
                    authorization: `Bot ${botToken}`,
                    "content-type": "application/json",
                },
                body: JSON.stringify(mapDiscordCreateMessageRequestBody(request)),
            })

            const responseBody = await parseJsonBody(response)
            if (response.ok === false) {
                throw createDiscordFetchError(response, responseBody)
            }

            return extractMessageResponse(responseBody)
        },
    }
}

/**
 * Validates and normalizes Discord send request.
 *
 * @param payload Shared notification payload.
 * @returns Normalized Discord request.
 */
function normalizeDiscordSendRequest(payload: INotificationPayload): INormalizedDiscordSendRequest {
    if (payload.channel !== NOTIFICATION_CHANNEL.WEBHOOK) {
        throw new DiscordProviderError("Discord provider supports WEBHOOK notification channel only", {
            code: DISCORD_PROVIDER_ERROR_CODE.INVALID_PAYLOAD,
            isRetryable: false,
        })
    }

    const title = normalizeRequiredText(payload.title, "title cannot be empty")
    const body = normalizeRequiredText(payload.body, "body cannot be empty")
    const recipients = dedupeRecipients(payload.recipients)
    if (recipients.length === 0) {
        throw new DiscordProviderError("recipients must contain at least one non-empty value", {
            code: DISCORD_PROVIDER_ERROR_CODE.INVALID_PAYLOAD,
            isRetryable: false,
        })
    }

    const dedupeKey = buildDedupeKey(payload, title, body, recipients)
    const messageReference = resolveMessageReference(payload.metadata)

    return {
        dedupeKey,
        recipients,
        request: {
            content: `**${title}**\n${body}`,
            allowedMentions: {
                parse: [],
            },
            messageReference,
        },
    }
}

/**
 * Resolves optional Discord message reference from metadata.
 *
 * @param metadata Optional notification metadata.
 * @returns Optional message reference.
 */
function resolveMessageReference(
    metadata: Readonly<Record<string, unknown>> | undefined,
): IDiscordMessageReference | undefined {
    if (metadata === undefined) {
        return undefined
    }

    const messageId = normalizeOptionalText(metadata["replyToMessageId"])
    if (messageId === undefined) {
        return undefined
    }

    return {
        messageId,
        failIfNotExists: false,
    }
}

/**
 * Builds stable dedupe key from payload.
 *
 * @param payload Shared notification payload.
 * @param title Normalized title.
 * @param body Normalized body.
 * @param recipients Normalized recipients.
 * @returns Stable dedupe key.
 */
function buildDedupeKey(
    payload: INotificationPayload,
    title: string,
    body: string,
    recipients: readonly string[],
): string {
    const explicitKey = normalizeOptionalText(payload.dedupeKey)
    if (explicitKey !== undefined) {
        return explicitKey
    }

    const source = [
        payload.event,
        payload.urgency,
        title,
        body,
        ...recipients,
    ].join("|")
    const fingerprint = createHash("sha256").update(source).digest("hex").slice(0, 24)
    return `discord:${fingerprint}`
}

/**
 * Removes empty and duplicate recipients while preserving order.
 *
 * @param recipients Raw recipient list.
 * @returns Normalized recipient list.
 */
function dedupeRecipients(recipients: readonly string[]): readonly string[] {
    const deduped: string[] = []
    const seenRecipients = new Set<string>()

    for (const rawRecipient of recipients) {
        const normalizedRecipient = normalizeOptionalText(rawRecipient)
        if (normalizedRecipient === undefined || seenRecipients.has(normalizedRecipient)) {
            continue
        }

        deduped.push(normalizedRecipient)
        seenRecipients.add(normalizedRecipient)
    }

    return deduped
}

/**
 * Asserts Discord response validity.
 *
 * @param response Discord API response.
 * @param dedupeKey Delivery dedupe key.
 */
function assertDiscordCreateMessageResponse(
    response: IDiscordCreateMessageResponse,
    dedupeKey: string,
): void {
    if (normalizeOptionalText(response.id) === undefined) {
        throw new DiscordProviderError("Discord API response does not contain message id", {
            code: DISCORD_PROVIDER_ERROR_CODE.REQUEST_FAILED,
            isRetryable: true,
            dedupeKey,
        })
    }
}

/**
 * Maps unknown request failure into typed Discord provider error.
 *
 * @param error Unknown failure.
 * @param dedupeKey Delivery dedupe key.
 * @returns Typed Discord provider error.
 */
function normalizeDiscordError(error: unknown, dedupeKey: string): DiscordProviderError {
    if (error instanceof DiscordProviderError) {
        return error
    }

    const statusCode = readNumberProperty(error, "statusCode")
    const retryAfterMs = readNumberProperty(error, "retryAfterMs")

    if (statusCode === 401) {
        return new DiscordProviderError("Discord authentication failed", {
            code: DISCORD_PROVIDER_ERROR_CODE.AUTHENTICATION,
            isRetryable: false,
            statusCode,
            dedupeKey,
        })
    }

    if (statusCode === 403) {
        return new DiscordProviderError("Discord access denied", {
            code: DISCORD_PROVIDER_ERROR_CODE.PERMISSION_DENIED,
            isRetryable: false,
            statusCode,
            dedupeKey,
        })
    }

    if (statusCode === 404) {
        return new DiscordProviderError("Discord destination channel not found", {
            code: DISCORD_PROVIDER_ERROR_CODE.NOT_FOUND,
            isRetryable: false,
            statusCode,
            dedupeKey,
        })
    }

    if (statusCode === 429) {
        return new DiscordProviderError("Discord rate limit exceeded", {
            code: DISCORD_PROVIDER_ERROR_CODE.RATE_LIMITED,
            isRetryable: true,
            statusCode,
            retryAfterMs: retryAfterMs ?? DEFAULT_RETRY_BASE_DELAY_MS,
            dedupeKey,
        })
    }

    if (statusCode !== undefined && statusCode >= 500) {
        return new DiscordProviderError("Discord upstream service is unavailable", {
            code: DISCORD_PROVIDER_ERROR_CODE.UPSTREAM_UNAVAILABLE,
            isRetryable: true,
            statusCode,
            dedupeKey,
        })
    }

    if (error instanceof Error) {
        return new DiscordProviderError(error.message, {
            code: DISCORD_PROVIDER_ERROR_CODE.REQUEST_FAILED,
            isRetryable: true,
            retryAfterMs,
            statusCode,
            dedupeKey,
        })
    }

    return new DiscordProviderError("Discord request failed", {
        code: DISCORD_PROVIDER_ERROR_CODE.REQUEST_FAILED,
        isRetryable: true,
        retryAfterMs,
        statusCode,
        dedupeKey,
    })
}

/**
 * Resolves retry delay from error metadata and fallback backoff.
 *
 * @param error Typed Discord provider error.
 * @param attempt Current attempt number.
 * @returns Delay in milliseconds.
 */
function resolveRetryDelayMs(error: DiscordProviderError, attempt: number): number {
    if (error.retryAfterMs !== undefined) {
        return error.retryAfterMs
    }

    return DEFAULT_RETRY_BASE_DELAY_MS * (2 ** (attempt - 1))
}

/**
 * Reads finite numeric property from unknown object.
 *
 * @param value Unknown source.
 * @param propertyName Property name.
 * @returns Property value when finite numeric.
 */
function readNumberProperty(value: unknown, propertyName: string): number | undefined {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return undefined
    }

    const propertyValue = (value as Record<string, unknown>)[propertyName]
    if (typeof propertyValue !== "number" || Number.isFinite(propertyValue) === false) {
        return undefined
    }

    return propertyValue
}

/**
 * Parses JSON response body when available.
 *
 * @param response Fetch response.
 * @returns Parsed JSON value or undefined.
 */
async function parseJsonBody(response: Response): Promise<unknown> {
    const contentLength = response.headers.get("content-length")
    if (contentLength === "0") {
        return undefined
    }

    const responseText = await response.text()
    if (responseText.trim().length === 0) {
        return undefined
    }

    try {
        return JSON.parse(responseText) as unknown
    } catch {
        return undefined
    }
}

/**
 * Creates normalized fetch error for Discord API failure.
 *
 * @param response Fetch response.
 * @param responseBody Parsed response body.
 * @returns Error enriched with status and retry metadata.
 */
function createDiscordFetchError(
    response: Response,
    responseBody: unknown,
): Error & {statusCode: number; retryAfterMs?: number} {
    const message = resolveDiscordErrorMessage(response.status, responseBody)
    const retryAfterMs = resolveRetryAfterMs(response, responseBody)

    return Object.assign(new Error(message), {
        statusCode: response.status,
        retryAfterMs,
    })
}

/**
 * Resolves human-readable Discord error message.
 *
 * @param statusCode HTTP status code.
 * @param responseBody Parsed response body.
 * @returns Error message.
 */
function resolveDiscordErrorMessage(statusCode: number, responseBody: unknown): string {
    const bodyRecord = toRecord(responseBody)
    const message = normalizeOptionalText(bodyRecord?.["message"])

    return message ?? `Discord API request failed with status ${String(statusCode)}`
}

/**
 * Resolves retry-after delay from headers or body.
 *
 * @param response Fetch response.
 * @param responseBody Parsed response body.
 * @returns Retry delay in milliseconds.
 */
function resolveRetryAfterMs(response: Response, responseBody: unknown): number | undefined {
    const retryAfterHeader = normalizeOptionalText(response.headers.get("retry-after"))
    if (retryAfterHeader !== undefined) {
        const headerValue = Number(retryAfterHeader)
        if (Number.isFinite(headerValue)) {
            return headerValue > 0 ? Math.round(headerValue * 1000) : 0
        }
    }

    const bodyRecord = toRecord(responseBody)
    const retryAfterSeconds = bodyRecord?.["retry_after"]
    if (typeof retryAfterSeconds === "number" && Number.isFinite(retryAfterSeconds)) {
        return retryAfterSeconds > 0 ? Math.round(retryAfterSeconds * 1000) : 0
    }

    return undefined
}

/**
 * Extracts create-message response.
 *
 * @param responseBody Parsed response body.
 * @returns Normalized message response.
 */
function extractMessageResponse(responseBody: unknown): IDiscordCreateMessageResponse {
    const bodyRecord = toRecord(responseBody)
    return {
        id: normalizeOptionalText(bodyRecord?.["id"]),
    }
}

/**
 * Converts unknown value into record.
 *
 * @param value Unknown candidate.
 * @returns Record when value is a plain object.
 */
function toRecord(value: unknown): Readonly<Record<string, unknown>> | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return null
    }

    return value as Readonly<Record<string, unknown>>
}

/**
 * Maps typed request into Discord API payload.
 *
 * @param request Typed create-message request.
 * @returns Raw Discord request payload.
 */
function mapDiscordCreateMessageRequestBody(
    request: IDiscordCreateMessageRequest,
): Readonly<Record<string, unknown>> {
    const requestBody: Record<string, unknown> = {
        content: request.content,
    }

    if (request.allowedMentions !== undefined) {
        requestBody["allowed_mentions"] = {
            parse: request.allowedMentions.parse ?? [],
        }
    }

    if (request.messageReference !== undefined) {
        requestBody["message_reference"] = {
            message_id: request.messageReference.messageId,
            fail_if_not_exists: request.messageReference.failIfNotExists ?? false,
        }
    }

    return requestBody
}

/**
 * Normalizes optional text input.
 *
 * @param value Candidate value.
 * @returns Trimmed non-empty value.
 */
function normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== "string") {
        return undefined
    }

    const normalized = value.trim()
    return normalized.length > 0 ? normalized : undefined
}

/**
 * Normalizes required text input.
 *
 * @param value Candidate value.
 * @param fieldName Field label.
 * @returns Trimmed non-empty value.
 */
function normalizeRequiredText(value: unknown, fieldName: string): string {
    const normalized = normalizeOptionalText(value)
    if (normalized === undefined) {
        throw new DiscordProviderError(`${fieldName} cannot be empty`, {
            code: DISCORD_PROVIDER_ERROR_CODE.INVALID_PAYLOAD,
            isRetryable: false,
        })
    }

    return normalized
}

/**
 * Validates and normalizes retry attempts.
 *
 * @param retryMaxAttempts Candidate retry attempts.
 * @returns Positive integer retry attempts.
 */
function normalizeRetryMaxAttempts(retryMaxAttempts: number | undefined): number {
    const resolvedAttempts = retryMaxAttempts ?? DEFAULT_RETRY_MAX_ATTEMPTS
    if (Number.isInteger(resolvedAttempts) === false || resolvedAttempts <= 0) {
        throw new DiscordProviderError("retryMaxAttempts must be positive integer", {
            code: DISCORD_PROVIDER_ERROR_CODE.CONFIGURATION,
            isRetryable: false,
        })
    }

    return resolvedAttempts
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
