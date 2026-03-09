import type { Meta, StoryObj } from "@storybook/react"

import type { IStatusDistributionPoint } from "./status-distribution-chart"
import { StatusDistributionChart } from "./status-distribution-chart"

const meta: Meta<typeof StatusDistributionChart> = {
    title: "Dashboard/StatusDistributionChart",
    component: StatusDistributionChart,
}

export default meta

type TStory = StoryObj<typeof StatusDistributionChart>

const MULTI_STATUS_DATA: ReadonlyArray<IStatusDistributionPoint> = [
    { status: "Approved", count: 42, color: "oklch(0.72 0.19 142)" },
    { status: "Pending Review", count: 18, color: "oklch(0.75 0.18 80)" },
    { status: "Changes Requested", count: 11, color: "oklch(0.63 0.24 29)" },
    { status: "Draft", count: 7, color: "oklch(0.65 0.15 250)" },
    { status: "Merged", count: 56, color: "oklch(0.55 0.18 270)" },
]

export const Default: TStory = {
    args: {
        data: MULTI_STATUS_DATA,
        title: "CCR status distribution",
    },
}

const SINGLE_STATUS_DATA: ReadonlyArray<IStatusDistributionPoint> = [
    { status: "Approved", count: 34, color: "oklch(0.72 0.19 142)" },
]

export const SingleStatus: TStory = {
    args: {
        data: SINGLE_STATUS_DATA,
        title: "Single status view",
    },
}
