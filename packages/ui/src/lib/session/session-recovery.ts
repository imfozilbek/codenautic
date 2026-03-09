/**
 * Детали custom event `codenautic:session-expired`.
 */
export interface ISessionExpiredEventDetail {
    /** HTTP код ошибки сессии. */
    readonly code: 401 | 419
    /** Pending intent route для восстановления после re-auth. */
    readonly pendingIntent?: string
}

declare global {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- extends built-in WindowEventMap
    interface WindowEventMap {
        "codenautic:session-expired": CustomEvent<ISessionExpiredEventDetail>
        "codenautic:session-draft-restored": CustomEvent<ISessionDraftSnapshot>
    }
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

/**
 * Безопасно парсит JSON строку.
 *
 * @param rawValue Сырая JSON строка.
 * @returns Распарсенное значение или undefined при ошибке.
 */
function safeParseJson(rawValue: string): unknown {
    try {
        return JSON.parse(rawValue) as unknown
    } catch {
        return undefined
    }
}

/**
 * Создаёт стабильный key для draft поля.
 *
 * @param field Редактируемое поле.
 * @returns Идентификатор draft.
 */
export function buildDraftFieldKey(field: HTMLInputElement | HTMLTextAreaElement): string {
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

    const parsed = safeParseJson(rawValue)
    if (typeof parsed !== "object" || parsed === null) {
        return undefined
    }

    const candidate = parsed as Record<string, unknown>
    if (
        typeof candidate.fieldKey !== "string" ||
        typeof candidate.path !== "string" ||
        typeof candidate.value !== "string" ||
        typeof candidate.updatedAt !== "string"
    ) {
        return undefined
    }

    return {
        fieldKey: candidate.fieldKey,
        path: candidate.path,
        value: candidate.value,
        updatedAt: candidate.updatedAt,
    }
}
