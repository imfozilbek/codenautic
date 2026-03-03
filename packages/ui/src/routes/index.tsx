import type {ReactElement} from "react"
import {Suspense, lazy} from "react"
import {createFileRoute} from "@tanstack/react-router"

import {RouteErrorFallback} from "@/app/error-fallback"
import {RouteSuspenseFallback} from "@/app/route-suspense-fallback"
import {DashboardLayout} from "@/components/layout"
import {AuthBoundary} from "@/lib/auth/auth-boundary"

const LazySystemHealthPage = lazy(async (): Promise<{default: () => ReactElement}> => {
    const pageModule = await import("@/pages/dashboard-mission-control.page")
    return {
        default: pageModule.DashboardMissionControlPage,
    }
})

/**
 * Route-level boundary для lazy-загрузки главного экрана.
 *
 * @returns Suspense boundary + lazy route component.
 */
function IndexRouteComponent(): ReactElement {
    return (
        <AuthBoundary loginPath="/login">
            {(context): ReactElement => (
                <DashboardLayout
                    onSignOut={context.onSignOut}
                    title="Dashboard"
                    userEmail={context.userEmail}
                    userName={context.userName}
                >
                    <Suspense fallback={<RouteSuspenseFallback />}>
                        <LazySystemHealthPage />
                    </Suspense>
                </DashboardLayout>
            )}
        </AuthBoundary>
    )
}

/**
 * Главный route dashboard-уровня.
 */
export const Route = createFileRoute("/")({
    component: IndexRouteComponent,
    errorComponent: RouteErrorFallback,
})
