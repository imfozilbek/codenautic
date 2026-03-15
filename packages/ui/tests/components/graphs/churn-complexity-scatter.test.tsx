import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    ChurnComplexityScatter,
    type IChurnComplexityScatterFileDescriptor,
} from "@/components/codecity/churn-complexity-scatter"
import { renderWithProviders } from "../../utils/render"

const MOCK_FILES: ReadonlyArray<IChurnComplexityScatterFileDescriptor> = [
    { id: "file-1", path: "src/api/routes.ts", churn: 10, complexity: 25 },
    { id: "file-2", path: "src/cache/store.ts", churn: 5, complexity: 40 },
    { id: "file-3", path: "src/logger/index.ts", churn: 3, complexity: 8 },
]

describe("ChurnComplexityScatter", (): void => {
    it("when rendered with files, then displays default title", (): void => {
        renderWithProviders(<ChurnComplexityScatter files={MOCK_FILES} />)

        expect(screen.getByText("Churn vs complexity scatter")).not.toBeNull()
    })

    it("when files is empty, then shows empty state", (): void => {
        renderWithProviders(<ChurnComplexityScatter files={[]} />)

        expect(
            screen.getByText("Not enough churn/complexity data for scatter plot."),
        ).not.toBeNull()
    })

    it("when custom title is provided, then displays custom title", (): void => {
        renderWithProviders(<ChurnComplexityScatter files={MOCK_FILES} title="Custom Scatter" />)

        expect(screen.getByText("Custom Scatter")).not.toBeNull()
    })

    it("when point is clicked, then calls onFileSelect with fileId", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelect = vi.fn()

        renderWithProviders(<ChurnComplexityScatter files={MOCK_FILES} onFileSelect={onSelect} />)

        const point = screen.getByRole("button", {
            name: /Churn point routes.ts/,
        })
        await user.click(point)

        expect(onSelect).toHaveBeenCalledWith("file-1")
    })

    it("when selectedFileId matches, then shows selected point info", (): void => {
        renderWithProviders(<ChurnComplexityScatter files={MOCK_FILES} selectedFileId="file-2" />)

        expect(screen.getByText(/Selected: store.ts/)).not.toBeNull()
    })

    it("when no point is selected, then shows no-selection text", (): void => {
        renderWithProviders(<ChurnComplexityScatter files={MOCK_FILES} />)

        expect(screen.getByText("No point selected.")).not.toBeNull()
    })
})
