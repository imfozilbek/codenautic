/**
 * Конфигурация HTTP-клиента UI для обращения к runtime/api.
 */
export interface IApiConfig {
    /**
     * Базовый URL API сервера.
     */
    readonly baseUrl: string
    /**
     * Заголовки, добавляемые к каждому запросу по умолчанию.
     */
    readonly defaultHeaders: Readonly<Record<string, string>>
}

/**
 * Источник переменных окружения UI.
 */
export interface IUiEnv {
    readonly VITE_API_URL?: string
    readonly VITE_API_BEARER_TOKEN?: string
    readonly MODE?: string
    readonly PROD?: boolean
}

interface IUiEnvSource {
    readonly MODE?: unknown
    readonly PROD?: unknown
    readonly VITE_API_BEARER_TOKEN?: unknown
    readonly VITE_API_URL?: unknown
}

const DEFAULT_API_URL = "http://localhost:3000"

/**
 * Безопасно нормализует runtime env Vite в типизированную конфигурацию UI.
 *
 * @param source Нестрого типизированный источник import.meta.env.
 * @returns Нормализованный env-объект для API-клиента.
 */
export function resolveUiEnv(source: IUiEnvSource | undefined): IUiEnv {
    if (source === undefined) {
        return {}
    }

    return {
        MODE: typeof source.MODE === "string" ? source.MODE : undefined,
        PROD: source.PROD === true,
        VITE_API_BEARER_TOKEN:
            typeof source.VITE_API_BEARER_TOKEN === "string"
                ? source.VITE_API_BEARER_TOKEN
                : undefined,
        VITE_API_URL: typeof source.VITE_API_URL === "string" ? source.VITE_API_URL : undefined,
    }
}

/**
 * Формирует конфиг API-клиента из переменных окружения.
 *
 * @param env Переменные окружения Vite.
 * @returns Готовый объект конфигурации для API-клиента.
 * @throws Error Если `VITE_API_URL` пустой или невалидный.
 * @throws Error Если в production отсутствует `VITE_API_URL`.
 */
export function createApiConfig(env: IUiEnv): IApiConfig {
    const rawBaseUrl = env.VITE_API_URL

    if (rawBaseUrl === undefined) {
        if (isProductionEnvironment(env)) {
            throw new Error("VITE_API_URL обязателен в production режиме")
        }

        return {
            baseUrl: DEFAULT_API_URL,
            defaultHeaders: createDefaultHeaders(env.VITE_API_BEARER_TOKEN),
        }
    }

    const normalizedBaseUrl = normalizeBaseUrl(rawBaseUrl)

    return {
        baseUrl: normalizedBaseUrl,
        defaultHeaders: createDefaultHeaders(env.VITE_API_BEARER_TOKEN),
    }
}

/**
 * Detects whether runtime environment is production.
 *
 * @param env UI environment source.
 * @returns True for production mode.
 */
function isProductionEnvironment(env: IUiEnv): boolean {
    if (env.PROD === true) {
        return true
    }
    return env.MODE === "production"
}

/**
 * Normalizes base URL and validates supported protocol.
 *
 * @param value Raw URL value from env.
 * @returns Normalized URL without trailing slash.
 */
function normalizeBaseUrl(value: string): string {
    const trimmedValue = value.trim()
    if (trimmedValue.length === 0) {
        throw new Error("VITE_API_URL не должен быть пустым")
    }

    let parsedUrl: URL
    try {
        parsedUrl = new URL(trimmedValue)
    } catch {
        throw new Error("VITE_API_URL должен быть абсолютным URL")
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error("VITE_API_URL должен использовать http или https")
    }

    if (trimmedValue.endsWith("/")) {
        return trimmedValue.slice(0, -1)
    }

    return trimmedValue
}

/**
 * Формирует стандартные заголовки API-клиента с optional bearer auth.
 *
 * @param rawToken Bearer token из окружения.
 * @returns Набор дефолтных заголовков.
 */
function createDefaultHeaders(rawToken: string | undefined): Readonly<Record<string, string>> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }

    if (rawToken === undefined) {
        return headers
    }

    const normalizedToken = rawToken.trim()
    if (normalizedToken.length === 0) {
        throw new Error("VITE_API_BEARER_TOKEN не должен быть пустым")
    }

    headers.Authorization = `Bearer ${normalizedToken}`
    return headers
}
