import { Suspense, type ReactElement, lazy } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { RouteErrorFallback } from "@/app/error-fallback"
import { RouteSuspenseFallback } from "@/app/route-suspense-fallback"
import { DashboardLayout } from "@/components/layout"
import { AuthBoundary } from "@/lib/auth/auth-boundary"

const LazyReportGeneratorPage = lazy(async (): Promise<{ default: () => ReactElement }> => {
    const pageModule = await import("@/pages/report-generator.page")
    return {
        default: pageModule.ReportGeneratorPage,
    }
})

function ReportsGenerateRouteComponent(): ReactElement {
    return (
        <AuthBoundary loginPath="/login">
            {(context): ReactElement => (
                <DashboardLayout
                    onSignOut={context.onSignOut}
                    title="Report Generator"
                    userEmail={context.userEmail}
                    userName={context.userName}
                >
                    <Suspense fallback={<RouteSuspenseFallback />}>
                        <LazyReportGeneratorPage />
                    </Suspense>
                </DashboardLayout>
            )}
        </AuthBoundary>
    )
}

export const Route = createFileRoute("/reports/generate")({
    component: ReportsGenerateRouteComponent,
    errorComponent: RouteErrorFallback,
})
