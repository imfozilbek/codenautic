import type { IHttpClient } from "../http-client"

/**
 * Файл в профиле репозитория CodeCity.
 */
export interface ICodeCityFile {
    /**
     * Уникальный идентификатор файла.
     */
    readonly id: string
    /**
     * Путь к файлу.
     */
    readonly path: string
    /**
     * Количество строк кода.
     */
    readonly loc: number
    /**
     * Цикломатическая сложность.
     */
    readonly complexity: number
    /**
     * Покрытие тестами (0–100).
     */
    readonly coverage: number
    /**
     * Частота изменений.
     */
    readonly churn: number
    /**
     * Количество найденных проблем.
     */
    readonly issueCount: number
}

/**
 * Контрибьютор CodeCity профиля.
 */
export interface ICodeCityContributor {
    /**
     * Идентификатор владельца.
     */
    readonly ownerId: string
    /**
     * Отображаемое имя.
     */
    readonly ownerName: string
    /**
     * Цвет для overlay.
     */
    readonly color: string
    /**
     * Количество коммитов.
     */
    readonly commitCount: number
}

/**
 * Точка тренда health score.
 */
export interface ICodeCityHealthTrendPoint {
    /**
     * Временная метка (ISO 8601).
     */
    readonly timestamp: string
    /**
     * Значение health score.
     */
    readonly healthScore: number
    /**
     * Аннотация события (если есть).
     */
    readonly annotation?: string
}

/**
 * Temporal coupling между файлами.
 */
export interface ICodeCityTemporalCoupling {
    /**
     * Идентификатор исходного файла.
     */
    readonly sourceFileId: string
    /**
     * Идентификатор целевого файла.
     */
    readonly targetFileId: string
    /**
     * Сила связи (0–1).
     */
    readonly strength: number
}

/**
 * Профиль репозитория для CodeCity.
 */
export interface ICodeCityRepositoryProfile {
    /**
     * Уникальный идентификатор репозитория.
     */
    readonly id: string
    /**
     * Отображаемое имя.
     */
    readonly name: string
    /**
     * Набор файлов для treemap.
     */
    readonly files: ReadonlyArray<ICodeCityFile>
    /**
     * Контрибьюторы репозитория.
     */
    readonly contributors: ReadonlyArray<ICodeCityContributor>
    /**
     * Тренд health score.
     */
    readonly healthTrend: ReadonlyArray<ICodeCityHealthTrendPoint>
    /**
     * Temporal coupling связи.
     */
    readonly temporalCouplings: ReadonlyArray<ICodeCityTemporalCoupling>
}

/**
 * Узел графа зависимостей CodeCity.
 */
export interface ICodeCityDependencyNode {
    /**
     * Уникальный идентификатор узла.
     */
    readonly id: string
    /**
     * Отображаемая метка.
     */
    readonly label: string
    /**
     * Тип узла.
     */
    readonly type: "repository" | "package" | "module"
}

/**
 * Связь графа зависимостей CodeCity.
 */
export interface ICodeCityDependencyRelation {
    /**
     * Идентификатор источника.
     */
    readonly source: string
    /**
     * Идентификатор цели.
     */
    readonly target: string
    /**
     * Вес связи (0–1).
     */
    readonly weight: number
}

/**
 * Ответ списка профилей CodeCity.
 */
export interface IListCodeCityProfilesResponse {
    /**
     * Профили репозиториев.
     */
    readonly profiles: ReadonlyArray<ICodeCityRepositoryProfile>
}

/**
 * Ответ графа зависимостей CodeCity.
 */
export interface ICodeCityDependencyGraphResponse {
    /**
     * Узлы графа зависимостей.
     */
    readonly nodes: ReadonlyArray<ICodeCityDependencyNode>
    /**
     * Связи графа зависимостей.
     */
    readonly relations: ReadonlyArray<ICodeCityDependencyRelation>
}

/**
 * API-контракт CodeCity.
 */
export interface ICodeCityApi {
    /**
     * Возвращает профили репозиториев CodeCity.
     */
    getRepositoryProfiles(): Promise<IListCodeCityProfilesResponse>
    /**
     * Возвращает граф зависимостей для репозитория.
     *
     * @param repoId - Идентификатор репозитория.
     */
    getDependencyGraph(repoId: string): Promise<ICodeCityDependencyGraphResponse>
}

/**
 * Endpoint-клиент CodeCity API.
 */
export class CodeCityApi implements ICodeCityApi {
    /**
     * HTTP-клиент для запросов.
     */
    private readonly httpClient: IHttpClient

    /**
     * Создаёт экземпляр CodeCityApi.
     *
     * @param httpClient - HTTP-клиент.
     */
    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    /**
     * Возвращает профили репозиториев CodeCity.
     *
     * @returns Ответ со списком профилей.
     */
    public async getRepositoryProfiles(): Promise<IListCodeCityProfilesResponse> {
        return this.httpClient.request<IListCodeCityProfilesResponse>({
            method: "GET",
            path: "/api/v1/code-city/profiles",
            credentials: "include",
        })
    }

    /**
     * Возвращает граф зависимостей для репозитория.
     *
     * @param repoId - Идентификатор репозитория.
     * @returns Ответ с узлами и связями графа.
     */
    public async getDependencyGraph(repoId: string): Promise<ICodeCityDependencyGraphResponse> {
        const normalizedId = repoId.trim()
        if (normalizedId.length === 0) {
            throw new Error("repoId не должен быть пустым")
        }

        return this.httpClient.request<ICodeCityDependencyGraphResponse>({
            method: "GET",
            path: `/api/v1/code-city/profiles/${encodeURIComponent(normalizedId)}/dependency-graph`,
            credentials: "include",
        })
    }
}
