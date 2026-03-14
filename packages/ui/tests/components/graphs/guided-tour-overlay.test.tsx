import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { GuidedTourOverlay, type IGuidedTourStep } from "@/components/graphs/guided-tour-overlay"
import { renderWithProviders } from "../../utils/render"

const MOCK_STEPS: ReadonlyArray<IGuidedTourStep> = [
    { id: "step-1", title: "Welcome", description: "Start exploring CodeCity" },
    { id: "step-2", title: "Hotspots", description: "See the hottest files" },
    { id: "step-3", title: "Ownership", description: "Check who owns what" },
]

describe("GuidedTourOverlay", (): void => {
    it("when isActive is false, then renders nothing", (): void => {
        const { container } = renderWithProviders(
            <GuidedTourOverlay
                isActive={false}
                steps={MOCK_STEPS}
                currentStepIndex={0}
                onNext={vi.fn()}
                onPrevious={vi.fn()}
                onSkip={vi.fn()}
            />,
        )

        expect(container.querySelector("aside")).toBeNull()
    })

    it("when isActive is true, then displays current step title and description", (): void => {
        renderWithProviders(
            <GuidedTourOverlay
                isActive={true}
                steps={MOCK_STEPS}
                currentStepIndex={0}
                onNext={vi.fn()}
                onPrevious={vi.fn()}
                onSkip={vi.fn()}
            />,
        )

        expect(screen.getByText("Welcome")).not.toBeNull()
        expect(screen.getByText("Start exploring CodeCity")).not.toBeNull()
        expect(screen.getByText(/Step 1 of 3/)).not.toBeNull()
    })

    it("when on first step, then Previous button is disabled", (): void => {
        renderWithProviders(
            <GuidedTourOverlay
                isActive={true}
                steps={MOCK_STEPS}
                currentStepIndex={0}
                onNext={vi.fn()}
                onPrevious={vi.fn()}
                onSkip={vi.fn()}
            />,
        )

        const prevButton = screen.getByRole("button", { name: "Previous tour step" })
        expect(prevButton).toBeDisabled()
    })

    it("when Next button clicked, then calls onNext", async (): Promise<void> => {
        const user = userEvent.setup()
        const onNext = vi.fn()

        renderWithProviders(
            <GuidedTourOverlay
                isActive={true}
                steps={MOCK_STEPS}
                currentStepIndex={0}
                onNext={onNext}
                onPrevious={vi.fn()}
                onSkip={vi.fn()}
            />,
        )

        const nextButton = screen.getByRole("button", { name: "Next tour step" })
        await user.click(nextButton)

        expect(onNext).toHaveBeenCalledTimes(1)
    })

    it("when on last step, then shows Finish button instead of Next", (): void => {
        renderWithProviders(
            <GuidedTourOverlay
                isActive={true}
                steps={MOCK_STEPS}
                currentStepIndex={2}
                onNext={vi.fn()}
                onPrevious={vi.fn()}
                onSkip={vi.fn()}
            />,
        )

        expect(screen.getByRole("button", { name: "Finish guided tour" })).not.toBeNull()
    })

    it("when Skip button clicked, then calls onSkip", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSkip = vi.fn()

        renderWithProviders(
            <GuidedTourOverlay
                isActive={true}
                steps={MOCK_STEPS}
                currentStepIndex={1}
                onNext={vi.fn()}
                onPrevious={vi.fn()}
                onSkip={onSkip}
            />,
        )

        const skipButton = screen.getByRole("button", { name: "Skip guided tour" })
        await user.click(skipButton)

        expect(onSkip).toHaveBeenCalledTimes(1)
    })

    it("when steps is empty, then renders nothing", (): void => {
        const { container } = renderWithProviders(
            <GuidedTourOverlay
                isActive={true}
                steps={[]}
                currentStepIndex={0}
                onNext={vi.fn()}
                onPrevious={vi.fn()}
                onSkip={vi.fn()}
            />,
        )

        expect(container.querySelector("aside")).toBeNull()
    })
})
