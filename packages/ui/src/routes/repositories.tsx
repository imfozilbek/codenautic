import { Suspense, type ReactElement, lazy } from "react"

import { RouteSuspenseFallback } from "@/app/route-suspense-fallback"
import { RouteErrorFallback } from "@/app/error-fallback"
import { AuthBoundary } from "@/lib/auth/auth-boundary"
import { DashboardLayout } from "@/components/layout"
import { createFileRoute } from "@tanstack/react-router"

const LazyRepositoriesListPage = lazy(
    async (): Promise<{
        default: () => ReactElement
    }> => {
        const pageModule = await import("@/pages/repositories-list.page")
        return {
            default: (): ReactElement => <pageModule.RepositoriesListPage />,
        }
    },
)

interface IRepositoriesSearch {
    /** Optional search term. */
    readonly q?: string
    /** Optional status filter. */
    readonly status?: "all" | "ready" | "scanning" | "error"
    /** Optional sort key. */
    readonly sort?: "name" | "status" | "lastScanAt"
}

/**
 * Маршрут списка репозиториев.
 *
 * @returns Экран с поиском/фильтрами и сортировкой онборденных репозиториев.
 */
function RepositoriesRouteComponent(): ReactElement {
    return (
        <AuthBoundary loginPath="/login">
            {(context): ReactElement => (
                <DashboardLayout
                    onSignOut={context.onSignOut}
                    title="Repositories"
                    userEmail={context.userEmail}
                    userName={context.userName}
                >
                    <Suspense fallback={<RouteSuspenseFallback />}>
                        <LazyRepositoriesListPage />
                    </Suspense>
                </DashboardLayout>
            )}
        </AuthBoundary>
    )
}

export function validateRepositoriesSearch(rawSearch: Record<string, unknown>): IRepositoriesSearch {
    return {
        q: typeof rawSearch.q === "string" ? rawSearch.q.trim() : undefined,
        sort:
            rawSearch.sort === "name" || rawSearch.sort === "status" || rawSearch.sort === "lastScanAt"
                ? rawSearch.sort
                : undefined,
        status:
            rawSearch.status === "ready" ||
            rawSearch.status === "scanning" ||
            rawSearch.status === "error"
                ? rawSearch.status
                : undefined,
    }
}

export const Route = createFileRoute("/repositories")({
    validateSearch: validateRepositoriesSearch,
    component: RepositoriesRouteComponent,
    errorComponent: RouteErrorFallback,
})
