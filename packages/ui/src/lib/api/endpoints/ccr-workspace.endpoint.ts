import type { IHttpClient } from "../http-client"

/** Уровень риска CCR. */
export type TCcrWorkspaceSeverity = "low" | "medium" | "high"

/** Статус CCR для workspace. */
export type TCcrWorkspaceStatus = "new" | "queued" | "in_progress" | "approved" | "rejected"

/** Модель CCR-строки для workspace. */
export interface ICcrWorkspaceRow {
    /** Идентификатор CCR. */
    readonly id: string
    /** Заголовок. */
    readonly title: string
    /** Репозиторий. */
    readonly repository: string
    /** Ответственный. */
    readonly assignee: string
    /** Статус. */
    readonly status: TCcrWorkspaceStatus
    /** Количество комментариев. */
    readonly comments: number
    /** Время обновления. */
    readonly updatedAt: string
    /** Команда. */
    readonly team: string
    /** Severity. */
    readonly severity: TCcrWorkspaceSeverity
    /** Список затронутых файлов. */
    readonly attachedFiles: ReadonlyArray<string>
}

/** Сторона строки diff. */
export type TCcrWorkspaceDiffLineSide = "left" | "right"

/** Тип строки unified diff. */
export type TCcrWorkspaceDiffLineType = "context" | "removed" | "added"

/** Комментарий на строке diff. */
export interface ICcrWorkspaceDiffComment {
    /** Автор комментария. */
    readonly author: string
    /** Текст комментария. */
    readonly message: string
    /** Номер строки. */
    readonly line: number
    /** Сторона строки. */
    readonly side: TCcrWorkspaceDiffLineSide
}

/** Одна строка diff по файлу. */
export interface ICcrWorkspaceDiffLine {
    /** Номер строки слева. */
    readonly leftLine?: number
    /** Номер строки справа. */
    readonly rightLine?: number
    /** Текст слева. */
    readonly leftText: string
    /** Текст справа. */
    readonly rightText: string
    /** Тип изменения. */
    readonly type: TCcrWorkspaceDiffLineType
    /** Комментарии к строке. */
    readonly comments?: ReadonlyArray<ICcrWorkspaceDiffComment>
}

/** Diff по файлу. */
export interface ICcrWorkspaceDiffFile {
    /** Путь файла. */
    readonly filePath: string
    /** Язык. */
    readonly language: string
    /** Строки diff. */
    readonly lines: ReadonlyArray<ICcrWorkspaceDiffLine>
}

/** Обратная связь к комментарию ревью. */
export type TCcrWorkspaceCommentFeedback = "like" | "dislike"

/** Комментарий ревью-треда. */
export interface ICcrWorkspaceReviewCommentThread {
    /** Идентификатор комментария. */
    readonly id: string
    /** Автор. */
    readonly author: string
    /** Сообщение. */
    readonly message: string
    /** Время создания. */
    readonly createdAt: string
    /** Разрешен ли комментарий. */
    readonly isResolved: boolean
    /** Обратная связь. */
    readonly feedback?: TCcrWorkspaceCommentFeedback
    /** Ответы. */
    readonly replies: ReadonlyArray<ICcrWorkspaceReviewCommentThread>
}

/** Ответ списка CCR для workspace. */
export interface ICcrWorkspaceListResponse {
    /** Список CCR. */
    readonly ccrs: ReadonlyArray<ICcrWorkspaceRow>
}

/** Ответ review-context workspace. */
export interface ICcrWorkspaceContextResponse {
    /** Идентификатор ревью. */
    readonly reviewId: string
    /** Модель CCR. */
    readonly ccr: ICcrWorkspaceRow
    /** Набор diff-файлов. */
    readonly diffFiles: ReadonlyArray<ICcrWorkspaceDiffFile>
    /** Набор комментариев review-thread. */
    readonly threads: ReadonlyArray<ICcrWorkspaceReviewCommentThread>
}

/** API-контракт CCR workspace. */
export interface ICcrWorkspaceApi {
    /** Возвращает список CCR для review workspace. */
    listCcrs(): Promise<ICcrWorkspaceListResponse>
    /** Возвращает детальный review context. */
    getWorkspaceContext(reviewId: string): Promise<ICcrWorkspaceContextResponse>
}

/** Endpoint-клиент CCR workspace API. */
export class CcrWorkspaceApi implements ICcrWorkspaceApi {
    private readonly httpClient: IHttpClient

    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    public async listCcrs(): Promise<ICcrWorkspaceListResponse> {
        return this.httpClient.request<ICcrWorkspaceListResponse>({
            method: "GET",
            path: "/api/v1/reviews/workspace",
            credentials: "include",
        })
    }

    public async getWorkspaceContext(reviewId: string): Promise<ICcrWorkspaceContextResponse> {
        const normalizedReviewId = reviewId.trim()
        if (normalizedReviewId.length === 0) {
            throw new Error("reviewId не должен быть пустым")
        }

        return this.httpClient.request<ICcrWorkspaceContextResponse>({
            method: "GET",
            path: `/api/v1/reviews/${encodeURIComponent(normalizedReviewId)}/workspace`,
            credentials: "include",
        })
    }
}
