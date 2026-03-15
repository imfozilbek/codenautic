import { http, HttpResponse, delay } from "msw"

import type {
    ICcrWorkspaceContextResponse,
    TCcrWorkspaceStatus,
} from "@/lib/api/endpoints/ccr-workspace.endpoint"

import type { ICcrListFilters } from "../store/collections/reviews-collection"
import { getMockStore } from "../store/create-mock-store"
import { api, extractPaginationParams, paginate } from "./handler-utils"

/**
 * MSW handlers для CCR workspace: список CCR и детальный review context.
 *
 * Используют ReviewsCollection из mock store для хранения состояния.
 */
export const workspaceHandlers = [
    /**
     * GET /reviews/workspace — список CCR с пагинацией и фильтрами.
     *
     * Query-параметры: q, status, team, repo, page, limit.
     */
    http.get(api("/reviews/workspace"), async ({ request }) => {
        await delay(100)
        const store = getMockStore()
        const url = new URL(request.url)

        const filters: ICcrListFilters = {}
        const status = url.searchParams.get("status")
        const team = url.searchParams.get("team")
        const repo = url.searchParams.get("repo")
        const q = url.searchParams.get("q")

        const appliedFilters: ICcrListFilters = {
            ...filters,
            ...(status !== null ? { status: status as TCcrWorkspaceStatus } : {}),
            ...(team !== null ? { team } : {}),
            ...(repo !== null ? { repository: repo } : {}),
            ...(q !== null ? { q } : {}),
        }

        const allCcrs = store.reviews.listCcrs(appliedFilters)
        const { page, limit } = extractPaginationParams(request)
        const paginated = paginate(allCcrs, page, limit)

        return HttpResponse.json({
            ccrs: paginated.items,
            total: paginated.total,
            page: paginated.page,
            limit: paginated.limit,
            totalPages: paginated.totalPages,
        })
    }),

    /**
     * GET /reviews/:reviewId/workspace — детальный review context.
     *
     * Возвращает CCR, диффы и треды комментариев по review ID.
     */
    http.get(api("/reviews/:reviewId/workspace"), async ({ params }) => {
        await delay(120)
        const store = getMockStore()
        const reviewId = params["reviewId"] as string

        const review = store.reviews.getReviewById(reviewId)
        if (review === undefined) {
            return HttpResponse.json(
                { error: "Review not found", reviewId },
                { status: 404 },
            )
        }

        const ccrId = review.mergeRequestId
        const ccr = store.reviews.getCcrById(ccrId)
        if (ccr === undefined) {
            return HttpResponse.json(
                { error: "CCR not found", ccrId },
                { status: 404 },
            )
        }

        const diffFiles = store.reviews.getDiffsByCcrId(ccrId)
        const threads = store.reviews.getThreadsByCcrId(ccrId)

        const response: ICcrWorkspaceContextResponse = {
            reviewId,
            ccr,
            diffFiles,
            threads,
        }

        return HttpResponse.json(response)
    }),
]
