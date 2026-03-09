import type { Meta, StoryObj } from "@storybook/react"

import { DashboardHeroMetric } from "./dashboard-hero-metric"

const meta: Meta<typeof DashboardHeroMetric> = {
    title: "Dashboard/HeroMetric",
    component: DashboardHeroMetric,
}

export default meta

type TStory = StoryObj<typeof DashboardHeroMetric>

export const HealthScore: TStory = {
    args: {
        label: "Health Score",
        value: 87,
        color: "var(--success)",
        subtitle: "+3 from last week",
    },
}

export const RiskScore: TStory = {
    args: {
        label: "Risk Score",
        value: 23,
        color: "var(--danger)",
        subtitle: "Low risk",
    },
}

export const HalfFull: TStory = {
    args: {
        label: "Coverage",
        value: 50,
        max: 100,
        color: "var(--warning)",
    },
}
