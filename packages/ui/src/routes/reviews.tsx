import type { ReactElement } from "react"
import { Suspense, lazy } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useNavigate } from "@tanstack/react-router"

import { RouteSuspenseFallback } from "@/app/route-suspense-fallback"
import { AuthBoundary } from "@/lib/auth/auth-boundary"
import { DashboardLayout } from "@/components/layout"
import { type ICcrFilters } from "@/pages/ccr-management.page"
import {
    getWindowLocalStorage,
    safeStorageGetJson,
    safeStorageSetJson,
} from "@/lib/utils/safe-storage"

export const REVIEWS_FILTER_PERSISTENCE_KEY = "reviews:filters:v1"

const LazyCcrManagementPage = lazy(
    async (): Promise<{
        default: (
            props: ICcrFilters & {
                onFilterChange: (next: ICcrFilters) => void
            },
        ) => ReactElement
    }> => {
        const pageModule = await import("@/pages/ccr-management.page")

        return {
            default: (props): ReactElement => (
                <pageModule.CcrManagementPage
                    onFilterChange={props.onFilterChange}
                    repository={props.repository}
                    search={props.search}
                    status={props.status}
                    team={props.team}
                />
            ),
        }
    },
)

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

function hasExplicitRouteFilters(input: IReviewsSearch): boolean {
    const hasSearch = typeof input.q === "string" && input.q.trim().length > 0
    const hasStatus = typeof input.status === "string" && input.status.length > 0
    const hasTeam = typeof input.team === "string" && input.team.length > 0
    const hasRepository = typeof input.repo === "string" && input.repo.length > 0

    return hasSearch || hasStatus || hasTeam || hasRepository
}

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

function persistReviewsFilters(next: ICcrFilters): void {
    safeStorageSetJson(getWindowLocalStorage(), REVIEWS_FILTER_PERSISTENCE_KEY, next)
}

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

export function sanitizeForRouter(next: ICcrFilters): IReviewsSearch {
    return {
        q: next.search.length === 0 ? undefined : next.search,
        repo: next.repository === "all" ? undefined : next.repository,
        status: next.status === "all" ? undefined : next.status,
        team: next.team === "all" ? undefined : next.team,
    }
}

function ReviewsRouteComponent(): ReactElement {
    const currentSearch = Route.useSearch()
    const navigate = useNavigate()

    const initialFilters = buildSearchFromRoute(currentSearch)

    return (
        <AuthBoundary loginPath="/login">
            {(context): ReactElement => (
                <DashboardLayout
                    onSignOut={context.onSignOut}
                    title="CCR Management"
                    userEmail={context.userEmail}
                    userName={context.userName}
                >
                    <Suspense fallback={<RouteSuspenseFallback />}>
                        <LazyCcrManagementPage
                            {...initialFilters}
                            onFilterChange={(next): void => {
                                persistReviewsFilters(next)
                                void navigate({
                                    to: "/reviews",
                                    search: sanitizeForRouter(next),
                                    replace: true,
                                })
                            }}
                        />
                    </Suspense>
                </DashboardLayout>
            )}
        </AuthBoundary>
    )
}

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
    component: ReviewsRouteComponent,
})
