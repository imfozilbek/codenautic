import { fireEvent, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    ROICalculatorWidget,
} from "@/components/graphs/roi-calculator-widget"
import type { IRefactoringTargetDescriptor } from "@/components/graphs/refactoring-dashboard"
import { renderWithProviders } from "../utils/render"

const TEST_TARGETS: ReadonlyArray<IRefactoringTargetDescriptor> = [
    {
        description: "Queue adapter",
        effortScore: 7,
        fileId: "src/adapters/queue.ts",
        id: "target-queue",
        module: "adapters",
        riskScore: 82,
        roiScore: 91,
        title: "src/adapters/queue.ts",
    },
    {
        description: "Retry service",
        effortScore: 4,
        fileId: "src/services/retry.ts",
        id: "target-retry",
        module: "services",
        riskScore: 64,
        roiScore: 72,
        title: "src/services/retry.ts",
    },
]

describe("ROICalculatorWidget", (): void => {
    it("обновляет selected files count и веса при взаимодействии", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ROICalculatorWidget targets={TEST_TARGETS} />)

        expect(screen.getByText("Selected files: 0")).not.toBeNull()
        expect(screen.getByRole("button", { name: "Apply ROI scenario" })).toBeDisabled()

        await user.click(screen.getByRole("checkbox", { name: "Select ROI target src/adapters/queue.ts" }))
        expect(screen.getByText("Selected files: 1")).not.toBeNull()
        expect(screen.getByRole("button", { name: "Apply ROI scenario" })).not.toBeDisabled()

        fireEvent.change(screen.getByRole("slider", { name: "ROI risk weight" }), {
            target: { value: "80" },
        })
        expect(screen.getByText("Risk weight: 80%")).not.toBeNull()

        fireEvent.change(screen.getByRole("slider", { name: "ROI effort weight" }), {
            target: { value: "20" },
        })
        expect(screen.getByText("Effort weight: 20%")).not.toBeNull()
    })

    it("вызывает callback применения ROI сценария", async (): Promise<void> => {
        const user = userEvent.setup()
        const onApplyScenario = vi.fn()
        renderWithProviders(
            <ROICalculatorWidget
                onApplyScenario={(fileIds): void => {
                    onApplyScenario(fileIds)
                }}
                targets={TEST_TARGETS}
            />,
        )

        await user.click(screen.getByRole("checkbox", { name: "Select ROI target src/adapters/queue.ts" }))
        await user.click(screen.getByRole("checkbox", { name: "Select ROI target src/services/retry.ts" }))
        await user.click(screen.getByRole("button", { name: "Apply ROI scenario" }))

        expect(onApplyScenario).toHaveBeenCalledTimes(1)
        expect(onApplyScenario).toHaveBeenCalledWith([
            "src/adapters/queue.ts",
            "src/services/retry.ts",
        ])
    })
})
