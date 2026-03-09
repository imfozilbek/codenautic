import type { Meta, StoryObj } from "@storybook/react"

import type { IFlowMetricsPoint } from "./flow-metrics-widget"
import { FlowMetricsWidget } from "./flow-metrics-widget"

const meta: Meta<typeof FlowMetricsWidget> = {
    title: "Dashboard/FlowMetricsWidget",
    component: FlowMetricsWidget,
}

export default meta

type TStory = StoryObj<typeof FlowMetricsWidget>

const SEVEN_POINTS: ReadonlyArray<IFlowMetricsPoint> = [
    { window: "Week 1", flowEfficiency: 62, deliveryCapacity: 34 },
    { window: "Week 2", flowEfficiency: 65, deliveryCapacity: 38 },
    { window: "Week 3", flowEfficiency: 60, deliveryCapacity: 36 },
    { window: "Week 4", flowEfficiency: 68, deliveryCapacity: 40 },
    { window: "Week 5", flowEfficiency: 72, deliveryCapacity: 42 },
    { window: "Week 6", flowEfficiency: 70, deliveryCapacity: 45 },
    { window: "Week 7", flowEfficiency: 74, deliveryCapacity: 48 },
]

export const Default: TStory = {
    args: {
        points: SEVEN_POINTS,
        flowTrendLabel: "+4%",
        capacityTrendLabel: "+6%",
    },
}

export const Empty: TStory = {
    args: {
        points: [],
        flowTrendLabel: "0%",
        capacityTrendLabel: "0%",
    },
}
