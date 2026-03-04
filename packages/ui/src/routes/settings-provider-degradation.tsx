import { Suspense, lazy, type ReactElement } from "react"

import { RouteErrorFallback } from "@/app/error-fallback"
import { RouteSuspenseFallback } from "@/app/route-suspense-fallback"
import { DashboardLayout, SettingsLayout } from "@/components/layout"
import { AuthBoundary } from "@/lib/auth/auth-boundary"
import { createFileRoute } from "@tanstack/react-router"

const LazySettingsProviderDegradationPage = lazy(
    async (): Promise<{ default: () => ReactElement }> => {
        const pageModule = await import("@/pages/settings-provider-degradation.page")
        return {
            default: pageModule.SettingsProviderDegradationPage,
        }
    },
)

function SettingsProviderDegradationRouteComponent(): ReactElement {
    return (
        <AuthBoundary loginPath="/login">
            {(context): ReactElement => (
                <DashboardLayout
                    onSignOut={context.onSignOut}
                    title="Settings · Provider degradation"
                    userEmail={context.userEmail}
                    userName={context.userName}
                >
                    <SettingsLayout>
                        <Suspense fallback={<RouteSuspenseFallback />}>
                            <LazySettingsProviderDegradationPage />
                        </Suspense>
                    </SettingsLayout>
                </DashboardLayout>
            )}
        </AuthBoundary>
    )
}

export const Route = createFileRoute("/settings-provider-degradation")({
    component: SettingsProviderDegradationRouteComponent,
    errorComponent: RouteErrorFallback,
})
