import type {
    ExternalContextSource,
    IExternalContext,
    IExternalContextProvider,
} from "@codenautic/core"

import {DatadogAlertAcl, DatadogContextAcl} from "./acl"
import {DatadogProviderError} from "./datadog-provider.error"
import type {IDatadogAlert} from "./datadog.types"

const DEFAULT_DATADOG_API_URL = "https://api.datadoghq.com"
const DEFAULT_RETRY_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_BASE_DELAY_MS = 250
const DEFAULT_LOGS_LIMIT = 25
const DEFAULT_LOGS_TIME_WINDOW_MINUTES = 120

type DatadogMonitorPayload = Readonly<Record<string, unknown>>
type DatadogLogsSearchPayload = Readonly<Record<string, unknown>>

/**
 * Response headers returned by Datadog API client.
 */
export interface IDatadogResponseHeaders {
    readonly [key: string]: string | undefined
}

/**
 * Generic Datadog API response envelope.
 */
export interface IDatadogApiResponse<TData> {
    /**
     * HTTP status code.
     */
    readonly status: number

    /**
     * Lower-cased HTTP headers.
     */
    readonly headers: IDatadogResponseHeaders

    /**
     * Decoded JSON body when available.
     */
    readonly data?: TData
}

/**
 * Parameters for Datadog monitor fetch.
 */
export interface IDatadogGetMonitorRequest {
    /**
     * Datadog monitor identifier.
     */
    readonly monitorId: string
}

/**
 * Parameters for Datadog logs search request.
 */
export interface IDatadogSearchLogsRequest {
    /**
     * Datadog logs query expression.
     */
    readonly query: string

    /**
     * ISO timestamp range start.
     */
    readonly from: string

    /**
     * ISO timestamp range end.
     */
    readonly to: string

    /**
     * Maximum logs to return.
     */
    readonly limit: number
}

/**
 * Minimal Datadog client contract used by provider.
 */
export interface IDatadogApiClient {
    /**
     * Loads a Datadog monitor by identifier.
     *
     * @param request Monitor request parameters.
     * @returns API response envelope.
     */
    getMonitor(
        request: IDatadogGetMonitorRequest,
    ): Promise<IDatadogApiResponse<DatadogMonitorPayload>>

    /**
     * Searches Datadog logs.
     *
     * @param request Logs request parameters.
     * @returns API response envelope.
     */
    searchLogs(
        request: IDatadogSearchLogsRequest,
    ): Promise<IDatadogApiResponse<DatadogLogsSearchPayload>>
}

/**
 * Datadog-specific provider contract.
 */
export interface IDatadogProvider {
    /**
     * Loads Datadog alert by monitor identifier.
     *
     * @param alertId Datadog monitor identifier.
     * @returns Normalized Datadog alert or null when not found.
     */
    getAlert(alertId: string): Promise<IDatadogAlert | null>
}

/**
 * Datadog provider constructor options.
 */
export interface IDatadogProviderOptions {
    /**
     * Base Datadog API URL.
     */
    readonly baseUrl?: string

    /**
     * Datadog API key.
     */
    readonly apiKey?: string

    /**
     * Datadog application key.
     */
    readonly applicationKey?: string

    /**
     * Datadog application key alias.
     */
    readonly appKey?: string

    /**
     * Optional injected Datadog-compatible client for tests.
     */
    readonly client?: IDatadogApiClient

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
     * Maximum number of logs returned for one alert lookup.
     */
    readonly logsLimit?: number

    /**
     * Logs lookup window size in minutes.
     */
    readonly logsTimeWindowMinutes?: number

    /**
     * Optional explicit logs query override.
     */
    readonly logsQuery?: string

    /**
     * Optional deterministic clock.
     */
    readonly now?: () => Date
}

/**
 * Datadog implementation of shared external-context provider contracts.
 */
export class DatadogProvider implements IExternalContextProvider, IDatadogProvider {
    public readonly source: ExternalContextSource

    private readonly client: IDatadogApiClient
    private readonly alertAcl: DatadogAlertAcl
    private readonly contextAcl: DatadogContextAcl
    private readonly retryMaxAttempts: number
    private readonly sleep: (delayMs: number) => Promise<void>
    private readonly logsLimit: number
    private readonly logsTimeWindowMinutes: number
    private readonly logsQuery?: string
    private readonly now: () => Date

    /**
     * Creates Datadog provider.
     *
     * @param options Provider options.
     */
    public constructor(options: IDatadogProviderOptions) {
        this.source = "DATADOG"
        this.client = options.client ?? createDatadogApiClient(options)
        this.alertAcl = new DatadogAlertAcl()
        this.contextAcl = new DatadogContextAcl()
        this.retryMaxAttempts = normalizeRetryMaxAttempts(options.retryMaxAttempts)
        this.sleep = options.sleep ?? defaultSleep
        this.logsLimit = normalizePositiveInteger(options.logsLimit, DEFAULT_LOGS_LIMIT)
        this.logsTimeWindowMinutes = normalizePositiveInteger(
            options.logsTimeWindowMinutes,
            DEFAULT_LOGS_TIME_WINDOW_MINUTES,
        )
        this.logsQuery = normalizeOptionalText(options.logsQuery)
        this.now = options.now ?? (() => new Date())
    }

    /**
     * Loads Datadog alert by monitor identifier.
     *
     * @param alertId Datadog monitor identifier.
     * @returns Normalized Datadog alert or null when not found.
     */
    public async getAlert(alertId: string): Promise<IDatadogAlert | null> {
        const monitorPayload = await this.resolveMonitorPayload(alertId)
        if (monitorPayload === null) {
            return null
        }

        return this.alertAcl.toDomain(monitorPayload)
    }

    /**
     * Loads Datadog context and normalizes it to shared external-context payload.
     *
     * @param identifier Datadog monitor identifier.
     * @returns Normalized external context or null when not found.
     */
    public async loadContext(identifier: string): Promise<IExternalContext | null> {
        const monitorPayload = await this.resolveMonitorPayload(identifier)
        if (monitorPayload === null) {
            return null
        }

        const logsPayload = await this.resolveLogsPayload(identifier, monitorPayload)
        return this.contextAcl.toDomain({
            monitor: monitorPayload,
            logs: logsPayload,
        })
    }

    /**
     * Resolves canonical Datadog monitor payload by identifier.
     *
     * @param identifier Datadog monitor identifier.
     * @returns Canonical monitor payload or null.
     */
    private async resolveMonitorPayload(identifier: string): Promise<DatadogMonitorPayload | null> {
        const normalizedIdentifier = normalizeOptionalText(identifier)
        if (normalizedIdentifier === undefined) {
            return null
        }

        const payload = await this.executeRequest<DatadogMonitorPayload>(
            () => {
                return this.client.getMonitor({
                    monitorId: normalizedIdentifier,
                })
            },
            true,
        )

        if (payload === null) {
            return null
        }

        return canonicalizeMonitorPayload(payload)
    }

    /**
     * Resolves Datadog logs payload correlated with monitor details.
     *
     * @param alertId Datadog monitor identifier.
     * @param monitorPayload Canonical monitor payload.
     * @returns Canonical logs payload.
     */
    private async resolveLogsPayload(
        alertId: string,
        monitorPayload: DatadogMonitorPayload,
    ): Promise<DatadogLogsSearchPayload> {
        const monitorAlert = this.alertAcl.toDomain(monitorPayload)
        const logsQuery = this.logsQuery ?? buildDefaultLogsQuery(monitorAlert, alertId)
        const dateRange = resolveLogsDateRange(
            monitorAlert,
            this.logsTimeWindowMinutes,
            this.now,
        )
        const payload = await this.executeRequest<DatadogLogsSearchPayload>(
            () => {
                return this.client.searchLogs({
                    query: logsQuery,
                    from: dateRange.from,
                    to: dateRange.to,
                    limit: this.logsLimit,
                })
            },
            false,
        )

        if (payload === null) {
            return {
                data: [],
            }
        }

        return canonicalizeLogsSearchPayload(payload)
    }

    /**
     * Executes Datadog API request with retry handling for retryable statuses.
     *
     * @param operation Deferred client request.
     * @param allowNotFound Whether 404 should return null.
     * @returns Successful payload or null for allowed 404.
     */
    private async executeRequest<TData>(
        operation: () => Promise<IDatadogApiResponse<TData>>,
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

        throw new DatadogProviderError("Datadog request failed after exhausting retries", {
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
    private async retryIfNeeded(error: DatadogProviderError, attempt: number): Promise<boolean> {
        if (shouldRetryRequest(error, attempt, this.retryMaxAttempts) === false) {
            return false
        }

        await this.sleep(resolveRetryDelayMs(error, attempt))
        return true
    }
}

/**
 * Internal options for REST-backed Datadog client.
 */
interface IDatadogRestApiClientOptions {
    readonly baseUrl: string
    readonly apiKey: string
    readonly applicationKey: string
    readonly fetchImplementation: typeof fetch
}

/**
 * Fetch-backed Datadog REST API client.
 */
class DatadogRestApiClient implements IDatadogApiClient {
    private readonly baseUrl: string
    private readonly apiKey: string
    private readonly applicationKey: string
    private readonly fetchImplementation: typeof fetch

    /**
     * Creates fetch-backed Datadog client.
     *
     * @param options Client options.
     */
    public constructor(options: IDatadogRestApiClientOptions) {
        this.baseUrl = options.baseUrl
        this.apiKey = options.apiKey
        this.applicationKey = options.applicationKey
        this.fetchImplementation = options.fetchImplementation
    }

    /**
     * Loads Datadog monitor via REST API.
     *
     * @param request Monitor request parameters.
     * @returns API response envelope.
     */
    public getMonitor(
        request: IDatadogGetMonitorRequest,
    ): Promise<IDatadogApiResponse<DatadogMonitorPayload>> {
        return this.requestJson<DatadogMonitorPayload>({
            method: "GET",
            path: "/api/v1/monitor/" + encodeURIComponent(request.monitorId),
        })
    }

    /**
     * Searches Datadog logs via REST API.
     *
     * @param request Logs request parameters.
     * @returns API response envelope.
     */
    public searchLogs(
        request: IDatadogSearchLogsRequest,
    ): Promise<IDatadogApiResponse<DatadogLogsSearchPayload>> {
        return this.requestJson<DatadogLogsSearchPayload>({
            method: "POST",
            path: "/api/v2/logs/events/search",
            body: {
                filter: {
                    query: request.query,
                    from: request.from,
                    to: request.to,
                },
                sort: "desc",
                page: {
                    limit: request.limit,
                },
            },
        })
    }

    /**
     * Executes JSON request against Datadog REST API.
     *
     * @param request Request configuration.
     * @returns Response envelope with decoded body.
     */
    private async requestJson<TData>(request: {
        readonly method: "GET" | "POST"
        readonly path: string
        readonly body?: Readonly<Record<string, unknown>>
    }): Promise<IDatadogApiResponse<TData>> {
        const url = buildRequestUrl(this.baseUrl, request.path)
        const response = await this.fetchImplementation(url, {
            method: request.method,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "DD-API-KEY": this.apiKey,
                "DD-APPLICATION-KEY": this.applicationKey,
            },
            ...(request.body !== undefined ? {body: JSON.stringify(request.body)} : {}),
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
 * Creates fetch-backed Datadog API client from provider options.
 *
 * @param options Provider options.
 * @returns Datadog API client.
 */
function createDatadogApiClient(options: IDatadogProviderOptions): IDatadogApiClient {
    const baseUrl = normalizeOptionalText(options.baseUrl) ?? DEFAULT_DATADOG_API_URL
    const apiKey = normalizeOptionalText(options.apiKey)
    const applicationKey = normalizeOptionalText(options.applicationKey ?? options.appKey)

    if (apiKey === undefined) {
        throw new DatadogProviderError(
            "Datadog apiKey is required when no client is provided",
            {
                code: "CONFIGURATION",
                isRetryable: false,
            },
        )
    }

    if (applicationKey === undefined) {
        throw new DatadogProviderError(
            "Datadog applicationKey is required when no client is provided",
            {
                code: "CONFIGURATION",
                isRetryable: false,
            },
        )
    }

    return new DatadogRestApiClient({
        baseUrl,
        apiKey,
        applicationKey,
        fetchImplementation: options.fetchImplementation ?? fetch,
    })
}

/**
 * Builds fallback logs query using monitor identity and key tags.
 *
 * @param alert Normalized monitor alert.
 * @param fallbackIdentifier Raw monitor identifier fallback.
 * @returns Datadog logs query.
 */
function buildDefaultLogsQuery(alert: IDatadogAlert, fallbackIdentifier: string): string {
    const monitorId = normalizeOptionalText(alert.id) ?? normalizeOptionalText(fallbackIdentifier) ?? "unknown"
    const segments: string[] = [`@monitor.id:${monitorId}`]
    const serviceTag = alert.tags?.find((tag) => {
        return tag.startsWith("service:")
    })

    if (serviceTag !== undefined) {
        segments.push(serviceTag)
    }

    if (alert.status.toLowerCase() === "alert") {
        segments.push("status:error")
    }

    return segments.join(" ")
}

/**
 * Resolves logs query date range from monitor alert and configured window.
 *
 * @param alert Normalized monitor alert.
 * @param logsTimeWindowMinutes Window size in minutes.
 * @param now Deterministic clock.
 * @returns Date range in ISO format.
 */
function resolveLogsDateRange(
    alert: IDatadogAlert,
    logsTimeWindowMinutes: number,
    now: () => Date,
): Readonly<{from: string; to: string}> {
    const alertTimestamp = parseDate(alert.triggeredAt) ?? now()
    const toDate = new Date(alertTimestamp.getTime())
    const fromDate = new Date(toDate.getTime() - logsTimeWindowMinutes * 60_000)

    return {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
    }
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
function readHeaders(headers: Headers): IDatadogResponseHeaders {
    const collected: Record<string, string | undefined> = {}

    headers.forEach((value, key) => {
        collected[key.toLowerCase()] = value
    })

    return collected
}

/**
 * Creates normalized Datadog provider error from HTTP response envelope.
 *
 * @param response Datadog API response.
 * @returns Normalized Datadog provider error.
 */
function createResponseError(response: IDatadogApiResponse<unknown>): DatadogProviderError {
    const statusCode = response.status
    const retryAfterMs = readRetryAfterMs(response.headers)
    const message =
        readErrorMessage(response.data)
        ?? `Datadog request failed with status ${String(statusCode)}`
    const code = readErrorCode(response.data) ?? `HTTP_${String(statusCode)}`

    return new DatadogProviderError(message, {
        statusCode,
        code,
        retryAfterMs,
        isRetryable: statusCode === 429 || statusCode >= 500,
    })
}

/**
 * Resolves response payload for success and allowed not-found branches.
 *
 * @param response Datadog API response.
 * @param allowNotFound Whether 404 should return null.
 * @returns Response payload or null when 404 is allowed.
 */
function resolveResponseData<TData>(
    response: IDatadogApiResponse<TData>,
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
 * Canonicalizes Datadog monitor payload.
 *
 * @param payload Raw monitor payload.
 * @returns Canonical monitor payload.
 */
function canonicalizeMonitorPayload(payload: DatadogMonitorPayload): DatadogMonitorPayload {
    const monitor = toRecord(payload["monitor"])
    if (monitor !== null) {
        return monitor
    }

    const data = toRecord(payload["data"])
    if (data !== null) {
        return data
    }

    return payload
}

/**
 * Canonicalizes Datadog logs search payload.
 *
 * @param payload Raw logs search payload.
 * @returns Canonical logs payload.
 */
function canonicalizeLogsSearchPayload(payload: DatadogLogsSearchPayload): DatadogLogsSearchPayload {
    const data = toArray(payload["data"])
    if (data.length > 0) {
        return {
            ...payload,
            data,
        }
    }

    return {
        ...payload,
        data: [],
    }
}

/**
 * Normalizes thrown request errors into DatadogProviderError.
 *
 * @param error Unknown thrown error.
 * @returns Normalized provider error.
 */
function normalizeRequestError(error: unknown): DatadogProviderError {
    if (error instanceof DatadogProviderError) {
        return error
    }

    if (error instanceof Error) {
        return new DatadogProviderError(error.message, {
            code: "NETWORK_ERROR",
            isRetryable: true,
        })
    }

    return new DatadogProviderError("Datadog request failed", {
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
function resolveRetryDelayMs(error: DatadogProviderError, attempt: number): number {
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
function readRetryAfterMs(headers: IDatadogResponseHeaders): number | undefined {
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
 * Reads Datadog error message from common response body shapes.
 *
 * @param payload Error payload candidate.
 * @returns Human-readable error message.
 */
function readErrorMessage(payload: unknown): string | undefined {
    const record = toRecord(payload)
    if (record === null) {
        return undefined
    }

    const directMessage = normalizeOptionalText(record["message"] ?? record["error"])
    if (directMessage !== undefined) {
        return directMessage
    }

    const errors = toArray(record["errors"])
    const firstError = errors[0]
    if (typeof firstError === "string") {
        const normalized = normalizeOptionalText(firstError)
        if (normalized !== undefined) {
            return normalized
        }
    }

    const firstErrorRecord = toRecord(firstError)
    return normalizeOptionalText(firstErrorRecord?.["message"])
}

/**
 * Reads provider-specific error code from common Datadog error shapes.
 *
 * @param payload Error payload candidate.
 * @returns Machine-readable error code.
 */
function readErrorCode(payload: unknown): string | undefined {
    const record = toRecord(payload)
    if (record === null) {
        return undefined
    }

    const code = normalizeOptionalText(record["code"])
    if (code !== undefined) {
        return code
    }

    const firstErrorRecord = toRecord(toArray(record["errors"])[0])
    return normalizeOptionalText(firstErrorRecord?.["code"])
}

/**
 * Builds absolute Datadog request URL.
 *
 * @param baseUrl Datadog base URL.
 * @param path API path.
 * @returns Absolute request URL.
 */
function buildRequestUrl(baseUrl: string, path: string): string {
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
    const url = new URL(path.replace(/^\//, ""), normalizedBaseUrl)
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
    error: DatadogProviderError,
    attempt: number,
    retryMaxAttempts: number,
): boolean {
    return error.isRetryable && attempt < retryMaxAttempts
}

/**
 * Parses optional date-like string into Date object.
 *
 * @param value Candidate date value.
 * @returns Parsed date when valid.
 */
function parseDate(value: string | undefined): Date | undefined {
    if (value === undefined) {
        return undefined
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.valueOf())) {
        return undefined
    }

    return parsed
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
