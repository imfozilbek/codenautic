import { Suspense, lazy, type ReactElement } from "react"
import { AuthBoundary } from "@/lib/auth/auth-boundary"
import { DashboardLayout } from "@/components/layout"
import { RouteSuspenseFallback } from "@/app/route-suspense-fallback"
import { RouteErrorFallback } from "@/app/error-fallback"
import { createFileRoute } from "@tanstack/react-router"

const LazyOnboardingWizardPage = lazy(async (): Promise<{ default: () => ReactElement }> => {
    const pageModule = await import("@/pages/onboarding-wizard.page")
    return {
        default: pageModule.OnboardingWizardPage,
    }
})

/**
 * Маршрут мастера онбординга репозитория.
 *
 * @returns Рендер с защищенным доступом и dashboard layout.
 */
function OnboardingRouteComponent(): ReactElement {
    return (
        <AuthBoundary loginPath="/login">
            {(context): ReactElement => (
                <DashboardLayout
                    onSignOut={context.onSignOut}
                    title="Onboarding"
                    userEmail={context.userEmail}
                    userName={context.userName}
                >
                    <Suspense fallback={<RouteSuspenseFallback />}>
                        <LazyOnboardingWizardPage />
                    </Suspense>
                </DashboardLayout>
            )}
        </AuthBoundary>
    )
}

export const Route = createFileRoute("/onboarding")({
    component: OnboardingRouteComponent,
    errorComponent: RouteErrorFallback,
})

