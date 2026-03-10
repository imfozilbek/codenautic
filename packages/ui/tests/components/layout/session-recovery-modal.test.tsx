import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SessionRecoveryModal } from "@/components/layout/session-recovery-modal"
import { renderWithProviders } from "../../utils/render"

describe("SessionRecoveryModal", (): void => {
    it("when open with 401 failure, then renders failure code", (): void => {
        renderWithProviders(
            <SessionRecoveryModal
                failureCode={401}
                isOpen={true}
                onOpenChange={vi.fn()}
                onReAuthenticate={vi.fn()}
            />,
        )

        expect(screen.getByText(/401/)).toBeDefined()
        expect(screen.getByText("Session expired")).toBeDefined()
    })

    it("when open with 419 failure, then renders 419 code", (): void => {
        renderWithProviders(
            <SessionRecoveryModal
                failureCode={419}
                isOpen={true}
                onOpenChange={vi.fn()}
                onReAuthenticate={vi.fn()}
            />,
        )

        expect(screen.getByText(/419/)).toBeDefined()
    })

    it("when clicking Re-authenticate, then calls onReAuthenticate", async (): Promise<void> => {
        const onReAuthenticate = vi.fn()

        renderWithProviders(
            <SessionRecoveryModal
                failureCode={401}
                isOpen={true}
                onOpenChange={vi.fn()}
                onReAuthenticate={onReAuthenticate}
            />,
        )

        await userEvent.click(screen.getByText("Re-authenticate"))

        expect(onReAuthenticate).toHaveBeenCalledOnce()
    })

    it("when clicking Later, then calls onOpenChange with false", async (): Promise<void> => {
        const onOpenChange = vi.fn()

        renderWithProviders(
            <SessionRecoveryModal
                failureCode={401}
                isOpen={true}
                onOpenChange={onOpenChange}
                onReAuthenticate={vi.fn()}
            />,
        )

        await userEvent.click(screen.getByText("Later"))

        expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it("when not open, then does not render content", (): void => {
        renderWithProviders(
            <SessionRecoveryModal
                failureCode={401}
                isOpen={false}
                onOpenChange={vi.fn()}
                onReAuthenticate={vi.fn()}
            />,
        )

        expect(screen.queryByText("Session expired")).toBeNull()
    })
})
