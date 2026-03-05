import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { RefactoringExportDialog } from "@/components/graphs/refactoring-export-dialog"
import type { IRefactoringTargetDescriptor } from "@/components/graphs/refactoring-dashboard"
import { renderWithProviders } from "../utils/render"

const TEST_TARGETS: ReadonlyArray<IRefactoringTargetDescriptor> = [
    {
        description: "Retry loop stabilization",
        effortScore: 6,
        fileId: "src/api/retry.ts",
        id: "target-retry",
        module: "api",
        riskScore: 78,
        roiScore: 90,
        title: "src/api/retry.ts",
    },
    {
        description: "Queue handoff cleanup",
        effortScore: 4,
        fileId: "src/queue/worker.ts",
        id: "target-worker",
        module: "worker",
        riskScore: 66,
        roiScore: 84,
        title: "src/queue/worker.ts",
    },
]

describe("RefactoringExportDialog", (): void => {
    it("открывает диалог и позволяет кастомизировать шаблон", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<RefactoringExportDialog targets={TEST_TARGETS} />)

        await user.click(
            screen.getByRole("button", { name: "Open refactoring export dialog" }),
        )
        expect(screen.getByLabelText("Refactoring export destination")).not.toBeNull()
        expect(screen.getByLabelText("Refactoring export template title")).not.toBeNull()
        expect(screen.getByLabelText("Refactoring export template body")).not.toBeNull()

        await user.selectOptions(screen.getByLabelText("Refactoring export destination"), "github")
        await user.clear(screen.getByLabelText("Refactoring export template title"))
        await user.type(
            screen.getByLabelText("Refactoring export template title"),
            "Refactor template for {{title}}",
        )

        expect(screen.getByDisplayValue("GitHub Issues")).not.toBeNull()
    })

    it("экспортирует выбранные задачи в целевой трекер", async (): Promise<void> => {
        const user = userEvent.setup()
        const onExport = vi.fn()
        renderWithProviders(<RefactoringExportDialog onExport={onExport} targets={TEST_TARGETS} />)

        await user.click(
            screen.getByRole("button", { name: "Open refactoring export dialog" }),
        )
        await user.click(
            screen.getByRole("checkbox", { name: "Select export target src/api/retry.ts" }),
        )
        await user.click(screen.getByRole("button", { name: "Export refactoring plan" }))

        expect(onExport).toHaveBeenCalledTimes(1)
        expect(onExport).toHaveBeenCalledWith(
            expect.objectContaining({
                destination: "jira",
                fileIds: ["src/api/retry.ts"],
            }),
        )
        expect(screen.getByText("Exported 1 task(s) to jira")).not.toBeNull()
    })
})
