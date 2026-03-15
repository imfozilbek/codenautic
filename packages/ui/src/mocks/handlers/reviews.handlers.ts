import { http, HttpResponse, delay } from "msw"

import type {
    ISubmitCodeReviewFeedbackRequest,
    ITriggerCodeReviewRequest,
} from "@/lib/api/endpoints/code-review.endpoint"

import { getMockStore } from "../store/create-mock-store"
import { api, generateId } from "./handler-utils"

/**
 * MSW handlers для code review: получение, запуск, обратная связь.
 *
 * Используют ReviewsCollection из mock store для хранения состояния.
 */
export const reviewsHandlers = [
    /**
     * GET /reviews/:reviewId — возвращает результат code review.
     */
    http.get(api("/reviews/:reviewId"), async ({ params }) => {
        await delay(80)
        const store = getMockStore()
        const reviewId = params["reviewId"] as string

        const review = store.reviews.getReviewById(reviewId)
        if (review === undefined) {
            return HttpResponse.json(
                { error: "Review not found", reviewId },
                { status: 404 },
            )
        }

        return HttpResponse.json(review)
    }),

    /**
     * POST /reviews — запускает новый code review.
     */
    http.post(api("/reviews"), async ({ request }) => {
        await delay(150)
        const body = (await request.json()) as ITriggerCodeReviewRequest

        const reviewId = generateId("rev")

        return HttpResponse.json(
            { reviewId, status: "queued" },
            { status: 201 },
        )
    }),

    /**
     * POST /reviews/:reviewId/feedback — отправляет обратную связь по review.
     */
    http.post(api("/reviews/:reviewId/feedback"), async ({ params, request }) => {
        await delay(100)
        const store = getMockStore()
        const reviewId = params["reviewId"] as string

        const body = (await request.json()) as ISubmitCodeReviewFeedbackRequest

        const acceptedCount = store.reviews.submitFeedback(
            reviewId,
            body.feedbacks,
        )

        if (acceptedCount === undefined) {
            return HttpResponse.json(
                { error: "Review not found", reviewId },
                { status: 404 },
            )
        }

        return HttpResponse.json({ reviewId, acceptedCount })
    }),
]
