import type {
    IIntegrationState,
    TIntegrationStatus,
} from "@/lib/api/endpoints/integrations.endpoint"

/**
 * Частичные данные для обновления конфигурации интеграции.
 */
export interface IUpdateIntegrationConfigData {
    /**
     * Workspace/base path.
     */
    readonly workspace?: string
    /**
     * Ключ проекта/канала/сервиса.
     */
    readonly target?: string
    /**
     * Включен ли sync.
     */
    readonly syncEnabled?: boolean
    /**
     * Включены ли уведомления.
     */
    readonly notificationsEnabled?: boolean
}

/**
 * Данные для seed-инициализации IntegrationsCollection.
 */
export interface IIntegrationsSeedData {
    /**
     * Начальный набор интеграций.
     */
    readonly integrations: ReadonlyArray<IIntegrationState>
}

/**
 * Проверяет, заполнены ли workspace и target.
 *
 * @param integration - Интеграция для проверки.
 * @returns true если оба поля непусты.
 */
function hasConfigValues(integration: IIntegrationState): boolean {
    return integration.workspace.trim().length > 0 && integration.target.trim().length > 0
}

/**
 * Коллекция интеграций для mock API.
 *
 * Хранит in-memory данные интеграций (Jira, Linear, Sentry, Slack).
 * Поддерживает list, toggle, config update, test, seed и clear.
 */
export class IntegrationsCollection {
    /**
     * Хранилище интеграций по ID.
     */
    private integrations: Map<string, IIntegrationState> = new Map()

    /**
     * Возвращает список всех интеграций.
     *
     * @returns Массив интеграций.
     */
    public listIntegrations(): ReadonlyArray<IIntegrationState> {
        return Array.from(this.integrations.values())
    }

    /**
     * Возвращает интеграцию по идентификатору.
     *
     * @param id - Идентификатор интеграции.
     * @returns Интеграция или undefined.
     */
    public getIntegrationById(id: string): IIntegrationState | undefined {
        return this.integrations.get(id)
    }

    /**
     * Переключает состояние подключения интеграции.
     *
     * @param id - Идентификатор интеграции.
     * @param connected - Целевое состояние.
     * @returns Обновлённая интеграция или undefined.
     */
    public toggleConnection(
        id: string,
        connected: boolean,
    ): IIntegrationState | undefined {
        const existing = this.integrations.get(id)
        if (existing === undefined) {
            return undefined
        }

        let status: TIntegrationStatus
        if (connected !== true) {
            status = "disconnected"
        } else {
            status = hasConfigValues(existing) ? "connected" : "degraded"
        }

        const updated: IIntegrationState = {
            ...existing,
            connected,
            status,
            lastSyncAt: connected ? new Date().toISOString() : existing.lastSyncAt,
        }

        this.integrations.set(id, updated)
        return updated
    }

    /**
     * Обновляет конфигурацию интеграции.
     *
     * @param id - Идентификатор интеграции.
     * @param patch - Данные для обновления.
     * @returns Обновлённая интеграция или undefined.
     */
    public updateConfig(
        id: string,
        patch: IUpdateIntegrationConfigData,
    ): IIntegrationState | undefined {
        const existing = this.integrations.get(id)
        if (existing === undefined) {
            return undefined
        }

        const updated: IIntegrationState = {
            ...existing,
            workspace: patch.workspace ?? existing.workspace,
            target: patch.target ?? existing.target,
            syncEnabled: patch.syncEnabled ?? existing.syncEnabled,
            notificationsEnabled: patch.notificationsEnabled ?? existing.notificationsEnabled,
            id: existing.id,
            provider: existing.provider,
        }

        const configReady = hasConfigValues(updated)
        const nextStatus: TIntegrationStatus =
            updated.connected !== true
                ? "disconnected"
                : configReady
                  ? "connected"
                  : "degraded"

        const withStatus: IIntegrationState = {
            ...updated,
            secretConfigured: configReady,
            status: nextStatus,
        }

        this.integrations.set(id, withStatus)
        return withStatus
    }

    /**
     * Симулирует тест соединения с интеграцией.
     *
     * @param id - Идентификатор интеграции.
     * @returns Результат теста или undefined.
     */
    public testConnection(
        id: string,
    ): { readonly ok: boolean; readonly message: string } | undefined {
        const integration = this.integrations.get(id)
        if (integration === undefined) {
            return undefined
        }

        const isHealthy =
            integration.connected === true &&
            integration.secretConfigured === true &&
            hasConfigValues(integration)

        const status: TIntegrationStatus = isHealthy ? "connected" : "degraded"

        if (integration.connected === true) {
            const updated: IIntegrationState = {
                ...integration,
                status,
                lastSyncAt: new Date().toISOString(),
            }
            this.integrations.set(id, updated)
        }

        const message = isHealthy ? "Connection healthy" : "Health check failed"
        return { ok: isHealthy, message }
    }

    /**
     * Заполняет коллекцию начальными данными.
     *
     * @param data - Данные для seed-инициализации.
     */
    public seed(data: IIntegrationsSeedData): void {
        this.clear()

        for (const integration of data.integrations) {
            this.integrations.set(integration.id, integration)
        }
    }

    /**
     * Полностью очищает коллекцию.
     */
    public clear(): void {
        this.integrations.clear()
    }
}
