import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ChangeRiskGauge } from "@/components/predictions/change-risk-gauge"
import { renderWithProviders } from "../../utils/render"

describe("ChangeRiskGauge", (): void => {
    it("when rendered with currentScore, then displays score value", (): void => {
        renderWithProviders(<ChangeRiskGauge currentScore={55} historicalPoints={[]} />)

        expect(screen.getByText("55")).not.toBeNull()
    })

    it("when score is high (>=70), then shows red zone indicator", (): void => {
        const { container } = renderWithProviders(
            <ChangeRiskGauge currentScore={85} historicalPoints={[]} />,
        )

        const redElements = container.querySelectorAll("[class*='danger'], [class*='red']")
        expect(redElements.length).toBeGreaterThan(0)
    })

    it("when score is low (<40), then shows green zone indicator", (): void => {
        const { container } = renderWithProviders(
            <ChangeRiskGauge currentScore={20} historicalPoints={[]} />,
        )

        const greenElements = container.querySelectorAll("[class*='success'], [class*='green']")
        expect(greenElements.length).toBeGreaterThan(0)
    })

    it("when historicalPoints provided, then renders them", (): void => {
        renderWithProviders(
            <ChangeRiskGauge
                currentScore={50}
                historicalPoints={[
                    { label: "Week 1", score: 30 },
                    { label: "Week 2", score: 60 },
                ]}
            />,
        )

        expect(screen.getByText("Week 1")).not.toBeNull()
        expect(screen.getByText("Week 2")).not.toBeNull()
    })

    it("when onSelectHistoricalPoint provided, then calls it on click", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelect = vi.fn()

        renderWithProviders(
            <ChangeRiskGauge
                currentScore={50}
                historicalPoints={[{ label: "Week 1", score: 30 }]}
                onSelectHistoricalPoint={onSelect}
            />,
        )

        const pointButton = screen.getByRole("button", { name: /Week 1/ })
        await user.click(pointButton)

        expect(onSelect).toHaveBeenCalledWith({ label: "Week 1", score: 30 })
    })
})
