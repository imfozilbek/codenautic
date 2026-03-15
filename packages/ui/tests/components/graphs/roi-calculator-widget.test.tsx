import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ROICalculatorWidget } from "@/components/refactoring/roi-calculator-widget"
import type { IRefactoringTargetDescriptor } from "@/components/refactoring/refactoring-dashboard"
import { renderWithProviders } from "../../utils/render"

const MOCK_TARGETS: ReadonlyArray<IRefactoringTargetDescriptor> = [
    {
        id: "target-1",
        title: "api/routes.ts",
        description: "High complexity handler",
        module: "api",
        fileId: "file-api",
        riskScore: 80,
        roiScore: 90,
        effortScore: 6,
    },
    {
        id: "target-2",
        title: "cache/store.ts",
        description: "Cache invalidation cleanup",
        module: "cache",
        fileId: "file-cache",
        riskScore: 50,
        roiScore: 70,
        effortScore: 3,
    },
]

describe("ROICalculatorWidget", (): void => {
    it("when rendered with targets, then displays title and target labels", (): void => {
        renderWithProviders(<ROICalculatorWidget targets={MOCK_TARGETS} />)

        expect(screen.getByText("ROI calculator widget")).not.toBeNull()
        expect(screen.getByText("api/routes.ts")).not.toBeNull()
        expect(screen.getByText("cache/store.ts")).not.toBeNull()
    })

    it("when no targets selected, then ROI score is 0 and apply button is disabled", (): void => {
        renderWithProviders(<ROICalculatorWidget targets={MOCK_TARGETS} />)

        expect(screen.getByText("0")).not.toBeNull()
        const button = screen.getByRole("button", { name: "Apply ROI scenario" })
        expect(button).toBeDisabled()
    })

    it("when target checkbox is checked, then updates ROI score", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<ROICalculatorWidget targets={MOCK_TARGETS} />)

        const checkbox = screen.getByRole("checkbox", {
            name: /Select ROI target api\/routes.ts/,
        })
        await user.click(checkbox)

        const button = screen.getByRole("button", { name: "Apply ROI scenario" })
        expect(button).not.toBeDisabled()
    })

    it("when target selected and apply clicked, then calls onApplyScenario with fileIds", async (): Promise<void> => {
        const user = userEvent.setup()
        const onApply = vi.fn()

        renderWithProviders(
            <ROICalculatorWidget targets={MOCK_TARGETS} onApplyScenario={onApply} />,
        )

        const checkbox = screen.getByRole("checkbox", {
            name: /Select ROI target api\/routes.ts/,
        })
        await user.click(checkbox)

        const button = screen.getByRole("button", { name: "Apply ROI scenario" })
        await user.click(button)

        expect(onApply).toHaveBeenCalledWith(["file-api"])
    })

    it("when risk/effort sliders are present, then renders them", (): void => {
        renderWithProviders(<ROICalculatorWidget targets={MOCK_TARGETS} />)

        const riskSlider = screen.getByRole("slider", { name: "ROI risk weight" })
        const effortSlider = screen.getByRole("slider", { name: "ROI effort weight" })
        expect(riskSlider).not.toBeNull()
        expect(effortSlider).not.toBeNull()
    })
})
