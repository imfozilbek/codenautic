import { type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { type Key, ListBox, ListBoxItem, Select } from "@heroui/react"
import {
    DashboardDateRangeFilter,
    type TDashboardDateRange,
} from "@/components/dashboard/dashboard-date-range-filter"

/**
 * Organization scope options.
 */
export type TOrgScope = "all-orgs" | "platform-team" | "frontend-team" | "runtime-team"

/**
 * Repository scope options.
 */
export type TRepositoryScope = "all-repos" | "repo-core" | "repo-ui" | "repo-api"

/**
 * Team scope options.
 */
export type TTeamScope = "all-teams" | "runtime" | "frontend" | "backend" | "data"

/**
 * Props for the DashboardScopeFilters component.
 */
export interface IDashboardScopeFiltersProps {
    /** Current org scope. */
    readonly orgScope: TOrgScope
    /** Current repo scope. */
    readonly repositoryScope: TRepositoryScope
    /** Current team scope. */
    readonly teamScope: TTeamScope
    /** Current date range. */
    readonly dateRange: TDashboardDateRange
    /** Org scope change callback. */
    readonly onOrgScopeChange: (scope: TOrgScope) => void
    /** Repo scope change callback. */
    readonly onRepositoryScopeChange: (scope: TRepositoryScope) => void
    /** Team scope change callback. */
    readonly onTeamScopeChange: (scope: TTeamScope) => void
    /** Date range change callback. */
    readonly onDateRangeChange: (range: TDashboardDateRange) => void
}

const ORG_OPTIONS: ReadonlyArray<{ readonly value: TOrgScope; readonly label: string }> = [
    { value: "all-orgs", label: "Org: all" },
    { value: "platform-team", label: "Org: platform-team" },
    { value: "frontend-team", label: "Org: frontend-team" },
    { value: "runtime-team", label: "Org: runtime-team" },
]

const REPO_OPTIONS: ReadonlyArray<{ readonly value: TRepositoryScope; readonly label: string }> = [
    { value: "all-repos", label: "Repo: all" },
    { value: "repo-core", label: "Repo: repo-core" },
    { value: "repo-ui", label: "Repo: repo-ui" },
    { value: "repo-api", label: "Repo: repo-api" },
]

const TEAM_OPTIONS: ReadonlyArray<{ readonly value: TTeamScope; readonly label: string }> = [
    { value: "all-teams", label: "Team: all" },
    { value: "runtime", label: "Team: runtime" },
    { value: "frontend", label: "Team: frontend" },
    { value: "backend", label: "Team: backend" },
    { value: "data", label: "Team: data" },
]

/**
 * Создаёт обработчик изменения scope-фильтра для HeroUI v3 Select.
 *
 * @param callback Callback для обновления scope-значения.
 * @returns Обработчик onSelectionChange.
 */
function createScopeHandler<T extends string>(callback: (value: T) => void): (key: Key | null) => void {
    return (key: Key | null): void => {
        if (key === null) {
            return
        }
        callback(String(key) as T)
    }
}

/**
 * Dashboard scope filter bar with org/repo/team selects and date range.
 * Replaces native `<select>` elements with HeroUI Select components.
 *
 * @param props Filter configuration.
 * @returns Filter bar with four selects.
 */
export function DashboardScopeFilters(props: IDashboardScopeFiltersProps): ReactElement {
    const { t } = useTranslation(["dashboard"])
    return (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Select
                aria-label={t("dashboard:ariaLabel.scopeFilters.organizationScope")}
                selectedKey={props.orgScope}
                onSelectionChange={createScopeHandler<TOrgScope>(props.onOrgScopeChange)}
            >
                <Select.Trigger>
                    <Select.Value />
                </Select.Trigger>
                <Select.Popover>
                    <ListBox>
                        {ORG_OPTIONS.map(
                            (option): ReactElement => (
                                <ListBoxItem key={option.value} id={option.value} textValue={option.label}>
                                    {option.label}
                                </ListBoxItem>
                            ),
                        )}
                    </ListBox>
                </Select.Popover>
            </Select>
            <Select
                aria-label={t("dashboard:ariaLabel.scopeFilters.repositoryScope")}
                selectedKey={props.repositoryScope}
                onSelectionChange={createScopeHandler<TRepositoryScope>(
                    props.onRepositoryScopeChange,
                )}
            >
                <Select.Trigger>
                    <Select.Value />
                </Select.Trigger>
                <Select.Popover>
                    <ListBox>
                        {REPO_OPTIONS.map(
                            (option): ReactElement => (
                                <ListBoxItem key={option.value} id={option.value} textValue={option.label}>
                                    {option.label}
                                </ListBoxItem>
                            ),
                        )}
                    </ListBox>
                </Select.Popover>
            </Select>
            <Select
                aria-label={t("dashboard:ariaLabel.scopeFilters.teamScope")}
                selectedKey={props.teamScope}
                onSelectionChange={createScopeHandler<TTeamScope>(props.onTeamScopeChange)}
            >
                <Select.Trigger>
                    <Select.Value />
                </Select.Trigger>
                <Select.Popover>
                    <ListBox>
                        {TEAM_OPTIONS.map(
                            (option): ReactElement => (
                                <ListBoxItem key={option.value} id={option.value} textValue={option.label}>
                                    {option.label}
                                </ListBoxItem>
                            ),
                        )}
                    </ListBox>
                </Select.Popover>
            </Select>
            <DashboardDateRangeFilter value={props.dateRange} onChange={props.onDateRangeChange} />
        </div>
    )
}
