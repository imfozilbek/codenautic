import type { ReactElement } from "react"
import { Suspense, lazy } from "react"

import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { RouteSuspenseFallback } from "@/app/route-suspense-fallback"
import { AuthBoundary } from "@/lib/auth/auth-boundary"
import { DashboardLayout } from "@/components/layout"
import { type ICcrFilters } from "@/pages/ccr-management.page"
import {
    buildSearchFromRoute,
    persistReviewsFilters,
    sanitizeForRouter,
} from "./reviews"

const LazyCcrManagementPage = lazy(
    async (): Promise<{
        default: (
            props: ICcrFilters & {
                onFilterChange: (next: ICcrFilters) => void
            },
        ) => ReactElement
    }> => {
        const pageModule = await import("@/pages/ccr-management.page")

        return {
            default: (props): ReactElement => (
                <pageModule.CcrManagementPage
                    onFilterChange={props.onFilterChange}
                    repository={props.repository}
                    search={props.search}
                    status={props.status}
                    team={props.team}
                />
            ),
        }
    },
)

/**
 * Index route для /reviews — список CCR management.
 *
 * @returns Страница списка CCR.
 */
function ReviewsIndexComponent(): ReactElement {
    const currentSearch = Route.useSearch()
    const navigate = useNavigate()

    const initialFilters = buildSearchFromRoute(currentSearch)

    return (
        <AuthBoundary loginPath="/login">
            {(context): ReactElement => (
                <DashboardLayout
                    onSignOut={context.onSignOut}
                    title="CCR Management"
                    userEmail={context.userEmail}
                    userName={context.userName}
                >
                    <Suspense fallback={<RouteSuspenseFallback />}>
                        <LazyCcrManagementPage
                            {...initialFilters}
                            onFilterChange={(next): void => {
                                persistReviewsFilters(next)
                                void navigate({
                                    to: "/reviews",
                                    search: sanitizeForRouter(next),
                                    replace: true,
                                })
                            }}
                        />
                    </Suspense>
                </DashboardLayout>
            )}
        </AuthBoundary>
    )
}

export const Route = createFileRoute("/reviews/")({
    component: ReviewsIndexComponent,
})
