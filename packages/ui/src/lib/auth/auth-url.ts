/**
 * Санитизирует внутренний маршрут приложения и блокирует protocol-relative/external URL.
 *
 * @param destination Потенциальный внутренний путь.
 * @param fallback Fallback-путь при невалидном значении.
 * @returns Безопасный путь приложения.
 */
export function sanitizeAppDestinationPath(
    destination: string | undefined,
    fallback: string,
): string {
    if (destination === undefined) {
        return fallback
    }

    const trimmedDestination = destination.trim()
    if (trimmedDestination.length === 0) {
        return fallback
    }

    if (trimmedDestination.startsWith("//")) {
        return fallback
    }

    if (trimmedDestination.startsWith("/")) {
        return trimmedDestination
    }

    try {
        const parsedDestination = new URL(trimmedDestination)
        if (parsedDestination.origin !== window.location.origin) {
            return fallback
        }

        if (parsedDestination.pathname.startsWith("//")) {
            return fallback
        }

        return `${parsedDestination.pathname}${parsedDestination.search}${parsedDestination.hash}`
    } catch {
        return fallback
    }
}

/**
 * Формирует redirect URI для OAuth/OIDC flow.
 *
 * @param intendedDestination Целевой путь после успешной авторизации.
 * @returns Redirect URI в текущем origin.
 */
export function resolveAuthRedirectUri(intendedDestination: string): string {
    const safeDestination = sanitizeAppDestinationPath(intendedDestination, "/")
    return new URL(safeDestination, window.location.origin).toString()
}

/**
 * Нормализует intended destination и блокирует внешние URL.
 *
 * @param destination Желаемый путь после авторизации.
 * @returns Безопасный относительный путь.
 */
export function resolveIntendedDestinationPath(destination: string | undefined): string {
    return sanitizeAppDestinationPath(destination, getCurrentRelativeUrl())
}

/**
 * Формирует текущий относительный URL (path + search + hash).
 *
 * @returns Относительный URL текущей страницы.
 */
export function getCurrentRelativeUrl(): string {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

/**
 * Проверяет, открыта ли текущая страница по целевому path.
 *
 * @param path Path для сравнения.
 * @returns true, если path совпадает с текущим pathname.
 */
export function isCurrentPage(path: string): boolean {
    return window.location.pathname === path
}

/**
 * Возвращает path текущего boundary для route guard проверки.
 *
 * @param routePath Явный route path.
 * @returns Санитизированный path приложения.
 */
export function resolveBoundaryRoutePath(routePath: string | undefined): string {
    if (typeof window === "undefined") {
        return sanitizeAppDestinationPath(routePath, "/")
    }

    return sanitizeAppDestinationPath(routePath, window.location.pathname)
}

/**
 * Выполняет browser redirect на внешний OAuth authorization URL.
 *
 * @param authorizationUrl URL авторизации.
 */
export function redirectToAuthorizationUrl(authorizationUrl: string): void {
    window.location.assign(authorizationUrl)
}

/**
 * Выполняет redirect на внутренний путь приложения.
 *
 * @param path Внутренний путь с query-параметрами.
 */
export function navigateToPath(path: string): void {
    window.location.assign(path)
}

/**
 * Возвращает доступный sessionStorage или undefined.
 *
 * @returns Browser storage для auth snapshot.
 */
export function getSessionStorageOrUndefined(): Storage | undefined {
    try {
        return window.sessionStorage
    } catch {
        return undefined
    }
}
