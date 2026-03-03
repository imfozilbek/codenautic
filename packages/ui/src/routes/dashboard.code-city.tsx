import { Suspense, type ReactElement, lazy } from "react"

import { RouteErrorFallback } from "@/app/error-fallback"
import { RouteSuspenseFallback } from "@/app/route-suspense-fallback"
import { AuthBoundary } from "@/lib/auth/auth-boundary"
import { DashboardLayout } from "@/components/layout"
import { createFileRoute } from "@tanstack/react-router"

const LazyCodeCityDashboardPage = lazy(
    async (): Promise<{
        default: (props: unknown) => ReactElement
    }> => {
        const pageModule = await import("@/pages/code-city-dashboard.page")

        return {
            default: pageModule.CodeCityDashboardPage,
        }
    },
)

/**
 * Маршрут CodeCity dashboard.
 *
 * @returns Экран с выбором репозитория и метрик.
 */
function CodeCityDashboardRouteComponent(): ReactElement {
    return (
        <AuthBoundary loginPath="/login">
            {(context): ReactElement => (
                <DashboardLayout
                    onSignOut={context.onSignOut}
                    title="CodeCity"
                    userEmail={context.userEmail}
                    userName={context.userName}
                >
                    <Suspense fallback={<RouteSuspenseFallback />}>
                        <LazyCodeCityDashboardPage />
                    </Suspense>
                </DashboardLayout>
            )}
        </AuthBoundary>
    )
}

export const Route = createFileRoute("/dashboard/code-city")({
    component: CodeCityDashboardRouteComponent,
    errorComponent: RouteErrorFallback,
})
