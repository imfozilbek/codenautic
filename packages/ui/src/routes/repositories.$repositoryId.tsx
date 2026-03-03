import type { ReactElement } from "react"
import { Suspense, lazy } from "react"

import { RouteSuspenseFallback } from "@/app/route-suspense-fallback"
import { AuthBoundary } from "@/lib/auth/auth-boundary"
import { DashboardLayout } from "@/components/layout"
import { createFileRoute } from "@tanstack/react-router"

const LazyRepositoryOverviewPage = lazy(
    async (): Promise<{
        default: (props: { repositoryId: string }) => ReactElement
    }> => {
        const pageModule = await import("@/pages/repository-overview.page")
        return {
            default: (props): ReactElement => (
                <pageModule.RepositoryOverviewPage repositoryId={props.repositoryId} />
            ),
        }
    },
)

/**
 * Маршрут отчёта по скану конкретного репозитория.
 *
 * @returns Экран dashboard с метриками, стеком и health score.
 */
function RepositoryOverviewRouteComponent(): ReactElement {
    const params = Route.useParams()

    return (
        <AuthBoundary loginPath="/login">
            {(context): ReactElement => (
                <DashboardLayout
                    onSignOut={context.onSignOut}
                    title="Repository overview"
                    userEmail={context.userEmail}
                    userName={context.userName}
                >
                    <Suspense fallback={<RouteSuspenseFallback />}>
                        <LazyRepositoryOverviewPage repositoryId={params.repositoryId} />
                    </Suspense>
                </DashboardLayout>
            )}
        </AuthBoundary>
    )
}

export const Route = createFileRoute("/repositories/$repositoryId")({
    component: RepositoryOverviewRouteComponent,
})
