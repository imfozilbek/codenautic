import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SimulationPanel } from "@/components/graphs/simulation-panel"
import type { IRefactoringTargetDescriptor } from "@/components/graphs/refactoring-dashboard"
import { renderWithProviders } from "../../utils/render"

const TEST_TARGETS: ReadonlyArray<IRefactoringTargetDescriptor> = [
    {
        description: "API retry stabilization",
        effortScore: 7,
        fileId: "src/api/retry.ts",
        id: "target-retry",
        module: "api",
        riskScore: 82,
        roiScore: 94,
        title: "src/api/retry.ts",
    },
    {
        description: "Queue backpressure cleanup",
        effortScore: 5,
        fileId: "src/queue/worker.ts",
        id: "target-queue",
        module: "worker",
        riskScore: 74,
        roiScore: 87,
        title: "src/queue/worker.ts",
    },
    {
        description: "Cache invalidation fix",
        effortScore: 9,
        fileId: "src/cache/store.ts",
        id: "target-cache",
        module: "cache",
        riskScore: 91,
        roiScore: 78,
        title: "src/cache/store.ts",
    },
]

describe("SimulationPanel (extended)", (): void => {
    it("when targets list is empty, then renders panel with zero metrics", (): void => {
        renderWithProviders(<SimulationPanel targets={[]} />)

        expect(screen.getByText("Simulation panel")).not.toBeNull()
        expect(screen.getByText("Complexity")).not.toBeNull()
        expect(screen.getByText("Risk")).not.toBeNull()
        expect(screen.getByText("Maintainability")).not.toBeNull()
    })

    it("when targets list is empty, then disables preview button", (): void => {
        renderWithProviders(<SimulationPanel targets={[]} />)

        const previewButton = screen.getByRole("button", {
            name: "Preview refactoring simulation",
        })
        expect(previewButton).toBeDisabled()
    })

    it("when target checkbox is unchecked, then removes target from selection", async (): Promise<void> => {
        const user = userEvent.setup()
        const onPreviewScenario = vi.fn()
        renderWithProviders(
            <SimulationPanel onPreviewScenario={onPreviewScenario} targets={TEST_TARGETS} />,
        )

        const firstCheckbox = screen.getByRole("checkbox", {
            name: "Select simulation target src/api/retry.ts",
        })
        await user.click(firstCheckbox)

        await user.click(screen.getByRole("button", { name: "Preview refactoring simulation" }))
        expect(onPreviewScenario).toHaveBeenCalledWith(
            expect.objectContaining({
                fileIds: ["src/queue/worker.ts"],
                mode: "before",
            }),
        )
    })

    it("when all targets are unchecked, then disables preview button", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SimulationPanel targets={TEST_TARGETS} />)

        const firstCheckbox = screen.getByRole("checkbox", {
            name: "Select simulation target src/api/retry.ts",
        })
        const secondCheckbox = screen.getByRole("checkbox", {
            name: "Select simulation target src/queue/worker.ts",
        })
        await user.click(firstCheckbox)
        await user.click(secondCheckbox)

        const previewButton = screen.getByRole("button", {
            name: "Preview refactoring simulation",
        })
        expect(previewButton).toBeDisabled()
    })

    it("when target is re-checked after unchecking, then adds it back to selection", async (): Promise<void> => {
        const user = userEvent.setup()
        const onPreviewScenario = vi.fn()
        renderWithProviders(
            <SimulationPanel onPreviewScenario={onPreviewScenario} targets={TEST_TARGETS} />,
        )

        const firstCheckbox = screen.getByRole("checkbox", {
            name: "Select simulation target src/api/retry.ts",
        })
        await user.click(firstCheckbox)
        await user.click(firstCheckbox)

        await user.click(screen.getByRole("button", { name: "Preview refactoring simulation" }))
        expect(onPreviewScenario).toHaveBeenCalledWith(
            expect.objectContaining({
                fileIds: expect.arrayContaining([
                    "src/api/retry.ts",
                    "src/queue/worker.ts",
                ]) as ReadonlyArray<string>,
            }),
        )
    })

    it("when before mode is active, then Before button is pressed", (): void => {
        renderWithProviders(<SimulationPanel targets={TEST_TARGETS} />)

        const beforeButton = screen.getByRole("button", { name: "Before" })
        expect(beforeButton).toHaveAttribute("aria-pressed", "true")
    })

    it("when after mode is selected, then After button is pressed", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SimulationPanel targets={TEST_TARGETS} />)

        await user.click(screen.getByRole("button", { name: "After" }))
        const afterButton = screen.getByRole("button", { name: "After" })
        expect(afterButton).toHaveAttribute("aria-pressed", "true")
    })

    it("when switching between modes, then displayed metrics change", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SimulationPanel targets={TEST_TARGETS} />)

        const beforeComplexity = screen.getAllByText(/^\d+$/)
        const beforeValues = beforeComplexity.map((element): string | null => element.textContent)

        await user.click(screen.getByRole("button", { name: "After" }))

        const afterComplexity = screen.getAllByText(/^\d+$/)
        const afterValues = afterComplexity.map((element): string | null => element.textContent)

        const valuesChanged = beforeValues.some(
            (value, index): boolean => value !== afterValues[index],
        )
        expect(valuesChanged).toBe(true)
    })

    it("when delta is displayed, then shows difference between after and before", (): void => {
        renderWithProviders(<SimulationPanel targets={TEST_TARGETS} />)

        const deltaTexts = screen.getAllByText(/^Delta/)
        expect(deltaTexts.length).toBe(3)
    })

    it("when only one target is provided, then shows it checked by default", (): void => {
        const firstTarget = TEST_TARGETS[0]
        if (firstTarget === undefined) {
            throw new Error("TEST_TARGETS must have at least one entry")
        }
        const singleTarget: ReadonlyArray<IRefactoringTargetDescriptor> = [firstTarget]
        renderWithProviders(<SimulationPanel targets={singleTarget} />)

        const checkbox = screen.getByRole("checkbox", {
            name: "Select simulation target src/api/retry.ts",
        })
        expect(checkbox).toBeChecked()
    })

    it("when more than 5 targets are provided, then only shows first 5", (): void => {
        const manyTargets: ReadonlyArray<IRefactoringTargetDescriptor> = Array.from(
            { length: 8 },
            (_value, index): IRefactoringTargetDescriptor => ({
                description: `Target ${String(index)}`,
                effortScore: 5,
                fileId: `src/file-${String(index)}.ts`,
                id: `target-${String(index)}`,
                module: "test",
                riskScore: 50,
                roiScore: 60,
                title: `Target ${String(index)}`,
            }),
        )
        renderWithProviders(<SimulationPanel targets={manyTargets} />)

        expect(screen.getByText("Target 0")).not.toBeNull()
        expect(screen.getByText("Target 4")).not.toBeNull()
        expect(screen.queryByText("Target 5")).toBeNull()
    })

    it("when no onPreviewScenario callback provided, then preview button still works without error", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SimulationPanel targets={TEST_TARGETS} />)

        await user.click(screen.getByRole("button", { name: "Preview refactoring simulation" }))
    })

    it("when target info is displayed, then shows ROI, Risk and Effort scores", (): void => {
        renderWithProviders(<SimulationPanel targets={TEST_TARGETS} />)

        expect(screen.getByText(/ROI 94/)).not.toBeNull()
        expect(screen.getByText(/Risk 82/)).not.toBeNull()
        expect(screen.getByText(/Effort 7/)).not.toBeNull()
    })
})
