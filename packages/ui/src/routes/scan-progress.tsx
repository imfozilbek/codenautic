import { Suspense, type ReactElement, lazy } from "react"

import { RouteSuspenseFallback } from "@/app/route-suspense-fallback"
import { RouteErrorFallback } from "@/app/error-fallback"
import { AuthBoundary } from "@/lib/auth/auth-boundary"
import { DashboardLayout } from "@/components/layout"
import { createFileRoute, useNavigate } from "@tanstack/react-router"

interface IScanProgressPageModuleProps {
    readonly jobId?: string
    readonly eventSourceUrl?: string
    readonly repositoryId?: string
    readonly onRetry?: () => void
    readonly onCancel?: () => void
    readonly onOpenRepositoryOverview?: () => void
}

const LazyScanProgressPage = lazy(
    async (): Promise<{
        default: (props: IScanProgressPageModuleProps) => ReactElement
    }> => {
        const pageModule = await import("@/pages/scan-progress.page")
        return {
            default: (props: IScanProgressPageModuleProps): ReactElement => (
                <pageModule.ScanProgressPage {...props} />
            ),
        }
    },
)

interface IScanProgressSearch {
    /** Optional scan job id from query, used to open stream url. */
    readonly jobId?: string
    /** Optional repository id to open overview when scan is done. */
    readonly repositoryId?: string
    /** Optional source marker for onboarding flow. */
    readonly source?: "onboarding"
}

/**
 * Маршрут страницы прогресса сканирования.
 *
 * @returns Экран с мониторингом по этапам.
 */
function ScanProgressRouteComponent(): ReactElement {
    const search = Route.useSearch()
    const navigate = useNavigate()
    const routeJobId = search.jobId
    const routeRepositoryId = search.repositoryId
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
                        <LazyScanProgressPage
                            {...pageProps}
                            eventSourceUrl="/api/v1/scans/progress"
                            repositoryId={routeRepositoryId}
                            onCancel={(): void => {
                                void navigate({ to: "/repositories" })
                            }}
                            onOpenRepositoryOverview={(): void => {
                                if (
                                    typeof routeRepositoryId === "string"
                                    && routeRepositoryId.trim().length > 0
                                ) {
                                    void navigate({
                                        to: "/repositories/$repositoryId",
                                        params: {
                                            repositoryId: routeRepositoryId,
                                        },
                                    })
                                    return
                                }

                                void navigate({ to: "/repositories" })
                            }}
                            onRetry={(): void => {
                                void navigate({ to: "/onboarding" })
                            }}
                        />
                    </Suspense>
                </DashboardLayout>
            )}
        </AuthBoundary>
    )
}

export function validateScanProgressSearch(rawSearch: Record<string, unknown>): IScanProgressSearch {
    const jobId = typeof rawSearch.jobId === "string" && rawSearch.jobId.trim().length > 0
        ? rawSearch.jobId.trim()
        : undefined
    const repositoryId = typeof rawSearch.repositoryId === "string" && rawSearch.repositoryId.trim().length > 0
        ? rawSearch.repositoryId.trim()
        : undefined
    const source = rawSearch.source === "onboarding" ? "onboarding" : undefined

    return {
        jobId,
        repositoryId,
        source,
    }
}

export const Route = createFileRoute("/scan-progress")({
    validateSearch: validateScanProgressSearch,
    component: ScanProgressRouteComponent,
    errorComponent: RouteErrorFallback,
})
