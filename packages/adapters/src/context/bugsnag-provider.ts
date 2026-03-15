import type {
    ExternalContextSource,
    IBugsnagError,
    IBugsnagProvider,
    IExternalContext,
    IExternalContextProvider,
} from "@codenautic/core"

import {BugsnagContextAcl, BugsnagErrorAcl} from "./acl"
import {BugsnagProviderError} from "./bugsnag-provider.error"

const DEFAULT_BUGSNAG_API_URL = "https://api.bugsnag.com"
const DEFAULT_RETRY_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_BASE_DELAY_MS = 250
const DEFAULT_EVENTS_PER_PAGE = 25

type BugsnagErrorPayload = Readonly<Record<string, unknown>>
type BugsnagEventsPayload = Readonly<Record<string, unknown>>

/**
 * Response headers returned by Bugsnag API client.
 */
export interface IBugsnagResponseHeaders {
    readonly [key: string]: string | undefined
}

/**
 * Generic Bugsnag API response envelope.
 */
export interface IBugsnagApiResponse<TData> {
    /**
     * HTTP status code.
     */
    readonly status: number

    /**
     * Lower-cased HTTP headers.
     */
    readonly headers: IBugsnagResponseHeaders

    /**
     * Decoded JSON body when available.
     */
    readonly data?: TData
}

/**
 * Parameters for Bugsnag error fetch.
 */
export interface IBugsnagGetErrorRequest {
    /**
     * Bugsnag error identifier.
     */
    readonly errorId: string
}

/**
 * Parameters for Bugsnag events fetch.
 */
export interface IBugsnagListErrorEventsRequest {
    /**
     * Bugsnag error identifier.
     */
    readonly errorId: string

    /**
     * Number of events requested.
     */
    readonly perPage: number
}

/**
 * Minimal Bugsnag client contract used by provider.
 */
export interface IBugsnagApiClient {
    /**
     * Loads a single Bugsnag error.
     *
     * @param request Error request parameters.
     * @returns API response envelope.
     */
    getError(request: IBugsnagGetErrorRequest): Promise<IBugsnagApiResponse<BugsnagErrorPayload>>

    /**
     * Lists Bugsnag error events.
     *
     * @param request Error-events request parameters.
     * @returns API response envelope.
     */
    listErrorEvents(
        request: IBugsnagListErrorEventsRequest,
    ): Promise<IBugsnagApiResponse<BugsnagEventsPayload>>
}

/**
 * Bugsnag provider constructor options.
 */
export interface IBugsnagProviderOptions {
    /**
     * Base Bugsnag API URL.
     */
    readonly baseUrl?: string

    /**
     * Bugsnag API token.
     */
    readonly apiToken?: string

    /**
     * Bugsnag access token alias.
     */
    readonly accessToken?: string

    /**
     * Alternative auth token alias.
     */
    readonly authToken?: string

    /**
     * Optional injected Bugsnag-compatible client for tests.
     */
    readonly client?: IBugsnagApiClient

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

    /**
     * Number of events requested for context enrichment.
     */
    readonly eventsPerPage?: number
}

/**
 * Bugsnag implementation of shared external-context provider contracts.
 */
export class BugsnagProvider implements IExternalContextProvider, IBugsnagProvider {
    public readonly source: ExternalContextSource

    private readonly client: IBugsnagApiClient
    private readonly errorAcl: BugsnagErrorAcl
    private readonly contextAcl: BugsnagContextAcl
    private readonly retryMaxAttempts: number
    private readonly sleep: (delayMs: number) => Promise<void>
    private readonly eventsPerPage: number

    /**
     * Creates Bugsnag provider.
     *
     * @param options Provider options.
     */
    public constructor(options: IBugsnagProviderOptions) {
        this.source = "BUGSNAG"
        this.client = options.client ?? createBugsnagApiClient(options)
        this.errorAcl = new BugsnagErrorAcl()
        this.contextAcl = new BugsnagContextAcl()
        this.retryMaxAttempts = normalizeRetryMaxAttempts(options.retryMaxAttempts)
        this.sleep = options.sleep ?? defaultSleep
        this.eventsPerPage = normalizePositiveInteger(options.eventsPerPage, DEFAULT_EVENTS_PER_PAGE)
    }

    /**
     * Loads Bugsnag error by identifier.
     *
     * @param errorId Bugsnag error identifier.
     * @returns Normalized Bugsnag error or null when not found.
     */
    public async getError(errorId: string): Promise<IBugsnagError | null> {
        const payload = await this.resolveErrorPayload(errorId)
        if (payload === null) {
            return null
        }

        return this.errorAcl.toDomain(payload)
    }

    /**
     * Loads Bugsnag context and normalizes it to shared external-context payload.
     *
     * @param identifier Bugsnag error identifier.
     * @returns Normalized external context or null when not found.
     */
    public async loadContext(identifier: string): Promise<IExternalContext | null> {
        const payload = await this.resolveErrorPayload(identifier)
        if (payload === null) {
            return null
        }

        return this.contextAcl.toDomain(payload)
    }

    /**
     * Resolves canonical Bugsnag error payload and enriches it with events.
     *
     * @param identifier Bugsnag error identifier.
     * @returns Canonical Bugsnag error payload or null.
     */
    private async resolveErrorPayload(identifier: string): Promise<BugsnagErrorPayload | null> {
        const normalizedIdentifier = normalizeOptionalText(identifier)
        if (normalizedIdentifier === undefined) {
            return null
        }

        const errorPayload = await this.executeRequest<BugsnagErrorPayload>(
            () => {
                return this.client.getError({
                    errorId: normalizedIdentifier,
                })
            },
            true,
        )

        if (errorPayload === null) {
            return null
        }

        const canonicalErrorPayload = canonicalizeErrorPayload(errorPayload)
        const eventsPayload = await this.executeRequest<BugsnagEventsPayload>(
            () => {
                return this.client.listErrorEvents({
                    errorId: normalizedIdentifier,
                    perPage: this.eventsPerPage,
                })
            },
            false,
        )

        if (eventsPayload === null) {
            return canonicalErrorPayload
        }

        const events = canonicalizeEventsPayload(eventsPayload)
        if (events.length === 0) {
            return canonicalErrorPayload
        }

        return {
            ...canonicalErrorPayload,
            events,
        }
    }

    /**
     * Executes Bugsnag API request with retry handling for retryable statuses.
     *
     * @param operation Deferred client request.
     * @param allowNotFound Whether 404 should return null.
     * @returns Successful payload or null for allowed 404.
     */
    private async executeRequest<TData>(
        operation: () => Promise<IBugsnagApiResponse<TData>>,
        allowNotFound: boolean,
    ): Promise<TData | null> {
        for (let attempt = 1; attempt <= this.retryMaxAttempts; attempt += 1) {
            try {
                const response = await operation()
                const resolution = resolveResponseData(response, allowNotFound)
                if (resolution !== undefined) {
                    return resolution
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

        throw new BugsnagProviderError("Bugsnag request failed after exhausting retries", {
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
    private async retryIfNeeded(error: BugsnagProviderError, attempt: number): Promise<boolean> {
        if (shouldRetryRequest(error, attempt, this.retryMaxAttempts) === false) {
            return false
        }

        await this.sleep(resolveRetryDelayMs(error, attempt))
        return true
    }
}

/**
 * Internal options for REST-backed Bugsnag client.
 */
interface IBugsnagRestApiClientOptions {
    readonly baseUrl: string
    readonly authorizationHeader: string
    readonly fetchImplementation: typeof fetch
}

/**
 * Fetch-backed Bugsnag REST API client.
 */
class BugsnagRestApiClient implements IBugsnagApiClient {
    private readonly baseUrl: string
    private readonly authorizationHeader: string
    private readonly fetchImplementation: typeof fetch

    /**
     * Creates fetch-backed Bugsnag client.
     *
     * @param options Client options.
     */
    public constructor(options: IBugsnagRestApiClientOptions) {
        this.baseUrl = options.baseUrl
        this.authorizationHeader = options.authorizationHeader
        this.fetchImplementation = options.fetchImplementation
    }

    /**
     * Loads Bugsnag error via REST API.
     *
     * @param request Error request parameters.
     * @returns API response envelope.
     */
    public getError(
        request: IBugsnagGetErrorRequest,
    ): Promise<IBugsnagApiResponse<BugsnagErrorPayload>> {
        return this.requestJson<BugsnagErrorPayload>("GET", `/errors/${encodeURIComponent(request.errorId)}`)
    }

    /**
     * Lists Bugsnag events via REST API.
     *
     * @param request Events request parameters.
     * @returns API response envelope.
     */
    public listErrorEvents(
        request: IBugsnagListErrorEventsRequest,
    ): Promise<IBugsnagApiResponse<BugsnagEventsPayload>> {
        return this.requestJson<BugsnagEventsPayload>(
            "GET",
            `/errors/${encodeURIComponent(request.errorId)}/events`,
            {
                per_page: String(request.perPage),
            },
        )
    }

    /**
     * Executes JSON request against Bugsnag REST API.
     *
     * @param method HTTP method.
     * @param path API path.
     * @param query Query parameters.
     * @returns Response envelope with decoded body.
     */
    private async requestJson<TData>(
        method: "GET",
        path: string,
        query: Readonly<Record<string, string>> = {},
    ): Promise<IBugsnagApiResponse<TData>> {
        const url = buildRequestUrl(this.baseUrl, path, query)
        const response = await this.fetchImplementation(url, {
            method,
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
 * Creates fetch-backed Bugsnag API client from provider options.
 *
 * @param options Provider options.
 * @returns Bugsnag API client.
 */
function createBugsnagApiClient(options: IBugsnagProviderOptions): IBugsnagApiClient {
    const baseUrl = normalizeOptionalText(options.baseUrl) ?? DEFAULT_BUGSNAG_API_URL

    return new BugsnagRestApiClient({
        baseUrl,
        authorizationHeader: createAuthorizationHeader(options),
        fetchImplementation: options.fetchImplementation ?? fetch,
    })
}

/**
 * Builds Bugsnag authorization header from supported auth strategies.
 *
 * @param options Provider options.
 * @returns HTTP authorization header value.
 */
function createAuthorizationHeader(options: IBugsnagProviderOptions): string {
    const token = normalizeOptionalText(options.apiToken ?? options.accessToken ?? options.authToken)
    if (token !== undefined) {
        return `token ${token}`
    }

    throw new BugsnagProviderError(
        "Bugsnag apiToken or accessToken is required when no client is provided",
        {
            code: "CONFIGURATION",
            isRetryable: false,
        },
    )
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
function readHeaders(headers: Headers): IBugsnagResponseHeaders {
    const collected: Record<string, string | undefined> = {}

    headers.forEach((value, key) => {
        collected[key.toLowerCase()] = value
    })

    return collected
}

/**
 * Creates normalized Bugsnag provider error from HTTP response envelope.
 *
 * @param response Bugsnag API response.
 * @returns Normalized Bugsnag provider error.
 */
function createResponseError(response: IBugsnagApiResponse<unknown>): BugsnagProviderError {
    const statusCode = response.status
    const retryAfterMs = readRetryAfterMs(response.headers)
    const message =
        readErrorMessage(response.data)
        ?? `Bugsnag request failed with status ${String(statusCode)}`
    const code = readErrorCode(response.data) ?? `HTTP_${String(statusCode)}`

    return new BugsnagProviderError(message, {
        statusCode,
        code,
        retryAfterMs,
        isRetryable: statusCode === 429 || statusCode >= 500,
    })
}

/**
 * Resolves response payload for success and allowed not-found branches.
 *
 * @param response Bugsnag API response.
 * @param allowNotFound Whether 404 should return null.
 * @returns Response payload or null when 404 is allowed.
 */
function resolveResponseData<TData>(
    response: IBugsnagApiResponse<TData>,
    allowNotFound: boolean,
): TData | null | undefined {
    if (response.status >= 200 && response.status < 300) {
        return response.data ?? null
    }

    if (allowNotFound && response.status === 404) {
        return null
    }

    return undefined
}

/**
 * Canonicalizes Bugsnag error payload.
 *
 * @param payload Raw Bugsnag payload.
 * @returns Canonical error payload.
 */
function canonicalizeErrorPayload(payload: BugsnagErrorPayload): BugsnagErrorPayload {
    const error = toRecord(payload["error"])
    if (error !== null) {
        return error
    }

    const data = toRecord(payload["data"])
    if (data !== null) {
        return data
    }

    return payload
}

/**
 * Canonicalizes Bugsnag events payload to event list.
 *
 * @param payload Raw Bugsnag events payload.
 * @returns Canonical event list.
 */
function canonicalizeEventsPayload(payload: BugsnagEventsPayload): readonly unknown[] {
    const events = toArray(payload["events"])
    if (events.length > 0) {
        return events
    }

    return toArray(payload["data"])
}

/**
 * Normalizes thrown request errors into BugsnagProviderError.
 *
 * @param error Unknown thrown error.
 * @returns Normalized provider error.
 */
function normalizeRequestError(error: unknown): BugsnagProviderError {
    if (error instanceof BugsnagProviderError) {
        return error
    }

    if (error instanceof Error) {
        return new BugsnagProviderError(error.message, {
            code: "NETWORK_ERROR",
            isRetryable: true,
        })
    }

    return new BugsnagProviderError("Bugsnag request failed", {
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
function resolveRetryDelayMs(error: BugsnagProviderError, attempt: number): number {
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
 * Parses retry-after header into milliseconds.
 *
 * @param headers Response headers.
 * @returns Retry delay in milliseconds.
 */
function readRetryAfterMs(headers: IBugsnagResponseHeaders): number | undefined {
    const retryAfter = headers["retry-after"]
    if (retryAfter === undefined) {
        return undefined
    }

    const retryAfterSeconds = Number(retryAfter)
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
        return retryAfterSeconds * 1000
    }

    const retryAt = new Date(retryAfter)
    if (Number.isNaN(retryAt.valueOf())) {
        return undefined
    }

    const delayMs = retryAt.getTime() - Date.now()
    return delayMs > 0 ? delayMs : undefined
}

/**
 * Reads Bugsnag error message from common response body shapes.
 *
 * @param payload Error payload candidate.
 * @returns Human-readable error message.
 */
function readErrorMessage(payload: unknown): string | undefined {
    const record = toRecord(payload)
    if (record === null) {
        return undefined
    }

    const directMessage = normalizeOptionalText(
        record["message"] ?? record["error"] ?? record["detail"],
    )
    if (directMessage !== undefined) {
        return directMessage
    }

    const firstError = toArray(record["errors"])[0]
    if (typeof firstError === "string") {
        return normalizeOptionalText(firstError)
    }

    return normalizeOptionalText(toRecord(firstError)?.["message"])
}

/**
 * Reads provider-specific error code from common Bugsnag error shapes.
 *
 * @param payload Error payload candidate.
 * @returns Machine-readable error code.
 */
function readErrorCode(payload: unknown): string | undefined {
    const record = toRecord(payload)
    if (record === null) {
        return undefined
    }

    const directCode = normalizeOptionalText(record["code"])
    if (directCode !== undefined) {
        return directCode
    }

    return normalizeOptionalText(toRecord(toArray(record["errors"])[0])?.["code"])
}

/**
 * Builds absolute Bugsnag request URL with query parameters.
 *
 * @param baseUrl Bugsnag base URL.
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
 * Normalizes positive integer values and applies fallback for invalid inputs.
 *
 * @param value Candidate value.
 * @param fallback Fallback value.
 * @returns Normalized positive integer.
 */
function normalizePositiveInteger(value: number | undefined, fallback: number): number {
    if (typeof value !== "number" || Number.isInteger(value) === false || value < 1) {
        return fallback
    }

    return value
}

/**
 * Determines whether request should be retried for current attempt.
 *
 * @param error Normalized provider error.
 * @param attempt Current attempt number.
 * @param retryMaxAttempts Configured retry budget.
 * @returns True when request should be retried.
 */
function shouldRetryRequest(
    error: BugsnagProviderError,
    attempt: number,
    retryMaxAttempts: number,
): boolean {
    return error.isRetryable && attempt < retryMaxAttempts
}

/**
 * Normalizes optional string-like input.
 *
 * @param value Unknown candidate value.
 * @returns Trimmed text or undefined.
 */
function normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== "string") {
        return undefined
    }

    const normalized = value.trim()
    return normalized.length > 0 ? normalized : undefined
}

/**
 * Converts unknown value to plain object record.
 *
 * @param value Candidate payload.
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
 * @param value Candidate payload.
 * @returns Array or empty list.
 */
function toArray(value: unknown): readonly unknown[] {
    if (Array.isArray(value)) {
        return value
    }

    return []
}

/**
 * Default async sleep helper.
 *
 * @param delayMs Delay in milliseconds.
 * @returns Promise resolved after delay.
 */
function defaultSleep(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, delayMs)
    })
}
