import type { Meta, StoryObj } from "@storybook/react"

import type { IMetricGridMetric } from "./metrics-grid"
import { MetricsGrid } from "./metrics-grid"

const meta: Meta<typeof MetricsGrid> = {
    title: "Dashboard/MetricsGrid",
    component: MetricsGrid,
}

export default meta

type TStory = StoryObj<typeof MetricsGrid>

const FOUR_METRICS: ReadonlyArray<IMetricGridMetric> = [
    {
        id: "total-reviews",
        label: "Total reviews",
        value: "1,284",
        caption: "Last 30 days",
        trendDirection: "up",
        trendLabel: "+12%",
    },
    {
        id: "avg-resolution-time",
        label: "Avg resolution time",
        value: "4.2h",
        caption: "Per CCR",
        trendDirection: "down",
        trendLabel: "-18%",
    },
    {
        id: "critical-issues",
        label: "Critical issues",
        value: "7",
        caption: "Open right now",
        trendDirection: "neutral",
        trendLabel: "0%",
    },
    {
        id: "merge-rate",
        label: "Merge rate",
        value: "94%",
        caption: "Approved CCRs",
        trendDirection: "up",
        trendLabel: "+3%",
    },
]

const TWO_METRICS: ReadonlyArray<IMetricGridMetric> = [
    {
        id: "active-devs",
        label: "Active developers",
        value: "18",
        caption: "This sprint",
        trendDirection: "up",
        trendLabel: "+2",
    },
    {
        id: "code-coverage",
        label: "Code coverage",
        value: "87%",
        caption: "Across all packages",
        trendDirection: "down",
        trendLabel: "-1.5%",
    },
]

export const Default: TStory = {
    args: {
        metrics: FOUR_METRICS,
    },
}

export const TwoMetrics: TStory = {
    args: {
        metrics: TWO_METRICS,
    },
}
