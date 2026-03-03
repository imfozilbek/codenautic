import { screen } from "@testing-library/react"
import userEvent, { type UserEvent } from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { GitProviderCard } from "@/components/settings/git-provider-card"
import { renderWithProviders } from "../../utils/render"

describe("git provider card", (): void => {
    it("показывает disconnected state и действие connect", (): void => {
        renderWithProviders(
            <GitProviderCard
                account="dev@example.com"
                connected={false}
                onAction={vi.fn()}
                provider="GitHub"
            />,
        )

        expect(screen.queryByText("Disconnected")).not.toBeNull()
        expect(screen.queryByText("Connect")).not.toBeNull()
        expect(screen.queryByText("Connected as dev@example.com")).toBeNull()
    })

    it("показывает loading состояние во время action", async (): Promise<void> => {
        const user: UserEvent = userEvent.setup()
        const onAction = vi.fn()

        renderWithProviders(
            <GitProviderCard
                connected={true}
                isLoading={true}
                onAction={onAction}
                provider="GitHub"
            />,
        )

        const actionButton = screen.getByRole("button", { name: "Disconnect" })
        await user.click(actionButton)
        expect(actionButton.getAttribute("aria-busy")).toBe("true")
        expect(onAction).not.toHaveBeenCalled()
    })
})
