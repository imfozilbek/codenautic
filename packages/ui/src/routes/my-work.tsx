import { Suspense, lazy, type ReactElement } from "react"

import { RouteErrorFallback } from "@/app/error-fallback"
import { RouteSuspenseFallback } from "@/app/route-suspense-fallback"
import { DashboardLayout } from "@/components/layout"
import { AuthBoundary } from "@/lib/auth/auth-boundary"
import { createFileRoute } from "@tanstack/react-router"

const LazyMyWorkPage = lazy(async (): Promise<{ default: () => ReactElement }> => {
    const pageModule = await import("@/pages/my-work.page")
    return {
        default: pageModule.MyWorkPage,
    }
})

function MyWorkRouteComponent(): ReactElement {
    return (
        <AuthBoundary loginPath="/login">
            {(context): ReactElement => (
                <DashboardLayout
                    onSignOut={context.onSignOut}
                    title="My Work / Triage"
                    userEmail={context.userEmail}
                    userName={context.userName}
                >
                    <Suspense fallback={<RouteSuspenseFallback />}>
                        <LazyMyWorkPage />
                    </Suspense>
                </DashboardLayout>
            )}
        </AuthBoundary>
    )
}

export const Route = createFileRoute("/my-work")({
    component: MyWorkRouteComponent,
    errorComponent: RouteErrorFallback,
})
