import { Suspense, type ReactElement, lazy } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { RouteErrorFallback } from "@/app/error-fallback"
import { RouteSuspenseFallback } from "@/app/route-suspense-fallback"
import { DashboardLayout } from "@/components/layout"
import { AuthBoundary } from "@/lib/auth/auth-boundary"

const LazySessionRecoveryPage = lazy(async (): Promise<{ default: () => ReactElement }> => {
    const pageModule = await import("@/pages/session-recovery.page")
    return {
        default: pageModule.SessionRecoveryPage,
    }
})

function SessionRecoveryRouteComponent(): ReactElement {
    return (
        <AuthBoundary loginPath="/login">
            {(context): ReactElement => (
                <DashboardLayout
                    onSignOut={context.onSignOut}
                    title="Session recovery flow"
                    userEmail={context.userEmail}
                    userName={context.userName}
                >
                    <Suspense fallback={<RouteSuspenseFallback />}>
                        <LazySessionRecoveryPage />
                    </Suspense>
                </DashboardLayout>
            )}
        </AuthBoundary>
    )
}

export const Route = createFileRoute("/session-recovery")({
    component: SessionRecoveryRouteComponent,
    errorComponent: RouteErrorFallback,
})

