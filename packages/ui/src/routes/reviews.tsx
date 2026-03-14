import type { ReactElement } from "react"

import { createFileRoute, Outlet } from "@tanstack/react-router"

import { type ICcrFilters } from "@/pages/ccr-management.page"
import {
    getWindowLocalStorage,
    safeStorageGetJson,
    safeStorageSetJson,
} from "@/lib/utils/safe-storage"

export const REVIEWS_FILTER_PERSISTENCE_KEY = "reviews:filters:v1"

interface IReviewsSearch {
    /** Search term. */
    readonly q?: string
    /** Status filter. */
    readonly status?: string
    /** Team filter. */
    readonly team?: string
    /** Repository filter. */
    readonly repo?: string
}

/**
 * Проверяет наличие явных фильтров в query params.
 *
 * @param input Параметры поиска из URL.
 * @returns true если есть хотя бы один явный фильтр.
 */
function hasExplicitRouteFilters(input: IReviewsSearch): boolean {
    const hasSearch = typeof input.q === "string" && input.q.trim().length > 0
    const hasStatus = typeof input.status === "string" && input.status.length > 0
    const hasTeam = typeof input.team === "string" && input.team.length > 0
    const hasRepository = typeof input.repo === "string" && input.repo.length > 0

    return hasSearch || hasStatus || hasTeam || hasRepository
}

/**
 * Читает сохранённые фильтры из localStorage.
 *
 * @returns Фильтры или null.
 */
export function readPersistedReviewsFilters(): ICcrFilters | null {
    const storage = getWindowLocalStorage()
    const parsed = safeStorageGetJson<Record<string, unknown> | null>(
        storage,
        REVIEWS_FILTER_PERSISTENCE_KEY,
        null,
    )
    if (parsed === null) {
        return null
    }

    const search = typeof parsed.search === "string" ? parsed.search : ""
    const status =
        typeof parsed.status === "string" && parsed.status.length > 0 ? parsed.status : "all"
    const team = typeof parsed.team === "string" && parsed.team.length > 0 ? parsed.team : "all"
    const repository =
        typeof parsed.repository === "string" && parsed.repository.length > 0
            ? parsed.repository
            : "all"

    return {
        repository,
        search,
        status,
        team,
    }
}

/**
 * Сохраняет фильтры в localStorage.
 *
 * @param next Фильтры для сохранения.
 */
export function persistReviewsFilters(next: ICcrFilters): void {
    safeStorageSetJson(getWindowLocalStorage(), REVIEWS_FILTER_PERSISTENCE_KEY, next)
}

/**
 * Строит фильтры из query params с fallback на persisted.
 *
 * @param input Параметры из URL.
 * @returns Итоговые фильтры.
 */
export function buildSearchFromRoute(input: IReviewsSearch): ICcrFilters {
    const routeFilters: ICcrFilters = {
        repository: typeof input.repo === "string" && input.repo.length > 0 ? input.repo : "all",
        search: typeof input.q === "string" ? input.q : "",
        status: typeof input.status === "string" ? input.status : "all",
        team: typeof input.team === "string" ? input.team : "all",
    }

    if (hasExplicitRouteFilters(input) === true) {
        return routeFilters
    }

    const persistedFilters = readPersistedReviewsFilters()
    if (persistedFilters === null) {
        return routeFilters
    }

    return persistedFilters
}

/**
 * Преобразует фильтры обратно в query params для роутера.
 *
 * @param next Фильтры.
 * @returns Query params.
 */
export function sanitizeForRouter(next: ICcrFilters): IReviewsSearch {
    return {
        q: next.search.length === 0 ? undefined : next.search,
        repo: next.repository === "all" ? undefined : next.repository,
        status: next.status === "all" ? undefined : next.status,
        team: next.team === "all" ? undefined : next.team,
    }
}

/**
 * Layout route для /reviews — рендерит Outlet для index и $reviewId child routes.
 *
 * @returns Outlet pass-through.
 */
function ReviewsLayoutComponent(): ReactElement {
    return <Outlet />
}

/**
 * Валидирует search params для /reviews route.
 *
 * @param search Raw query params.
 * @returns Типизированные search params.
 */
export function validateReviewsSearch(search: Record<string, unknown>): IReviewsSearch {
    const q = typeof search.q === "string" && search.q.trim().length > 0 ? search.q : undefined
    const status = typeof search.status === "string" ? search.status : undefined
    const team = typeof search.team === "string" ? search.team : undefined
    const repo = typeof search.repo === "string" ? search.repo : undefined

    return {
        q,
        repo,
        status,
        team,
    }
}

export const Route = createFileRoute("/reviews")({
    validateSearch: validateReviewsSearch,
    component: ReviewsLayoutComponent,
})
