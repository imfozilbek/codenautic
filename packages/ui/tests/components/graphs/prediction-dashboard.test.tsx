import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    PredictionDashboard,
    type IPredictionDashboardHotspotEntry,
    type IPredictionDashboardQualityTrendPoint,
    type IPredictionDashboardBugProneFile,
} from "@/components/predictions/prediction-dashboard"
import { renderWithProviders } from "../../utils/render"

const MOCK_HOTSPOTS: ReadonlyArray<IPredictionDashboardHotspotEntry> = [
    {
        id: "hs-1",
        fileId: "file-api",
        label: "api/routes.ts",
        riskLevel: "high",
        confidenceScore: 90,
        predictedIssueIncrease: 5,
    },
    {
        id: "hs-2",
        fileId: "file-cache",
        label: "cache/store.ts",
        riskLevel: "medium",
        confidenceScore: 65,
        predictedIssueIncrease: 2,
    },
]

const MOCK_TREND_POINTS: ReadonlyArray<IPredictionDashboardQualityTrendPoint> = [
    { timestamp: "2025-01", qualityScore: 80, forecastQualityScore: 78 },
    { timestamp: "2025-02", qualityScore: 82, forecastQualityScore: 75 },
]

const MOCK_BUG_PRONE: ReadonlyArray<IPredictionDashboardBugProneFile> = [
    { fileId: "f1", label: "src/db.ts", bugIntroductions30d: 4, confidenceScore: 85 },
]

describe("PredictionDashboard", (): void => {
    it("when rendered, then displays title and hotspot labels", (): void => {
        renderWithProviders(
            <PredictionDashboard
                hotspots={MOCK_HOTSPOTS}
                qualityTrendPoints={MOCK_TREND_POINTS}
                bugProneFiles={MOCK_BUG_PRONE}
            />,
        )

        expect(screen.getByText("Prediction dashboard")).not.toBeNull()
        expect(screen.getByText("api/routes.ts")).not.toBeNull()
        expect(screen.getByText("cache/store.ts")).not.toBeNull()
    })

    it("when hotspot button clicked, then calls onSelectHotspot", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelect = vi.fn()

        renderWithProviders(
            <PredictionDashboard
                hotspots={MOCK_HOTSPOTS}
                qualityTrendPoints={MOCK_TREND_POINTS}
                bugProneFiles={MOCK_BUG_PRONE}
                onSelectHotspot={onSelect}
            />,
        )

        const button = screen.getByRole("button", {
            name: /Inspect prediction dashboard hotspot api\/routes.ts/,
        })
        await user.click(button)

        expect(onSelect).toHaveBeenCalledWith(MOCK_HOTSPOTS[0])
    })

    it("when quality trend points provided, then renders trend data", (): void => {
        renderWithProviders(
            <PredictionDashboard
                hotspots={MOCK_HOTSPOTS}
                qualityTrendPoints={MOCK_TREND_POINTS}
                bugProneFiles={MOCK_BUG_PRONE}
            />,
        )

        expect(screen.getByText(/2025-01: 80/)).not.toBeNull()
    })

    it("when bug prone files provided, then renders bug-prone section", (): void => {
        renderWithProviders(
            <PredictionDashboard
                hotspots={MOCK_HOTSPOTS}
                qualityTrendPoints={MOCK_TREND_POINTS}
                bugProneFiles={MOCK_BUG_PRONE}
            />,
        )

        expect(screen.getByText(/src\/db.ts/)).not.toBeNull()
        expect(screen.getByText(/bugs 30d 4/)).not.toBeNull()
    })

    it("when activeHotspotId matches, then highlights active hotspot", (): void => {
        const { container } = renderWithProviders(
            <PredictionDashboard
                hotspots={MOCK_HOTSPOTS}
                qualityTrendPoints={MOCK_TREND_POINTS}
                bugProneFiles={MOCK_BUG_PRONE}
                activeHotspotId="hs-1"
            />,
        )

        const buttons = container.querySelectorAll(
            "[aria-label^='Inspect prediction dashboard hotspot']",
        )
        const firstButton = buttons[0]
        expect(firstButton?.className).toContain("border-accent")
    })
})
