import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ChartContainer } from "@/components/charts/chart-container"
import { renderWithProviders } from "../utils/render"

describe("ChartContainer", (): void => {
    it("when rendered with children, then displays chart content", (): void => {
        renderWithProviders(
            <ChartContainer>
                <svg data-testid="mock-chart" />
            </ChartContainer>,
        )

        expect(screen.getByTestId("mock-chart")).not.toBeNull()
    })

    it("when aria-label is provided, then applies it to the container", (): void => {
        renderWithProviders(
            <ChartContainer aria-label="Review trend chart">
                <svg data-testid="mock-chart" />
            </ChartContainer>,
        )

        expect(screen.getByLabelText("Review trend chart")).not.toBeNull()
    })

    it("when height is 'sm', then applies sm height class", (): void => {
        const { container } = renderWithProviders(
            <ChartContainer height="sm">
                <svg data-testid="mock-chart" />
            </ChartContainer>,
        )

        const wrapper = container.firstElementChild
        expect(wrapper?.className).toContain("h-56")
    })

    it("when height is not specified, then defaults to lg height class", (): void => {
        const { container } = renderWithProviders(
            <ChartContainer>
                <svg data-testid="mock-chart" />
            </ChartContainer>,
        )

        const wrapper = container.firstElementChild
        expect(wrapper?.className).toContain("h-64")
    })

    it("when height is 'xl', then applies xl height class", (): void => {
        const { container } = renderWithProviders(
            <ChartContainer height="xl">
                <svg data-testid="mock-chart" />
            </ChartContainer>,
        )

        const wrapper = container.firstElementChild
        expect(wrapper?.className).toContain("h-72")
    })
})
