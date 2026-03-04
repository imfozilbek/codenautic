import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    GuidedTourOverlay,
    type IGuidedTourStep,
} from "@/components/graphs/guided-tour-overlay"
import { renderWithProviders } from "../utils/render"

const TEST_STEPS: ReadonlyArray<IGuidedTourStep> = [
    {
        description: "Configure repository scope before deep investigation.",
        id: "controls",
        title: "Configure scope",
    },
    {
        description: "Inspect 3D city context.",
        id: "city-3d",
        title: "Inspect 3D city",
    },
    {
        description: "Trace root causes to target files.",
        id: "root-cause",
        title: "Trace root causes",
    },
]

describe("GuidedTourOverlay", (): void => {
    it("рендерит текущий шаг и прогресс guided tour", (): void => {
        renderWithProviders(
            <GuidedTourOverlay
                currentStepIndex={0}
                isActive={true}
                onNext={vi.fn()}
                onPrevious={vi.fn()}
                onSkip={vi.fn()}
                steps={TEST_STEPS}
            />,
        )

        expect(screen.getByRole("dialog", { name: "Guided tour overlay" })).not.toBeNull()
        expect(screen.getByText("Guided tour")).not.toBeNull()
        expect(screen.getByText("Step 1 of 3")).not.toBeNull()
        expect(screen.getByText("Configure scope")).not.toBeNull()
        expect(screen.getByRole("button", { name: "Previous tour step" })).toBeDisabled()
        expect(screen.getByRole("button", { name: "Next tour step" })).not.toBeDisabled()
    })

    it("поддерживает действия previous/next/skip", async (): Promise<void> => {
        const user = userEvent.setup()
        const onNext = vi.fn()
        const onPrevious = vi.fn()
        const onSkip = vi.fn()

        renderWithProviders(
            <GuidedTourOverlay
                currentStepIndex={1}
                isActive={true}
                onNext={onNext}
                onPrevious={onPrevious}
                onSkip={onSkip}
                steps={TEST_STEPS}
            />,
        )

        await user.click(screen.getByRole("button", { name: "Previous tour step" }))
        await user.click(screen.getByRole("button", { name: "Next tour step" }))
        await user.click(screen.getByRole("button", { name: "Skip guided tour" }))

        expect(onPrevious).toHaveBeenCalledTimes(1)
        expect(onNext).toHaveBeenCalledTimes(1)
        expect(onSkip).toHaveBeenCalledTimes(1)
    })

    it("скрывает overlay, когда тур не активен", (): void => {
        renderWithProviders(
            <GuidedTourOverlay
                currentStepIndex={0}
                isActive={false}
                onNext={vi.fn()}
                onPrevious={vi.fn()}
                onSkip={vi.fn()}
                steps={TEST_STEPS}
            />,
        )

        expect(screen.queryByRole("dialog", { name: "Guided tour overlay" })).toBeNull()
    })
})
