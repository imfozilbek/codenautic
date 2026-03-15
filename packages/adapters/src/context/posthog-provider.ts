import type {
    ExternalContextSource,
    IExternalContext,
    IExternalContextProvider,
    IPostHogFeatureFlag,
    IPostHogProvider,
} from "@codenautic/core"

import {PostHogContextAcl, PostHogFeatureFlagAcl} from "./acl"
import {PostHogProviderError} from "./posthog-provider.error"

const DEFAULT_POSTHOG_API_URL = "https://app.posthog.com"
const DEFAULT_RETRY_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_BASE_DELAY_MS = 250

type PostHogFeatureFlagPayload = Readonly<Record<string, unknown>>

/**
 * Response headers returned by PostHog API client.
 */
export interface IPostHogResponseHeaders {
    readonly [key: string]: string | undefined
}

/**
 * Generic PostHog API response envelope.
 */
export interface IPostHogApiResponse<TData> {
    /**
     * HTTP status code.
     */
    readonly status: number

    /**
     * Lower-cased HTTP headers.
     */
    readonly headers: IPostHogResponseHeaders

    /**
     * Decoded JSON body when available.
     */
    readonly data?: TData
}

/**
 * Parameters for PostHog feature-flag fetch.
 */
export interface IPostHogGetFeatureFlagRequest {
    /**
     * PostHog project identifier.
     */
    readonly projectId: string

    /**
     * PostHog feature-flag key.
     */
    readonly featureFlagKey: string
}

/**
 * Minimal PostHog client contract used by provider.
 */
export interface IPostHogApiClient {
    /**
     * Loads a single PostHog feature flag.
     *
     * @param request Feature-flag request parameters.
     * @returns API response envelope.
     */
    getFeatureFlag(
        request: IPostHogGetFeatureFlagRequest,
    ): Promise<IPostHogApiResponse<PostHogFeatureFlagPayload>>
}

/**
 * PostHog provider constructor options.
 */
export interface IPostHogProviderOptions {
    /**
     * Base PostHog API URL.
     */
    readonly baseUrl?: string

    /**
     * PostHog project identifier.
     */
    readonly projectId?: string

    /**
     * PostHog personal API token.
     */
    readonly apiToken?: string

    /**
     * PostHog access token alias.
     */
    readonly accessToken?: string

    /**
     * PostHog personal API key alias.
     */
    readonly personalApiKey?: string

    /**
     * Alternative auth token alias.
     */
    readonly authToken?: string

    /**
     * Optional injected PostHog-compatible client for tests.
     */
    readonly client?: IPostHogApiClient

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
 * PostHog implementation of shared external-context provider contracts.
 */
export class PostHogProvider implements IExternalContextProvider, IPostHogProvider {
    public readonly source: ExternalContextSource

    private readonly projectId: string
    private readonly client: IPostHogApiClient
    private readonly featureFlagAcl: PostHogFeatureFlagAcl
    private readonly contextAcl: PostHogContextAcl
    private readonly retryMaxAttempts: number
    private readonly sleep: (delayMs: number) => Promise<void>

    /**
     * Creates PostHog provider.
     *
     * @param options Provider options.
     */
    public constructor(options: IPostHogProviderOptions) {
        this.source = "POSTHOG"
        this.projectId = normalizeProjectId(options.projectId, options.client === undefined)
        this.client = options.client ?? createPostHogApiClient(options, this.projectId)
        this.featureFlagAcl = new PostHogFeatureFlagAcl()
        this.contextAcl = new PostHogContextAcl()
        this.retryMaxAttempts = normalizeRetryMaxAttempts(options.retryMaxAttempts)
        this.sleep = options.sleep ?? defaultSleep
    }

    /**
     * Loads PostHog feature flag by key.
     *
     * @param featureFlagKey PostHog feature-flag key.
     * @returns Normalized PostHog feature flag or null when not found.
     */
    public async getFeatureFlag(featureFlagKey: string): Promise<IPostHogFeatureFlag | null> {
        const payload = await this.resolveFeatureFlagPayload(featureFlagKey)
        if (payload === null) {
            return null
        }

        return this.featureFlagAcl.toDomain(payload)
    }

    /**
     * Loads PostHog context and normalizes it to shared external-context payload.
     *
     * @param identifier PostHog feature-flag key.
     * @returns Normalized external context or null when not found.
     */
    public async loadContext(identifier: string): Promise<IExternalContext | null> {
        const payload = await this.resolveFeatureFlagPayload(identifier)
        if (payload === null) {
            return null
        }

        return this.contextAcl.toDomain(payload)
    }

    /**
     * Resolves canonical PostHog feature-flag payload by key.
     *
     * @param identifier PostHog feature-flag key.
     * @returns Canonical payload or null when not found.
     */
    private async resolveFeatureFlagPayload(
        identifier: string,
    ): Promise<PostHogFeatureFlagPayload | null> {
        const normalizedIdentifier = normalizeOptionalText(identifier)
        if (normalizedIdentifier === undefined) {
            return null
        }

        const payload = await this.executeRequest<PostHogFeatureFlagPayload>(
            () => {
                return this.client.getFeatureFlag({
                    projectId: this.projectId,
                    featureFlagKey: normalizedIdentifier,
                })
            },
            true,
        )

        if (payload === null) {
            return null
        }

        return canonicalizeFeatureFlagPayload(payload, normalizedIdentifier)
    }

    /**
     * Executes PostHog API request with retry handling for retryable statuses.
     *
     * @param operation Deferred client request.
     * @param allowNotFound Whether 404 should return null.
     * @returns Successful payload or null for allowed 404.
     */
    private async executeRequest<TData>(
        operation: () => Promise<IPostHogApiResponse<TData>>,
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

        throw new PostHogProviderError("PostHog request failed after exhausting retries", {
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
    private async retryIfNeeded(error: PostHogProviderError, attempt: number): Promise<boolean> {
        if (shouldRetryRequest(error, attempt, this.retryMaxAttempts) === false) {
            return false
        }

        await this.sleep(resolveRetryDelayMs(error, attempt))
        return true
    }
}

/**
 * Internal options for REST-backed PostHog client.
 */
interface IPostHogRestApiClientOptions {
    readonly baseUrl: string
    readonly authorizationHeader: string
    readonly fetchImplementation: typeof fetch
}

/**
 * Fetch-backed PostHog REST API client.
 */
class PostHogRestApiClient implements IPostHogApiClient {
    private readonly baseUrl: string
    private readonly authorizationHeader: string
    private readonly fetchImplementation: typeof fetch

    /**
     * Creates fetch-backed PostHog client.
     *
     * @param options Client options.
     */
    public constructor(options: IPostHogRestApiClientOptions) {
        this.baseUrl = options.baseUrl
        this.authorizationHeader = options.authorizationHeader
        this.fetchImplementation = options.fetchImplementation
    }

    /**
     * Loads PostHog feature flag via REST API.
     *
     * @param request Feature-flag request parameters.
     * @returns API response envelope.
     */
    public getFeatureFlag(
        request: IPostHogGetFeatureFlagRequest,
    ): Promise<IPostHogApiResponse<PostHogFeatureFlagPayload>> {
        const encodedProjectId = encodeURIComponent(request.projectId)
        const encodedFeatureFlagKey = encodeURIComponent(request.featureFlagKey)

        return this.requestJson<PostHogFeatureFlagPayload>(
            "GET",
            `/api/projects/${encodedProjectId}/feature_flags/${encodedFeatureFlagKey}/`,
        )
    }

    /**
     * Executes JSON request against PostHog REST API.
     *
     * @param method HTTP method.
     * @param path API path.
     * @returns Response envelope with decoded body.
     */
    private async requestJson<TData>(
        method: "GET",
        path: string,
    ): Promise<IPostHogApiResponse<TData>> {
        const url = buildRequestUrl(this.baseUrl, path)
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
 * Creates fetch-backed PostHog API client from provider options.
 *
 * @param options Provider options.
 * @param projectId Resolved PostHog project identifier.
 * @returns PostHog API client.
 */
function createPostHogApiClient(
    options: IPostHogProviderOptions,
    projectId: string,
): IPostHogApiClient {
    const baseUrl = normalizeOptionalText(options.baseUrl) ?? DEFAULT_POSTHOG_API_URL
    if (projectId.length === 0) {
        throw new PostHogProviderError("PostHog projectId is required when no client is provided", {
            code: "CONFIGURATION",
            isRetryable: false,
        })
    }

    return new PostHogRestApiClient({
        baseUrl,
        authorizationHeader: createAuthorizationHeader(options),
        fetchImplementation: options.fetchImplementation ?? fetch,
    })
}

/**
 * Builds PostHog authorization header from supported auth strategies.
 *
 * @param options Provider options.
 * @returns HTTP authorization header value.
 */
function createAuthorizationHeader(options: IPostHogProviderOptions): string {
    const token = normalizeOptionalText(
        options.apiToken ?? options.accessToken ?? options.personalApiKey ?? options.authToken,
    )
    if (token !== undefined) {
        return `Bearer ${token}`
    }

    throw new PostHogProviderError(
        "PostHog apiToken or accessToken is required when no client is provided",
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
function readHeaders(headers: Headers): IPostHogResponseHeaders {
    const collected: Record<string, string | undefined> = {}

    headers.forEach((value, key) => {
        collected[key.toLowerCase()] = value
    })

    return collected
}

/**
 * Creates normalized PostHog provider error from HTTP response envelope.
 *
 * @param response PostHog API response.
 * @returns Normalized provider error.
 */
function createResponseError(response: IPostHogApiResponse<unknown>): PostHogProviderError {
    const statusCode = response.status
    const retryAfterMs = readRetryAfterMs(response.headers)
    const message =
        readErrorMessage(response.data)
        ?? `PostHog request failed with status ${String(statusCode)}`
    const code = readErrorCode(response.data) ?? `HTTP_${String(statusCode)}`

    return new PostHogProviderError(message, {
        statusCode,
        code,
        retryAfterMs,
        isRetryable: statusCode === 429 || statusCode >= 500,
    })
}

/**
 * Resolves response payload for success and allowed not-found branches.
 *
 * @param response PostHog API response.
 * @param allowNotFound Whether 404 should return null.
 * @returns Response payload or null when 404 is allowed.
 */
function resolveResponseData<TData>(
    response: IPostHogApiResponse<TData>,
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
 * Canonicalizes PostHog feature-flag payload.
 *
 * @param payload Raw PostHog payload.
 * @param featureFlagKey Requested feature-flag key.
 * @returns Canonical feature-flag payload.
 */
function canonicalizeFeatureFlagPayload(
    payload: PostHogFeatureFlagPayload,
    featureFlagKey: string,
): PostHogFeatureFlagPayload {
    const nestedFeatureFlag = toRecord(payload["featureFlag"])
        ?? toRecord(payload["feature_flag"])
        ?? toRecord(payload["flag"])
        ?? toRecord(payload["data"])
    const resolvedPayload = nestedFeatureFlag ?? payload
    const resolvedKey = normalizeOptionalText(
        resolvedPayload["key"] ?? resolvedPayload["featureFlagKey"] ?? resolvedPayload["id"],
    )

    return {
        ...resolvedPayload,
        key: resolvedKey ?? featureFlagKey,
    }
}

/**
 * Normalizes thrown request errors into PostHogProviderError.
 *
 * @param error Unknown thrown error.
 * @returns Normalized provider error.
 */
function normalizeRequestError(error: unknown): PostHogProviderError {
    if (error instanceof PostHogProviderError) {
        return error
    }

    if (error instanceof Error) {
        return new PostHogProviderError(error.message, {
            code: "NETWORK_ERROR",
            isRetryable: true,
        })
    }

    return new PostHogProviderError("PostHog request failed", {
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
function resolveRetryDelayMs(error: PostHogProviderError, attempt: number): number {
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
function readRetryAfterMs(headers: IPostHogResponseHeaders): number | undefined {
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
 * Reads PostHog error message from common response body shapes.
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
 * Reads provider-specific error code from common PostHog error shapes.
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
 * Builds absolute PostHog request URL.
 *
 * @param baseUrl PostHog base URL.
 * @param path API path.
 * @returns Absolute request URL.
 */
function buildRequestUrl(baseUrl: string, path: string): string {
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
    return new URL(path.replace(/^\//, ""), normalizedBaseUrl).toString()
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
    error: PostHogProviderError,
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
 * Normalizes project identifier with optional strict validation.
 *
 * @param value Raw project identifier candidate.
 * @param isRequired Whether empty value should throw.
 * @returns Normalized project identifier.
 */
function normalizeProjectId(value: unknown, isRequired: boolean): string {
    const projectId = normalizeOptionalText(value)
    if (projectId !== undefined) {
        return projectId
    }

    if (isRequired) {
        throw new PostHogProviderError("PostHog projectId is required when no client is provided", {
            code: "CONFIGURATION",
            isRetryable: false,
        })
    }

    return "default"
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
