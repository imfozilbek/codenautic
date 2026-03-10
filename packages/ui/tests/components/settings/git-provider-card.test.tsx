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
        expect(actionButton.matches(":disabled")).toBe(true)
        expect(onAction).not.toHaveBeenCalled()
    })

    it("when connected with account, then shows connected as account", (): void => {
        renderWithProviders(
            <GitProviderCard
                account="dev@example.com"
                connected={true}
                onAction={vi.fn()}
                provider="GitHub"
            />,
        )

        expect(screen.getByText("Connected as dev@example.com")).toBeDefined()
        expect(screen.getByText("Connected")).toBeDefined()
    })

    it("when connected without account, then shows 'Connected as Unknown'", (): void => {
        renderWithProviders(
            <GitProviderCard connected={true} onAction={vi.fn()} provider="GitLab" />,
        )

        expect(screen.getByText("Connected as Unknown")).toBeDefined()
    })

    it("when lastSyncAt provided, then renders last sync time", (): void => {
        renderWithProviders(
            <GitProviderCard
                connected={true}
                lastSyncAt="2026-03-10T08:00:00Z"
                onAction={vi.fn()}
                provider="GitHub"
            />,
        )

        expect(screen.getByText("Last sync: 2026-03-10T08:00:00Z")).toBeDefined()
    })

    it("when lastSyncAt not provided, then does not render sync time", (): void => {
        renderWithProviders(
            <GitProviderCard connected={true} onAction={vi.fn()} provider="GitHub" />,
        )

        expect(screen.queryByText(/Last sync/)).toBeNull()
    })

    it("when onAction is undefined, then button is disabled", (): void => {
        renderWithProviders(<GitProviderCard connected={false} provider="Azure DevOps" />)

        const button = screen.getByRole("button", { name: "Connect" })
        expect(button.matches(":disabled")).toBe(true)
    })

    it("when clicking connect on disconnected provider, then calls onAction", async (): Promise<void> => {
        const user = userEvent.setup()
        const onAction = vi.fn()

        renderWithProviders(
            <GitProviderCard connected={false} onAction={onAction} provider="GitHub" />,
        )

        await user.click(screen.getByRole("button", { name: "Connect" }))

        expect(onAction).toHaveBeenCalledOnce()
    })
})
