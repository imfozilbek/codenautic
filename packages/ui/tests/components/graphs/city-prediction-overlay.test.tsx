import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    CityPredictionOverlay,
    type ICityPredictionOverlayEntry,
} from "@/components/graphs/city-prediction-overlay"
import { renderWithProviders } from "../../utils/render"

const MOCK_ENTRIES: ReadonlyArray<ICityPredictionOverlayEntry> = [
    {
        fileId: "file-hot",
        label: "src/api/routes.ts",
        riskLevel: "high",
        confidenceScore: 92,
        reason: "High churn rate",
    },
    {
        fileId: "file-med",
        label: "src/cache/store.ts",
        riskLevel: "medium",
        confidenceScore: 65,
        reason: "Growing complexity",
    },
    {
        fileId: "file-low",
        label: "src/utils/format.ts",
        riskLevel: "low",
        confidenceScore: 40,
        reason: "Stable pattern",
    },
]

describe("CityPredictionOverlay", (): void => {
    it("when rendered with entries, then displays title and entry labels", (): void => {
        renderWithProviders(<CityPredictionOverlay entries={MOCK_ENTRIES} />)

        expect(screen.getByText("Prediction overlay")).not.toBeNull()
        expect(screen.getByText("src/api/routes.ts")).not.toBeNull()
        expect(screen.getByText("src/cache/store.ts")).not.toBeNull()
    })

    it("when entry has high risk, then shows High risk forecast badge", (): void => {
        renderWithProviders(<CityPredictionOverlay entries={MOCK_ENTRIES} />)

        expect(screen.getByText("High risk forecast")).not.toBeNull()
    })

    it("when onSelectEntry provided and entry clicked, then calls callback", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelect = vi.fn()

        renderWithProviders(
            <CityPredictionOverlay entries={MOCK_ENTRIES} onSelectEntry={onSelect} />,
        )

        const button = screen.getByRole("button", {
            name: /Inspect prediction hotspot src\/api\/routes.ts/,
        })
        await user.click(button)

        expect(onSelect).toHaveBeenCalledWith(MOCK_ENTRIES[0])
    })

    it("when activeFileId matches, then highlights the active entry", (): void => {
        const { container } = renderWithProviders(
            <CityPredictionOverlay entries={MOCK_ENTRIES} activeFileId="file-med" />,
        )

        const buttons = container.querySelectorAll("button")
        const secondButton = buttons[1]
        expect(secondButton?.className).toContain("border-primary")
    })

    it("when entry has confidence score, then shows confidence in details", (): void => {
        renderWithProviders(<CityPredictionOverlay entries={MOCK_ENTRIES} />)

        expect(screen.getByText(/Confidence 92%/)).not.toBeNull()
    })
})
