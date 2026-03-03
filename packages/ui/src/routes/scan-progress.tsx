import { Suspense, type ReactElement, lazy } from "react"

import { RouteSuspenseFallback } from "@/app/route-suspense-fallback"
import { RouteErrorFallback } from "@/app/error-fallback"
import { AuthBoundary } from "@/lib/auth/auth-boundary"
import { DashboardLayout } from "@/components/layout"
import { createFileRoute } from "@tanstack/react-router"

const LazyScanProgressPage = lazy(
    async (): Promise<{
        default: (props: unknown) => ReactElement
    }> => {
        const pageModule = await import("@/pages/scan-progress.page")
        return {
            default: pageModule.ScanProgressPage,
        }
    },
)

interface IScanProgressSearch {
    /** Optional scan job id from query, used to open stream url. */
    readonly jobId?: string
}

/**
 * Маршрут страницы прогресса сканирования.
 *
 * @returns Экран с мониторингом по этапам.
 */
function ScanProgressRouteComponent(): ReactElement {
    const search = Route.useSearch()
    const routeJobId = search.jobId
    const pageProps = routeJobId === undefined || routeJobId.length === 0 ? {} : { jobId: routeJobId }

    return (
        <AuthBoundary loginPath="/login">
            {(context): ReactElement => (
                <DashboardLayout
                    onSignOut={context.onSignOut}
                    title="Scan Progress"
                    userEmail={context.userEmail}
                    userName={context.userName}
                >
                    <Suspense fallback={<RouteSuspenseFallback />}>
                        <LazyScanProgressPage {...pageProps} eventSourceUrl="/api/v1/scans/progress" />
                    </Suspense>
                </DashboardLayout>
            )}
        </AuthBoundary>
    )
}

export function validateScanProgressSearch(rawSearch: Record<string, unknown>): IScanProgressSearch {
    if (typeof rawSearch.jobId === "string" && rawSearch.jobId.trim().length > 0) {
        return {
            jobId: rawSearch.jobId.trim(),
        }
    }

    return {}
}

export const Route = createFileRoute("/scan-progress")({
    validateSearch: validateScanProgressSearch,
    component: ScanProgressRouteComponent,
    errorComponent: RouteErrorFallback,
})
