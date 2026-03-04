export interface ISessionExpiredEventDetail {
    /** HTTP код ошибки сессии. */
    readonly code: 401 | 419
    /** Pending intent route для восстановления после re-auth. */
    readonly pendingIntent?: string
}

export interface ISessionDraftSnapshot {
    /** Идентификатор поля, для которого сохранён draft. */
    readonly fieldKey: string
    /** Маршрут, на котором сохранён draft. */
    readonly path: string
    /** Сохранённое значение draft. */
    readonly value: string
    /** Время обновления. */
    readonly updatedAt: string
}

const SESSION_PENDING_INTENT_KEY = "codenautic:session:pending-intent"
const SESSION_DRAFT_KEY = "codenautic:session:draft"

function safeParse<T>(rawValue: string): T | undefined {
    try {
        return JSON.parse(rawValue) as T
    } catch (_error: unknown) {
        return undefined
    }
}

/**
 * Создаёт стабильный key для draft поля.
 *
 * @param field Редактируемое поле.
 * @returns Идентификатор draft.
 */
export function buildDraftFieldKey(
    field: HTMLInputElement | HTMLTextAreaElement,
): string {
    const fieldName = field.name.trim()
    if (fieldName.length > 0) {
        return `name:${fieldName}`
    }

    const fieldId = field.id.trim()
    if (fieldId.length > 0) {
        return `id:${fieldId}`
    }

    const ariaLabel = field.getAttribute("aria-label")?.trim() ?? ""
    if (ariaLabel.length > 0) {
        return `aria:${ariaLabel}`
    }

    return "field:unknown"
}

/**
 * Сохраняет pending intent в session storage.
 *
 * @param pendingIntent Маршрут восстановления.
 */
export function writeSessionPendingIntent(pendingIntent: string): void {
    if (typeof window === "undefined") {
        return
    }

    window.sessionStorage.setItem(SESSION_PENDING_INTENT_KEY, pendingIntent)
}

/**
 * Читает pending intent из session storage.
 *
 * @returns Маршрут восстановления или undefined.
 */
export function readSessionPendingIntent(): string | undefined {
    if (typeof window === "undefined") {
        return undefined
    }

    const rawValue = window.sessionStorage.getItem(SESSION_PENDING_INTENT_KEY)
    if (rawValue === null || rawValue.trim().length === 0) {
        return undefined
    }

    return rawValue
}

/**
 * Очищает pending intent после re-auth.
 */
export function clearSessionPendingIntent(): void {
    if (typeof window === "undefined") {
        return
    }

    window.sessionStorage.removeItem(SESSION_PENDING_INTENT_KEY)
}

/**
 * Сохраняет autosave draft в session storage.
 *
 * @param draft Snapshot draft.
 */
export function writeSessionDraftSnapshot(draft: ISessionDraftSnapshot): void {
    if (typeof window === "undefined") {
        return
    }

    window.sessionStorage.setItem(SESSION_DRAFT_KEY, JSON.stringify(draft))
}

/**
 * Возвращает последний autosave draft из session storage.
 *
 * @returns Snapshot draft или undefined.
 */
export function readSessionDraftSnapshot(): ISessionDraftSnapshot | undefined {
    if (typeof window === "undefined") {
        return undefined
    }

    const rawValue = window.sessionStorage.getItem(SESSION_DRAFT_KEY)
    if (rawValue === null) {
        return undefined
    }

    const parsed = safeParse<ISessionDraftSnapshot>(rawValue)
    if (parsed === undefined) {
        return undefined
    }

    if (
        typeof parsed.fieldKey !== "string"
        || typeof parsed.path !== "string"
        || typeof parsed.value !== "string"
        || typeof parsed.updatedAt !== "string"
    ) {
        return undefined
    }

    return parsed
}
