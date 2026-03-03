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
})
