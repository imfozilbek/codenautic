import type { Meta, StoryObj } from "@storybook/react"
import { Bar, BarChart, Tooltip, XAxis, YAxis } from "recharts"

import { ChartContainer } from "./chart-container"

const meta: Meta<typeof ChartContainer> = {
    title: "Charts/ChartContainer",
    component: ChartContainer,
}

export default meta

type TStory = StoryObj<typeof ChartContainer>

const SAMPLE_DATA = [
    { name: "Mon", value: 40 },
    { name: "Tue", value: 55 },
    { name: "Wed", value: 30 },
    { name: "Thu", value: 70 },
    { name: "Fri", value: 45 },
]

export const Small: TStory = {
    args: {
        height: "sm",
        children: (
            <BarChart data={SAMPLE_DATA}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="var(--chart-primary)" />
            </BarChart>
        ),
    },
}

export const Large: TStory = {
    args: {
        height: "lg",
        children: (
            <BarChart data={SAMPLE_DATA}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="var(--chart-secondary)" />
            </BarChart>
        ),
    },
}
