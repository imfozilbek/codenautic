import { Suspense, lazy, type ReactElement } from "react"

import { RouteErrorFallback } from "@/app/error-fallback"
import { RouteSuspenseFallback } from "@/app/route-suspense-fallback"
import { DashboardLayout, SettingsLayout } from "@/components/layout"
import { AuthBoundary } from "@/lib/auth/auth-boundary"
import { createFileRoute } from "@tanstack/react-router"

const LazySettingsRulesLibraryPage = lazy(async (): Promise<{ default: () => ReactElement }> => {
    const pageModule = await import("@/pages/settings-rules-library.page")
    return {
        default: pageModule.SettingsRulesLibraryPage,
    }
})

function SettingsRulesLibraryRouteComponent(): ReactElement {
    return (
        <AuthBoundary loginPath="/login">
            {(context): ReactElement => (
                <DashboardLayout
                    onSignOut={context.onSignOut}
                    title="Settings · Rules Library"
                    userEmail={context.userEmail}
                    userName={context.userName}
                >
                    <SettingsLayout>
                        <Suspense fallback={<RouteSuspenseFallback />}>
                            <LazySettingsRulesLibraryPage />
                        </Suspense>
                    </SettingsLayout>
                </DashboardLayout>
            )}
        </AuthBoundary>
    )
}

export const Route = createFileRoute("/settings-rules-library")({
    component: SettingsRulesLibraryRouteComponent,
    errorComponent: RouteErrorFallback,
})
