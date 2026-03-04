import type {ISettingsServiceClientConfig} from "./config/settings-client-config.module"

/**
 * Settings item shape exposed by settings-service.
 */
export interface ISettingItem<TValue = unknown> {
    readonly key: string
    readonly value: TValue
}

/**
 * Settings snapshot payload.
 */
export interface ISettingsSnapshot<TValue = unknown> {
    readonly items: readonly ISettingItem<TValue>[]
}

interface IFetchJsonOptions {
    readonly allowNotFound?: boolean
}

/**
 * Error raised when settings-service requests fail.
 */
export class SettingsServiceClientError extends Error {
    public readonly status?: number
    public readonly path: string

    /**
     * Creates settings-service client error.
     *
     * @param message Error message.
     * @param path Request path.
     * @param status HTTP status code, when available.
     * @param cause Underlying error.
     */
    public constructor(message: string, path: string, status?: number, cause?: Error) {
        super(message, {cause})
        this.name = "SettingsServiceClientError"
        this.status = status
        this.path = path
    }
}

/**
 * HTTP client for settings-service endpoints.
 */
export class SettingsServiceClient {
    private readonly baseUrl: string
    private readonly timeoutMs: number

    /**
     * Creates settings-service client.
     *
     * @param config Client configuration.
     */
    public constructor(config: ISettingsServiceClientConfig) {
        this.baseUrl = SettingsServiceClient.normalizeBaseUrl(config.baseUrl)
        this.timeoutMs = config.timeoutMs
    }

    /**
     * Fetches setting item by key.
     *
     * @param key Setting key.
     * @returns Setting item.
     */
    public async getSetting<TValue>(key: string): Promise<ISettingItem<TValue>> {
        const normalizedKey = SettingsServiceClient.normalizeKey(key)
        return this.fetchJson<ISettingItem<TValue>>(`/configs/settings/${encodeURIComponent(normalizedKey)}`)
    }

    /**
     * Fetches setting item by key and returns null when missing.
     *
     * @param key Setting key.
     * @returns Setting item or null when missing.
     */
    public async getOptionalSetting<TValue>(key: string): Promise<ISettingItem<TValue> | null> {
        const normalizedKey = SettingsServiceClient.normalizeKey(key)
        return this.fetchJson<ISettingItem<TValue>>(
            `/configs/settings/${encodeURIComponent(normalizedKey)}`,
            {allowNotFound: true},
        )
    }

    /**
     * Fetches full settings snapshot.
     *
     * @returns Settings snapshot.
     */
    public async getSettingsSnapshot<TValue = unknown>(): Promise<ISettingsSnapshot<TValue>> {
        return this.fetchJson<ISettingsSnapshot<TValue>>("/configs/settings")
    }

    /**
     * Fetches config resource payload.
     *
     * @param resource Resource name.
     * @returns Resource payload.
     */
    public async getConfigResource<TValue = unknown>(resource: string): Promise<TValue> {
        const normalized = resource.trim()
        if (normalized.length === 0) {
            throw new SettingsServiceClientError("Config resource name cannot be empty", "/configs/:resource")
        }

        return this.fetchJson<TValue>(`/configs/${encodeURIComponent(normalized)}`)
    }

    private async fetchJson<TValue>(
        path: string,
        options: IFetchJsonOptions = {},
    ): Promise<TValue> {
        const controller = new AbortController()
        const timeout = setTimeout(() => {
            controller.abort()
        }, this.timeoutMs)

        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                signal: controller.signal,
            })

            if (response.status === 404 && options.allowNotFound === true) {
                return null as TValue
            }

            if (!response.ok) {
                throw new SettingsServiceClientError(
                    `Settings-service request failed with status ${response.status}`,
                    path,
                    response.status,
                )
            }

            return await response.json() as TValue
        } catch (error: unknown) {
            if (error instanceof SettingsServiceClientError) {
                throw error
            }

            const cause = error instanceof Error ? error : undefined
            throw new SettingsServiceClientError(
                "Settings-service request failed",
                path,
                undefined,
                cause,
            )
        } finally {
            clearTimeout(timeout)
        }
    }

    private static normalizeKey(key: string): string {
        const normalized = key.trim()
        if (normalized.length === 0) {
            throw new SettingsServiceClientError("Setting key cannot be empty", "/configs/settings/:key")
        }

        return normalized
    }

    private static normalizeBaseUrl(value: string): string {
        const trimmed = value.trim()
        if (trimmed.endsWith("/")) {
            return trimmed.replace(/\/+$/u, "")
        }

        return trimmed
    }
}
