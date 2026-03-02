import type {IAuthSession, IAuthUser, TOAuthProvider} from "./types"

/**
 * Ключ хранения безопасного snapshot auth session.
 */
export const AUTH_SESSION_STORAGE_KEY = "codenautic.ui.auth.session"

/**
 * Snapshot сессии, который можно безопасно хранить в browser storage.
 */
export interface IAuthSessionSnapshot {
    readonly provider: TOAuthProvider
    readonly expiresAt: string
    readonly user: IAuthUser
}

/**
 * Определяет, истекла ли auth session относительно указанного времени.
 *
 * @param session Текущая auth session.
 * @param nowMs Контрольное время в миллисекундах.
 * @returns true, если `expiresAt` уже в прошлом.
 */
export function isAuthSessionExpired(
    session: Pick<IAuthSession, "expiresAt">,
    nowMs: number = Date.now(),
): boolean {
    const expiresAtMs = Date.parse(session.expiresAt)
    if (Number.isNaN(expiresAtMs)) {
        return true
    }

    return expiresAtMs <= nowMs
}

/**
 * Возвращает признак необходимости refresh заранее до истечения сессии.
 *
 * @param session Текущая auth session.
 * @param nowMs Контрольное время в миллисекундах.
 * @param refreshThresholdMs Порог раннего refresh в миллисекундах.
 * @returns true, если до истечения меньше либо равно порогу.
 */
export function shouldRefreshAuthSession(
    session: Pick<IAuthSession, "expiresAt">,
    nowMs: number = Date.now(),
    refreshThresholdMs: number = 60_000,
): boolean {
    const expiresAtMs = Date.parse(session.expiresAt)
    if (Number.isNaN(expiresAtMs)) {
        return false
    }

    if (expiresAtMs <= nowMs) {
        return false
    }

    return expiresAtMs - nowMs <= refreshThresholdMs
}

/**
 * Сохраняет безопасный snapshot сессии в browser storage.
 *
 * @param storage Browser storage.
 * @param session Активная auth session.
 */
export function persistAuthSession(storage: Storage | undefined, session: IAuthSession): void {
    if (storage === undefined) {
        return
    }

    const snapshot = createAuthSessionSnapshot(session)
    storage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(snapshot))
}

/**
 * Загружает безопасный snapshot сессии из browser storage.
 *
 * @param storage Browser storage.
 * @returns Валидный snapshot или undefined.
 */
export function loadPersistedAuthSession(storage: Storage | undefined): IAuthSessionSnapshot | undefined {
    if (storage === undefined) {
        return undefined
    }

    const rawSnapshot = storage.getItem(AUTH_SESSION_STORAGE_KEY)
    if (rawSnapshot === null) {
        return undefined
    }

    let parsedSnapshot: unknown
    try {
        parsedSnapshot = JSON.parse(rawSnapshot) as unknown
    } catch {
        return undefined
    }

    if (isAuthSessionSnapshot(parsedSnapshot) !== true) {
        return undefined
    }

    return parsedSnapshot
}

/**
 * Удаляет сохранённый snapshot auth session из browser storage.
 *
 * @param storage Browser storage.
 */
export function clearPersistedAuthSession(storage: Storage | undefined): void {
    if (storage === undefined) {
        return
    }

    storage.removeItem(AUTH_SESSION_STORAGE_KEY)
}

/**
 * Создаёт безопасный snapshot без access/refresh токенов.
 *
 * @param session Активная auth session.
 * @returns Snapshot, пригодный для browser storage.
 */
function createAuthSessionSnapshot(session: IAuthSession): IAuthSessionSnapshot {
    return {
        provider: session.provider,
        expiresAt: session.expiresAt,
        user: {
            id: session.user.id,
            email: session.user.email,
            displayName: session.user.displayName,
            avatarUrl: session.user.avatarUrl,
        },
    }
}

/**
 * Проверяет, что значение соответствует IAuthSessionSnapshot.
 *
 * @param value Неизвестное значение.
 * @returns true, если объект имеет корректную структуру snapshot.
 */
function isAuthSessionSnapshot(value: unknown): value is IAuthSessionSnapshot {
    if (isRecord(value) !== true) {
        return false
    }

    if (isOAuthProvider(value.provider) !== true) {
        return false
    }

    if (typeof value.expiresAt !== "string" || value.expiresAt.length === 0) {
        return false
    }

    return isAuthUser(value.user)
}

/**
 * Проверяет поддержку OAuth/OIDC provider.
 *
 * @param value Неизвестное значение.
 * @returns true, если значение входит в поддерживаемый список providers.
 */
function isOAuthProvider(value: unknown): value is TOAuthProvider {
    return value === "github" || value === "gitlab" || value === "google" || value === "oidc"
}

/**
 * Проверяет структуру auth user.
 *
 * @param value Неизвестное значение.
 * @returns true, если значение соответствует IAuthUser.
 */
function isAuthUser(value: unknown): value is IAuthUser {
    if (isRecord(value) !== true) {
        return false
    }

    if (typeof value.id !== "string" || value.id.length === 0) {
        return false
    }

    if (typeof value.email !== "string" || value.email.length === 0) {
        return false
    }

    if (typeof value.displayName !== "string" || value.displayName.length === 0) {
        return false
    }

    if (value.avatarUrl === undefined) {
        return true
    }

    return typeof value.avatarUrl === "string"
}

/**
 * Проверяет, является ли значение plain object.
 *
 * @param value Неизвестное значение.
 * @returns true, если значение объект и не null.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}
