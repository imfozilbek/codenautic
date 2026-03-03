import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { RechartsChartWrapper } from "@/components/charts/recharts-chart-wrapper"
import { renderWithProviders } from "../utils/render"

describe("recharts chart wrapper", (): void => {
    it("рендерит loading состояние", (): void => {
        renderWithProviders(
            <RechartsChartWrapper isLoading={true} title="Chart">
                <p>chart content</p>
            </RechartsChartWrapper>,
        )

        expect(screen.queryByText("Loading chart...")).not.toBeNull()
        expect(screen.queryByText("chart content")).toBeNull()
    })

    it("рендерит контент после снятия loading", (): void => {
        renderWithProviders(
            <RechartsChartWrapper title="Chart">
                <p>chart content</p>
            </RechartsChartWrapper>,
        )

        expect(screen.queryByText("chart content")).not.toBeNull()
    })
})
