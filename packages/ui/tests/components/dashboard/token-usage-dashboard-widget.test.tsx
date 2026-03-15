import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
    TokenUsageDashboardWidget,
    type ITokenUsageDashboardWidgetProps,
    type ITokenUsageModelPoint,
    type ITokenUsageTrendPoint,
} from "@/components/dashboard/token-usage-dashboard-widget"
import { renderWithProviders } from "../../utils/render"

vi.mock("recharts", () => ({
    Area: ({ children }: { readonly children?: React.ReactNode }): React.ReactElement => (
        <div data-testid="recharts-area">{children}</div>
    ),
    AreaChart: ({ children }: { readonly children?: React.ReactNode }): React.ReactElement => (
        <div data-testid="recharts-area-chart">{children}</div>
    ),
    CartesianGrid: (): React.ReactElement => <div data-testid="recharts-grid" />,
    Cell: (): React.ReactElement => <div data-testid="recharts-cell" />,
    Pie: ({ children }: { readonly children?: React.ReactNode }): React.ReactElement => (
        <div data-testid="recharts-pie">{children}</div>
    ),
    PieChart: ({ children }: { readonly children?: React.ReactNode }): React.ReactElement => (
        <div data-testid="recharts-pie-chart">{children}</div>
    ),
    ResponsiveContainer: ({
        children,
    }: {
        readonly children?: React.ReactNode
    }): React.ReactElement => <div data-testid="recharts-responsive">{children}</div>,
    Tooltip: (): React.ReactElement => <div data-testid="recharts-tooltip" />,
    XAxis: (): React.ReactElement => <div data-testid="recharts-xaxis" />,
    YAxis: (): React.ReactElement => <div data-testid="recharts-yaxis" />,
}))

vi.mock("@/lib/motion", () => ({
    DURATION: { normal: 0 },
    EASING: { move: [0, 0, 1, 1] },
    CHART_DATA_TRANSITION: {},
    CHART_DATA_TRANSITION_NONE: {},
    STAGGER_DELAY: 0,
    STAGGER_ITEM_VARIANTS: {},
    AnimatedAlert: ({
        children,
        isVisible,
    }: {
        readonly children: React.ReactNode
        readonly isVisible: boolean
    }): React.ReactElement | null => (isVisible ? <div>{children}</div> : null),
    AnimatedMount: ({ children }: { readonly children: React.ReactNode }): React.ReactElement => (
        <div>{children}</div>
    ),
    FADE_VARIANTS: {},
    PAGE_TRANSITION_VARIANTS: {},
    SCALE_FADE_VARIANTS: {},
}))

vi.mock("react-countup", () => ({
    default: ({ end }: { readonly end: number }): React.ReactElement => (
        <span>{String(end)}</span>
    ),
    useCountUp: (): { readonly countUp: string } => ({ countUp: "0" }),
}))

const MODEL_DATA: ReadonlyArray<ITokenUsageModelPoint> = [
    { model: "gpt-4", tokens: 50000 },
    { model: "claude-3", tokens: 30000 },
]

const COST_TREND: ReadonlyArray<ITokenUsageTrendPoint> = [
    { period: "2026-W01", costUsd: 120 },
    { period: "2026-W02", costUsd: 145 },
]

function createProps(
    overrides: Partial<ITokenUsageDashboardWidgetProps> = {},
): ITokenUsageDashboardWidgetProps {
    return {
        byModel: overrides.byModel ?? MODEL_DATA,
        costTrend: overrides.costTrend ?? COST_TREND,
    }
}

describe("TokenUsageDashboardWidget", (): void => {
    it("when rendered with data, then shows title and description", (): void => {
        const props = createProps()
        renderWithProviders(<TokenUsageDashboardWidget {...props} />)

        expect(screen.queryByText("Token usage dashboard")).not.toBeNull()
        expect(
            screen.queryByText(
                "Usage by model, cost breakdown and trend chart for selected range.",
            ),
        ).not.toBeNull()
    })

    it("when both byModel and costTrend are empty, then shows empty state", (): void => {
        const props = createProps({ byModel: [], costTrend: [] })
        renderWithProviders(<TokenUsageDashboardWidget {...props} />)

        expect(screen.queryByText("No data")).not.toBeNull()
        expect(screen.queryByText("No token usage data available for this period.")).not.toBeNull()
    })

    it("when data is provided, then does not show empty state", (): void => {
        const props = createProps()
        renderWithProviders(<TokenUsageDashboardWidget {...props} />)

        expect(screen.queryByText("No data")).toBeNull()
    })

    it("when only byModel has data, then renders charts section", (): void => {
        const props = createProps({ costTrend: [] })
        renderWithProviders(<TokenUsageDashboardWidget {...props} />)

        expect(screen.queryByText("No data")).toBeNull()
        expect(screen.queryByText("Token usage dashboard")).not.toBeNull()
    })
})
