import type {
    IRepository,
    IRepositoryOverview,
} from "@/lib/api/endpoints/repository.endpoint"

/**
 * Данные для seed-инициализации RepositoriesCollection.
 */
export interface IRepositoriesSeedData {
    /**
     * Начальный набор репозиториев.
     */
    readonly repositories: ReadonlyArray<IRepository>
    /**
     * Начальный набор overview-профилей (ключ — repositoryId).
     */
    readonly overviews: ReadonlyArray<{
        readonly repositoryId: string
        readonly overview: IRepositoryOverview
    }>
}

/**
 * Коллекция репозиториев для mock API.
 *
 * Хранит in-memory данные репозиториев и их overview-профилей.
 * Поддерживает CRUD, seed и clear.
 */
export class RepositoriesCollection {
    /**
     * Хранилище репозиториев по ID.
     */
    private repositories: Map<string, IRepository> = new Map()

    /**
     * Хранилище overview-профилей по repositoryId.
     */
    private overviews: Map<string, IRepositoryOverview> = new Map()

    /**
     * Возвращает список всех репозиториев.
     *
     * @returns Массив всех репозиториев.
     */
    public list(): ReadonlyArray<IRepository> {
        return Array.from(this.repositories.values())
    }

    /**
     * Возвращает репозиторий по идентификатору.
     *
     * @param id - Идентификатор репозитория.
     * @returns Репозиторий или undefined, если не найден.
     */
    public getById(id: string): IRepository | undefined {
        return this.repositories.get(id)
    }

    /**
     * Возвращает overview-профиль репозитория.
     *
     * @param repositoryId - Идентификатор репозитория.
     * @returns Overview или undefined, если не найден.
     */
    public getOverview(repositoryId: string): IRepositoryOverview | undefined {
        return this.overviews.get(repositoryId)
    }

    /**
     * Создаёт новый репозиторий.
     *
     * @param repository - Данные нового репозитория.
     */
    public create(repository: IRepository): void {
        this.repositories.set(repository.id, repository)
    }

    /**
     * Обновляет существующий репозиторий.
     *
     * @param id - Идентификатор репозитория.
     * @param patch - Частичные данные для обновления.
     * @returns Обновлённый репозиторий или undefined, если не найден.
     */
    public update(id: string, patch: Partial<IRepository>): IRepository | undefined {
        const existing = this.repositories.get(id)
        if (existing === undefined) {
            return undefined
        }

        const updated: IRepository = {
            ...existing,
            ...patch,
            id: existing.id,
        }

        this.repositories.set(id, updated)
        return updated
    }

    /**
     * Заполняет коллекцию начальными данными.
     *
     * Очищает текущее состояние и загружает переданные данные.
     *
     * @param data - Данные для seed-инициализации.
     */
    public seed(data: IRepositoriesSeedData): void {
        this.clear()

        for (const repository of data.repositories) {
            this.repositories.set(repository.id, repository)
        }

        for (const entry of data.overviews) {
            this.overviews.set(entry.repositoryId, entry.overview)
        }
    }

    /**
     * Полностью очищает коллекцию.
     */
    public clear(): void {
        this.repositories.clear()
        this.overviews.clear()
    }
}
