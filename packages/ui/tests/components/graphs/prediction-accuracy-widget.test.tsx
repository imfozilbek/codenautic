import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    PredictionAccuracyWidget,
    type IPredictionAccuracyPoint,
    type IPredictionConfusionMatrix,
    type IPredictionAccuracyCase,
} from "@/components/predictions/prediction-accuracy-widget"
import { renderWithProviders } from "../../utils/render"

const MOCK_POINTS: ReadonlyArray<IPredictionAccuracyPoint> = [
    {
        timestamp: "2025-01",
        predictedIncidents: 5,
        actualIncidents: 4,
        accuracyScore: 80,
    },
    {
        timestamp: "2025-02",
        predictedIncidents: 3,
        actualIncidents: 3,
        accuracyScore: 100,
    },
]

const MOCK_MATRIX: IPredictionConfusionMatrix = {
    truePositive: 12,
    trueNegative: 45,
    falsePositive: 3,
    falseNegative: 2,
}

const MOCK_CASES: ReadonlyArray<IPredictionAccuracyCase> = [
    {
        id: "case-1",
        fileId: "file-api",
        label: "api/routes.ts",
        predictedRiskLevel: "high",
        actualOutcome: "incident",
    },
    {
        id: "case-2",
        fileId: "file-util",
        label: "utils/format.ts",
        predictedRiskLevel: "low",
        actualOutcome: "stable",
    },
]

describe("PredictionAccuracyWidget", (): void => {
    it("when rendered, then displays title and description", (): void => {
        renderWithProviders(
            <PredictionAccuracyWidget
                points={MOCK_POINTS}
                matrix={MOCK_MATRIX}
                cases={MOCK_CASES}
            />,
        )

        expect(screen.getByText("Prediction accuracy widget")).not.toBeNull()
    })

    it("when confusion matrix is provided, then displays TP/TN/FP/FN values", (): void => {
        renderWithProviders(
            <PredictionAccuracyWidget
                points={MOCK_POINTS}
                matrix={MOCK_MATRIX}
                cases={MOCK_CASES}
            />,
        )

        expect(screen.getByText("TP 12")).not.toBeNull()
        expect(screen.getByText("TN 45")).not.toBeNull()
        expect(screen.getByText("FP 3")).not.toBeNull()
        expect(screen.getByText("FN 2")).not.toBeNull()
    })

    it("when case button is clicked, then calls onSelectCase", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelect = vi.fn()

        renderWithProviders(
            <PredictionAccuracyWidget
                points={MOCK_POINTS}
                matrix={MOCK_MATRIX}
                cases={MOCK_CASES}
                onSelectCase={onSelect}
            />,
        )

        const caseButton = screen.getByRole("button", {
            name: /Inspect prediction accuracy case api\/routes.ts/,
        })
        await user.click(caseButton)

        expect(onSelect).toHaveBeenCalledWith(MOCK_CASES[0])
    })

    it("when points are provided, then renders trend data", (): void => {
        renderWithProviders(
            <PredictionAccuracyWidget
                points={MOCK_POINTS}
                matrix={MOCK_MATRIX}
                cases={MOCK_CASES}
            />,
        )

        expect(screen.getByText(/2025-01.*predicted 5/)).not.toBeNull()
    })

    it("when activeCaseId matches, then highlights the active case button", (): void => {
        const { container } = renderWithProviders(
            <PredictionAccuracyWidget
                points={MOCK_POINTS}
                matrix={MOCK_MATRIX}
                cases={MOCK_CASES}
                activeCaseId="case-1"
            />,
        )

        const buttons = container.querySelectorAll(
            "[aria-label^='Inspect prediction accuracy case']",
        )
        const firstButton = buttons[0]
        expect(firstButton?.className).toContain("border-accent")
    })
})
