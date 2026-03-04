import type { IHttpClient } from "../http-client"
import type { TRepoReviewMode } from "./repo-config.endpoint"

/** Dry-run issue entry. */
export interface IDryRunIssue {
    /** Путь до файла. */
    readonly filePath: string
    /** Важность issue. */
    readonly severity: "low" | "medium" | "high"
    /** Описание issue. */
    readonly title: string
}

/** Dry-run aggregated result. */
export interface IDryRunResult {
    /** Применённый режим ревью. */
    readonly mode: TRepoReviewMode
    /** Количество просмотренных файлов. */
    readonly reviewedFiles: number
    /** Количество рекомендаций. */
    readonly suggestions: number
    /** Список найденных issues. */
    readonly issues: ReadonlyArray<IDryRunIssue>
}

/** Dry-run request payload. */
export interface ITriggerDryRunRequest {
    /** Идентификатор репозитория. */
    readonly repositoryId: string
    /** Текущий review mode. */
    readonly reviewMode: TRepoReviewMode
    /** Ignore patterns, используемые в dry-run. */
    readonly ignorePatterns: ReadonlyArray<string>
}

/** Dry-run response payload. */
export interface ITriggerDryRunResponse {
    /** Dry-run output snapshot. */
    readonly result: IDryRunResult
}

/** API контракт для dry-run операций. */
export interface IDryRunApi {
    /** Триггерит dry-run для репозитория. */
    triggerDryRun(request: ITriggerDryRunRequest): Promise<ITriggerDryRunResponse>
}

/** Endpoint-клиент dry-run API. */
export class DryRunApi implements IDryRunApi {
    private readonly httpClient: IHttpClient

    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    public async triggerDryRun(request: ITriggerDryRunRequest): Promise<ITriggerDryRunResponse> {
        const normalizedRepositoryId = request.repositoryId.trim()
        if (normalizedRepositoryId.length === 0) {
            throw new Error("repositoryId не должен быть пустым")
        }

        return this.httpClient.request<ITriggerDryRunResponse>({
            method: "POST",
            path: `/api/v1/repositories/${encodeURIComponent(normalizedRepositoryId)}/dry-run`,
            body: {
                reviewMode: request.reviewMode,
                ignorePatterns: request.ignorePatterns,
            },
            credentials: "include",
        })
    }
}
