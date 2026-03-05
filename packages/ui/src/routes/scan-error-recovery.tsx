import { Suspense, type ReactElement, lazy } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { RouteErrorFallback } from "@/app/error-fallback"
import { RouteSuspenseFallback } from "@/app/route-suspense-fallback"
import { DashboardLayout } from "@/components/layout"
import { AuthBoundary } from "@/lib/auth/auth-boundary"

const LazyScanErrorRecoveryPage = lazy(async (): Promise<{ default: () => ReactElement }> => {
    const pageModule = await import("@/pages/scan-error-recovery.page")
    return {
        default: pageModule.ScanErrorRecoveryPage,
    }
})

function ScanErrorRecoveryRouteComponent(): ReactElement {
    return (
        <AuthBoundary loginPath="/login">
            {(context): ReactElement => (
                <DashboardLayout
                    onSignOut={context.onSignOut}
                    title="Scan error recovery"
                    userEmail={context.userEmail}
                    userName={context.userName}
                >
                    <Suspense fallback={<RouteSuspenseFallback />}>
                        <LazyScanErrorRecoveryPage />
                    </Suspense>
                </DashboardLayout>
            )}
        </AuthBoundary>
    )
}

export const Route = createFileRoute("/scan-error-recovery")({
    component: ScanErrorRecoveryRouteComponent,
    errorComponent: RouteErrorFallback,
})

