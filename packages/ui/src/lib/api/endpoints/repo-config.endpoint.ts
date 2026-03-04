import type { IHttpClient } from "../http-client"

/** Режим review execution для репозитория. */
export const REPO_REVIEW_MODE = {
    manual: "MANUAL",
    auto: "AUTO",
    autoPause: "AUTO_PAUSE",
} as const

/** Режим review execution. */
export type TRepoReviewMode = (typeof REPO_REVIEW_MODE)[keyof typeof REPO_REVIEW_MODE]

/** Конфигурация репозитория, редактируемая в UI. */
export interface IRepoConfig {
    /** Идентификатор репозитория. */
    readonly repositoryId: string
    /** YAML-представление `codenautic-config.yml`. */
    readonly configYaml: string
    /** Ignore patterns для файлов/директорий. */
    readonly ignorePatterns: readonly string[]
    /** Режим review cadence. */
    readonly reviewMode: TRepoReviewMode
    /** Время последнего обновления конфига. */
    readonly updatedAt?: string
}

/** Ответ загрузки repo config. */
export interface IRepoConfigResponse {
    /** Загруженная конфигурация. */
    readonly config: IRepoConfig
}

/** Запрос сохранения repo config. */
export interface IUpdateRepoConfigRequest {
    /** Идентификатор репозитория. */
    readonly repositoryId: string
    /** Новое YAML-содержимое. */
    readonly configYaml?: string
    /** Новые ignore patterns. */
    readonly ignorePatterns?: readonly string[]
    /** Новый режим ревью. */
    readonly reviewMode?: TRepoReviewMode
}

/** Ответ сохранения repo config. */
export interface IUpdateRepoConfigResponse {
    /** Обновлённая конфигурация. */
    readonly config: IRepoConfig
}

/** Контракт API для репозиторного конфига. */
export interface IRepoConfigApi {
    /** Загружает `codenautic-config.yml` для репозитория. */
    getRepoConfig(repositoryId: string): Promise<IRepoConfigResponse>
    /** Сохраняет конфиг репозитория. */
    updateRepoConfig(request: IUpdateRepoConfigRequest): Promise<IUpdateRepoConfigResponse>
}

/** Endpoint-слой для repo config API. */
export class RepoConfigApi implements IRepoConfigApi {
    private readonly httpClient: IHttpClient

    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    public async getRepoConfig(repositoryId: string): Promise<IRepoConfigResponse> {
        const normalizedRepositoryId = repositoryId.trim()
        if (normalizedRepositoryId.length === 0) {
            throw new Error("repositoryId не должен быть пустым")
        }

        return this.httpClient.request<IRepoConfigResponse>({
            method: "GET",
            path: `/api/v1/repositories/${encodeURIComponent(normalizedRepositoryId)}/config`,
            credentials: "include",
        })
    }

    public async updateRepoConfig(
        request: IUpdateRepoConfigRequest,
    ): Promise<IUpdateRepoConfigResponse> {
        const normalizedRepositoryId = request.repositoryId.trim()
        if (normalizedRepositoryId.length === 0) {
            throw new Error("repositoryId не должен быть пустым")
        }

        const { repositoryId: _repositoryId, ...payload } = request
        return this.httpClient.request<IUpdateRepoConfigResponse>({
            method: "PUT",
            path: `/api/v1/repositories/${encodeURIComponent(normalizedRepositoryId)}/config`,
            body: payload,
            credentials: "include",
        })
    }
}
