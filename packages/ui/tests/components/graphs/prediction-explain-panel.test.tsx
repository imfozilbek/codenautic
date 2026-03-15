import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    PredictionExplainPanel,
    type IPredictionExplainPanelEntry,
} from "@/components/predictions/prediction-explain-panel"
import { renderWithProviders } from "../../utils/render"

const MOCK_ENTRIES: ReadonlyArray<IPredictionExplainPanelEntry> = [
    {
        fileId: "file-api",
        label: "api/routes.ts",
        riskLevel: "high",
        confidenceScore: 92,
        reason: "High churn rate",
        explanation: "This file changed 42 times in the last sprint, indicating volatility.",
    },
    {
        fileId: "file-util",
        label: "utils/format.ts",
        riskLevel: "low",
        confidenceScore: 40,
        reason: "Stable pattern",
        explanation: "No significant changes detected recently.",
    },
]

describe("PredictionExplainPanel", (): void => {
    it("when rendered with entries, then displays title and entry labels", (): void => {
        renderWithProviders(<PredictionExplainPanel entries={MOCK_ENTRIES} />)

        expect(screen.getByText("Prediction explain panel")).not.toBeNull()
        expect(screen.getByText("api/routes.ts")).not.toBeNull()
        expect(screen.getByText("utils/format.ts")).not.toBeNull()
    })

    it("when no activeFileId, then shows first entry explanation by default", (): void => {
        renderWithProviders(<PredictionExplainPanel entries={MOCK_ENTRIES} />)

        expect(screen.getByText(/High churn rate/)).not.toBeNull()
        expect(screen.getByText(/This file changed 42 times in the last sprint/)).not.toBeNull()
    })

    it("when entry button clicked, then calls onSelectEntry", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelect = vi.fn()

        renderWithProviders(
            <PredictionExplainPanel entries={MOCK_ENTRIES} onSelectEntry={onSelect} />,
        )

        const button = screen.getByRole("button", {
            name: /Inspect prediction explanation for utils\/format.ts/,
        })
        await user.click(button)

        expect(onSelect).toHaveBeenCalledWith(MOCK_ENTRIES[1])
    })

    it("when activeFileId matches second entry, then highlights it", (): void => {
        const { container } = renderWithProviders(
            <PredictionExplainPanel entries={MOCK_ENTRIES} activeFileId="file-util" />,
        )

        const buttons = container.querySelectorAll("[aria-label^='Inspect prediction explanation']")
        const secondButton = buttons[1]
        expect(secondButton?.className).toContain("border-accent")
    })

    it("when entries is empty, then shows no-selection text", (): void => {
        renderWithProviders(<PredictionExplainPanel entries={[]} />)

        expect(screen.getByText("No prediction selected.")).not.toBeNull()
    })
})
