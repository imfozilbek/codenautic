import type { IHttpClient } from "../http-client"

/** Уровень критичности проблемы. */
export type TIssueSeverity = "critical" | "high" | "medium" | "low"

/** Статус решения проблемы. */
export type TIssueStatus = "dismissed" | "fixed" | "in_progress" | "open"

/** Действие над проблемой. */
export type TIssueAction = "acknowledge" | "fix" | "ignore" | "snooze"

/** Проблема, обнаруженная при анализе кода. */
export interface IIssue {
    /** Уникальный идентификатор проблемы. */
    readonly id: string
    /** Заголовок / краткое описание проблемы. */
    readonly title: string
    /** Репозиторий с проблемой. */
    readonly repository: string
    /** Путь к файлу, где обнаружена проблема. */
    readonly filePath: string
    /** Уровень критичности. */
    readonly severity: TIssueSeverity
    /** Статус решения. */
    readonly status: TIssueStatus
    /** Короткий комментарий о типе сигнала. */
    readonly message: string
    /** Отвечающий коллега. */
    readonly owner: string
    /** Время обнаружения (ISO 8601). */
    readonly detectedAt: string
}

/** Ответ списка проблем. */
export interface IIssuesListResponse {
    /** Отфильтрованный список проблем. */
    readonly issues: readonly IIssue[]
    /** Полное количество для пагинации. */
    readonly total: number
}

/** Параметры фильтрации списка проблем. */
export interface IListIssuesQuery {
    /** Фильтр по статусу. */
    readonly status?: TIssueStatus
    /** Фильтр по критичности. */
    readonly severity?: TIssueSeverity
    /** Поиск по тексту. */
    readonly search?: string
}

/** Запрос на выполнение действия над проблемой. */
export interface IPerformIssueActionRequest {
    /** Идентификатор проблемы. */
    readonly id: string
    /** Действие для выполнения. */
    readonly action: TIssueAction
}

/** Результат выполнения действия над проблемой. */
export interface IPerformIssueActionResponse {
    /** Обновлённая проблема после действия. */
    readonly issue: IIssue
}

/** Контракт issues API. */
export interface IIssuesApi {
    /** Возвращает отфильтрованный список проблем. */
    listIssues(query?: IListIssuesQuery): Promise<IIssuesListResponse>

    /** Возвращает одну проблему по id. */
    getIssue(issueId: string): Promise<IIssue>

    /** Выполняет действие над проблемой. */
    performAction(request: IPerformIssueActionRequest): Promise<IPerformIssueActionResponse>
}

/** Endpoint-слой для issues API. */
export class IssuesApi implements IIssuesApi {
    private readonly httpClient: IHttpClient

    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    public async listIssues(query: IListIssuesQuery = {}): Promise<IIssuesListResponse> {
        const requestQuery = query as Readonly<Record<string, string | undefined>>

        return this.httpClient.request<IIssuesListResponse>({
            method: "GET",
            path: "/api/v1/issues",
            query: requestQuery,
            credentials: "include",
        })
    }

    public async getIssue(issueId: string): Promise<IIssue> {
        const normalizedId = issueId.trim()
        if (normalizedId.length === 0) {
            throw new Error("issueId не должен быть пустым")
        }

        return this.httpClient.request<IIssue>({
            method: "GET",
            path: `/api/v1/issues/${encodeURIComponent(normalizedId)}`,
            credentials: "include",
        })
    }

    public async performAction(
        request: IPerformIssueActionRequest,
    ): Promise<IPerformIssueActionResponse> {
        const normalizedId = request.id.trim()
        if (normalizedId.length === 0) {
            throw new Error("issueId не должен быть пустым")
        }

        return this.httpClient.request<IPerformIssueActionResponse>({
            method: "PATCH",
            path: `/api/v1/issues/${encodeURIComponent(normalizedId)}/action`,
            body: { action: request.action },
            credentials: "include",
        })
    }
}
