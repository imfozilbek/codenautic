import type {
    ExternalContextSource,
    IExternalContext,
    IExternalContextProvider,
    ISentryError,
    ISentryProvider,
} from "@codenautic/core"

import {SentryContextAcl, SentryErrorAcl} from "./acl"
import {SentryProviderError} from "./sentry-provider.error"

const DEFAULT_SENTRY_API_URL = "https://sentry.io"
const DEFAULT_RETRY_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_BASE_DELAY_MS = 250

type SentryIssuePayload = Readonly<Record<string, unknown>>
type SentryEventPayload = Readonly<Record<string, unknown>>

/**
 * Response headers returned by Sentry API client.
 */
export interface ISentryResponseHeaders {
    readonly [key: string]: string | undefined
}

/**
 * Generic Sentry API response envelope.
 */
export interface ISentryApiResponse<TData> {
    /**
     * HTTP status code.
     */
    readonly status: number

    /**
     * Lower-cased HTTP headers.
     */
    readonly headers: ISentryResponseHeaders

    /**
     * Decoded JSON body when available.
     */
    readonly data?: TData
}

/**
 * Parameters for Sentry issue fetch.
 */
export interface ISentryGetIssueRequest {
    /**
     * Sentry issue identifier.
     */
    readonly issueId: string
}

/**
 * Parameters for Sentry issue-events fetch.
 */
export interface ISentryListIssueEventsRequest {
    /**
     * Sentry organization slug.
     */
    readonly organizationSlug: string

    /**
     * Sentry issue identifier.
     */
    readonly issueId: string

    /**
     * Cursor used for pagination.
     */
    readonly cursor?: string

    /**
     * Indicates whether full event payload should be requested.
     */
    readonly full?: boolean
}

/**
 * Minimal Sentry client contract used by provider.
 */
export interface ISentryApiClient {
    /**
     * Loads a single Sentry issue.
     *
     * @param request Issue request parameters.
     * @returns API response envelope.
     */
    getIssue(request: ISentryGetIssueRequest): Promise<ISentryApiResponse<SentryIssuePayload>>

    /**
     * Lists Sentry issue events.
     *
     * @param request Issue-events request parameters.
     * @returns API response envelope.
     */
    listIssueEvents(
        request: ISentryListIssueEventsRequest,
    ): Promise<ISentryApiResponse<readonly unknown[]>>
}

/**
 * Sentry provider constructor options.
 */
export interface ISentryProviderOptions {
    /**
     * Base Sentry API URL.
     */
    readonly baseUrl?: string

    /**
     * Sentry organization slug used for issue-events pagination.
     */
    readonly organizationSlug?: string

    /**
     * Sentry auth token.
     */
    readonly authToken?: string

    /**
     * Alternative OAuth access token.
     */
    readonly accessToken?: string

    /**
     * Optional injected Sentry-compatible client for tests.
     */
    readonly client?: ISentryApiClient

    /**
     * Optional custom fetch implementation.
     */
    readonly fetchImplementation?: typeof fetch

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
 * Sentry implementation of shared external-context provider contracts.
 */
export class SentryProvider implements IExternalContextProvider, ISentryProvider {
    public readonly source: ExternalContextSource

    private readonly client: ISentryApiClient
    private readonly errorAcl: SentryErrorAcl
    private readonly contextAcl: SentryContextAcl
    private readonly retryMaxAttempts: number
    private readonly sleep: (delayMs: number) => Promise<void>
    private readonly organizationSlug: string

    /**
     * Creates Sentry provider.
     *
     * @param options Provider options.
     */
    public constructor(options: ISentryProviderOptions) {
        this.source = "SENTRY"
        this.organizationSlug = normalizeOrganizationSlug(options.organizationSlug)
        this.client = options.client ?? createSentryApiClient(options)
        this.errorAcl = new SentryErrorAcl()
        this.contextAcl = new SentryContextAcl()
        this.retryMaxAttempts = normalizeRetryMaxAttempts(options.retryMaxAttempts)
        this.sleep = options.sleep ?? defaultSleep
    }

    /**
     * Loads Sentry error by identifier.
     *
     * @param errorId Sentry issue identifier.
     * @returns Normalized Sentry error or null when not found.
     */
    public async getError(errorId: string): Promise<ISentryError | null> {
        const payload = await this.resolveIssuePayload(errorId)
        if (payload === null) {
            return null
        }

        return this.errorAcl.toDomain(payload)
    }

    /**
     * Loads Sentry context and normalizes it to shared external-context payload.
     *
     * @param identifier Sentry issue identifier.
     * @returns Normalized external context or null when not found.
     */
    public async loadContext(identifier: string): Promise<IExternalContext | null> {
        const payload = await this.resolveIssuePayload(identifier)
        if (payload === null) {
            return null
        }

        return this.contextAcl.toDomain(payload)
    }

    /**
     * Resolves canonical Sentry issue payload and enriches it with paginated event data.
     *
     * @param identifier Sentry issue identifier.
     * @returns Canonical Sentry issue payload or null.
     */
    private async resolveIssuePayload(identifier: string): Promise<SentryIssuePayload | null> {
        const normalizedIdentifier = normalizeOptionalText(identifier)
        if (normalizedIdentifier === undefined) {
            return null
        }

        const issueResponse = await this.executeRequest<SentryIssuePayload>(() => {
            return this.client.getIssue({
                issueId: normalizedIdentifier,
            })
        }, true)

        if (issueResponse === null) {
            return null
        }

        const issuePayload = canonicalizeIssuePayload(issueResponse.data, normalizedIdentifier)
        const eventPayload = await this.resolveEventPayload(normalizedIdentifier)

        if (eventPayload === null) {
            return issuePayload
        }

        return {
            ...issuePayload,
            latestEvent: eventPayload,
        }
    }

    /**
     * Resolves paginated Sentry event payload containing a usable stack trace.
     *
     * @param issueId Sentry issue identifier.
     * @returns Matching event payload or null when stack trace is unavailable.
     */
    private async resolveEventPayload(issueId: string): Promise<SentryEventPayload | null> {
        let cursor: string | undefined
        const seenCursors = new Set<string>()

        while (true) {
            const response = await this.executeRequest<readonly unknown[]>(() => {
                return this.client.listIssueEvents({
                    organizationSlug: this.organizationSlug,
                    issueId,
                    full: true,
                    ...(cursor !== undefined ? {cursor} : {}),
                })
            }, false)

            if (response === null) {
                return null
            }

            for (const eventCandidate of toArray(response.data)) {
                const event = toRecord(eventCandidate)
                if (event === null) {
                    continue
                }

                if (this.hasUsableStackTrace(issueId, event)) {
                    return event
                }
            }

            const nextCursor = resolveNextCursor(response.headers)
            if (nextCursor === undefined || seenCursors.has(nextCursor)) {
                return null
            }

            seenCursors.add(nextCursor)
            cursor = nextCursor
        }
    }

    /**
     * Executes Sentry API request with retry handling for retryable statuses.
     *
     * @param operation Deferred client request.
     * @param allowNotFound Whether 404 should return null.
     * @returns API response envelope or null for allowed 404.
     */
    private async executeRequest<TData>(
        operation: () => Promise<ISentryApiResponse<TData>>,
        allowNotFound: boolean,
    ): Promise<ISentryApiResponse<TData> | null> {
        for (let attempt = 1; attempt <= this.retryMaxAttempts; attempt += 1) {
            try {
                const response = await operation()
                if (response.status >= 200 && response.status < 300) {
                    return response
                }

                if (allowNotFound && response.status === 404) {
                    return null
                }

                const error = createResponseError(response)
                if (await this.retryIfNeeded(error, attempt)) {
                    continue
                }

                throw error
            } catch (error: unknown) {
                const normalizedError = normalizeRequestError(error)
                if (await this.retryIfNeeded(normalizedError, attempt)) {
                    continue
                }

                throw normalizedError
            }
        }

        throw new SentryProviderError("Sentry request failed after exhausting retries", {
            code: "RETRY_EXHAUSTED",
            isRetryable: false,
        })
    }

    /**
     * Retries request when error is retryable and retry budget is still available.
     *
     * @param error Normalized provider error.
     * @param attempt Current attempt number.
     * @returns True when request should be retried.
     */
    private async retryIfNeeded(error: SentryProviderError, attempt: number): Promise<boolean> {
        if (shouldRetryRequest(error, attempt, this.retryMaxAttempts) === false) {
            return false
        }

        await this.sleep(resolveRetryDelayMs(error, attempt))
        return true
    }

    /**
     * Determines whether event payload contains normalized stack-trace lines.
     *
     * @param issueId Sentry issue identifier.
     * @param event Sentry event payload.
     * @returns True when event should be used for context enrichment.
     */
    private hasUsableStackTrace(issueId: string, event: SentryEventPayload): boolean {
        return this.errorAcl.toDomain({
            id: issueId,
            latestEvent: event,
        }).stackTrace.length > 0
    }
}

/**
 * Internal options for fetch-backed Sentry client.
 */
interface ISentryRestApiClientOptions {
    readonly baseUrl: string
    readonly authorizationHeader: string
    readonly fetchImplementation: typeof fetch
}

/**
 * Fetch-backed Sentry REST API client.
 */
class SentryRestApiClient implements ISentryApiClient {
    private readonly baseUrl: string
    private readonly authorizationHeader: string
    private readonly fetchImplementation: typeof fetch

    /**
     * Creates fetch-backed Sentry client.
     *
     * @param options Client options.
     */
    public constructor(options: ISentryRestApiClientOptions) {
        this.baseUrl = options.baseUrl
        this.authorizationHeader = options.authorizationHeader
        this.fetchImplementation = options.fetchImplementation
    }

    /**
     * Loads Sentry issue via REST API.
     *
     * @param request Issue request parameters.
     * @returns API response envelope.
     */
    public getIssue(request: ISentryGetIssueRequest): Promise<ISentryApiResponse<SentryIssuePayload>> {
        return this.requestJson<SentryIssuePayload>(
            "/api/0/issues/" + encodeURIComponent(request.issueId) + "/",
        )
    }

    /**
     * Lists Sentry issue events via REST API.
     *
     * @param request Issue-events request parameters.
     * @returns API response envelope.
     */
    public listIssueEvents(
        request: ISentryListIssueEventsRequest,
    ): Promise<ISentryApiResponse<readonly unknown[]>> {
        const query: Record<string, string> = {}

        if (request.full === true) {
            query["full"] = "1"
        }

        if (request.cursor !== undefined) {
            query["cursor"] = request.cursor
        }

        return this.requestJson<readonly unknown[]>(
            "/api/0/organizations/"
                + encodeURIComponent(request.organizationSlug)
                + "/issues/"
                + encodeURIComponent(request.issueId)
                + "/events/",
            query,
        )
    }

    /**
     * Executes JSON request against Sentry REST API.
     *
     * @param path API path.
     * @param query Query parameters.
     * @returns Response envelope with decoded body.
     */
    private async requestJson<TData>(
        path: string,
        query: Readonly<Record<string, string>> = {},
    ): Promise<ISentryApiResponse<TData>> {
        const url = buildRequestUrl(this.baseUrl, path, query)
        const response = await this.fetchImplementation(url, {
            method: "GET",
            headers: {
                Accept: "application/json",
                Authorization: this.authorizationHeader,
            },
        })
        const data = await readJsonResponse<TData>(response)

        return {
            status: response.status,
            headers: readHeaders(response.headers),
            data,
        }
    }
}

/**
 * Creates fetch-backed Sentry API client from provider options.
 *
 * @param options Provider options.
 * @returns Sentry API client.
 */
function createSentryApiClient(options: ISentryProviderOptions): ISentryApiClient {
    const baseUrl = normalizeOptionalText(options.baseUrl) ?? DEFAULT_SENTRY_API_URL

    return new SentryRestApiClient({
        baseUrl,
        authorizationHeader: createAuthorizationHeader(options),
        fetchImplementation: options.fetchImplementation ?? fetch,
    })
}

/**
 * Builds Sentry authorization header from supported auth strategies.
 *
 * @param options Provider options.
 * @returns HTTP authorization header value.
 */
function createAuthorizationHeader(options: ISentryProviderOptions): string {
    const accessToken = normalizeOptionalText(options.accessToken)
    if (accessToken !== undefined) {
        return accessToken.startsWith("Bearer ") ? accessToken : `Bearer ${accessToken}`
    }

    const authToken = normalizeOptionalText(options.authToken)
    if (authToken !== undefined) {
        return authToken.startsWith("Bearer ") ? authToken : `Bearer ${authToken}`
    }

    throw new SentryProviderError("Sentry authToken or accessToken is required when no client is provided", {
        code: "CONFIGURATION",
        isRetryable: false,
    })
}

/**
 * Validates organization slug configuration.
 *
 * @param value Raw organization slug.
 * @returns Normalized organization slug.
 */
function normalizeOrganizationSlug(value: string | undefined): string {
    const organizationSlug = normalizeOptionalText(value)
    if (organizationSlug === undefined) {
        throw new SentryProviderError("Sentry organizationSlug is required", {
            code: "CONFIGURATION",
            isRetryable: false,
        })
    }

    return organizationSlug
}

/**
 * Canonicalizes issue payload into ACL-friendly shape.
 *
 * @param payload Raw issue payload.
 * @param issueId Requested issue identifier.
 * @returns Canonical issue payload.
 */
function canonicalizeIssuePayload(payload: unknown, issueId: string): SentryIssuePayload {
    const issue = toRecord(payload)
    if (issue === null) {
        return {
            id: issueId,
        }
    }

    return {
        ...issue,
        ...(issue["id"] === undefined ? {id: issueId} : {}),
        issueId,
    }
}

/**
 * Creates normalized Sentry provider error from HTTP response envelope.
 *
 * @param response Sentry API response.
 * @returns Normalized Sentry provider error.
 */
function createResponseError(response: ISentryApiResponse<unknown>): SentryProviderError {
    const statusCode = response.status
    const retryAfterMs = readRetryAfterMs(response.headers)
    const message =
        readErrorMessage(response.data) ?? `Sentry request failed with status ${String(statusCode)}`
    const code = readErrorCode(response.data) ?? `HTTP_${String(statusCode)}`

    return new SentryProviderError(message, {
        statusCode,
        code,
        retryAfterMs,
        isRetryable: statusCode === 429 || statusCode >= 500,
    })
}

/**
 * Normalizes thrown request errors into SentryProviderError.
 *
 * @param error Unknown thrown error.
 * @returns Normalized provider error.
 */
function normalizeRequestError(error: unknown): SentryProviderError {
    if (error instanceof SentryProviderError) {
        return error
    }

    if (error instanceof Error) {
        return new SentryProviderError(error.message, {
            code: "NETWORK_ERROR",
            isRetryable: true,
        })
    }

    return new SentryProviderError("Sentry request failed", {
        code: "UNKNOWN_ERROR",
        isRetryable: true,
    })
}

/**
 * Resolves retry delay from provider error and current attempt number.
 *
 * @param error Normalized provider error.
 * @param attempt Current attempt number.
 * @returns Delay in milliseconds.
 */
function resolveRetryDelayMs(error: SentryProviderError, attempt: number): number {
    if (
        typeof error.retryAfterMs === "number"
        && Number.isFinite(error.retryAfterMs)
        && error.retryAfterMs > 0
    ) {
        return error.retryAfterMs
    }

    return DEFAULT_RETRY_BASE_DELAY_MS * 2 ** Math.max(attempt - 1, 0)
}

/**
 * Determines whether request should be retried.
 *
 * @param error Normalized provider error.
 * @param attempt Current attempt number.
 * @param retryMaxAttempts Maximum retry attempts.
 * @returns True when request should be retried.
 */
function shouldRetryRequest(
    error: SentryProviderError,
    attempt: number,
    retryMaxAttempts: number,
): boolean {
    return error.isRetryable && attempt < retryMaxAttempts
}

/**
 * Parses pagination headers and resolves next cursor when more results are available.
 *
 * @param headers Sentry response headers.
 * @returns Next pagination cursor or undefined.
 */
function resolveNextCursor(headers: ISentryResponseHeaders): string | undefined {
    const linkHeader = headers["link"]
    if (linkHeader === undefined) {
        return undefined
    }

    for (const segment of linkHeader.split(",")) {
        const trimmedSegment = segment.trim()
        if (trimmedSegment.includes('rel="next"') === false) {
            continue
        }

        if (trimmedSegment.includes('results="true"') === false) {
            return undefined
        }

        const cursorMatch = /cursor="([^"]+)"/.exec(trimmedSegment)
        if (cursorMatch?.[1] !== undefined) {
            return cursorMatch[1]
        }
    }

    return undefined
}

/**
 * Reads retry-delay headers into milliseconds.
 *
 * @param headers Response headers.
 * @returns Retry delay in milliseconds.
 */
function readRetryAfterMs(headers: ISentryResponseHeaders): number | undefined {
    const retryAfter = parseRetryDelayValue(headers["retry-after"])
    if (retryAfter !== undefined) {
        return retryAfter
    }

    return parseRetryDelayValue(headers["x-sentry-rate-limit-reset"])
}

/**
 * Parses retry-delay header value into milliseconds.
 *
 * @param value Header value.
 * @returns Delay in milliseconds.
 */
function parseRetryDelayValue(value: string | undefined): number | undefined {
    if (value === undefined) {
        return undefined
    }

    const trimmed = value.trim()
    if (trimmed.length === 0) {
        return undefined
    }

    const numericValue = Number(trimmed)
    if (Number.isFinite(numericValue) && numericValue > 0) {
        if (numericValue > 100000) {
            const delayMs = numericValue * 1000 - Date.now()
            return delayMs > 0 ? delayMs : undefined
        }

        return numericValue * 1000
    }

    const retryAt = new Date(trimmed)
    if (Number.isNaN(retryAt.valueOf())) {
        return undefined
    }

    const delayMs = retryAt.getTime() - Date.now()
    return delayMs > 0 ? delayMs : undefined
}

/**
 * Reads human-readable error message from common Sentry error shapes.
 *
 * @param payload Error payload candidate.
 * @returns Human-readable error message.
 */
function readErrorMessage(payload: unknown): string | undefined {
    const record = toRecord(payload)
    if (record === null) {
        return undefined
    }

    return normalizeOptionalText(record["detail"] ?? record["message"] ?? record["error"])
}

/**
 * Reads provider-specific error code from common Sentry error shapes.
 *
 * @param payload Error payload candidate.
 * @returns Machine-readable error code.
 */
function readErrorCode(payload: unknown): string | undefined {
    const record = toRecord(payload)
    if (record === null) {
        return undefined
    }

    return normalizeOptionalText(record["code"] ?? record["errorCode"] ?? record["slug"])
}

/**
 * Builds absolute Sentry request URL with query parameters.
 *
 * @param baseUrl Sentry base URL.
 * @param path API path.
 * @param query Query parameters.
 * @returns Absolute request URL.
 */
function buildRequestUrl(
    baseUrl: string,
    path: string,
    query: Readonly<Record<string, string>>,
): string {
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
    const url = new URL(path.replace(/^\//, ""), normalizedBaseUrl)

    for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value)
    }

    return url.toString()
}

/**
 * Reads JSON response body when available.
 *
 * @param response Fetch response.
 * @returns Parsed JSON payload or undefined.
 */
async function readJsonResponse<TData>(response: Response): Promise<TData | undefined> {
    const text = await response.text()
    if (text.trim().length === 0) {
        return undefined
    }

    try {
        return JSON.parse(text) as TData
    } catch {
        return undefined
    }
}

/**
 * Converts Headers object to lower-cased record.
 *
 * @param headers Fetch headers.
 * @returns Plain headers record.
 */
function readHeaders(headers: Headers): ISentryResponseHeaders {
    const collected: Record<string, string | undefined> = {}

    headers.forEach((value, key) => {
        collected[key.toLowerCase()] = value
    })

    return collected
}

/**
 * Normalizes retry attempts configuration.
 *
 * @param value Raw attempts value.
 * @returns Safe positive integer.
 */
function normalizeRetryMaxAttempts(value: number | undefined): number {
    if (typeof value !== "number" || Number.isInteger(value) === false || value < 1) {
        return DEFAULT_RETRY_MAX_ATTEMPTS
    }

    return value
}

/**
 * Normalizes optional text value.
 *
 * @param value Raw text candidate.
 * @returns Trimmed non-empty text.
 */
function normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== "string") {
        return undefined
    }

    const normalized = value.trim()
    return normalized.length > 0 ? normalized : undefined
}

/**
 * Converts unknown to plain object record.
 *
 * @param value Candidate value.
 * @returns Plain record or null.
 */
function toRecord(value: unknown): Readonly<Record<string, unknown>> | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return null
    }

    return value as Readonly<Record<string, unknown>>
}

/**
 * Converts unknown value to readonly array.
 *
 * @param value Candidate value.
 * @returns Array or empty list.
 */
function toArray(value: unknown): readonly unknown[] {
    if (Array.isArray(value)) {
        return value
    }

    return []
}

/**
 * Default async sleep implementation.
 *
 * @param delayMs Delay in milliseconds.
 * @returns Promise resolved after delay.
 */
function defaultSleep(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, delayMs)
    })
}
