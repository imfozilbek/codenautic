import type { IApiConfig } from "./config"

/**
 * Разрешённые HTTP-методы для UI API-клиента.
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

/**
 * Примитивы, разрешённые в query-параметрах.
 */
export type QueryValue = string | number | boolean

/**
 * Параметры HTTP-запроса.
 */
export interface IHttpRequest {
    /**
     * HTTP-метод.
     */
    readonly method: HttpMethod
    /**
     * Относительный путь эндпойнта (например, `/api/v1/health`).
     */
    readonly path: string
    /**
     * Query-параметры.
     */
    readonly query?: Readonly<Record<string, QueryValue | undefined>>
    /**
     * Дополнительные заголовки.
     */
    readonly headers?: Readonly<Record<string, string>>
    /**
     * Тело запроса в JSON-формате.
     */
    readonly body?: unknown
    /**
     * Режим передачи cookie/credentials.
     */
    readonly credentials?: RequestCredentials
    /**
     * AbortSignal для отмены запроса.
     */
    readonly signal?: AbortSignal
}

/**
 * Контракт HTTP-клиента.
 */
export interface IHttpClient {
    /**
     * Выполняет HTTP-запрос и возвращает типизированный JSON-ответ.
     *
     * @param request Параметры запроса.
     * @returns Ответ API, десериализованный из JSON.
     */
    request<TResponse>(request: IHttpRequest): Promise<TResponse>
}

/**
 * Контракт retry-политики HTTP-клиента.
 */
export interface IRetryPolicy {
    /**
     * Максимальное количество попыток, включая первую.
     */
    readonly maxAttempts: number
    /**
     * Базовая задержка между попытками в миллисекундах.
     */
    readonly baseDelayMs: number
    /**
     * Множитель экспоненциального backoff.
     */
    readonly backoffMultiplier: number
    /**
     * Верхняя граница задержки между попытками.
     */
    readonly maxDelayMs: number
}

/**
 * Зависимости для тестируемой и настраиваемой реализации FetchHttpClient.
 */
export interface IFetchHttpClientDependencies {
    /**
     * Partial override retry-политики.
     */
    readonly retryPolicy?: Partial<IRetryPolicy>
    /**
     * Функция ожидания между ретраями.
     */
    readonly delay?: IDelayFunction
}

/**
 * Функция задержки, учитывающая AbortSignal.
 *
 * @param timeoutMs Время ожидания в миллисекундах.
 * @param signal Сигнал отмены.
 */
export type IDelayFunction = (timeoutMs: number, signal: AbortSignal | undefined) => Promise<void>

const DEFAULT_RETRY_POLICY: IRetryPolicy = {
    maxAttempts: 3,
    baseDelayMs: 200,
    backoffMultiplier: 2,
    maxDelayMs: 2_000,
}

const RETRYABLE_HTTP_STATUSES = new Set<number>([408, 502, 503, 504])
const RETRYABLE_METHODS = new Set<HttpMethod>(["GET", "PUT", "PATCH", "DELETE"])

type TRequestAttemptResult<TResponse> =
    | {
          readonly type: "success"
          readonly response: TResponse
      }
    | {
          readonly type: "retry"
          readonly delayMs: number
      }
    | {
          readonly type: "error"
          readonly error: Error
      }

/**
 * Ошибка HTTP-запроса с metadata для обработки на уровне UI.
 */
export class ApiHttpError extends Error {
    public readonly status: number
    public readonly path: string

    public constructor(status: number, path: string, message: string) {
        super(message)
        this.name = "ApiHttpError"
        this.status = status
        this.path = path
    }
}

/**
 * Ошибка превышения rate-limit лимита API.
 */
export class ApiRateLimitError extends ApiHttpError {
    public readonly retryAfterMs: number | undefined

    public constructor(path: string, retryAfterMs: number | undefined) {
        super(429, path, `HTTP 429 for ${path}`)
        this.name = "ApiRateLimitError"
        this.retryAfterMs = retryAfterMs
    }
}

/**
 * Ошибка сетевого уровня до получения HTTP-ответа.
 */
export class ApiNetworkError extends Error {
    public readonly path: string
    public readonly cause: unknown

    public constructor(path: string, message: string, cause: unknown) {
        super(message)
        this.name = "ApiNetworkError"
        this.path = path
        this.cause = cause
    }
}

/**
 * Type guard для ApiHttpError.
 *
 * @param error Неизвестная ошибка.
 * @returns true, если ошибка относится к HTTP уровню.
 */
export function isApiHttpError(error: unknown): error is ApiHttpError {
    return error instanceof ApiHttpError
}

/**
 * Type guard для ApiRateLimitError.
 *
 * @param error Неизвестная ошибка.
 * @returns true, если ошибка обозначает 429 rate limiting.
 */
export function isApiRateLimitError(error: unknown): error is ApiRateLimitError {
    return error instanceof ApiRateLimitError
}

/**
 * Type guard для ApiNetworkError.
 *
 * @param error Неизвестная ошибка.
 * @returns true, если ошибка возникла на сетевом уровне.
 */
export function isApiNetworkError(error: unknown): error is ApiNetworkError {
    return error instanceof ApiNetworkError
}

/**
 * Реализация HTTP-клиента поверх `fetch`.
 */
export class FetchHttpClient implements IHttpClient {
    private readonly config: IApiConfig
    private readonly retryPolicy: IRetryPolicy
    private readonly delay: IDelayFunction

    public constructor(config: IApiConfig, dependencies: IFetchHttpClientDependencies = {}) {
        this.config = config
        this.retryPolicy = createRetryPolicy(dependencies.retryPolicy)
        this.delay = dependencies.delay ?? waitWithAbortSupport
    }

    public async request<TResponse>(request: IHttpRequest): Promise<TResponse> {
        const url = this.buildUrl(request.path, request.query)
        let attempt = 1

        while (attempt <= this.retryPolicy.maxAttempts) {
            const result = await this.executeRequestAttempt<TResponse>(request, url, attempt)

            if (result.type === "success") {
                return result.response
            }

            if (result.type === "error") {
                throw result.error
            }

            await this.delay(result.delayMs, request.signal)
            attempt += 1
        }

        throw new Error("Unreachable: retry loop exited unexpectedly")
    }

    private buildBody(body: unknown): BodyInit | undefined {
        if (body === undefined) {
            return undefined
        }
        return JSON.stringify(body)
    }

    private buildUrl(
        path: string,
        query: Readonly<Record<string, QueryValue | undefined>> | undefined,
    ): string {
        const normalizedPath = normalizeRequestPath(path)
        const target = new URL(normalizedPath, this.config.baseUrl)

        if (query !== undefined) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) {
                    target.searchParams.set(key, String(value))
                }
            }
        }

        return target.toString()
    }

    private shouldRetryResponse(method: HttpMethod, status: number): boolean {
        if (status === 429) {
            return true
        }
        if (RETRYABLE_METHODS.has(method) !== true) {
            return false
        }
        return RETRYABLE_HTTP_STATUSES.has(status)
    }

    private shouldRetryNetworkError(method: HttpMethod, error: unknown): boolean {
        if (RETRYABLE_METHODS.has(method) !== true) {
            return false
        }
        return isRetryableNetworkError(error)
    }

    private resolveDelayMs(attempt: number, retryAfterMs?: number): number {
        if (retryAfterMs !== undefined && retryAfterMs > 0) {
            return retryAfterMs
        }

        const exponentialDelay =
            this.retryPolicy.baseDelayMs * this.retryPolicy.backoffMultiplier ** (attempt - 1)

        return Math.min(exponentialDelay, this.retryPolicy.maxDelayMs)
    }

    private async executeRequestAttempt<TResponse>(
        request: IHttpRequest,
        url: string,
        attempt: number,
    ): Promise<TRequestAttemptResult<TResponse>> {
        try {
            const response = await fetch(url, {
                method: request.method,
                headers: {
                    ...this.config.defaultHeaders,
                    ...request.headers,
                },
                body: this.buildBody(request.body),
                credentials: request.credentials,
                signal: request.signal,
            })

            return this.handleHttpResponse<TResponse>(request, response, attempt)
        } catch (error: unknown) {
            return this.handleRequestError(request, error, attempt)
        }
    }

    private async handleHttpResponse<TResponse>(
        request: IHttpRequest,
        response: Response,
        attempt: number,
    ): Promise<TRequestAttemptResult<TResponse>> {
        if (response.ok === true) {
            return {
                type: "success",
                response: (await response.json()) as TResponse,
            }
        }

        const retryAfterMs = parseRetryAfterHeader(response.headers.get("Retry-After"))
        const shouldRetry = this.shouldRetryResponse(request.method, response.status)

        if (shouldRetry === true && attempt < this.retryPolicy.maxAttempts) {
            return {
                type: "retry",
                delayMs: this.resolveDelayMs(attempt, retryAfterMs),
            }
        }

        if (response.status === 429) {
            return {
                type: "error",
                error: new ApiRateLimitError(request.path, retryAfterMs),
            }
        }

        return {
            type: "error",
            error: new ApiHttpError(
                response.status,
                request.path,
                `HTTP ${response.status} for ${request.path}`,
            ),
        }
    }

    private handleRequestError(
        request: IHttpRequest,
        error: unknown,
        attempt: number,
    ): TRequestAttemptResult<never> {
        if (isAbortError(error)) {
            return {
                type: "error",
                error,
            }
        }

        if (isApiHttpError(error)) {
            return {
                type: "error",
                error,
            }
        }

        const shouldRetry = this.shouldRetryNetworkError(request.method, error)
        if (shouldRetry === true && attempt < this.retryPolicy.maxAttempts) {
            return {
                type: "retry",
                delayMs: this.resolveDelayMs(attempt),
            }
        }

        return {
            type: "error",
            error: createApiNetworkError(error, request.path),
        }
    }
}

/**
 * Normalizes request path and rejects unsafe values.
 *
 * @param path Raw request path.
 * @returns Normalized path that starts with `/`.
 */
function normalizeRequestPath(path: string): string {
    const trimmedPath = path.trim()
    if (trimmedPath.length === 0) {
        throw new Error("Request path не должен быть пустым")
    }

    if (looksLikeAbsoluteUrl(trimmedPath)) {
        throw new Error("Request path не должен быть абсолютным URL")
    }

    if (trimmedPath.startsWith("//")) {
        throw new Error("Request path не должен начинаться с //")
    }

    if (trimmedPath.includes(" ")) {
        throw new Error("Request path не должен содержать пробелы")
    }

    const normalizedPath = trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`
    const pathSegments = normalizedPath.split("/")
    if (pathSegments.includes("..")) {
        throw new Error("Request path не должен содержать '..'")
    }

    return normalizedPath
}

/**
 * Detects whether path string already looks like absolute URL.
 *
 * @param value Path-like input.
 * @returns True when value starts with URI scheme.
 */
function looksLikeAbsoluteUrl(value: string): boolean {
    return /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(value)
}

/**
 * Преобразует частичный override retry-политики в полный объект.
 *
 * @param override Partial override для retry-параметров.
 * @returns Финальная retry-политика.
 */
function createRetryPolicy(override: Partial<IRetryPolicy> | undefined): IRetryPolicy {
    return {
        maxAttempts: override?.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts,
        baseDelayMs: override?.baseDelayMs ?? DEFAULT_RETRY_POLICY.baseDelayMs,
        backoffMultiplier: override?.backoffMultiplier ?? DEFAULT_RETRY_POLICY.backoffMultiplier,
        maxDelayMs: override?.maxDelayMs ?? DEFAULT_RETRY_POLICY.maxDelayMs,
    }
}

/**
 * Декодирует Retry-After заголовок в миллисекунды ожидания.
 *
 * @param value Строковое значение заголовка Retry-After.
 * @returns Время ожидания в миллисекундах или undefined.
 */
function parseRetryAfterHeader(value: string | null): number | undefined {
    if (value === null) {
        return undefined
    }

    const trimmedValue = value.trim()
    if (trimmedValue.length === 0) {
        return undefined
    }

    const parsedSeconds = Number(trimmedValue)
    if (Number.isFinite(parsedSeconds) && parsedSeconds > 0) {
        return Math.ceil(parsedSeconds * 1_000)
    }

    const parsedDateMs = Date.parse(trimmedValue)
    if (Number.isNaN(parsedDateMs)) {
        return undefined
    }

    const deltaMs = parsedDateMs - Date.now()
    if (deltaMs <= 0) {
        return undefined
    }

    return deltaMs
}

/**
 * Определяет, относится ли ошибка к сетевым transient сбоям.
 *
 * @param error Неизвестная ошибка.
 * @returns true, если ошибку можно повторно выполнить.
 */
function isRetryableNetworkError(error: unknown): boolean {
    if (error instanceof TypeError) {
        return true
    }

    if (error instanceof Error) {
        return error.name === "NetworkError"
    }

    return false
}

/**
 * Конвертирует неизвестную ошибку fetch в типизированный ApiNetworkError.
 *
 * @param error Неизвестная ошибка.
 * @param path Путь API-запроса.
 * @returns Типизированная ошибка сетевого уровня.
 */
function createApiNetworkError(error: unknown, path: string): ApiNetworkError {
    if (isApiNetworkError(error)) {
        return error
    }

    if (error instanceof Error) {
        return new ApiNetworkError(path, error.message, error)
    }

    return new ApiNetworkError(path, "Network request failed", error)
}

/**
 * Определяет abort-ошибки и позволяет не ретраить отменённые запросы.
 *
 * @param error Неизвестная ошибка.
 * @returns true, если запрос был отменён.
 */
function isAbortError(error: unknown): error is Error {
    if (error instanceof Error) {
        return error.name === "AbortError"
    }
    return false
}

/**
 * Выполняет ожидание с поддержкой отмены через AbortSignal.
 *
 * @param timeoutMs Время ожидания в миллисекундах.
 * @param signal Сигнал отмены.
 */
async function waitWithAbortSupport(
    timeoutMs: number,
    signal: AbortSignal | undefined,
): Promise<void> {
    if (timeoutMs <= 0) {
        return
    }

    if (signal?.aborted === true) {
        throw createAbortError()
    }

    await new Promise<void>((resolve, reject): void => {
        const timeoutId = setTimeout((): void => {
            if (signal !== undefined) {
                signal.removeEventListener("abort", onAbort)
            }
            resolve()
        }, timeoutMs)

        const onAbort = (): void => {
            clearTimeout(timeoutId)
            signal?.removeEventListener("abort", onAbort)
            reject(createAbortError())
        }

        if (signal !== undefined) {
            signal.addEventListener("abort", onAbort, { once: true })
        }
    })
}

/**
 * Создаёт ошибку отмены совместимую с браузерной и тестовой средой.
 *
 * @returns AbortError.
 */
function createAbortError(): Error {
    if (typeof DOMException === "function") {
        return new DOMException("The operation was aborted", "AbortError")
    }

    const abortError = new Error("The operation was aborted")
    abortError.name = "AbortError"
    return abortError
}
