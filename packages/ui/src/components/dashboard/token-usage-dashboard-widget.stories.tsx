import type { Meta, StoryObj } from "@storybook/react"

import type {
    ITokenUsageModelPoint,
    ITokenUsageTrendPoint,
} from "./token-usage-dashboard-widget"
import { TokenUsageDashboardWidget } from "./token-usage-dashboard-widget"

const meta: Meta<typeof TokenUsageDashboardWidget> = {
    title: "Dashboard/TokenUsageDashboardWidget",
    component: TokenUsageDashboardWidget,
}

export default meta

type TStory = StoryObj<typeof TokenUsageDashboardWidget>

const BY_MODEL: ReadonlyArray<ITokenUsageModelPoint> = [
    { model: "GPT-4o", tokens: 1_240_000 },
    { model: "Claude Opus", tokens: 890_000 },
    { model: "Gemini Pro", tokens: 420_000 },
]

const COST_TREND: ReadonlyArray<ITokenUsageTrendPoint> = [
    { period: "Mar 1", costUsd: 42.5 },
    { period: "Mar 2", costUsd: 38.1 },
    { period: "Mar 3", costUsd: 45.8 },
    { period: "Mar 4", costUsd: 51.2 },
    { period: "Mar 5", costUsd: 47.9 },
]

export const Default: TStory = {
    args: {
        byModel: BY_MODEL,
        costTrend: COST_TREND,
    },
}
