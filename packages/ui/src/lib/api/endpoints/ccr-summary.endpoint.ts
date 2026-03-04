import type { IHttpClient } from "../http-client"
import type { TRepoReviewMode } from "./repo-config.endpoint"

/**
 * Payload генерации CCR summary.
 */
export interface IGenerateCcrSummaryRequest {
    /** Уровень детализации summary. */
    readonly detailLevel: "CONCISE" | "STANDARD" | "DEEP"
    /** Включить risk overview секцию. */
    readonly includeRiskOverview: boolean
    /** Включить timeline highlights секцию. */
    readonly includeTimeline: boolean
    /** Максимум suggestions в summary. */
    readonly maxSuggestions: number
    /** Prompt override для summary generator. */
    readonly promptOverride: string
    /** Идентификатор репозитория. */
    readonly repositoryId: string
    /** Режим ревью. */
    readonly reviewMode: TRepoReviewMode
}

/**
 * Сгенерированный CCR summary.
 */
export interface ICcrSummaryResult {
    /** Временная метка генерации summary. */
    readonly generatedAt: string
    /** Ключевые highlights summary. */
    readonly highlights: ReadonlyArray<string>
    /** Режим, в котором summary сгенерирован. */
    readonly mode: TRepoReviewMode
    /** Текст summary. */
    readonly summary: string
}

/**
 * Response генерации summary.
 */
export interface IGenerateCcrSummaryResponse {
    /** Результат summary generation. */
    readonly result: ICcrSummaryResult
}

/**
 * API контракт CCR summary.
 */
export interface ICCRSummaryApi {
    /**
     * Генерирует CCR summary для репозитория.
     *
     * @param request - параметры генерации summary.
     * @returns Сгенерированный summary payload.
     */
    generateSummary(request: IGenerateCcrSummaryRequest): Promise<IGenerateCcrSummaryResponse>
}

/**
 * Endpoint-клиент CCR summary операций.
 */
export class CCRSummaryApi implements ICCRSummaryApi {
    private readonly httpClient: IHttpClient

    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    public async generateSummary(
        request: IGenerateCcrSummaryRequest,
    ): Promise<IGenerateCcrSummaryResponse> {
        const normalizedRepositoryId = request.repositoryId.trim()
        if (normalizedRepositoryId.length === 0) {
            throw new Error("repositoryId не должен быть пустым")
        }

        return this.httpClient.request<IGenerateCcrSummaryResponse>({
            method: "POST",
            path: `/api/v1/repositories/${encodeURIComponent(normalizedRepositoryId)}/ccr-summary/generate`,
            body: {
                reviewMode: request.reviewMode,
                detailLevel: request.detailLevel,
                includeRiskOverview: request.includeRiskOverview,
                includeTimeline: request.includeTimeline,
                maxSuggestions: request.maxSuggestions,
                promptOverride: request.promptOverride,
            },
            credentials: "include",
        })
    }
}
