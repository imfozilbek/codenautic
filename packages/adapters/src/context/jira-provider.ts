import {Buffer} from "node:buffer"

import type {
    ExternalContextSource,
    IExternalContext,
    IExternalContextProvider,
    IJiraProvider,
    IJiraTicket,
} from "@codenautic/core"

import {JiraContextAcl, JiraTicketAcl} from "./acl"
import {JiraProviderError} from "./jira-provider.error"

const DEFAULT_RETRY_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_BASE_DELAY_MS = 250
const DEFAULT_SEARCH_PAGE_SIZE = 50
const DEFAULT_ACCEPTANCE_CRITERIA_FIELD_IDS = [
    "acceptanceCriteria",
    "acceptance_criteria",
] as const
const DEFAULT_JIRA_FIELDS = [
    "summary",
    "status",
    "description",
    "updated",
    "sprint",
    "customfield_10020",
] as const
type JiraIssuePayload = Readonly<Record<string, unknown>>

/**
 * Response headers returned by Jira API client.
 */
export interface IJiraResponseHeaders {
    readonly [key: string]: string | undefined
}

/**
 * Generic Jira API response envelope.
 */
export interface IJiraApiResponse<TData> {
    /**
     * HTTP status code.
     */
    readonly status: number

    /**
     * Lower-cased HTTP headers.
     */
    readonly headers: IJiraResponseHeaders

    /**
     * Decoded JSON body when available.
     */
    readonly data?: TData
}

/**
 * Parameters for Jira issue fetch.
 */
export interface IJiraGetIssueRequest {
    /**
     * Jira issue key or identifier.
     */
    readonly issueIdOrKey: string

    /**
     * Requested Jira fields.
     */
    readonly fields: readonly string[]
}

/**
 * Paginated Jira search request.
 */
export interface IJiraSearchIssuesRequest {
    /**
     * JQL query.
     */
    readonly jql: string

    /**
     * Pagination offset.
     */
    readonly startAt: number

    /**
     * Page size.
     */
    readonly maxResults: number

    /**
     * Requested Jira fields.
     */
    readonly fields: readonly string[]
}

/**
 * Minimal Jira search response shape.
 */
export interface IJiraSearchIssuesPage {
    /**
     * Search results page.
     */
    readonly issues?: readonly unknown[]

    /**
     * Current page offset.
     */
    readonly startAt?: number

    /**
     * Current page size.
     */
    readonly maxResults?: number

    /**
     * Total available results.
     */
    readonly total?: number
}

/**
 * Minimal Jira client contract used by provider.
 */
export interface IJiraApiClient {
    /**
     * Loads a single issue by key or id.
     *
     * @param request Issue request parameters.
     * @returns API response envelope.
     */
    getIssue(request: IJiraGetIssueRequest): Promise<IJiraApiResponse<JiraIssuePayload>>

    /**
     * Executes paginated Jira search.
     *
     * @param request Search request parameters.
     * @returns API response envelope.
     */
    searchIssues(
        request: IJiraSearchIssuesRequest,
    ): Promise<IJiraApiResponse<IJiraSearchIssuesPage>>
}

/**
 * Jira provider constructor options.
 */
export interface IJiraProviderOptions {
    /**
     * Base Jira URL, for example `https://company.atlassian.net`.
     */
    readonly baseUrl?: string

    /**
     * Jira account email for basic auth.
     */
    readonly email?: string

    /**
     * Jira API token for basic auth.
     */
    readonly apiToken?: string

    /**
     * Alternative bearer token for self-hosted Jira setups.
     */
    readonly token?: string

    /**
     * Optional injected Jira-compatible client for tests.
     */
    readonly client?: IJiraApiClient

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
     * Search page size used for identifier fallback lookup.
     */
    readonly searchPageSize?: number

    /**
     * Jira custom field ids that can contain acceptance criteria.
     */
    readonly acceptanceCriteriaFieldIds?: readonly string[]
}

/**
 * Jira implementation of shared external-context provider contracts.
 */
export class JiraProvider implements IExternalContextProvider, IJiraProvider {
    public readonly source: ExternalContextSource

    private readonly client: IJiraApiClient
    private readonly ticketAcl: JiraTicketAcl
    private readonly contextAcl: JiraContextAcl
    private readonly retryMaxAttempts: number
    private readonly sleep: (delayMs: number) => Promise<void>
    private readonly searchPageSize: number
    private readonly acceptanceCriteriaFieldIds: readonly string[]

    /**
     * Creates Jira provider.
     *
     * @param options Provider options.
     */
    public constructor(options: IJiraProviderOptions) {
        this.source = "JIRA"
        this.client = options.client ?? createJiraApiClient(options)
        this.ticketAcl = new JiraTicketAcl()
        this.contextAcl = new JiraContextAcl()
        this.retryMaxAttempts = normalizeRetryMaxAttempts(options.retryMaxAttempts)
        this.sleep = options.sleep ?? defaultSleep
        this.searchPageSize = normalizeSearchPageSize(options.searchPageSize)
        this.acceptanceCriteriaFieldIds = normalizeAcceptanceCriteriaFieldIds(
            options.acceptanceCriteriaFieldIds,
        )
    }

    /**
     * Loads Jira ticket by key or identifier.
     *
     * @param ticketKey Jira issue key.
     * @returns Normalized Jira ticket or null when not found.
     */
    public async getTicket(ticketKey: string): Promise<IJiraTicket | null> {
        const payload = await this.resolveIssuePayload(ticketKey)
        if (payload === null) {
            return null
        }

        return this.ticketAcl.toDomain(payload)
    }

    /**
     * Loads Jira context and normalizes it to shared external-context payload.
     *
     * @param identifier Jira issue identifier.
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
     * Resolves Jira issue payload using direct lookup first and paginated search as fallback.
     *
     * @param identifier Issue identifier candidate.
     * @returns Canonical Jira issue payload or null.
     */
    private async resolveIssuePayload(identifier: string): Promise<JiraIssuePayload | null> {
        const normalizedIdentifier = normalizeOptionalText(identifier)
        if (normalizedIdentifier === undefined) {
            return null
        }

        const fields = this.buildRequestedFields()
        const directIssue = await this.executeRequest<JiraIssuePayload>(
            () => {
                return this.client.getIssue({
                    issueIdOrKey: normalizedIdentifier,
                    fields,
                })
            },
            true,
        )

        if (directIssue !== null) {
            return this.canonicalizeIssuePayload(directIssue)
        }

        return this.searchIssuePayload(normalizedIdentifier, fields)
    }

    /**
     * Performs paginated Jira search to recover issue payload by identifier.
     *
     * @param identifier Identifier used to build fallback JQL.
     * @param fields Requested fields.
     * @returns Canonical issue payload or null.
     */
    private async searchIssuePayload(
        identifier: string,
        fields: readonly string[],
    ): Promise<JiraIssuePayload | null> {
        let startAt = 0

        while (true) {
            const page = await this.executeRequest<IJiraSearchIssuesPage>(
                () => {
                    return this.client.searchIssues({
                        jql: buildSearchJql(identifier),
                        startAt,
                        maxResults: this.searchPageSize,
                        fields,
                    })
                },
                false,
            )

            const issues = Array.isArray(page?.issues) ? page.issues : []
            for (const issue of issues) {
                const canonicalIssue = this.canonicalizeIssuePayload(issue)
                if (canonicalIssue === null) {
                    continue
                }

                const ticket = this.ticketAcl.toDomain(canonicalIssue)
                if (ticket.key !== "UNKNOWN") {
                    return canonicalIssue
                }
            }

            const nextStart = resolveNextSearchOffset(page, startAt, issues.length)
            if (nextStart === undefined) {
                return null
            }

            startAt = nextStart
        }
    }

    /**
     * Executes Jira API request with retry handling for retryable statuses.
     *
     * @param operation Deferred client request.
     * @param allowNotFound Whether 404 should return null.
     * @returns Successful payload or null for allowed 404.
     */
    private async executeRequest<TData>(
        operation: () => Promise<IJiraApiResponse<TData>>,
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

        throw new JiraProviderError("Jira request failed after exhausting retries", {
            code: "RETRY_EXHAUSTED",
            isRetryable: false,
        })
    }

    /**
     * Builds requested Jira fields list including configured custom field ids.
     *
     * @returns Deduplicated Jira fields list.
     */
    private buildRequestedFields(): readonly string[] {
        const fields = new Set<string>(DEFAULT_JIRA_FIELDS)
        for (const fieldId of this.acceptanceCriteriaFieldIds) {
            fields.add(fieldId)
        }

        return [...fields]
    }

    /**
     * Canonicalizes provider-specific Jira payload into ACL-friendly shape.
     *
     * @param payload Raw Jira payload.
     * @returns Canonical payload.
     */
    private canonicalizeIssuePayload(payload: unknown): JiraIssuePayload | null {
        const root = toRecord(payload)
        if (root === null) {
            return null
        }

        const fields = toRecord(root["fields"])
        if (fields === null) {
            return root
        }

        const acceptanceCriteria = this.resolveAcceptanceCriteriaField(fields)
        if (acceptanceCriteria === undefined) {
            return root
        }

        return {
            ...root,
            fields: {
                ...fields,
                acceptanceCriteria,
            },
        }
    }

    /**
     * Resolves configured acceptance-criteria custom field from Jira fields object.
     *
     * @param fields Jira fields record.
     * @returns Canonical acceptance-criteria payload.
     */
    private resolveAcceptanceCriteriaField(
        fields: Readonly<Record<string, unknown>>,
    ): unknown {
        if (fields["acceptanceCriteria"] !== undefined) {
            return fields["acceptanceCriteria"]
        }

        if (fields["acceptance_criteria"] !== undefined) {
            return fields["acceptance_criteria"]
        }

        for (const fieldId of this.acceptanceCriteriaFieldIds) {
            const value = fields[fieldId]
            if (value !== undefined) {
                return value
            }
        }

        return undefined
    }

    /**
     * Retries request when error is retryable and retry budget is still available.
     *
     * @param error Normalized provider error.
     * @param attempt Current attempt number.
     * @returns True when request should be retried.
     */
    private async retryIfNeeded(error: JiraProviderError, attempt: number): Promise<boolean> {
        if (shouldRetryRequest(error, attempt, this.retryMaxAttempts) === false) {
            return false
        }

        await this.sleep(resolveRetryDelayMs(error, attempt))
        return true
    }
}

/**
 * Internal options for REST-backed Jira client.
 */
interface IJiraRestApiClientOptions {
    readonly baseUrl: string
    readonly authorizationHeader: string
    readonly fetchImplementation: typeof fetch
}

/**
 * Fetch-backed Jira REST API client.
 */
class JiraRestApiClient implements IJiraApiClient {
    private readonly baseUrl: string
    private readonly authorizationHeader: string
    private readonly fetchImplementation: typeof fetch

    /**
     * Creates fetch-backed Jira client.
     *
     * @param options Client options.
     */
    public constructor(options: IJiraRestApiClientOptions) {
        this.baseUrl = options.baseUrl
        this.authorizationHeader = options.authorizationHeader
        this.fetchImplementation = options.fetchImplementation
    }

    /**
     * Loads Jira issue via REST API.
     *
     * @param request Issue request parameters.
     * @returns API response envelope.
     */
    public getIssue(request: IJiraGetIssueRequest): Promise<IJiraApiResponse<JiraIssuePayload>> {
        return this.requestJson("/rest/api/3/issue/" + encodeURIComponent(request.issueIdOrKey), {
            fields: request.fields.join(","),
        })
    }

    /**
     * Executes Jira search via REST API.
     *
     * @param request Search request parameters.
     * @returns API response envelope.
     */
    public searchIssues(
        request: IJiraSearchIssuesRequest,
    ): Promise<IJiraApiResponse<IJiraSearchIssuesPage>> {
        return this.requestJson<IJiraSearchIssuesPage>("/rest/api/3/search", {
            jql: request.jql,
            startAt: String(request.startAt),
            maxResults: String(request.maxResults),
            fields: request.fields.join(","),
        })
    }

    /**
     * Executes JSON request against Jira REST API.
     *
     * @param path API path.
     * @param query Query parameters.
     * @returns Response envelope with decoded body.
     */
    private async requestJson<TData>(
        path: string,
        query: Readonly<Record<string, string>>,
    ): Promise<IJiraApiResponse<TData>> {
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
 * Creates fetch-backed Jira API client from provider options.
 *
 * @param options Provider options.
 * @returns Jira API client.
 */
function createJiraApiClient(options: IJiraProviderOptions): IJiraApiClient {
    const baseUrl = normalizeOptionalText(options.baseUrl)
    if (baseUrl === undefined) {
        throw new JiraProviderError("Jira baseUrl is required when no client is provided", {
            code: "CONFIGURATION",
            isRetryable: false,
        })
    }

    return new JiraRestApiClient({
        baseUrl,
        authorizationHeader: createAuthorizationHeader(options),
        fetchImplementation: options.fetchImplementation ?? fetch,
    })
}

/**
 * Builds Jira authorization header from supported auth strategies.
 *
 * @param options Provider options.
 * @returns HTTP authorization header value.
 */
function createAuthorizationHeader(options: IJiraProviderOptions): string {
    const token = normalizeOptionalText(options.token)
    if (token !== undefined) {
        return `Bearer ${token}`
    }

    const email = normalizeOptionalText(options.email)
    const apiToken = normalizeOptionalText(options.apiToken)
    if (email !== undefined && apiToken !== undefined) {
        const credentials = Buffer.from(`${email}:${apiToken}`).toString("base64")
        return `Basic ${credentials}`
    }

    throw new JiraProviderError("Jira auth token or email/apiToken pair is required", {
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
function readHeaders(headers: Headers): IJiraResponseHeaders {
    const collected: Record<string, string | undefined> = {}

    headers.forEach((value, key) => {
        collected[key.toLowerCase()] = value
    })

    return collected
}

/**
 * Creates normalized Jira provider error from HTTP response envelope.
 *
 * @param response Jira API response.
 * @returns Normalized Jira provider error.
 */
function createResponseError(response: IJiraApiResponse<unknown>): JiraProviderError {
    const statusCode = response.status
    const retryAfterMs = readRetryAfterMs(response.headers)
    const message = readErrorMessage(response.data) ?? `Jira request failed with status ${String(statusCode)}`
    const code = readErrorCode(response.data) ?? `HTTP_${String(statusCode)}`

    return new JiraProviderError(message, {
        statusCode,
        code,
        retryAfterMs,
        isRetryable: statusCode === 429 || statusCode >= 500,
    })
}

/**
 * Resolves response payload for success and allowed not-found branches.
 *
 * @param response Jira API response.
 * @param allowNotFound Whether 404 should return null.
 * @returns Response payload or null when 404 is allowed.
 */
function resolveResponseData<TData>(
    response: IJiraApiResponse<TData>,
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
 * Normalizes thrown request errors into JiraProviderError.
 *
 * @param error Unknown thrown error.
 * @returns Normalized provider error.
 */
function normalizeRequestError(error: unknown): JiraProviderError {
    if (error instanceof JiraProviderError) {
        return error
    }

    if (error instanceof Error) {
        return new JiraProviderError(error.message, {
            code: "NETWORK_ERROR",
            isRetryable: true,
        })
    }

    return new JiraProviderError("Jira request failed", {
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
function resolveRetryDelayMs(error: JiraProviderError, attempt: number): number {
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
function readRetryAfterMs(headers: IJiraResponseHeaders): number | undefined {
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
 * Reads Jira error message from common response body shapes.
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

    const errorMessages = Array.isArray(record["errorMessages"]) ? record["errorMessages"] : []
    const normalizedMessages = errorMessages
        .filter((message): message is string => {
            return typeof message === "string" && message.trim().length > 0
        })
        .map((message) => {
            return message.trim()
        })

    if (normalizedMessages.length > 0) {
        return normalizedMessages.join("; ")
    }

    return undefined
}

/**
 * Reads provider-specific error code from common Jira error shapes.
 *
 * @param payload Error payload candidate.
 * @returns Machine-readable error code.
 */
function readErrorCode(payload: unknown): string | undefined {
    const record = toRecord(payload)
    if (record === null) {
        return undefined
    }

    const code = normalizeOptionalText(record["code"] ?? record["errorCode"])
    if (code !== undefined) {
        return code
    }

    return undefined
}

/**
 * Resolves next page offset from Jira search page metadata.
 *
 * @param page Search page payload.
 * @param currentStartAt Current offset.
 * @param issueCount Current page size.
 * @returns Next offset or undefined when pagination is exhausted.
 */
function resolveNextSearchOffset(
    page: IJiraSearchIssuesPage | null,
    currentStartAt: number,
    issueCount: number,
): number | undefined {
    if (page === null) {
        return undefined
    }

    const pageStartAt = readNonNegativeInteger(page.startAt) ?? currentStartAt
    const pageSize = readPositiveInteger(page.maxResults) ?? issueCount
    const total = readNonNegativeInteger(page.total)
    const nextStartAt = pageStartAt + Math.max(pageSize, issueCount)

    if (total === undefined || nextStartAt >= total || Math.max(pageSize, issueCount) === 0) {
        return undefined
    }

    return nextStartAt
}

/**
 * Builds fallback JQL used when direct issue lookup does not resolve identifier.
 *
 * @param identifier Jira issue identifier.
 * @returns Search JQL.
 */
function buildSearchJql(identifier: string): string {
    const escapedIdentifier = identifier.replace(/\\/g, "\\\\").replace(/"/g, '\\"')

    return `key = "${escapedIdentifier}" OR id = "${escapedIdentifier}" ORDER BY updated DESC`
}

/**
 * Builds absolute Jira request URL with query parameters.
 *
 * @param baseUrl Jira base URL.
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
 * Normalizes search page size configuration.
 *
 * @param value Raw page size value.
 * @returns Safe positive integer.
 */
function normalizeSearchPageSize(value: number | undefined): number {
    if (typeof value !== "number" || Number.isInteger(value) === false || value < 1) {
        return DEFAULT_SEARCH_PAGE_SIZE
    }

    return value
}

/**
 * Normalizes custom Jira acceptance-criteria field ids.
 *
 * @param value Raw field-id list.
 * @returns Deduplicated field-id list.
 */
function normalizeAcceptanceCriteriaFieldIds(
    value: readonly string[] | undefined,
): readonly string[] {
    const seen = new Set<string>()
    const normalized: string[] = []

    for (const candidate of value ?? DEFAULT_ACCEPTANCE_CRITERIA_FIELD_IDS) {
        const fieldId = normalizeOptionalText(candidate)
        if (fieldId === undefined || seen.has(fieldId)) {
            continue
        }

        seen.add(fieldId)
        normalized.push(fieldId)
    }

    return normalized
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
    error: JiraProviderError,
    attempt: number,
    retryMaxAttempts: number,
): boolean {
    return error.isRetryable && attempt < retryMaxAttempts
}

/**
 * Reads safe non-negative integer value.
 *
 * @param value Raw numeric candidate.
 * @returns Normalized integer or undefined.
 */
function readNonNegativeInteger(value: unknown): number | undefined {
    if (typeof value !== "number" || Number.isInteger(value) === false || value < 0) {
        return undefined
    }

    return value
}

/**
 * Reads safe positive integer value.
 *
 * @param value Raw numeric candidate.
 * @returns Normalized integer or undefined.
 */
function readPositiveInteger(value: unknown): number | undefined {
    if (typeof value !== "number" || Number.isInteger(value) === false || value < 1) {
        return undefined
    }

    return value
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
