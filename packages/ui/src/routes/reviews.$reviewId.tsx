import type { ReactElement } from "react"
import { Suspense, lazy } from "react"

import { Link, createFileRoute } from "@tanstack/react-router"

import { RouteSuspenseFallback } from "@/app/route-suspense-fallback"
import { AuthBoundary } from "@/lib/auth/auth-boundary"
import { DashboardLayout } from "@/components/layout"
import type {
    ICcrWorkspaceContextResponse,
    ICcrWorkspaceRow,
} from "@/lib/api/endpoints/ccr-workspace.endpoint"
import { LINK_CLASSES } from "@/lib/constants/typography"
import { useCcrWorkspace } from "@/lib/hooks/queries"
import { getCcrById, type ICcrRowData } from "@/pages/ccr-data"

const LazyCcrReviewDetailPage = lazy(
    async (): Promise<{
        default: (props: {
            ccr: ICcrRowData
            workspaceContext?: ICcrWorkspaceContextResponse
        }) => ReactElement
    }> => {
        const pageModule = await import("@/pages/ccr-review-detail/ccr-review-detail.page")

        return {
            default: (props): ReactElement => (
                <pageModule.CcrReviewDetailPage
                    ccr={props.ccr}
                    workspaceContext={props.workspaceContext}
                />
            ),
        }
    },
)

function mapWorkspaceRowToCcrRow(row: ICcrWorkspaceRow): ICcrRowData {
    return {
        assignee: row.assignee,
        attachedFiles: row.attachedFiles,
        comments: row.comments,
        id: row.id,
        repository: row.repository,
        severity: row.severity,
        status: row.status,
        team: row.team,
        title: row.title,
        updatedAt: row.updatedAt,
    }
}

function createFallbackCcrRow(reviewId: string): ICcrRowData {
    return {
        assignee: "Unassigned",
        attachedFiles: [],
        comments: 0,
        id: reviewId,
        repository: "unknown/repository",
        severity: "medium",
        status: "queued",
        team: "Unknown",
        title: `CCR ${reviewId}`,
        updatedAt: new Date().toISOString(),
    }
}

function ReviewRouteFallback(): ReactElement {
    return (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4">
            <p className="text-sm font-semibold text-danger-foreground">CCR not found</p>
            <p className="mt-1 text-sm text-danger">
                Review not found. Open available CCR list to pick active review.
            </p>
            <Link className={`${LINK_CLASSES} mt-3 inline-block text-sm`} to="/reviews">
                Back to reviews
            </Link>
        </div>
    )
}

function ReviewsDetailRouteComponent(): ReactElement {
    const params = Route.useParams()
    const ccrWorkspace = useCcrWorkspace({
        reviewId: params.reviewId,
    })
    const seedCcr = getCcrById(params.reviewId)
    const apiCcr = ccrWorkspace.ccrContextQuery.data?.ccr
    const ccr =
        apiCcr !== undefined
            ? mapWorkspaceRowToCcrRow(apiCcr)
            : (seedCcr ?? createFallbackCcrRow(params.reviewId))

    if (params.reviewId.trim().length === 0) {
        return (
            <AuthBoundary loginPath="/login">
                {(context): ReactElement => (
                    <DashboardLayout
                        onSignOut={context.onSignOut}
                        title="CCR Review"
                        userEmail={context.userEmail}
                        userName={context.userName}
                    >
                        <ReviewRouteFallback />
                    </DashboardLayout>
                )}
            </AuthBoundary>
        )
    }

    return (
        <AuthBoundary loginPath="/login">
            {(context): ReactElement => (
                <DashboardLayout
                    onSignOut={context.onSignOut}
                    title={`CCR Review · ${ccr.id}`}
                    userEmail={context.userEmail}
                    userName={context.userName}
                >
                    <Suspense fallback={<RouteSuspenseFallback />}>
                        <LazyCcrReviewDetailPage
                            ccr={ccr}
                            workspaceContext={ccrWorkspace.ccrContextQuery.data}
                        />
                    </Suspense>
                </DashboardLayout>
            )}
        </AuthBoundary>
    )
}

export const Route = createFileRoute("/reviews/$reviewId")({
    component: ReviewsDetailRouteComponent,
})
