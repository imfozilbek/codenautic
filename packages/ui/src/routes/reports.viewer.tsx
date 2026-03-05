import { Suspense, type ReactElement, lazy } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { RouteErrorFallback } from "@/app/error-fallback"
import { RouteSuspenseFallback } from "@/app/route-suspense-fallback"
import { DashboardLayout } from "@/components/layout"
import { AuthBoundary } from "@/lib/auth/auth-boundary"

const LazyReportViewerPage = lazy(async (): Promise<{ default: () => ReactElement }> => {
    const pageModule = await import("@/pages/report-viewer.page")
    return {
        default: pageModule.ReportViewerPage,
    }
})

function ReportsViewerRouteComponent(): ReactElement {
    return (
        <AuthBoundary loginPath="/login">
            {(context): ReactElement => (
                <DashboardLayout
                    onSignOut={context.onSignOut}
                    title="Report Viewer"
                    userEmail={context.userEmail}
                    userName={context.userName}
                >
                    <Suspense fallback={<RouteSuspenseFallback />}>
                        <LazyReportViewerPage />
                    </Suspense>
                </DashboardLayout>
            )}
        </AuthBoundary>
    )
}

export const Route = createFileRoute("/reports/viewer")({
    component: ReportsViewerRouteComponent,
    errorComponent: RouteErrorFallback,
})
