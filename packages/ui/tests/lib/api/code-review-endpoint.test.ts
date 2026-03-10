import { describe, expect, it, vi } from "vitest"

import type { IHttpClient } from "@/lib/api"
import {
    CODE_REVIEW_FEEDBACK_TYPES,
    CodeReviewApi,
    type ICodeReview,
    type ICodeReviewFeedbackItem,
    type ISubmitCodeReviewFeedbackResponse,
    type ISubmitCodeReviewFeedbackRequest,
    type ITriggerCodeReviewRequest,
    type ITriggerCodeReviewResponse,
} from "@/lib/api/endpoints/code-review.endpoint"

/** Создаёт mock HTTP-клиента. */
function createHttpClientMock(): {
    readonly httpClient: IHttpClient
    readonly requestMock: ReturnType<typeof vi.fn>
} {
    const requestMock = vi.fn()
    return {
        httpClient: {
            request: requestMock,
        },
        requestMock,
    }
}

describe("CodeReviewApi", (): void => {
    it("получает codeReview по reviewId", async (): Promise<void> => {
        const review: ICodeReview = {
            reviewId: "review-101",
            repositoryId: "repo-1",
            mergeRequestId: "mr-101",
            status: "completed",
            issues: [
                {
                    id: "iss-1",
                    filePath: "src/index.ts",
                    lineStart: 12,
                    lineEnd: 14,
                    severity: "medium",
                    category: "security",
                    message: "Potential issue",
                    codeBlock: "throw new Error()",
                    rankScore: 83,
                },
            ],
            metrics: {
                duration: 2500,
            },
        }

        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(review)

        const api = new CodeReviewApi(httpClient)
        const result = await api.getCodeReview("review-101")

        expect(result).toEqual(review)
        expect(requestMock).toHaveBeenCalledWith({
            method: "GET",
            path: "/api/v1/reviews/review-101",
            credentials: "include",
        })
    })

    it("триггерит review и отправляет payload", async (): Promise<void> => {
        const response: ITriggerCodeReviewResponse = {
            reviewId: "review-102",
            status: "queued",
        }
        const payload: ITriggerCodeReviewRequest = {
            repositoryId: "repo-1",
            mergeRequestId: "mr-102",
            requestedBy: "user-1",
        }

        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new CodeReviewApi(httpClient)
        const result = await api.triggerCodeReview(payload)

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "POST",
            path: "/api/v1/reviews",
            body: payload,
            credentials: "include",
        })
    })

    it("отправляет feedback по review", async (): Promise<void> => {
        const response: ISubmitCodeReviewFeedbackResponse = {
            reviewId: "review-101",
            acceptedCount: 2,
        }
        const feedbackItem: ICodeReviewFeedbackItem = {
            issueId: "iss-1",
            reviewId: "review-101",
            type: CODE_REVIEW_FEEDBACK_TYPES.implemented,
            comment: "Fixed in next revision",
        }
        const payload: ISubmitCodeReviewFeedbackRequest = {
            reviewId: "review-101",
            feedbacks: [feedbackItem],
        }

        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new CodeReviewApi(httpClient)
        const result = await api.submitFeedback(payload)

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "POST",
            path: "/api/v1/reviews/review-101/feedback",
            body: payload,
            credentials: "include",
        })
    })

    it("when getCodeReview вызван с пустым reviewId, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new CodeReviewApi(httpClient)

        await expect(api.getCodeReview("")).rejects.toThrow("reviewId не должен быть пустым")
    })

    it("when getCodeReview вызван с id из пробелов, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new CodeReviewApi(httpClient)

        await expect(api.getCodeReview("   ")).rejects.toThrow("reviewId не должен быть пустым")
    })

    it("when triggerCodeReview вызван с пустым repositoryId, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new CodeReviewApi(httpClient)

        await expect(api.triggerCodeReview({ repositoryId: "" })).rejects.toThrow(
            "repositoryId не должен быть пустым",
        )
    })

    it("when triggerCodeReview вызван с repositoryId из пробелов, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new CodeReviewApi(httpClient)

        await expect(api.triggerCodeReview({ repositoryId: "   " })).rejects.toThrow(
            "repositoryId не должен быть пустым",
        )
    })

    it("when getCodeReview вызван с id содержащим спецсимволы, then encodeURIComponent применяется", async (): Promise<void> => {
        const review: ICodeReview = {
            reviewId: "rev/special",
            repositoryId: "repo-1",
            mergeRequestId: "mr-1",
            status: "completed",
            issues: [],
            metrics: null,
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(review)

        const api = new CodeReviewApi(httpClient)
        await api.getCodeReview("rev/special")

        expect(requestMock).toHaveBeenCalledWith({
            method: "GET",
            path: "/api/v1/reviews/rev%2Fspecial",
            credentials: "include",
        })
    })

    it("when triggerCodeReview с trim repositoryId, then нормализует id", async (): Promise<void> => {
        const response: ITriggerCodeReviewResponse = {
            reviewId: "review-200",
            status: "queued",
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new CodeReviewApi(httpClient)
        await api.triggerCodeReview({ repositoryId: "  repo-1  " })

        expect(requestMock).toHaveBeenCalledWith({
            method: "POST",
            path: "/api/v1/reviews",
            body: expect.objectContaining({ repositoryId: "repo-1" }) as Record<string, unknown>,
            credentials: "include",
        })
    })
})
