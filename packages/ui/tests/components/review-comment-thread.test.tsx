import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ReviewCommentThread } from "@/components/reviews/review-comment-thread"
import type { IReviewCommentThread } from "@/lib/types/ccr-types"
import { renderWithProviders } from "../utils/render"

function createThread(
    id: string,
    message: string,
    author: string = "Reviewer",
): IReviewCommentThread {
    return {
        author,
        createdAt: "2026-03-06 12:00",
        id,
        isResolved: false,
        message,
        replies: [],
    }
}

describe("ReviewCommentThread", (): void => {
    it("синхронизирует локальный state при обновлении threads через props", (): void => {
        const initialThreads: ReadonlyArray<IReviewCommentThread> = [
            createThread("thread-1", "Old comment"),
        ]
        const nextThreads: ReadonlyArray<IReviewCommentThread> = [
            createThread("thread-2", "Updated comment"),
        ]

        const rendered = renderWithProviders(<ReviewCommentThread threads={initialThreads} />)

        expect(screen.getByText("Old comment")).not.toBeNull()

        rendered.rerender(<ReviewCommentThread threads={nextThreads} />)

        expect(screen.getByText("Updated comment")).not.toBeNull()
        expect(screen.queryByText("Old comment")).toBeNull()
    })
})
