import type {
    ICodeCityDependencyNode,
    ICodeCityDependencyRelation,
    ICodeCityRepositoryProfile,
} from "@/lib/api/endpoints/code-city.endpoint"

/**
 * Данные для seed-инициализации CodeCityCollection.
 */
export interface ICodeCitySeedData {
    /**
     * Профили репозиториев CodeCity.
     */
    readonly profiles: ReadonlyArray<ICodeCityRepositoryProfile>
    /**
     * Узлы графа зависимостей.
     */
    readonly dependencyNodes: ReadonlyArray<ICodeCityDependencyNode>
    /**
     * Связи графа зависимостей.
     */
    readonly dependencyRelations: ReadonlyArray<ICodeCityDependencyRelation>
}

/**
 * Коллекция CodeCity данных для mock API.
 *
 * Хранит in-memory профили репозиториев и граф зависимостей.
 * Поддерживает чтение, seed и clear.
 */
export class CodeCityCollection {
    /**
     * Хранилище профилей репозиториев по ID.
     */
    private profiles: Map<string, ICodeCityRepositoryProfile> = new Map()

    /**
     * Узлы графа зависимостей.
     */
    private nodes: ReadonlyArray<ICodeCityDependencyNode> = []

    /**
     * Связи графа зависимостей.
     */
    private relations: ReadonlyArray<ICodeCityDependencyRelation> = []

    /**
     * Возвращает список всех профилей CodeCity.
     *
     * @returns Массив всех профилей.
     */
    public listProfiles(): ReadonlyArray<ICodeCityRepositoryProfile> {
        return Array.from(this.profiles.values())
    }

    /**
     * Возвращает профиль CodeCity по идентификатору.
     *
     * @param repoId - Идентификатор репозитория.
     * @returns Профиль или undefined, если не найден.
     */
    public getProfileById(repoId: string): ICodeCityRepositoryProfile | undefined {
        return this.profiles.get(repoId)
    }

    /**
     * Возвращает узлы графа зависимостей.
     *
     * @returns Массив узлов.
     */
    public getDependencyNodes(): ReadonlyArray<ICodeCityDependencyNode> {
        return this.nodes
    }

    /**
     * Возвращает связи графа зависимостей.
     *
     * @returns Массив связей.
     */
    public getDependencyRelations(): ReadonlyArray<ICodeCityDependencyRelation> {
        return this.relations
    }

    /**
     * Заполняет коллекцию начальными данными.
     *
     * Очищает текущее состояние и загружает переданные данные.
     *
     * @param data - Данные для seed-инициализации.
     */
    public seed(data: ICodeCitySeedData): void {
        this.clear()

        for (const profile of data.profiles) {
            this.profiles.set(profile.id, profile)
        }

        this.nodes = data.dependencyNodes
        this.relations = data.dependencyRelations
    }

    /**
     * Полностью очищает коллекцию.
     */
    public clear(): void {
        this.profiles.clear()
        this.nodes = []
        this.relations = []
    }
}
