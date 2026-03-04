import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DryRunResultViewer } from "@/components/settings/dry-run-result-viewer"
import { renderWithProviders } from "../../utils/render"

describe("DryRunResultViewer", (): void => {
    it("показывает empty состояние до запуска dry-run", (): void => {
        renderWithProviders(<DryRunResultViewer onRunDryRun={(): void => {}} />)

        expect(screen.getByTestId("dry-run-empty")).toHaveTextContent(
            "Run dry-run to preview current review output.",
        )
    })

    it("вызывает запуск dry-run и рендерит summary", async (): Promise<void> => {
        const user = userEvent.setup()
        const onRunDryRun = vi.fn((): void => {})

        renderWithProviders(
            <DryRunResultViewer
                result={{
                    mode: "AUTO_PAUSE",
                    reviewedFiles: 5,
                    suggestions: 4,
                    issues: [
                        {
                            filePath: "src/review/pipeline.ts",
                            severity: "high",
                            title: "Missing fallback branch",
                        },
                    ],
                }}
                onRunDryRun={onRunDryRun}
            />,
        )

        expect(screen.getByTestId("dry-run-summary")).toHaveTextContent("Mode: AUTO_PAUSE")
        expect(screen.getByTestId("dry-run-issue-row")).toHaveTextContent(
            "src/review/pipeline.ts · HIGH · Missing fallback branch",
        )

        await user.click(screen.getByRole("button", { name: "Run dry-run" }))
        expect(onRunDryRun).toHaveBeenCalledTimes(1)
    })
})
