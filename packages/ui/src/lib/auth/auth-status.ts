import { isApiHttpError } from "@/lib/api"

import type { IAuthBoundaryLabels } from "./auth-labels"
import type { IAuthSession } from "./types"

/**
 * Auth guard статус коды.
 */
export type TAuthGuardStatusCode = 401 | 403

/**
 * Возвращает актуальный status code для auth guard.
 *
 * @param runtimeCode Код, вычисленный из runtime ошибки.
 * @param hintCode Код, переданный через route search.
 * @returns Приоритетный статус для UI/redirect.
 */
export function resolveAuthStatusCode(
    runtimeCode: TAuthGuardStatusCode | undefined,
    hintCode: TAuthGuardStatusCode | undefined,
): TAuthGuardStatusCode | undefined {
    if (runtimeCode !== undefined) {
        return runtimeCode
    }

    return hintCode
}

/**
 * Подставляет default auth код для null session (анонимный пользователь).
 *
 * @param authStatusCode Текущий auth status code.
 * @param session Текущее session состояние.
 * @returns Итоговый статус для redirect/login state.
 */
export function resolveDefaultAuthStatusCode(
    authStatusCode: TAuthGuardStatusCode | undefined,
    session: IAuthSession | null | undefined,
): TAuthGuardStatusCode | undefined {
    if (authStatusCode !== undefined) {
        return authStatusCode
    }

    if (session === null) {
        return 401
    }

    return undefined
}

/**
 * Извлекает auth status code из ошибки запроса session endpoint.
 *
 * @param error Ошибка загрузки auth session.
 * @returns `401`/`403` или undefined.
 */
export function resolveAuthStatusCodeFromError(
    error: Error | null,
): TAuthGuardStatusCode | undefined {
    if (error === null) {
        return undefined
    }

    if (isApiHttpError(error) !== true) {
        return undefined
    }

    if (error.status === 401 || error.status === 403) {
        return error.status
    }

    return undefined
}

/**
 * Определяет, нужно ли перенаправить пользователя на login route.
 *
 * @param loginPath Путь login route.
 * @param isPending Признак pending состояния session query.
 * @param session Текущая auth session.
 * @param authStatusCode Текущий auth статус.
 * @returns true, если нужно выполнить redirect.
 */
export function shouldNavigateToLogin(
    loginPath: string | undefined,
    isPending: boolean,
    session: IAuthSession | null | undefined,
    authStatusCode: TAuthGuardStatusCode | undefined,
): boolean {
    if (loginPath === undefined || isPending === true) {
        return false
    }

    if (isCurrentPage(loginPath) === true) {
        return false
    }

    if (session !== undefined && session !== null) {
        return false
    }

    if (authStatusCode === 401 || authStatusCode === 403 || session === null) {
        return true
    }

    return false
}

/**
 * Формирует login route path с сохранением intended destination.
 *
 * @param loginPath Базовый путь страницы логина.
 * @param intendedDestination Целевой путь после успешной авторизации.
 * @param authStatusCode Код auth статуса.
 * @returns Финальный redirect path.
 */
export function createLoginRedirectPath(
    loginPath: string | undefined,
    intendedDestination: string,
    authStatusCode: TAuthGuardStatusCode | undefined,
): string | undefined {
    if (loginPath === undefined) {
        return undefined
    }

    const searchParams = new URLSearchParams()
    searchParams.set("next", intendedDestination)

    if (authStatusCode === 401 || authStatusCode === 403) {
        searchParams.set("reason", String(authStatusCode))
    }

    return `${loginPath}?${searchParams.toString()}`
}

/**
 * Возвращает текст auth статуса для явного отображения 401/403 состояний.
 *
 * @param authStatusCode Auth статус.
 * @param labels Локализованные метки auth boundary.
 * @returns Текстовое сообщение или undefined.
 */
export function resolveAuthStatusMessage(
    authStatusCode: TAuthGuardStatusCode | undefined,
    labels: IAuthBoundaryLabels,
): string | undefined {
    if (authStatusCode === 401) {
        return labels.unauthorizedState
    }

    if (authStatusCode === 403) {
        return labels.forbiddenState
    }

    return undefined
}

/**
 * Проверяет, открыта ли текущая страница по целевому path.
 *
 * @param path Path для сравнения.
 * @returns true, если path совпадает с текущим pathname.
 */
function isCurrentPage(path: string): boolean {
    return window.location.pathname === path
}
