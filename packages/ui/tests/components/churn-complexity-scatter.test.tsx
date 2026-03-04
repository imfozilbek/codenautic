import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
    ChurnComplexityScatter,
    type IChurnComplexityScatterFileDescriptor,
} from "@/components/graphs/churn-complexity-scatter"
import { renderWithProviders } from "../utils/render"

const SAMPLE_FILES: ReadonlyArray<IChurnComplexityScatterFileDescriptor> = [
    {
        id: "src/api/auth.ts",
        path: "src/api/auth.ts",
        churn: 4,
        complexity: 18,
    },
    {
        id: "src/api/repository.ts",
        path: "src/api/repository.ts",
        churn: 7,
        complexity: 26,
    },
]

describe("churn complexity scatter", (): void => {
    it("рендерит scatter plot и quadrant labels", (): void => {
        renderWithProviders(<ChurnComplexityScatter files={SAMPLE_FILES} />)

        expect(screen.getByLabelText("Churn vs complexity scatter plot")).not.toBeNull()
        expect(screen.getByLabelText("Scatter quadrants")).toHaveTextContent(
            "Q1 high churn/high complexity",
        )
    })

    it("вызывает onFileSelect при клике на point и отмечает selected point", (): void => {
        const onFileSelect = vi.fn<(fileId: string) => void>()
        const view = renderWithProviders(
            <ChurnComplexityScatter files={SAMPLE_FILES} onFileSelect={onFileSelect} />,
        )

        const firstPoint = screen.getByLabelText("Churn point auth.ts")
        fireEvent.click(firstPoint)

        expect(onFileSelect).toHaveBeenCalledWith("src/api/auth.ts")

        view.rerender(
            <ChurnComplexityScatter
                files={SAMPLE_FILES}
                onFileSelect={onFileSelect}
                selectedFileId="src/api/auth.ts"
            />,
        )

        expect(screen.getByLabelText("Churn point auth.ts")).toHaveAttribute("data-selected", "true")
    })

    it("показывает empty state без валидных данных", (): void => {
        renderWithProviders(
            <ChurnComplexityScatter
                files={[
                    {
                        id: "no-metrics",
                        path: "src/no-metrics.ts",
                    },
                ]}
            />,
        )

        expect(screen.getByText("Not enough churn/complexity data for scatter plot.")).not.toBeNull()
    })
})
