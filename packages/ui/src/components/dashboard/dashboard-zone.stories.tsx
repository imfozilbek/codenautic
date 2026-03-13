import type { Meta, StoryObj } from "@storybook/react"

import { DashboardZone } from "./dashboard-zone"

const meta: Meta<typeof DashboardZone> = {
    title: "Dashboard/Zone",
    component: DashboardZone,
}

export default meta

type TStory = StoryObj<typeof DashboardZone>

export const DefaultExpanded: TStory = {
    args: {
        title: "Primary Charts",
        defaultExpanded: true,
        children: (
            <div className="grid gap-4 md:grid-cols-2">
                <div className="h-32 rounded-lg bg-surface-muted" />
                <div className="h-32 rounded-lg bg-surface-muted" />
            </div>
        ),
    },
}

export const CollapsedByDefault: TStory = {
    args: {
        title: "Advanced Metrics",
        defaultExpanded: false,
        children: <div className="h-32 rounded-lg bg-surface-muted" />,
    },
}

export const PrimaryPriority: TStory = {
    args: {
        title: "Primary Zone",
        priority: "primary",
        defaultExpanded: true,
        children: (
            <div className="grid gap-4 md:grid-cols-2">
                <div className="h-32 rounded-lg bg-surface-muted" />
                <div className="h-32 rounded-lg bg-surface-muted" />
            </div>
        ),
    },
}

export const TertiaryPriority: TStory = {
    args: {
        title: "Tertiary Zone",
        priority: "tertiary",
        defaultExpanded: true,
        children: <div className="h-32 rounded-lg bg-surface-muted" />,
    },
}

export const Hidden: TStory = {
    args: {
        title: "Hidden Zone",
        isVisible: false,
        children: <div>This should not render</div>,
    },
}
