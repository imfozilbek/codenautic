/**
 * Статусы CCR.
 */
export type TReviewStatus = "new" | "queued" | "in_progress" | "approved" | "rejected"

/**
 * Уровень важности CCR.
 */
export type TCcrSeverity = "low" | "medium" | "high"

/**
 * Модель строки CCR для UI-экранов review.
 */
export interface ICcrRowData {
    /** Идентификатор CCR. */
    readonly id: string
    /** Заголовок/тема. */
    readonly title: string
    /** Репозиторий. */
    readonly repository: string
    /** Владелец. */
    readonly assignee: string
    /** Статус. */
    readonly status: TReviewStatus
    /** Количество комментариев. */
    readonly comments: number
    /** Обновление. */
    readonly updatedAt: string
    /** Команда. */
    readonly team: string
    /** Уровень критичности. */
    readonly severity: TCcrSeverity
    /** Прикреплённые файлы. */
    readonly attachedFiles: ReadonlyArray<string>
}

/**
 * Сторона строки диффа.
 */
export type TCcrDiffLineSide = "left" | "right"

/**
 * Тип статуса строки в диффе.
 */
export type TCcrDiffLineType = "context" | "removed" | "added"

/**
 * Inline-комментарий к конкретной строке диффа.
 */
export interface ICcrDiffComment {
    /** Автор комментария. */
    readonly author: string
    /** Текст комментария. */
    readonly message: string
    /** Позиция линии комментария. */
    readonly line: number
    /** Сторона строки для комментария. */
    readonly side: TCcrDiffLineSide
}

/**
 * Одна строка unified-диффа.
 */
export interface ICcrDiffLine {
    /** Номер строки слева. */
    readonly leftLine?: number
    /** Номер строки справа. */
    readonly rightLine?: number
    /** Содержимое слева. */
    readonly leftText: string
    /** Содержимое справа. */
    readonly rightText: string
    /** Тип изменения строки. */
    readonly type: TCcrDiffLineType
    /** Комментарии к строке. */
    readonly comments?: ReadonlyArray<ICcrDiffComment>
}

/**
 * Дифф по файлу.
 */
export interface ICcrDiffFile {
    /** Путь файла. */
    readonly filePath: string
    /** Язык для подсветки. */
    readonly language: string
    /** Строки диффа. */
    readonly lines: ReadonlyArray<ICcrDiffLine>
}

/**
 * Тип обратной связи по комментарию.
 */
export type TReviewCommentFeedback = "like" | "dislike"

/**
 * Комментарий review с вложенностью.
 */
export interface IReviewCommentThread {
    /** Идентификатор комментария. */
    readonly id: string
    /** Автор комментария. */
    readonly author: string
    /** Сообщение. */
    readonly message: string
    /** Время создания. */
    readonly createdAt: string
    /** Разрешен ли комментарий. */
    readonly isResolved: boolean
    /** Оценка пользователем. */
    readonly feedback?: TReviewCommentFeedback
    /** Вложенные ответы. */
    readonly replies: ReadonlyArray<IReviewCommentThread>
}
