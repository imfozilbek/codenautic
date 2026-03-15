import type { IPaginatedResult } from "../store/mock-store-types"

/**
 * Базовый URL API для MSW handlers.
 */
const API_BASE = "http://localhost:7120/api/v1"

/**
 * Строит полный URL для MSW handler'а.
 *
 * @param path - Путь относительно API base (например, "/auth/session").
 * @returns Полный URL с базовым префиксом.
 */
export function api(path: string): string {
    return `${API_BASE}${path}`
}

/**
 * Пагинирует массив элементов.
 *
 * @param items - Исходный массив элементов для пагинации.
 * @param page - Номер страницы (минимум 1).
 * @param limit - Количество элементов на странице (1–100).
 * @returns Результат пагинации с метаданными.
 */
export function paginate<T>(
    items: ReadonlyArray<T>,
    page: number,
    limit: number,
): IPaginatedResult<T> {
    const safePage = Math.max(1, page)
    const safeLimit = Math.max(1, Math.min(100, limit))
    const total = items.length
    const totalPages = Math.ceil(total / safeLimit)
    const offset = (safePage - 1) * safeLimit
    const pageItems = items.slice(offset, offset + safeLimit)

    return {
        items: pageItems,
        total,
        page: safePage,
        limit: safeLimit,
        totalPages,
    }
}

/**
 * Извлекает параметры пагинации из URL.
 *
 * @param request - HTTP-запрос с query-параметрами page и limit.
 * @returns Объект с номером страницы и лимитом.
 */
export function extractPaginationParams(request: Request): {
    readonly page: number
    readonly limit: number
} {
    const url = new URL(request.url)
    return {
        page: Number(url.searchParams.get("page") ?? "1"),
        limit: Number(url.searchParams.get("limit") ?? "20"),
    }
}

/**
 * Извлекает search query из URL.
 *
 * @param request - HTTP-запрос с query-параметром q.
 * @returns Строка поискового запроса (пустая строка если отсутствует).
 */
export function extractSearchQuery(request: Request): string {
    const url = new URL(request.url)
    return url.searchParams.get("q") ?? ""
}

/**
 * Проверяет, нужно ли симулировать ошибку.
 *
 * Управляется через localStorage: msw.errorRate (0.0–1.0).
 * При значении 0 или отсутствии ключа ошибки не симулируются.
 *
 * @returns true если случайное число попало в диапазон errorRate.
 */
export function shouldSimulateError(): boolean {
    try {
        const rate = parseFloat(localStorage.getItem("msw.errorRate") ?? "0")
        if (Number.isNaN(rate) || rate <= 0) {
            return false
        }
        return Math.random() < rate
    } catch {
        return false
    }
}

/**
 * Генерирует уникальный ID с префиксом.
 *
 * @param prefix - Префикс для идентификатора (например, "review", "user").
 * @returns Строка вида "{prefix}-{timestamp36}-{random6}".
 */
export function generateId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
