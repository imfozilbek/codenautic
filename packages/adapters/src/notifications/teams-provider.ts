import {createHash} from "node:crypto"

import {
    NOTIFICATION_CHANNEL,
    type INotificationPayload,
    type INotificationProvider,
} from "@codenautic/core"

import {
    TEAMS_PROVIDER_ERROR_CODE,
    TeamsProviderError,
} from "./teams-provider.error"

const DEFAULT_TEAMS_BASE_URL = "https://smba.trafficmanager.net/emea/v3"
const DEFAULT_RETRY_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_BASE_DELAY_MS = 250

interface ITeamsActivityRequestBody {
    readonly type: "message"
    readonly text: string
    readonly replyToId?: string
}

interface INormalizedTeamsSendRequest {
    readonly dedupeKey: string
    readonly recipients: readonly string[]
    readonly request: Omit<ITeamsCreateActivityRequest, "conversationId">
}

/**
 * Minimal Teams create-activity request used by the adapter.
 */
export interface ITeamsCreateActivityRequest {
    /**
     * Teams conversation identifier.
     */
    readonly conversationId: string

    /**
     * Activity text.
     */
    readonly text: string

    /**
     * Optional parent activity identifier.
     */
    readonly replyToId?: string
}

/**
 * Minimal Teams create-activity response used by the adapter.
 */
export interface ITeamsCreateActivityResponse {
    /**
     * Teams activity identifier.
     */
    readonly id?: string

    /**
     * Optional activity identifier alias used by some proxies.
     */
    readonly activityId?: string
}

/**
 * Minimal Teams REST client contract used by the adapter.
 */
export interface ITeamsRestClient {
    /**
     * Creates one message activity in destination conversation.
     *
     * @param request Teams create-activity request.
     * @returns Teams API response.
     */
    createActivity(request: ITeamsCreateActivityRequest): Promise<ITeamsCreateActivityResponse>
}

/**
 * Teams provider constructor options.
 */
export interface ITeamsProviderOptions {
    /**
     * Teams bot token used when REST client is created internally.
     */
    readonly botToken?: string

    /**
     * Optional alternative Teams API base URL.
     */
    readonly baseUrl?: string

    /**
     * Optional injected Teams-compatible client for tests.
     */
    readonly client?: ITeamsRestClient

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
 * Teams implementation of notification delivery via Bot Framework API.
 */
export class TeamsProvider implements INotificationProvider {
    public readonly channel = NOTIFICATION_CHANNEL.TEAMS

    private readonly client: ITeamsRestClient
    private readonly retryMaxAttempts: number
    private readonly sleep: (delayMs: number) => Promise<void>
    private readonly sentDedupeKeys: Set<string>
    private readonly inFlightByDedupeKey: Map<string, Promise<void>>

    /**
     * Creates Teams provider.
     *
     * @param options Provider configuration.
     */
    public constructor(options: ITeamsProviderOptions) {
        this.client = options.client ?? createTeamsRestClient(options)
        this.retryMaxAttempts = normalizeRetryMaxAttempts(options.retryMaxAttempts)
        this.sleep = options.sleep ?? defaultSleep
        this.sentDedupeKeys = new Set<string>()
        this.inFlightByDedupeKey = new Map<string, Promise<void>>()
    }

    /**
     * Sends Teams notification idempotently by dedupe key.
     *
     * @param payload Shared notification payload.
     * @returns Completion promise.
     */
    public async send(payload: INotificationPayload): Promise<void> {
        const normalized = normalizeTeamsSendRequest(payload)

        if (this.sentDedupeKeys.has(normalized.dedupeKey)) {
            return
        }

        const existingRequest = this.inFlightByDedupeKey.get(normalized.dedupeKey)
        if (existingRequest !== undefined) {
            await existingRequest
            return
        }

        const requestPromise = this.dispatchTeamsRequest(normalized)
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
     * @param normalized Normalized Teams send request.
     * @returns Completion promise.
     */
    private async dispatchTeamsRequest(normalized: INormalizedTeamsSendRequest): Promise<void> {
        for (const recipient of normalized.recipients) {
            await this.executeRequest(async () => {
                const response = await this.client.createActivity({
                    conversationId: recipient,
                    ...normalized.request,
                })

                assertTeamsCreateActivityResponse(response, normalized.dedupeKey)
            }, normalized.dedupeKey)
        }
    }

    /**
     * Executes Teams request with retry semantics.
     *
     * @param operation Deferred Teams API call.
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
                const normalizedError = normalizeTeamsError(error, dedupeKey)
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
 * Creates Teams fetch-backed REST client.
 *
 * @param options Provider options.
 * @returns Teams-compatible client.
 */
function createTeamsRestClient(options: ITeamsProviderOptions): ITeamsRestClient {
    const botToken = normalizeOptionalText(options.botToken)
    if (botToken === undefined) {
        throw new TeamsProviderError("Teams bot token is required when client is not provided", {
            code: TEAMS_PROVIDER_ERROR_CODE.CONFIGURATION,
            isRetryable: false,
        })
    }

    const baseUrl = normalizeOptionalText(options.baseUrl) ?? DEFAULT_TEAMS_BASE_URL

    return {
        async createActivity(request: ITeamsCreateActivityRequest): Promise<ITeamsCreateActivityResponse> {
            const response = await fetch(
                `${baseUrl}/conversations/${encodeURIComponent(request.conversationId)}/activities`,
                {
                    method: "POST",
                    headers: {
                        authorization: `Bearer ${botToken}`,
                        "content-type": "application/json",
                    },
                    body: JSON.stringify(mapTeamsCreateActivityRequestBody(request)),
                },
            )

            const responseBody = await parseJsonBody(response)
            if (response.ok === false) {
                throw createTeamsFetchError(response, responseBody)
            }

            return extractActivityResponse(responseBody)
        },
    }
}

/**
 * Validates and normalizes Teams send request.
 *
 * @param payload Shared notification payload.
 * @returns Normalized Teams request.
 */
function normalizeTeamsSendRequest(payload: INotificationPayload): INormalizedTeamsSendRequest {
    if (payload.channel !== NOTIFICATION_CHANNEL.TEAMS) {
        throw new TeamsProviderError("Teams provider supports TEAMS notification channel only", {
            code: TEAMS_PROVIDER_ERROR_CODE.INVALID_PAYLOAD,
            isRetryable: false,
        })
    }

    const title = normalizeRequiredText(payload.title, "title")
    const body = normalizeRequiredText(payload.body, "body")
    const recipients = dedupeRecipients(payload.recipients)
    if (recipients.length === 0) {
        throw new TeamsProviderError("recipients must contain at least one non-empty value", {
            code: TEAMS_PROVIDER_ERROR_CODE.INVALID_PAYLOAD,
            isRetryable: false,
        })
    }

    const dedupeKey = buildDedupeKey(payload, title, body, recipients)
    const replyToId = resolveReplyToId(payload.metadata)

    return {
        dedupeKey,
        recipients,
        request: {
            text: `**${title}**\n\n${body}`,
            replyToId,
        },
    }
}

/**
 * Resolves optional Teams reply activity id from metadata.
 *
 * @param metadata Optional notification metadata.
 * @returns Optional reply activity id.
 */
function resolveReplyToId(
    metadata: Readonly<Record<string, unknown>> | undefined,
): string | undefined {
    if (metadata === undefined) {
        return undefined
    }

    return normalizeOptionalText(metadata["replyToActivityId"])
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
    return `teams:${fingerprint}`
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
 * Asserts Teams response validity.
 *
 * @param response Teams API response.
 * @param dedupeKey Delivery dedupe key.
 */
function assertTeamsCreateActivityResponse(
    response: ITeamsCreateActivityResponse,
    dedupeKey: string,
): void {
    const activityId = normalizeOptionalText(response.id)
        ?? normalizeOptionalText(response.activityId)

    if (activityId === undefined) {
        throw new TeamsProviderError("Teams API response does not contain activity id", {
            code: TEAMS_PROVIDER_ERROR_CODE.REQUEST_FAILED,
            isRetryable: true,
            dedupeKey,
        })
    }
}

/**
 * Maps unknown request failure into typed Teams provider error.
 *
 * @param error Unknown failure.
 * @param dedupeKey Delivery dedupe key.
 * @returns Typed Teams provider error.
 */
function normalizeTeamsError(error: unknown, dedupeKey: string): TeamsProviderError {
    if (error instanceof TeamsProviderError) {
        return error
    }

    const statusCode = readNumberProperty(error, "statusCode")
    const retryAfterMs = readNumberProperty(error, "retryAfterMs")

    if (statusCode === 401) {
        return new TeamsProviderError("Teams authentication failed", {
            code: TEAMS_PROVIDER_ERROR_CODE.AUTHENTICATION,
            isRetryable: false,
            statusCode,
            dedupeKey,
        })
    }

    if (statusCode === 403) {
        return new TeamsProviderError("Teams access denied", {
            code: TEAMS_PROVIDER_ERROR_CODE.PERMISSION_DENIED,
            isRetryable: false,
            statusCode,
            dedupeKey,
        })
    }

    if (statusCode === 404) {
        return new TeamsProviderError("Teams destination conversation not found", {
            code: TEAMS_PROVIDER_ERROR_CODE.NOT_FOUND,
            isRetryable: false,
            statusCode,
            dedupeKey,
        })
    }

    if (statusCode === 429) {
        return new TeamsProviderError("Teams rate limit exceeded", {
            code: TEAMS_PROVIDER_ERROR_CODE.RATE_LIMITED,
            isRetryable: true,
            statusCode,
            retryAfterMs: retryAfterMs ?? DEFAULT_RETRY_BASE_DELAY_MS,
            dedupeKey,
        })
    }

    if (statusCode !== undefined && statusCode >= 500) {
        return new TeamsProviderError("Teams upstream service is unavailable", {
            code: TEAMS_PROVIDER_ERROR_CODE.UPSTREAM_UNAVAILABLE,
            isRetryable: true,
            statusCode,
            dedupeKey,
        })
    }

    if (error instanceof Error) {
        return new TeamsProviderError(error.message, {
            code: TEAMS_PROVIDER_ERROR_CODE.REQUEST_FAILED,
            isRetryable: true,
            statusCode,
            retryAfterMs,
            dedupeKey,
        })
    }

    return new TeamsProviderError("Teams request failed", {
        code: TEAMS_PROVIDER_ERROR_CODE.REQUEST_FAILED,
        isRetryable: true,
        statusCode,
        retryAfterMs,
        dedupeKey,
    })
}

/**
 * Resolves retry delay from error metadata and fallback backoff.
 *
 * @param error Typed Teams provider error.
 * @param attempt Current attempt number.
 * @returns Delay in milliseconds.
 */
function resolveRetryDelayMs(error: TeamsProviderError, attempt: number): number {
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
 * Creates normalized fetch error for Teams API failure.
 *
 * @param response Fetch response.
 * @param responseBody Parsed response body.
 * @returns Error enriched with status and retry metadata.
 */
function createTeamsFetchError(
    response: Response,
    responseBody: unknown,
): Error & {statusCode: number; retryAfterMs?: number} {
    const message = resolveTeamsErrorMessage(response.status, responseBody)
    const retryAfterMs = resolveRetryAfterMs(response, responseBody)

    return Object.assign(new Error(message), {
        statusCode: response.status,
        retryAfterMs,
    })
}

/**
 * Resolves human-readable Teams error message.
 *
 * @param statusCode HTTP status code.
 * @param responseBody Parsed response body.
 * @returns Error message.
 */
function resolveTeamsErrorMessage(statusCode: number, responseBody: unknown): string {
    const bodyRecord = toRecord(responseBody)
    const rootMessage = normalizeOptionalText(bodyRecord?.["message"])
    if (rootMessage !== undefined) {
        return rootMessage
    }

    const errorRecord = toRecord(bodyRecord?.["error"])
    const nestedMessage = normalizeOptionalText(errorRecord?.["message"])
    if (nestedMessage !== undefined) {
        return nestedMessage
    }

    return `Teams API request failed with status ${String(statusCode)}`
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
 * Extracts create-activity response.
 *
 * @param responseBody Parsed response body.
 * @returns Normalized activity response.
 */
function extractActivityResponse(responseBody: unknown): ITeamsCreateActivityResponse {
    const bodyRecord = toRecord(responseBody)
    return {
        id: normalizeOptionalText(bodyRecord?.["id"]),
        activityId: normalizeOptionalText(bodyRecord?.["activityId"]),
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
 * Maps typed request into Teams API payload.
 *
 * @param request Typed create-activity request.
 * @returns Raw Teams request payload.
 */
function mapTeamsCreateActivityRequestBody(
    request: ITeamsCreateActivityRequest,
): ITeamsActivityRequestBody {
    return {
        type: "message",
        text: request.text,
        replyToId: request.replyToId,
    }
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
        throw new TeamsProviderError(`${fieldName} cannot be empty`, {
            code: TEAMS_PROVIDER_ERROR_CODE.INVALID_PAYLOAD,
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
        throw new TeamsProviderError("retryMaxAttempts must be positive integer", {
            code: TEAMS_PROVIDER_ERROR_CODE.CONFIGURATION,
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
