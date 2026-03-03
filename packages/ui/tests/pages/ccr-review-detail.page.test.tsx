import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { CcrReviewDetailPage } from "@/pages/ccr-review-detail.page"
import { MOCK_CCR_ROWS } from "@/pages/ccr-data"
import { renderWithProviders } from "../utils/render"

describe("ccr review detail page", (): void => {
    it("рендерит карточку CCR и заголовок чата", (): void => {
        const ccr = MOCK_CCR_ROWS[0]

        renderWithProviders(<CcrReviewDetailPage ccr={ccr} />)

        expect(screen.getByText(ccr.title)).not.toBeNull()
        expect(screen.getByRole("heading", { name: `Conversation · ${ccr.id}` })).not.toBeNull()
    })

    it("добавляет сообщение в чат по quick action", async (): Promise<void> => {
        const user = userEvent.setup()
        const ccr = MOCK_CCR_ROWS[1]

        renderWithProviders(<CcrReviewDetailPage ccr={ccr} />)

        const explainButton = screen.getByRole("button", { name: "explain this file" })
        await user.click(explainButton)

        expect(screen.getByText(/Please explain the current diff/)).not.toBeNull()
        expect(screen.getByText("You")).not.toBeNull()
    })

    it("рендерит code diff с inline комментариями", (): void => {
        const ccr = MOCK_CCR_ROWS[0]

        renderWithProviders(<CcrReviewDetailPage ccr={ccr} />)

        expect(screen.getByRole("heading", { name: "Code diff" })).not.toBeNull()
        expect(screen.getByText("src/auth/middleware.ts")).not.toBeNull()
        expect(screen.getByText(/Need consistent error message with existing auth errors/)).not.toBeNull()
    })

    it("поддерживает вложенный review thread с reply/resolve/feedback", async (): Promise<void> => {
        const user = userEvent.setup()
        const ccr = MOCK_CCR_ROWS[0]

        renderWithProviders(<CcrReviewDetailPage ccr={ccr} />)

        expect(screen.getByText("Ari")).not.toBeNull()
        expect(screen.getByText("Nika")).not.toBeNull()
        expect(screen.getByText("Oleg")).not.toBeNull()

        const likeButton = screen.getByRole("button", { name: /Like comment from Oleg/ })
        await user.click(likeButton)
        expect(screen.getByRole("button", { name: "👍 Liked" })).not.toBeNull()

        const resolveButtons = screen.getAllByRole("button", { name: "Resolve" })
        await user.click(resolveButtons[0])
        expect(screen.getAllByText("Resolved").length).toBeGreaterThan(0)

        const replyButton = screen.getByRole("button", { name: "Reply to Ari" })
        await user.click(replyButton)

        const replyTextarea = screen.getByLabelText("Reply textarea for Ari")
        await user.type(replyTextarea, "Looks good, let's handle in next refactor.")
        const addReplyButton = screen.getByRole("button", { name: "Add reply" })
        await user.click(addReplyButton)

        expect(screen.getByText("Looks good, let's handle in next refactor.")).not.toBeNull()
    })
})
