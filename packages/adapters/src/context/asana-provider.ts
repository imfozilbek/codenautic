import type {
    ExternalContextSource,
    IAsanaProvider,
    IAsanaTask,
    IExternalContext,
    IExternalContextProvider,
} from "@codenautic/core"

import {AsanaContextAcl, AsanaTaskAcl} from "./acl"
import {AsanaProviderError} from "./asana-provider.error"

const DEFAULT_ASANA_API_URL = "https://app.asana.com"
const DEFAULT_RETRY_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_BASE_DELAY_MS = 250
const DEFAULT_ASANA_TASK_FIELDS = [
    "gid",
    "name",
    "resource_subtype",
    "completed",
    "completed_at",
    "notes",
    "html_notes",
    "assignee.name",
    "due_on",
    "due_at",
    "tags.name",
    "memberships.project.gid",
    "memberships.project.name",
    "memberships.section.gid",
    "memberships.section.name",
    "projects.gid",
    "projects.name",
    "custom_fields.name",
    "custom_fields.display_value",
    "custom_fields.text_value",
    "custom_fields.enum_value.name",
    "modified_at",
] as const

type AsanaTaskPayload = Readonly<Record<string, unknown>>

/**
 * Response headers returned by Asana API client.
 */
export interface IAsanaResponseHeaders {
    readonly [key: string]: string | undefined
}

/**
 * Generic Asana API response envelope.
 */
export interface IAsanaApiResponse<TData> {
    /**
     * HTTP status code.
     */
    readonly status: number

    /**
     * Lower-cased HTTP headers.
     */
    readonly headers: IAsanaResponseHeaders

    /**
     * Decoded JSON body when available.
     */
    readonly data?: TData
}

/**
 * Parameters for Asana task fetch.
 */
export interface IAsanaGetTaskRequest {
    /**
     * Asana task identifier.
     */
    readonly taskId: string

    /**
     * Requested Asana task fields.
     */
    readonly optFields: readonly string[]
}

/**
 * Minimal Asana client contract used by provider.
 */
export interface IAsanaApiClient {
    /**
     * Loads a single Asana task by identifier.
     *
     * @param request Task request parameters.
     * @returns API response envelope.
     */
    getTask(request: IAsanaGetTaskRequest): Promise<IAsanaApiResponse<AsanaTaskPayload>>
}

/**
 * Asana provider constructor options.
 */
export interface IAsanaProviderOptions {
    /**
     * Base Asana URL.
     */
    readonly baseUrl?: string

    /**
     * Asana OAuth access token.
     */
    readonly accessToken?: string

    /**
     * Asana personal access token.
     */
    readonly personalAccessToken?: string

    /**
     * Alternative token alias.
     */
    readonly token?: string

    /**
     * Optional injected Asana-compatible client for tests.
     */
    readonly client?: IAsanaApiClient

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
     * Requested Asana task fields.
     */
    readonly taskFields?: readonly string[]
}

/**
 * Asana implementation of shared external-context provider contracts.
 */
export class AsanaProvider implements IExternalContextProvider, IAsanaProvider {
    public readonly source: ExternalContextSource

    private readonly client: IAsanaApiClient
    private readonly taskAcl: AsanaTaskAcl
    private readonly contextAcl: AsanaContextAcl
    private readonly retryMaxAttempts: number
    private readonly sleep: (delayMs: number) => Promise<void>
    private readonly taskFields: readonly string[]

    /**
     * Creates Asana provider.
     *
     * @param options Provider options.
     */
    public constructor(options: IAsanaProviderOptions) {
        this.source = "ASANA"
        this.client = options.client ?? createAsanaApiClient(options)
        this.taskAcl = new AsanaTaskAcl()
        this.contextAcl = new AsanaContextAcl()
        this.retryMaxAttempts = normalizeRetryMaxAttempts(options.retryMaxAttempts)
        this.sleep = options.sleep ?? defaultSleep
        this.taskFields = normalizeTaskFields(options.taskFields)
    }

    /**
     * Loads Asana task by identifier.
     *
     * @param taskId Asana task identifier.
     * @returns Normalized Asana task or null when not found.
     */
    public async getTask(taskId: string): Promise<IAsanaTask | null> {
        const payload = await this.resolveTaskPayload(taskId)
        if (payload === null) {
            return null
        }

        return this.taskAcl.toDomain(payload)
    }

    /**
     * Loads Asana context and normalizes it to shared external-context payload.
     *
     * @param identifier Asana task identifier.
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
     * Resolves canonical Asana task payload by identifier.
     *
     * @param identifier Asana task identifier.
     * @returns Canonical Asana task payload or null.
     */
    private async resolveTaskPayload(identifier: string): Promise<AsanaTaskPayload | null> {
        const normalizedIdentifier = normalizeOptionalText(identifier)
        if (normalizedIdentifier === undefined) {
            return null
        }

        const payload = await this.executeRequest<AsanaTaskPayload>(
            () => {
                return this.client.getTask({
                    taskId: normalizedIdentifier,
                    optFields: this.taskFields,
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
     * Executes Asana API request with retry handling for retryable statuses.
     *
     * @param operation Deferred client request.
     * @param allowNotFound Whether 404 should return null.
     * @returns Successful payload or null for allowed 404.
     */
    private async executeRequest<TData>(
        operation: () => Promise<IAsanaApiResponse<TData>>,
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

        throw new AsanaProviderError("Asana request failed after exhausting retries", {
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
    private async retryIfNeeded(error: AsanaProviderError, attempt: number): Promise<boolean> {
        if (shouldRetryRequest(error, attempt, this.retryMaxAttempts) === false) {
            return false
        }

        await this.sleep(resolveRetryDelayMs(error, attempt))
        return true
    }
}

/**
 * Internal options for REST-backed Asana client.
 */
interface IAsanaRestApiClientOptions {
    readonly baseUrl: string
    readonly authorizationHeader: string
    readonly fetchImplementation: typeof fetch
}

/**
 * Fetch-backed Asana REST API client.
 */
class AsanaRestApiClient implements IAsanaApiClient {
    private readonly baseUrl: string
    private readonly authorizationHeader: string
    private readonly fetchImplementation: typeof fetch

    /**
     * Creates fetch-backed Asana client.
     *
     * @param options Client options.
     */
    public constructor(options: IAsanaRestApiClientOptions) {
        this.baseUrl = options.baseUrl
        this.authorizationHeader = options.authorizationHeader
        this.fetchImplementation = options.fetchImplementation
    }

    /**
     * Loads Asana task via REST API.
     *
     * @param request Task request parameters.
     * @returns API response envelope.
     */
    public getTask(request: IAsanaGetTaskRequest): Promise<IAsanaApiResponse<AsanaTaskPayload>> {
        return this.requestJson<AsanaTaskPayload>("/api/1.0/tasks/" + encodeURIComponent(request.taskId), {
            opt_fields: request.optFields.join(","),
        })
    }

    /**
     * Executes JSON request against Asana REST API.
     *
     * @param path API path.
     * @param query Query parameters.
     * @returns Response envelope with decoded body.
     */
    private async requestJson<TData>(
        path: string,
        query: Readonly<Record<string, string>>,
    ): Promise<IAsanaApiResponse<TData>> {
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
 * Creates fetch-backed Asana API client from provider options.
 *
 * @param options Provider options.
 * @returns Asana API client.
 */
function createAsanaApiClient(options: IAsanaProviderOptions): IAsanaApiClient {
    const baseUrl = normalizeOptionalText(options.baseUrl) ?? DEFAULT_ASANA_API_URL

    return new AsanaRestApiClient({
        baseUrl,
        authorizationHeader: createAuthorizationHeader(options),
        fetchImplementation: options.fetchImplementation ?? fetch,
    })
}

/**
 * Builds Asana authorization header from supported auth strategies.
 *
 * @param options Provider options.
 * @returns HTTP authorization header value.
 */
function createAuthorizationHeader(options: IAsanaProviderOptions): string {
    const accessToken = normalizeOptionalText(options.accessToken)
    if (accessToken !== undefined) {
        return `Bearer ${accessToken}`
    }

    const personalAccessToken = normalizeOptionalText(options.personalAccessToken)
    if (personalAccessToken !== undefined) {
        return `Bearer ${personalAccessToken}`
    }

    const token = normalizeOptionalText(options.token)
    if (token !== undefined) {
        return `Bearer ${token}`
    }

    throw new AsanaProviderError("Asana access token is required when no client is provided", {
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
function readHeaders(headers: Headers): IAsanaResponseHeaders {
    const collected: Record<string, string | undefined> = {}

    headers.forEach((value, key) => {
        collected[key.toLowerCase()] = value
    })

    return collected
}

/**
 * Creates normalized Asana provider error from HTTP response envelope.
 *
 * @param response Asana API response.
 * @returns Normalized Asana provider error.
 */
function createResponseError(response: IAsanaApiResponse<unknown>): AsanaProviderError {
    const statusCode = response.status
    const retryAfterMs = readRetryAfterMs(response.headers)
    const message = readErrorMessage(response.data) ?? `Asana request failed with status ${String(statusCode)}`
    const code = readErrorCode(response.data) ?? `HTTP_${String(statusCode)}`

    return new AsanaProviderError(message, {
        statusCode,
        code,
        retryAfterMs,
        isRetryable: statusCode === 429 || statusCode >= 500,
    })
}

/**
 * Resolves response payload for success and allowed not-found branches.
 *
 * @param response Asana API response.
 * @param allowNotFound Whether 404 should return null.
 * @returns Response payload or null when 404 is allowed.
 */
function resolveResponseData<TData>(
    response: IAsanaApiResponse<TData>,
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
 * Canonicalizes Asana API payload by unwrapping optional `data` envelope.
 *
 * @param payload Raw Asana payload.
 * @returns Canonical task payload.
 */
function canonicalizeTaskPayload(payload: AsanaTaskPayload): AsanaTaskPayload {
    const data = toRecord(payload["data"])
    if (data !== null) {
        return data
    }

    return payload
}

/**
 * Normalizes thrown request errors into AsanaProviderError.
 *
 * @param error Unknown thrown error.
 * @returns Normalized provider error.
 */
function normalizeRequestError(error: unknown): AsanaProviderError {
    if (error instanceof AsanaProviderError) {
        return error
    }

    if (error instanceof Error) {
        return new AsanaProviderError(error.message, {
            code: "NETWORK_ERROR",
            isRetryable: true,
        })
    }

    return new AsanaProviderError("Asana request failed", {
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
function resolveRetryDelayMs(error: AsanaProviderError, attempt: number): number {
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
function readRetryAfterMs(headers: IAsanaResponseHeaders): number | undefined {
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
 * Reads Asana error message from common response body shapes.
 *
 * @param payload Error payload candidate.
 * @returns Human-readable error message.
 */
function readErrorMessage(payload: unknown): string | undefined {
    const record = toRecord(payload)
    if (record === null) {
        return undefined
    }

    const directMessage = normalizeOptionalText(record["message"])
    if (directMessage !== undefined) {
        return directMessage
    }

    const messages: string[] = []
    for (const errorCandidate of toArray(record["errors"])) {
        const errorRecord = toRecord(errorCandidate)
        const message = normalizeOptionalText(errorRecord?.["message"])
        if (message !== undefined) {
            messages.push(message)
        }
    }

    if (messages.length === 0) {
        return undefined
    }

    return messages.join("; ")
}

/**
 * Reads provider-specific error code from common Asana error shapes.
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

    for (const errorCandidate of toArray(record["errors"])) {
        const errorRecord = toRecord(errorCandidate)
        const code = normalizeOptionalText(
            errorRecord?.["code"] ?? errorRecord?.["phrase"] ?? errorRecord?.["error_code"],
        )
        if (code !== undefined) {
            return code
        }
    }

    return undefined
}

/**
 * Builds absolute Asana request URL with query parameters.
 *
 * @param baseUrl Asana base URL.
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
 * Normalizes requested Asana task fields.
 *
 * @param value Raw task-field list.
 * @returns Deduplicated task-field list.
 */
function normalizeTaskFields(value: readonly string[] | undefined): readonly string[] {
    const uniqueFields: string[] = []
    const seen = new Set<string>()

    for (const candidate of value ?? DEFAULT_ASANA_TASK_FIELDS) {
        const normalizedField = normalizeOptionalText(candidate)
        if (normalizedField === undefined || seen.has(normalizedField)) {
            continue
        }

        seen.add(normalizedField)
        uniqueFields.push(normalizedField)
    }

    return uniqueFields
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
    error: AsanaProviderError,
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
 * @returns Array candidate or empty list.
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
