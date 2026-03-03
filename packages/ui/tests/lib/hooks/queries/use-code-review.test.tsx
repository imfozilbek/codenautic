import { http, HttpResponse } from "msw"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState, type ReactElement } from "react"
import { describe, expect, it } from "vitest"

import { renderWithProviders } from "../../../utils/render"
import { server } from "../../../mocks/server"
import {
    useCodeReview,
    type IUseCodeReviewResult,
} from "@/lib/hooks/queries/use-code-review"

interface ICodeReviewProbeProps {
    readonly reviewId: string
}

function CodeReviewProbe(props: ICodeReviewProbeProps): ReactElement {
    const hook = useCodeReview({
        reviewId: props.reviewId,
    })
    const [triggerStatus, setTriggerStatus] = useState<string>("pending")
    const [feedbackStatus, setFeedbackStatus] = useState<string>("pending")

    return (
        <div>
            <ReviewQueryState {...hook} />
            <button
                data-testid="trigger-review"
                disabled={hook.triggerReview.isPending}
                onClick={(): void => {
                    void triggerReview(hook, setTriggerStatus)
                }}
                type="button"
            >
                Trigger review
            </button>
            <button
                data-testid="submit-feedback"
                disabled={hook.submitFeedback.isPending}
                onClick={(): void => {
                    void submitFeedback(hook, setFeedbackStatus)
                }}
                type="button"
            >
                Submit feedback
            </button>
            <p data-testid="trigger-result">{triggerStatus}</p>
            <p data-testid="feedback-result">{feedbackStatus}</p>
        </div>
    )
}

function ReviewQueryState(hook: IUseCodeReviewResult): ReactElement {
    if (hook.codeReviewQuery.isPending) {
        return <p data-testid="review-state">pending</p>
    }

    if (hook.codeReviewQuery.error !== null) {
        return <p data-testid="review-state">error</p>
    }

    return (
        <div>
            <p data-testid="review-id">{hook.codeReviewQuery.data?.reviewId}</p>
            <p data-testid="review-status">{hook.codeReviewQuery.data?.status}</p>
            <p data-testid="review-issues-count">
                {hook.codeReviewQuery.data?.issues.length ?? 0}
            </p>
        </div>
    )
}

async function triggerReview(
    hook: IUseCodeReviewResult,
    setTriggerStatus: (next: string) => void,
): Promise<void> {
    setTriggerStatus("loading")
    const result = await hook.triggerReview.mutateAsync({
        repositoryId: "repo-1",
        mergeRequestId: "mr-1",
    })
    setTriggerStatus(`${result.reviewId}:${result.status}`)
}

async function submitFeedback(
    hook: IUseCodeReviewResult,
    setFeedbackStatus: (next: string) => void,
): Promise<void> {
    setFeedbackStatus("loading")
    const result = await hook.submitFeedback.mutateAsync({
        reviewId: "review-101",
        feedbacks: [
            {
                issueId: "issue-1",
                reviewId: "review-101",
                type: "HELPFUL",
                comment: "Useful hint",
            },
        ],
    })
    setFeedbackStatus(`accepted:${result.acceptedCount}`)
}

describe("useCodeReview", (): void => {
    it("загружает code review по ID", async (): Promise<void> => {
        let callCount = 0
        server.use(
            http.get("http://localhost:3000/api/v1/reviews/:reviewId", ({ params }) => {
                callCount += 1
                return HttpResponse.json({
                    reviewId: String(params.reviewId),
                    repositoryId: "repo-1",
                    mergeRequestId: "mr-101",
                    status: "completed",
                    issues: [
                        {
                            id: "issue-1",
                            filePath: "src/index.ts",
                            lineStart: 12,
                            lineEnd: 12,
                            severity: "medium",
                            category: "security",
                            message: "Possible issue",
                            codeBlock: "console.log()",
                            rankScore: 72,
                        },
                    ],
                    metrics: {
                        duration: 1200,
                    },
                })
            }),
        )

        renderWithProviders(<CodeReviewProbe reviewId="review-101" />)

        const reviewId = await screen.findByTestId("review-id")
        expect(reviewId.textContent).toBe("review-101")
        expect(screen.getByTestId("review-status").textContent).toBe("completed")
        expect(screen.getByTestId("review-issues-count").textContent).toBe("1")
        expect(callCount).toBe(1)
    })

    it("триггерит новый review и показывает результат", async (): Promise<void> => {
        server.use(
            http.post("http://localhost:3000/api/v1/reviews", () => {
                return HttpResponse.json({
                    reviewId: "review-202",
                    status: "queued",
                })
            }),
        )

        renderWithProviders(<CodeReviewProbe reviewId="review-101" />)
        const triggerResult = screen.getByTestId("trigger-result")
        expect(triggerResult.textContent).toBe("pending")

        await userEvent.click(screen.getByTestId("trigger-review"))
        const completedResult = await screen.findByText("review-202:queued")
        expect(completedResult).toBeTruthy()
    })

    it("отправляет feedback и показывает acceptedCount", async (): Promise<void> => {
        server.use(
            http.post("http://localhost:3000/api/v1/reviews/:reviewId/feedback", () => {
                return HttpResponse.json({
                    reviewId: "review-101",
                    acceptedCount: 1,
                })
            }),
        )

        renderWithProviders(<CodeReviewProbe reviewId="review-101" />)
        const feedbackResult = screen.getByTestId("feedback-result")
        expect(feedbackResult.textContent).toBe("pending")

        await userEvent.click(screen.getByTestId("submit-feedback"))
        const completedFeedback = await screen.findByText("accepted:1")
        expect(completedFeedback).toBeTruthy()
    })
})
