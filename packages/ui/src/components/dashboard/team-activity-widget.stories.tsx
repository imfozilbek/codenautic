import type { Meta, StoryObj } from "@storybook/react"

import type { ITeamActivityPoint } from "./team-activity-widget"
import { TeamActivityWidget } from "./team-activity-widget"

const meta: Meta<typeof TeamActivityWidget> = {
    title: "Dashboard/TeamActivityWidget",
    component: TeamActivityWidget,
}

export default meta

type TStory = StoryObj<typeof TeamActivityWidget>

const TEAM_POINTS: ReadonlyArray<ITeamActivityPoint> = [
    { developer: "Alice", ccrMerged: 24 },
    { developer: "Bob", ccrMerged: 18 },
    { developer: "Charlie", ccrMerged: 31 },
    { developer: "Dana", ccrMerged: 12 },
    { developer: "Eve", ccrMerged: 27 },
]

export const Default: TStory = {
    args: {
        points: TEAM_POINTS,
    },
}

export const Empty: TStory = {
    args: {
        points: [],
    },
}
