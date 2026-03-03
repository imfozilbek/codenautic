import type { IHttpClient } from "../http-client"

/** Модель проблемы в результате code review. */
export interface ICodeReviewIssue {
    /** Уникальный идентификатор issue. */
    readonly id: string
    /** Путь файла, где найдена проблема. */
    readonly filePath: string
    /** Номер строки начала. */
    readonly lineStart: number
    /** Номер строки окончания. */
    readonly lineEnd: number
    /** Уровень важности. */
    readonly severity: string
    /** Категория нарушения. */
    readonly category: string
    /** Описание проблемы. */
    readonly message: string
    /** Предложение по исправлению. */
    readonly suggestion?: string
    /** Пример фрагмента кода. */
    readonly codeBlock?: string
    /** Приоритет. */
    readonly rankScore: number
}

/** Базовая метрика исполнения ревью. */
export interface ICodeReviewMetrics {
    /** Продолжительность в миллисекундах. */
    readonly duration: number
}

/** Ответ сервиса code review по ID. */
export interface ICodeReview {
    /** Идентификатор ревью. */
    readonly reviewId: string
    /** Идентификатор репозитория. */
    readonly repositoryId: string
    /** Идентификатор merge request или pull request. */
    readonly mergeRequestId: string
    /** Человеко-читаемый статус. */
    readonly status: string
    /** Найденные issues. */
    readonly issues: ReadonlyArray<ICodeReviewIssue>
    /** Метрики исполнения. */
    readonly metrics: ICodeReviewMetrics | null
    /** Заголовок/краткое описание ревью. */
    readonly title?: string
    /** Краткая сводка. */
    readonly summary?: string
}

/** Доступные типы обратной связи по issue. */
export const CODE_REVIEW_FEEDBACK_TYPES = {
    falsePositive: "FALSE_POSITIVE",
    helpful: "HELPFUL",
    dismissed: "DISMISSED",
    implemented: "IMPLEMENTED",
    accepted: "ACCEPTED",
    ignored: "IGNORED",
} as const

/** Тип обратной связи по issue. */
export type TCodeReviewFeedbackType = (typeof CODE_REVIEW_FEEDBACK_TYPES)[keyof typeof CODE_REVIEW_FEEDBACK_TYPES]

/** Элемент обратной связи. */
export interface ICodeReviewFeedbackItem {
    /** Идентификатор issue. */
    readonly issueId: string
    /** Идентификатор review. */
    readonly reviewId: string
    /** Тип обратной связи. */
    readonly type: TCodeReviewFeedbackType
    /** Комментарий пользователя. */
    readonly comment?: string
}

/** Запрос на запуск review. */
export interface ITriggerCodeReviewRequest {
    /** Идентификатор репозитория. */
    readonly repositoryId: string
    /** Идентификатор MR/PR. */
    readonly mergeRequestId?: string
    /** Идентификатор пользователя/инициатора. */
    readonly requestedBy?: string
}

/** Ответ на запуск review. */
export interface ITriggerCodeReviewResponse {
    /** Идентификатор созданного review. */
    readonly reviewId: string
    /** Статус постановки в очередь. */
    readonly status: string
}

/** Запрос обратной связи по результатам review. */
export interface ISubmitCodeReviewFeedbackRequest {
    /** Идентификатор review. */
    readonly reviewId: string
    /** Список обратной связи по issues. */
    readonly feedbacks: ReadonlyArray<ICodeReviewFeedbackItem>
}

/** Результат отправки обратной связи. */
export interface ISubmitCodeReviewFeedbackResponse {
    /** Идентификатор review, для которого применена обратная связь. */
    readonly reviewId: string
    /** Количество принятых записей обратной связи. */
    readonly acceptedCount: number
}

/** Контракт endpoint-слоя code review API. */
export interface ICodeReviewApi {
    /**
     * Возвращает детальную модель review.
     *
     * @param reviewId Идентификатор review.
     * @returns Review payload.
     */
    getCodeReview(reviewId: string): Promise<ICodeReview>

    /**
     * Запускает новый review.
     *
     * @param request Данные запуска.
     * @returns Идентификатор и статус очереди.
     */
    triggerCodeReview(request: ITriggerCodeReviewRequest): Promise<ITriggerCodeReviewResponse>

    /**
     * Отправляет feedback по найденным issue.
     *
     * @param request Payload обратной связи.
     * @returns Результат сохранения.
     */
    submitFeedback(request: ISubmitCodeReviewFeedbackRequest): Promise<ISubmitCodeReviewFeedbackResponse>
}

/** Endpoint-слой для code review API. */
export class CodeReviewApi implements ICodeReviewApi {
    private readonly httpClient: IHttpClient

    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    public async getCodeReview(reviewId: string): Promise<ICodeReview> {
        const normalizedReviewId = reviewId.trim()
        if (normalizedReviewId.length === 0) {
            throw new Error("reviewId не должен быть пустым")
        }

        return this.httpClient.request<ICodeReview>({
            method: "GET",
            path: `/api/v1/reviews/${encodeURIComponent(normalizedReviewId)}`,
            credentials: "include",
        })
    }

    public async triggerCodeReview(
        request: ITriggerCodeReviewRequest,
    ): Promise<ITriggerCodeReviewResponse> {
        const normalizedRepositoryId = request.repositoryId.trim()
        if (normalizedRepositoryId.length === 0) {
            throw new Error("repositoryId не должен быть пустым")
        }

        return this.httpClient.request<ITriggerCodeReviewResponse>({
            method: "POST",
            path: "/api/v1/reviews",
            body: {
                repositoryId: normalizedRepositoryId,
                mergeRequestId: request.mergeRequestId,
                requestedBy: request.requestedBy,
            },
            credentials: "include",
        })
    }

    public async submitFeedback(
        request: ISubmitCodeReviewFeedbackRequest,
    ): Promise<ISubmitCodeReviewFeedbackResponse> {
        return this.httpClient.request<ISubmitCodeReviewFeedbackResponse>({
            method: "POST",
            path: `/api/v1/reviews/${encodeURIComponent(request.reviewId)}/feedback`,
            body: {
                reviewId: request.reviewId,
                feedbacks: request.feedbacks,
            },
            credentials: "include",
        })
    }
}
