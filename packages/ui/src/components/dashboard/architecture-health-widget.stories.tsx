import type { Meta, StoryObj } from "@storybook/react"

import { ArchitectureHealthWidget } from "./architecture-health-widget"

const meta: Meta<typeof ArchitectureHealthWidget> = {
    title: "Dashboard/ArchitectureHealthWidget",
    component: ArchitectureHealthWidget,
}

export default meta

type TStory = StoryObj<typeof ArchitectureHealthWidget>

export const Healthy: TStory = {
    args: {
        healthScore: 85,
        layerViolations: 2,
        dddCompliance: 90,
    },
}

export const Degraded: TStory = {
    args: {
        healthScore: 55,
        layerViolations: 12,
        dddCompliance: 62,
    },
}
