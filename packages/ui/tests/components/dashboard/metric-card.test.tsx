import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { MetricCard, type IMetricCardProps } from "@/components/dashboard/metric-card"
import { renderWithProviders } from "../../utils/render"

vi.mock("@/lib/motion", () => ({
    DURATION: { normal: 0 },
    EASING: { move: [0, 0, 1, 1] },
    useReducedMotion: (): boolean => true,
    useCountUp: ({ target }: { readonly target: number }): number => target,
    CHART_DATA_TRANSITION: {},
    CHART_DATA_TRANSITION_NONE: {},
}))

function createProps(overrides: Partial<IMetricCardProps> = {}): IMetricCardProps {
    return {
        label: overrides.label ?? "Total reviews",
        value: overrides.value ?? "1,234",
        caption: overrides.caption,
        trendDirection: overrides.trendDirection,
        trendLabel: overrides.trendLabel,
    }
}

describe("MetricCard", (): void => {
    it("when rendered with label and value, then displays both", (): void => {
        const props = createProps()
        renderWithProviders(<MetricCard {...props} />)

        expect(screen.queryByText("Total reviews")).not.toBeNull()
        expect(screen.queryByText("1,234")).not.toBeNull()
    })

    it("when caption is provided, then displays caption text", (): void => {
        const props = createProps({ caption: "Last 30 days" })
        renderWithProviders(<MetricCard {...props} />)

        expect(screen.queryByText("Last 30 days")).not.toBeNull()
    })

    it("when caption is not provided, then does not render caption", (): void => {
        const props = createProps()
        renderWithProviders(<MetricCard {...props} />)

        expect(screen.queryByText("Last 30 days")).toBeNull()
    })

    it("when trend is provided, then displays trend label chip", (): void => {
        const props = createProps({
            trendDirection: "up",
            trendLabel: "+8%",
        })
        renderWithProviders(<MetricCard {...props} />)

        expect(screen.queryByText("+8%")).not.toBeNull()
    })

    it("when trend is not provided, then does not render trend chip", (): void => {
        const props = createProps()
        const { container } = renderWithProviders(<MetricCard {...props} />)

        const chips = container.querySelectorAll("[class*='chip']")
        expect(chips.length).toBe(0)
    })

    it("when value is non-numeric, then displays value as-is", (): void => {
        const props = createProps({ value: "N/A" })
        renderWithProviders(<MetricCard {...props} />)

        expect(screen.queryByText("N/A")).not.toBeNull()
    })
})
