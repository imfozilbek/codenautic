import type {
    ICcrWorkspaceDiffFile,
    ICcrWorkspaceReviewCommentThread,
    ICcrWorkspaceRow,
    TCcrWorkspaceSeverity,
    TCcrWorkspaceStatus,
} from "@/lib/api/endpoints/ccr-workspace.endpoint"
import type {
    ICodeReview,
    ICodeReviewFeedbackItem,
} from "@/lib/api/endpoints/code-review.endpoint"

/**
 * Параметры фильтрации списка CCR.
 */
export interface ICcrListFilters {
    /** Фильтр по статусу. */
    readonly status?: TCcrWorkspaceStatus
    /** Фильтр по команде. */
    readonly team?: string
    /** Фильтр по репозиторию. */
    readonly repository?: string
    /** Текстовый поиск по заголовку, assignee, id. */
    readonly q?: string
}

/**
 * Данные для создания нового CCR.
 */
export interface ICreateCcrData {
    /** Заголовок CCR. */
    readonly title: string
    /** Репозиторий. */
    readonly repository: string
    /** Ответственный. */
    readonly assignee: string
    /** Команда. */
    readonly team: string
    /** Уровень риска. */
    readonly severity: TCcrWorkspaceSeverity
    /** Список затронутых файлов. */
    readonly attachedFiles: ReadonlyArray<string>
}

/**
 * Частичное обновление CCR.
 */
export interface IUpdateCcrPatch {
    /** Новый заголовок. */
    readonly title?: string
    /** Новый статус. */
    readonly status?: TCcrWorkspaceStatus
    /** Новый ответственный. */
    readonly assignee?: string
    /** Новый уровень риска. */
    readonly severity?: TCcrWorkspaceSeverity
}

/**
 * Seed-данные для инициализации коллекции reviews.
 */
export interface IReviewsSeedData {
    /** CCR-строки. */
    readonly ccrs: ReadonlyArray<ICcrWorkspaceRow>
    /** Диффы по CCR ID. */
    readonly diffs: ReadonlyArray<{
        readonly ccrId: string
        readonly files: ReadonlyArray<ICcrWorkspaceDiffFile>
    }>
    /** Треды комментариев по CCR ID. */
    readonly threads: ReadonlyArray<{
        readonly ccrId: string
        readonly threads: ReadonlyArray<ICcrWorkspaceReviewCommentThread>
    }>
    /** Результаты code review. */
    readonly reviews: ReadonlyArray<ICodeReview>
}

/**
 * In-memory коллекция данных reviews для mock API.
 *
 * Хранит CCR-строки, диффы, комментарии и результаты code review.
 * Поддерживает CRUD-операции, фильтрацию и seed/clear для тестов.
 */
export class ReviewsCollection {
    /**
     * CCR-строки по ID.
     */
    private ccrs: Map<string, ICcrWorkspaceRow> = new Map()

    /**
     * Диффы файлов по CCR ID.
     */
    private diffs: Map<string, ReadonlyArray<ICcrWorkspaceDiffFile>> = new Map()

    /**
     * Треды комментариев по CCR ID.
     */
    private threads: Map<string, ReadonlyArray<ICcrWorkspaceReviewCommentThread>> =
        new Map()

    /**
     * Результаты code review по review ID.
     */
    private reviews: Map<string, ICodeReview> = new Map()

    /**
     * Счётчик принятых фидбеков по review ID.
     */
    private feedbackCounts: Map<string, number> = new Map()

    /**
     * Возвращает отфильтрованный список CCR.
     *
     * @param filters - Опциональные параметры фильтрации.
     * @returns Массив CCR-строк, соответствующих фильтрам.
     */
    public listCcrs(filters?: ICcrListFilters): ReadonlyArray<ICcrWorkspaceRow> {
        let result = Array.from(this.ccrs.values())

        if (filters === undefined) {
            return result
        }

        if (filters.status !== undefined) {
            result = result.filter(
                (ccr): boolean => ccr.status === filters.status,
            )
        }

        if (filters.team !== undefined) {
            result = result.filter(
                (ccr): boolean => ccr.team === filters.team,
            )
        }

        if (filters.repository !== undefined) {
            result = result.filter(
                (ccr): boolean => ccr.repository === filters.repository,
            )
        }

        if (filters.q !== undefined && filters.q.length > 0) {
            const query = filters.q.toLowerCase()
            result = result.filter(
                (ccr): boolean =>
                    ccr.title.toLowerCase().includes(query) ||
                    ccr.assignee.toLowerCase().includes(query) ||
                    ccr.id.toLowerCase().includes(query),
            )
        }

        return result
    }

    /**
     * Возвращает CCR по идентификатору.
     *
     * @param id - Идентификатор CCR.
     * @returns CCR-строка или undefined если не найдена.
     */
    public getCcrById(id: string): ICcrWorkspaceRow | undefined {
        return this.ccrs.get(id)
    }

    /**
     * Возвращает диффы файлов для указанного CCR.
     *
     * @param ccrId - Идентификатор CCR.
     * @returns Массив diff-файлов (пустой если диффы не найдены).
     */
    public getDiffsByCcrId(
        ccrId: string,
    ): ReadonlyArray<ICcrWorkspaceDiffFile> {
        return this.diffs.get(ccrId) ?? []
    }

    /**
     * Возвращает треды комментариев для указанного CCR.
     *
     * @param ccrId - Идентификатор CCR.
     * @returns Массив тредов (пустой если треды не найдены).
     */
    public getThreadsByCcrId(
        ccrId: string,
    ): ReadonlyArray<ICcrWorkspaceReviewCommentThread> {
        return this.threads.get(ccrId) ?? []
    }

    /**
     * Возвращает результат code review по идентификатору.
     *
     * @param reviewId - Идентификатор review.
     * @returns Модель code review или undefined если не найдена.
     */
    public getReviewById(reviewId: string): ICodeReview | undefined {
        return this.reviews.get(reviewId)
    }

    /**
     * Возвращает результат code review по идентификатору CCR (merge request).
     *
     * @param ccrId - Идентификатор CCR.
     * @returns Модель code review или undefined если не найдена.
     */
    public getReviewByCcrId(ccrId: string): ICodeReview | undefined {
        for (const review of this.reviews.values()) {
            if (review.mergeRequestId === ccrId) {
                return review
            }
        }
        return undefined
    }

    /**
     * Создаёт новый CCR и добавляет в коллекцию.
     *
     * @param data - Данные для создания CCR.
     * @returns Созданная CCR-строка.
     */
    public createCcr(data: ICreateCcrData): ICcrWorkspaceRow {
        const id = `ccr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
        const ccr: ICcrWorkspaceRow = {
            id,
            title: data.title,
            repository: data.repository,
            assignee: data.assignee,
            status: "new",
            comments: 0,
            updatedAt: new Date().toISOString(),
            team: data.team,
            severity: data.severity,
            attachedFiles: data.attachedFiles,
        }

        this.ccrs.set(id, ccr)
        return ccr
    }

    /**
     * Частично обновляет CCR по идентификатору.
     *
     * @param id - Идентификатор CCR.
     * @param patch - Частичное обновление полей.
     * @returns Обновлённая CCR-строка или undefined если не найдена.
     */
    public updateCcr(
        id: string,
        patch: IUpdateCcrPatch,
    ): ICcrWorkspaceRow | undefined {
        const existing = this.ccrs.get(id)
        if (existing === undefined) {
            return undefined
        }

        const updated: ICcrWorkspaceRow = {
            ...existing,
            ...patch,
            updatedAt: new Date().toISOString(),
        }
        this.ccrs.set(id, updated)
        return updated
    }

    /**
     * Добавляет тред комментария к CCR.
     *
     * @param ccrId - Идентификатор CCR.
     * @param thread - Тред комментария для добавления.
     */
    public addThread(
        ccrId: string,
        thread: ICcrWorkspaceReviewCommentThread,
    ): void {
        const existing = this.threads.get(ccrId) ?? []
        this.threads.set(ccrId, [...existing, thread])
    }

    /**
     * Принимает обратную связь по результатам review.
     *
     * Подсчитывает количество принятых элементов фидбека.
     *
     * @param reviewId - Идентификатор review.
     * @param feedbacks - Массив элементов обратной связи.
     * @returns Количество принятых элементов или undefined если review не найден.
     */
    public submitFeedback(
        reviewId: string,
        feedbacks: ReadonlyArray<ICodeReviewFeedbackItem>,
    ): number | undefined {
        const review = this.reviews.get(reviewId)
        if (review === undefined) {
            return undefined
        }

        const currentCount = this.feedbackCounts.get(reviewId) ?? 0
        const newCount = currentCount + feedbacks.length
        this.feedbackCounts.set(reviewId, newCount)

        return feedbacks.length
    }

    /**
     * Заполняет коллекцию seed-данными.
     *
     * Очищает текущее состояние и загружает переданные данные.
     *
     * @param data - Seed-данные для инициализации.
     */
    public seed(data: IReviewsSeedData): void {
        this.clear()

        for (const ccr of data.ccrs) {
            this.ccrs.set(ccr.id, ccr)
        }

        for (const entry of data.diffs) {
            this.diffs.set(entry.ccrId, entry.files)
        }

        for (const entry of data.threads) {
            this.threads.set(entry.ccrId, entry.threads)
        }

        for (const review of data.reviews) {
            this.reviews.set(review.reviewId, review)
        }
    }

    /**
     * Полностью очищает все данные коллекции.
     */
    public clear(): void {
        this.ccrs.clear()
        this.diffs.clear()
        this.threads.clear()
        this.reviews.clear()
        this.feedbackCounts.clear()
    }
}
