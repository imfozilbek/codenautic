import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    ChangeRiskGauge,
    type IChangeRiskGaugePoint,
} from "@/components/graphs/change-risk-gauge"
import { renderWithProviders } from "../utils/render"

const TEST_POINTS: ReadonlyArray<IChangeRiskGaugePoint> = [
    {
        label: "Week -2",
        score: 38,
    },
    {
        label: "Week -1",
        score: 52,
    },
]

describe("ChangeRiskGauge", (): void => {
    it("показывает текущую зону риска и historical comparison", (): void => {
        renderWithProviders(<ChangeRiskGauge currentScore={74} historicalPoints={TEST_POINTS} />)

        expect(screen.getByText("Change risk gauge")).not.toBeNull()
        expect(screen.getByText("Current risk score")).not.toBeNull()
        expect(screen.getByText("74")).not.toBeNull()
        expect(screen.getByText("Zone: red")).not.toBeNull()
        expect(screen.getByText("Historical 52 · Delta +22")).not.toBeNull()
    })

    it("вызывает callback при выборе historical point", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelectHistoricalPoint = vi.fn()
        renderWithProviders(
            <ChangeRiskGauge
                currentScore={61}
                historicalPoints={TEST_POINTS}
                onSelectHistoricalPoint={onSelectHistoricalPoint}
            />,
        )

        await user.click(screen.getByRole("button", { name: "Inspect risk point Week -1" }))
        expect(onSelectHistoricalPoint).toHaveBeenCalledTimes(1)
        expect(onSelectHistoricalPoint).toHaveBeenCalledWith(
            expect.objectContaining({
                label: "Week -1",
                score: 52,
            }),
        )
    })
})
