import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { TestConnectionButton } from "@/components/settings/test-connection-button"
import { renderWithProviders } from "../../utils/render"

describe("TestConnectionButton", (): void => {
    it("when rendered in idle state, then shows 'Test <provider> connection' label", (): void => {
        renderWithProviders(<TestConnectionButton onTest={vi.fn()} providerLabel="GitHub" />)

        expect(screen.getByRole("button", { name: "Test GitHub connection" })).not.toBeNull()
    })

    it("when onTest resolves to true, then shows '<provider> connected' label", async (): Promise<void> => {
        const user = userEvent.setup()
        const onTest = vi.fn().mockResolvedValue(true)

        renderWithProviders(<TestConnectionButton onTest={onTest} providerLabel="GitHub" />)

        await user.click(screen.getByRole("button", { name: "Test GitHub connection" }))

        expect(await screen.findByText("GitHub connected")).not.toBeNull()
        expect(onTest).toHaveBeenCalledOnce()
    })

    it("when onTest resolves to false, then shows '<provider> check failed' label", async (): Promise<void> => {
        const user = userEvent.setup()
        const onTest = vi.fn().mockResolvedValue(false)

        renderWithProviders(<TestConnectionButton onTest={onTest} providerLabel="OpenAI" />)

        await user.click(screen.getByRole("button", { name: "Test OpenAI connection" }))

        expect(await screen.findByText("OpenAI check failed")).not.toBeNull()
    })

    it("when onTest throws, then shows '<provider> check failed' label", async (): Promise<void> => {
        const user = userEvent.setup()
        const onTest = vi.fn().mockRejectedValue(new Error("Network error"))

        renderWithProviders(<TestConnectionButton onTest={onTest} providerLabel="Anthropic" />)

        await user.click(screen.getByRole("button", { name: "Test Anthropic connection" }))

        expect(await screen.findByText("Anthropic check failed")).not.toBeNull()
    })

    it("when onTest is synchronous and returns true, then shows connected label", async (): Promise<void> => {
        const user = userEvent.setup()
        const onTest = vi.fn().mockReturnValue(true)

        renderWithProviders(<TestConnectionButton onTest={onTest} providerLabel="GitLab" />)

        await user.click(screen.getByRole("button", { name: "Test GitLab connection" }))

        expect(await screen.findByText("GitLab connected")).not.toBeNull()
    })
})
