import type {
    IGitProviderConnection,
    TGitProviderConnectionStatus,
} from "@/lib/api/endpoints/git-providers.endpoint"
import type {
    IExternalContextPreviewItem,
    IExternalContextSource,
    TExternalContextStatus,
} from "@/lib/api/endpoints/external-context.endpoint"

/**
 * Частичные данные для обновления Git provider соединения.
 */
export interface IUpdateGitProviderData {
    /** Целевое состояние подключения. */
    readonly connected?: boolean
    /** Статус health/sync. */
    readonly status?: TGitProviderConnectionStatus
    /** Признак настроенного ключа. */
    readonly isKeySet?: boolean
    /** Имя аккаунта/workspace. */
    readonly account?: string
}

/**
 * Частичные данные для обновления context source.
 */
export interface IUpdateContextSourceData {
    /** Новое состояние enabled. */
    readonly enabled?: boolean
}

/**
 * Данные для seed-инициализации ProvidersCollection.
 */
export interface IProvidersSeedData {
    /** Начальный набор Git provider соединений. */
    readonly gitProviders: ReadonlyArray<IGitProviderConnection>
    /** Начальный набор context source. */
    readonly contextSources: ReadonlyArray<IExternalContextSource>
    /** Preview-элементы для context sources (ключ — sourceId). */
    readonly contextPreviews?: Readonly<Record<string, ReadonlyArray<IExternalContextPreviewItem>>>
}

/**
 * Коллекция Git providers и context sources для mock API.
 *
 * Хранит in-memory данные провайдеров и внешних источников контекста.
 * Поддерживает CRUD, test connection, preview, refresh, seed и clear.
 */
export class ProvidersCollection {
    /**
     * Хранилище Git provider соединений по ID.
     */
    private gitProviders: Map<string, IGitProviderConnection> = new Map()

    /**
     * Хранилище context source по ID.
     */
    private contextSources: Map<string, IExternalContextSource> = new Map()

    /**
     * Preview-элементы для context sources (ключ — sourceId).
     */
    private contextPreviews: Map<string, ReadonlyArray<IExternalContextPreviewItem>> =
        new Map()

    /**
     * Возвращает список всех Git provider соединений.
     *
     * @returns Массив всех провайдеров.
     */
    public listGitProviders(): ReadonlyArray<IGitProviderConnection> {
        return Array.from(this.gitProviders.values())
    }

    /**
     * Возвращает Git provider по идентификатору.
     *
     * @param id - Идентификатор провайдера.
     * @returns Провайдер или undefined, если не найден.
     */
    public getGitProviderById(id: string): IGitProviderConnection | undefined {
        return this.gitProviders.get(id)
    }

    /**
     * Обновляет соединение Git provider.
     *
     * Пересчитывает статус и connected-флаг на основе переданных данных.
     *
     * @param id - Идентификатор провайдера.
     * @param patch - Данные для обновления.
     * @returns Обновлённый провайдер или undefined, если не найден.
     */
    public updateGitProvider(
        id: string,
        patch: IUpdateGitProviderData,
    ): IGitProviderConnection | undefined {
        const existing = this.gitProviders.get(id)
        if (existing === undefined) {
            return undefined
        }

        const connected = patch.connected ?? existing.connected
        const status: TGitProviderConnectionStatus = connected
            ? "CONNECTED"
            : "DISCONNECTED"

        const updated: IGitProviderConnection = {
            ...existing,
            ...patch,
            id: existing.id,
            provider: existing.provider,
            connected,
            status,
            lastSyncAt: connected ? new Date().toISOString() : existing.lastSyncAt,
        }

        this.gitProviders.set(id, updated)
        return updated
    }

    /**
     * Симулирует тест соединения с Git provider.
     *
     * Провайдер считается доступным, если он подключён и ключ настроен.
     *
     * @param id - Идентификатор провайдера.
     * @returns Результат теста или undefined, если провайдер не найден.
     */
    public testGitProviderConnection(
        id: string,
    ): { readonly ok: boolean; readonly message: string } | undefined {
        const provider = this.gitProviders.get(id)
        if (provider === undefined) {
            return undefined
        }

        if (!provider.connected) {
            return { ok: false, message: "Provider is not connected" }
        }

        if (!provider.isKeySet) {
            return { ok: false, message: "API key is not configured" }
        }

        return { ok: true, message: "Connection successful" }
    }

    /**
     * Возвращает список всех context sources.
     *
     * @returns Массив всех источников контекста.
     */
    public listContextSources(): ReadonlyArray<IExternalContextSource> {
        return Array.from(this.contextSources.values())
    }

    /**
     * Возвращает context source по идентификатору.
     *
     * @param id - Идентификатор источника.
     * @returns Источник контекста или undefined, если не найден.
     */
    public getContextSourceById(id: string): IExternalContextSource | undefined {
        return this.contextSources.get(id)
    }

    /**
     * Возвращает preview-элементы для context source.
     *
     * @param sourceId - Идентификатор источника.
     * @returns Массив preview-элементов или undefined, если нет данных.
     */
    public getContextSourcePreview(
        sourceId: string,
    ): ReadonlyArray<IExternalContextPreviewItem> | undefined {
        return this.contextPreviews.get(sourceId)
    }

    /**
     * Обновляет параметры context source.
     *
     * @param id - Идентификатор источника.
     * @param patch - Данные для обновления.
     * @returns Обновлённый источник или undefined, если не найден.
     */
    public updateContextSource(
        id: string,
        patch: IUpdateContextSourceData,
    ): IExternalContextSource | undefined {
        const existing = this.contextSources.get(id)
        if (existing === undefined) {
            return undefined
        }

        const updated: IExternalContextSource = {
            ...existing,
            ...patch,
            id: existing.id,
        }

        this.contextSources.set(id, updated)
        return updated
    }

    /**
     * Симулирует refresh/sync для context source.
     *
     * Обновляет lastSyncedAt и статус на SYNCING.
     *
     * @param id - Идентификатор источника.
     * @returns Результат refresh или undefined, если не найден.
     */
    public refreshContextSource(
        id: string,
    ): { readonly accepted: boolean; readonly status: TExternalContextStatus } | undefined {
        const existing = this.contextSources.get(id)
        if (existing === undefined) {
            return undefined
        }

        const updated: IExternalContextSource = {
            ...existing,
            status: "SYNCING",
            lastSyncedAt: new Date().toISOString(),
        }

        this.contextSources.set(id, updated)

        return { accepted: true, status: "SYNCING" }
    }

    /**
     * Заполняет коллекцию начальными данными.
     *
     * Очищает текущее состояние и загружает переданные провайдеры и источники.
     *
     * @param data - Данные для seed-инициализации.
     */
    public seed(data: IProvidersSeedData): void {
        this.clear()

        for (const provider of data.gitProviders) {
            this.gitProviders.set(provider.id, provider)
        }

        for (const source of data.contextSources) {
            this.contextSources.set(source.id, source)
        }

        if (data.contextPreviews !== undefined) {
            for (const [sourceId, items] of Object.entries(data.contextPreviews)) {
                this.contextPreviews.set(sourceId, items)
            }
        }
    }

    /**
     * Полностью очищает коллекцию провайдеров и источников.
     */
    public clear(): void {
        this.gitProviders.clear()
        this.contextSources.clear()
        this.contextPreviews.clear()
    }
}
