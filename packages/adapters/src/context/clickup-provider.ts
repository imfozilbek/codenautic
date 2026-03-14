import type {
    ExternalContextSource,
    IClickUpProvider,
    IClickUpTask,
    IExternalContext,
    IExternalContextProvider,
} from "@codenautic/core"

import {ClickUpContextAcl, ClickUpTaskAcl} from "./acl"
import {ClickUpProviderError} from "./clickup-provider.error"

const DEFAULT_CLICKUP_API_URL = "https://api.clickup.com/api/v2"
const DEFAULT_RETRY_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_BASE_DELAY_MS = 250

type ClickUpTaskPayload = Readonly<Record<string, unknown>>

/**
 * Response headers returned by ClickUp API client.
 */
export interface IClickUpResponseHeaders {
    readonly [key: string]: string | undefined
}

/**
 * Generic ClickUp API response envelope.
 */
export interface IClickUpApiResponse<TData> {
    /**
     * HTTP status code.
     */
    readonly status: number

    /**
     * Lower-cased HTTP headers.
     */
    readonly headers: IClickUpResponseHeaders

    /**
     * Decoded JSON body when available.
     */
    readonly data?: TData
}

/**
 * Parameters for ClickUp task fetch.
 */
export interface IClickUpGetTaskRequest {
    /**
     * ClickUp task identifier.
     */
    readonly taskId: string

    /**
     * Whether subtasks should be included.
     */
    readonly includeSubtasks: boolean
}

/**
 * Minimal ClickUp client contract used by provider.
 */
export interface IClickUpApiClient {
    /**
     * Loads a single ClickUp task by identifier.
     *
     * @param request Task request parameters.
     * @returns API response envelope.
     */
    getTask(request: IClickUpGetTaskRequest): Promise<IClickUpApiResponse<ClickUpTaskPayload>>
}

/**
 * ClickUp provider constructor options.
 */
export interface IClickUpProviderOptions {
    /**
     * Base ClickUp API URL.
     */
    readonly baseUrl?: string

    /**
     * ClickUp API token.
     */
    readonly apiToken?: string

    /**
     * ClickUp OAuth access token.
     */
    readonly accessToken?: string

    /**
     * Alternative token alias.
     */
    readonly token?: string

    /**
     * Optional injected ClickUp-compatible client for tests.
     */
    readonly client?: IClickUpApiClient

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
     * Whether subtasks should be included in task payload.
     */
    readonly includeSubtasks?: boolean
}

/**
 * ClickUp implementation of shared external-context provider contracts.
 */
export class ClickUpProvider implements IExternalContextProvider, IClickUpProvider {
    public readonly source: ExternalContextSource

    private readonly client: IClickUpApiClient
    private readonly taskAcl: ClickUpTaskAcl
    private readonly contextAcl: ClickUpContextAcl
    private readonly retryMaxAttempts: number
    private readonly sleep: (delayMs: number) => Promise<void>
    private readonly includeSubtasks: boolean

    /**
     * Creates ClickUp provider.
     *
     * @param options Provider options.
     */
    public constructor(options: IClickUpProviderOptions) {
        this.source = "CLICKUP"
        this.client = options.client ?? createClickUpApiClient(options)
        this.taskAcl = new ClickUpTaskAcl()
        this.contextAcl = new ClickUpContextAcl()
        this.retryMaxAttempts = normalizeRetryMaxAttempts(options.retryMaxAttempts)
        this.sleep = options.sleep ?? defaultSleep
        this.includeSubtasks = options.includeSubtasks ?? false
    }

    /**
     * Loads ClickUp task by identifier.
     *
     * @param taskId ClickUp task identifier.
     * @returns Normalized ClickUp task or null when not found.
     */
    public async getTask(taskId: string): Promise<IClickUpTask | null> {
        const payload = await this.resolveTaskPayload(taskId)
        if (payload === null) {
            return null
        }

        return this.taskAcl.toDomain(payload)
    }

    /**
     * Loads ClickUp context and normalizes it to shared external-context payload.
     *
     * @param identifier ClickUp task identifier.
     * @returns Normalized external context or null when not found.
     */
    public async loadContext(identifier: string): Promise<IExternalContext | null> {
        const payload = await this.resolveTaskPayload(identifier)
        if (payload === null) {
            return null
        }

        return this.contextAcl.toDomain(payload)
    }

    /**
     * Resolves canonical ClickUp task payload by identifier.
     *
     * @param identifier ClickUp task identifier.
     * @returns Canonical ClickUp task payload or null.
     */
    private async resolveTaskPayload(identifier: string): Promise<ClickUpTaskPayload | null> {
        const normalizedIdentifier = normalizeOptionalText(identifier)
        if (normalizedIdentifier === undefined) {
            return null
        }

        const payload = await this.executeRequest<ClickUpTaskPayload>(
            () => {
                return this.client.getTask({
                    taskId: normalizedIdentifier,
                    includeSubtasks: this.includeSubtasks,
                })
            },
            true,
        )

        if (payload === null) {
            return null
        }

        return canonicalizeTaskPayload(payload)
    }

    /**
     * Executes ClickUp API request with retry handling for retryable statuses.
     *
     * @param operation Deferred client request.
     * @param allowNotFound Whether 404 should return null.
     * @returns Successful payload or null for allowed 404.
     */
    private async executeRequest<TData>(
        operation: () => Promise<IClickUpApiResponse<TData>>,
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

        throw new ClickUpProviderError("ClickUp request failed after exhausting retries", {
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
    private async retryIfNeeded(error: ClickUpProviderError, attempt: number): Promise<boolean> {
        if (shouldRetryRequest(error, attempt, this.retryMaxAttempts) === false) {
            return false
        }

        await this.sleep(resolveRetryDelayMs(error, attempt))
        return true
    }
}

/**
 * Internal options for REST-backed ClickUp client.
 */
interface IClickUpRestApiClientOptions {
    readonly baseUrl: string
    readonly authorizationHeader: string
    readonly fetchImplementation: typeof fetch
}

/**
 * Fetch-backed ClickUp REST API client.
 */
class ClickUpRestApiClient implements IClickUpApiClient {
    private readonly baseUrl: string
    private readonly authorizationHeader: string
    private readonly fetchImplementation: typeof fetch

    /**
     * Creates fetch-backed ClickUp client.
     *
     * @param options Client options.
     */
    public constructor(options: IClickUpRestApiClientOptions) {
        this.baseUrl = options.baseUrl
        this.authorizationHeader = options.authorizationHeader
        this.fetchImplementation = options.fetchImplementation
    }

    /**
     * Loads ClickUp task via REST API.
     *
     * @param request Task request parameters.
     * @returns API response envelope.
     */
    public getTask(
        request: IClickUpGetTaskRequest,
    ): Promise<IClickUpApiResponse<ClickUpTaskPayload>> {
        return this.requestJson<ClickUpTaskPayload>("/task/" + encodeURIComponent(request.taskId), {
            include_subtasks: request.includeSubtasks ? "true" : "false",
        })
    }

    /**
     * Executes JSON request against ClickUp REST API.
     *
     * @param path API path.
     * @param query Query parameters.
     * @returns Response envelope with decoded body.
     */
    private async requestJson<TData>(
        path: string,
        query: Readonly<Record<string, string>>,
    ): Promise<IClickUpApiResponse<TData>> {
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
 * Creates fetch-backed ClickUp API client from provider options.
 *
 * @param options Provider options.
 * @returns ClickUp API client.
 */
function createClickUpApiClient(options: IClickUpProviderOptions): IClickUpApiClient {
    const baseUrl = normalizeOptionalText(options.baseUrl) ?? DEFAULT_CLICKUP_API_URL

    return new ClickUpRestApiClient({
        baseUrl,
        authorizationHeader: createAuthorizationHeader(options),
        fetchImplementation: options.fetchImplementation ?? fetch,
    })
}

/**
 * Builds ClickUp authorization header from supported auth strategies.
 *
 * @param options Provider options.
 * @returns HTTP authorization header value.
 */
function createAuthorizationHeader(options: IClickUpProviderOptions): string {
    const apiToken = normalizeOptionalText(options.apiToken)
    if (apiToken !== undefined) {
        return apiToken
    }

    const accessToken = normalizeOptionalText(options.accessToken)
    if (accessToken !== undefined) {
        return accessToken
    }

    const token = normalizeOptionalText(options.token)
    if (token !== undefined) {
        return token
    }

    throw new ClickUpProviderError("ClickUp access token is required when no client is provided", {
        code: "CONFIGURATION",
        isRetryable: false,
    })
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
function readHeaders(headers: Headers): IClickUpResponseHeaders {
    const collected: Record<string, string | undefined> = {}

    headers.forEach((value, key) => {
        collected[key.toLowerCase()] = value
    })

    return collected
}

/**
 * Creates normalized ClickUp provider error from HTTP response envelope.
 *
 * @param response ClickUp API response.
 * @returns Normalized ClickUp provider error.
 */
function createResponseError(response: IClickUpApiResponse<unknown>): ClickUpProviderError {
    const statusCode = response.status
    const retryAfterMs = readRetryAfterMs(response.headers)
    const message = readErrorMessage(response.data) ?? `ClickUp request failed with status ${String(statusCode)}`
    const code = readErrorCode(response.data) ?? `HTTP_${String(statusCode)}`

    return new ClickUpProviderError(message, {
        statusCode,
        code,
        retryAfterMs,
        isRetryable: statusCode === 429 || statusCode >= 500,
    })
}

/**
 * Resolves response payload for success and allowed not-found branches.
 *
 * @param response ClickUp API response.
 * @param allowNotFound Whether 404 should return null.
 * @returns Response payload or null when 404 is allowed.
 */
function resolveResponseData<TData>(
    response: IClickUpApiResponse<TData>,
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
 * Canonicalizes ClickUp payload by unwrapping optional `task` or `data` envelope.
 *
 * @param payload Raw ClickUp payload.
 * @returns Canonical task payload.
 */
function canonicalizeTaskPayload(payload: ClickUpTaskPayload): ClickUpTaskPayload {
    const task = toRecord(payload["task"])
    if (task !== null) {
        return task
    }

    const data = toRecord(payload["data"])
    if (data !== null) {
        return data
    }

    return payload
}

/**
 * Normalizes thrown request errors into ClickUpProviderError.
 *
 * @param error Unknown thrown error.
 * @returns Normalized provider error.
 */
function normalizeRequestError(error: unknown): ClickUpProviderError {
    if (error instanceof ClickUpProviderError) {
        return error
    }

    if (error instanceof Error) {
        return new ClickUpProviderError(error.message, {
            code: "NETWORK_ERROR",
            isRetryable: true,
        })
    }

    return new ClickUpProviderError("ClickUp request failed", {
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
function resolveRetryDelayMs(error: ClickUpProviderError, attempt: number): number {
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
function readRetryAfterMs(headers: IClickUpResponseHeaders): number | undefined {
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
 * Reads ClickUp error message from common response body shapes.
 *
 * @param payload Error payload candidate.
 * @returns Human-readable error message.
 */
function readErrorMessage(payload: unknown): string | undefined {
    const record = toRecord(payload)
    if (record === null) {
        return undefined
    }

    const directMessage = normalizeOptionalText(record["err"] ?? record["message"])
    if (directMessage !== undefined) {
        return directMessage
    }

    return undefined
}

/**
 * Reads provider-specific error code from common ClickUp error shapes.
 *
 * @param payload Error payload candidate.
 * @returns Machine-readable error code.
 */
function readErrorCode(payload: unknown): string | undefined {
    const record = toRecord(payload)
    if (record === null) {
        return undefined
    }

    const code = normalizeOptionalText(record["ECODE"] ?? record["code"])
    if (code !== undefined) {
        return code
    }

    return undefined
}

/**
 * Builds absolute ClickUp request URL with query parameters.
 *
 * @param baseUrl ClickUp base URL.
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
 * Determines whether request should be retried for current attempt.
 *
 * @param error Normalized provider error.
 * @param attempt Current attempt number.
 * @param retryMaxAttempts Configured retry budget.
 * @returns True when request should be retried.
 */
function shouldRetryRequest(
    error: ClickUpProviderError,
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
