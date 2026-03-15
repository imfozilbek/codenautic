import type { IHttpClient } from "../http-client"

/**
 * Фаза сканирования.
 */
export type TScanPhase = "analysis" | "clone" | "indexing" | "queue" | "report"

/**
 * Событие прогресса сканирования.
 */
export interface IScanProgressEvent {
    /**
     * Название шага, который сейчас выполняется.
     */
    readonly phase: TScanPhase
    /**
     * Процент выполнения всего пайплайна.
     */
    readonly percent: number
    /**
     * Количество секунд до предполагаемого завершения.
     */
    readonly etaSeconds: number
    /**
     * Короткий статус сообщения для пользователя.
     */
    readonly message: string
    /**
     * Опциональный лог этой стадии.
     */
    readonly log?: string
    /**
     * Явно завершена ли текущая фаза.
     */
    readonly phaseCompleted: boolean
    /**
     * Таймштамп события.
     */
    readonly timestamp: string
}

/**
 * Ответ Scan Progress API.
 */
export interface IScanProgressResponse {
    /**
     * Идентификатор задания сканирования.
     */
    readonly jobId: string
    /**
     * Список событий прогресса.
     */
    readonly events: readonly IScanProgressEvent[]
}

/**
 * Контракт Scan Progress API.
 */
export interface IScanProgressApi {
    /**
     * Возвращает прогресс сканирования по jobId.
     *
     * @param jobId - Идентификатор задания.
     */
    getProgress(jobId: string): Promise<IScanProgressResponse>
}

/**
 * Endpoint-слой для Scan Progress API.
 */
export class ScanProgressApi implements IScanProgressApi {
    /**
     * HTTP-клиент для выполнения запросов.
     */
    private readonly httpClient: IHttpClient

    /**
     * Создаёт экземпляр ScanProgressApi.
     *
     * @param httpClient - HTTP-клиент.
     */
    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    /**
     * Возвращает прогресс сканирования по jobId.
     *
     * @param jobId - Идентификатор задания.
     * @returns Прогресс с событиями.
     */
    public async getProgress(jobId: string): Promise<IScanProgressResponse> {
        return this.httpClient.request<IScanProgressResponse>({
            method: "GET",
            path: `/api/v1/scans/${jobId}/progress`,
            credentials: "include",
        })
    }
}
