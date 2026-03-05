import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    PredictionComparisonView,
    type IPredictionComparisonSnapshot,
} from "@/components/graphs/prediction-comparison-view"
import { renderWithProviders } from "../utils/render"

const TEST_SNAPSHOTS: ReadonlyArray<IPredictionComparisonSnapshot> = [
    {
        accuracyScore: 78,
        actualHotspots: 4,
        fileId: "src/api/auth.ts",
        id: "cmp-3m",
        periodLabel: "3 months ago",
        predictedHotspots: 5,
        summary:
            "3 months ago we predicted 5 hotspots. 4 actually happened, mostly around auth and retry boundaries.",
    },
    {
        accuracyScore: 84,
        actualHotspots: 2,
        fileId: "src/worker/retry.ts",
        id: "cmp-1m",
        periodLabel: "1 month ago",
        predictedHotspots: 2,
        summary:
            "1 month ago we predicted 2 hotspots and both incidents happened in worker retries.",
    },
]

describe("PredictionComparisonView", (): void => {
    it("рендерит snapshot list и summary", (): void => {
        renderWithProviders(<PredictionComparisonView snapshots={TEST_SNAPSHOTS} />)

        expect(screen.getByText("Prediction comparison view")).not.toBeNull()
        expect(screen.getByLabelText("Prediction comparison snapshots")).not.toBeNull()
        expect(
            screen.getByText("3 months ago: predicted 5, actual 4, accuracy 78%"),
        ).not.toBeNull()
        expect(screen.getByLabelText("Prediction comparison summary")).not.toBeNull()
        expect(
            screen.getByText(
                "3 months ago we predicted 5 hotspots. 4 actually happened, mostly around auth and retry boundaries.",
            ),
        ).not.toBeNull()
    })

    it("вызывает onSelectSnapshot при выборе snapshot", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelectSnapshot = vi.fn()
        renderWithProviders(
            <PredictionComparisonView onSelectSnapshot={onSelectSnapshot} snapshots={TEST_SNAPSHOTS} />,
        )

        await user.click(
            screen.getByRole("button", {
                name: "Inspect prediction comparison 1 month ago",
            }),
        )

        expect(onSelectSnapshot).toHaveBeenCalledTimes(1)
        expect(onSelectSnapshot).toHaveBeenCalledWith(
            expect.objectContaining({
                fileId: "src/worker/retry.ts",
                id: "cmp-1m",
            }),
        )
    })
})

