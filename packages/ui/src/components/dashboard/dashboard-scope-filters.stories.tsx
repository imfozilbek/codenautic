import { useState, type ReactElement } from "react"
import type { Meta, StoryObj } from "@storybook/react"

import {
    DashboardScopeFilters,
    type TOrgScope,
    type TRepositoryScope,
    type TTeamScope,
} from "./dashboard-scope-filters"
import type { TDashboardDateRange } from "./dashboard-date-range-filter"

const meta: Meta<typeof DashboardScopeFilters> = {
    title: "Dashboard/ScopeFilters",
    component: DashboardScopeFilters,
}

export default meta

type TStory = StoryObj<typeof DashboardScopeFilters>

function InteractiveScopeFilters(): ReactElement {
    const [orgScope, setOrgScope] = useState<TOrgScope>("all-orgs")
    const [repositoryScope, setRepositoryScope] = useState<TRepositoryScope>("all-repos")
    const [teamScope, setTeamScope] = useState<TTeamScope>("all-teams")
    const [dateRange, setDateRange] = useState<TDashboardDateRange>("7d")

    return (
        <DashboardScopeFilters
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onOrgScopeChange={setOrgScope}
            onRepositoryScopeChange={setRepositoryScope}
            onTeamScopeChange={setTeamScope}
            orgScope={orgScope}
            repositoryScope={repositoryScope}
            teamScope={teamScope}
        />
    )
}

export const Interactive: TStory = {
    render: (): ReactElement => <InteractiveScopeFilters />,
}
