import { type ChangeEvent, type ReactElement, useEffect, useMemo, useState } from "react"

import { ReviewsContent, type IReviewRow } from "@/components/reviews/reviews-content"
import { type IReviewsTableProps } from "@/components/reviews/reviews-table"

/** Параметры URL-фильтров для страницы CCR. */
export interface ICcrFilters {
    /** Поисковый текст. */
    readonly search: string
    /** Фильтр по статусу. */
    readonly status: string
    /** Фильтр по команде. */
    readonly team: string
    /** Фильтр по репозиторию. */
    readonly repository: string
}

/** Формат данных mock CCR для демонстрации списочного экрана. */
interface ICcrRow extends IReviewRow {
    /** Команда. */
    readonly team: string
    /** Уровень критичности. */
    readonly severity: "low" | "medium" | "high"
}

/** Параметры страницы CCR Management. */
export interface ICcrManagementPageProps extends ICcrFilters {
    /** Callback обновления фильтров в URL. */
    readonly onFilterChange: (next: ICcrFilters) => void
}

const PAGE_SIZE = 8
const CCR_SORT_ORDER = ["new", "queued", "in_progress", "approved", "rejected"] as const
type TCcrFilterField = keyof ICcrFilters

function isCcrFilterField(value: string): value is TCcrFilterField {
    return value === "search" || value === "status" || value === "team" || value === "repository"
}

function toFilterMatch(fieldValue: string, filterValue: string): boolean {
    if (filterValue.length === 0 || filterValue === "all") {
        return true
    }

    return fieldValue === filterValue
}

const MOCK_CCR_ROWS: ReadonlyArray<ICcrRow> = [
    {
        assignee: "Ari",
        comments: 12,
        id: "ccr-9001",
        repository: "repo-core",
        severity: "high",
        status: "new",
        team: "runtime",
        title: "Refactor auth middleware",
        updatedAt: "2026-03-01 10:12",
    },
    {
        assignee: "Nika",
        comments: 3,
        id: "ccr-9002",
        repository: "repo-ui",
        severity: "medium",
        status: "queued",
        team: "frontend",
        title: "Add retry policy for scanner",
        updatedAt: "2026-03-01 09:40",
    },
    {
        assignee: "Ari",
        comments: 9,
        id: "ccr-9003",
        repository: "repo-mobile",
        severity: "low",
        status: "in_progress",
        team: "mobile",
        title: "Fix memory leaks in stream parser",
        updatedAt: "2026-02-28 19:18",
    },
    {
        assignee: "Sari",
        comments: 4,
        id: "ccr-9004",
        repository: "repo-core",
        severity: "medium",
        status: "approved",
        team: "runtime",
        title: "Tune telemetry export window",
        updatedAt: "2026-02-28 16:10",
    },
    {
        assignee: "Nika",
        comments: 13,
        id: "ccr-9005",
        repository: "repo-ui",
        severity: "high",
        status: "rejected",
        team: "frontend",
        title: "Large bundle regression",
        updatedAt: "2026-02-28 12:43",
    },
    {
        assignee: "Oleg",
        comments: 2,
        id: "ccr-9006",
        repository: "repo-api",
        severity: "low",
        status: "in_progress",
        team: "backend",
        title: "Endpoint contract drift",
        updatedAt: "2026-02-27 14:20",
    },
    {
        assignee: "Mila",
        comments: 1,
        id: "ccr-9007",
        repository: "repo-api",
        severity: "high",
        status: "new",
        team: "backend",
        title: "Critical auth edge-case",
        updatedAt: "2026-02-27 11:01",
    },
    {
        assignee: "Ari",
        comments: 5,
        id: "ccr-9008",
        repository: "repo-data",
        severity: "medium",
        status: "queued",
        team: "data",
        title: "Optimize graph traversal path",
        updatedAt: "2026-02-26 17:30",
    },
    {
        assignee: "Nika",
        comments: 6,
        id: "ccr-9009",
        repository: "repo-core",
        severity: "low",
        status: "new",
        team: "runtime",
        title: "Clean up deprecated API docs",
        updatedAt: "2026-02-26 10:12",
    },
    {
        assignee: "Mila",
        comments: 2,
        id: "ccr-9010",
        repository: "repo-data",
        severity: "medium",
        status: "approved",
        team: "data",
        title: "Rework data contract validation",
        updatedAt: "2026-02-25 09:45",
    },
]

function createSortedOptions(values: ReadonlyArray<string>): ReadonlyArray<string> {
    return Array.from(new Set(values)).sort()
}

function findFilterOptions(rows: ReadonlyArray<ICcrRow>): {
    readonly statusOptions: ReadonlyArray<string>
    readonly teamOptions: ReadonlyArray<string>
    readonly repositoryOptions: ReadonlyArray<string>
} {
    const statusValues: string[] = [ ...CCR_SORT_ORDER ]
    const teamValues: string[] = []
    const repositoryValues: string[] = []

    for (const row of rows) {
        statusValues.push(String(row.status))
        teamValues.push(String(row.team))
        repositoryValues.push(String(row.repository))
    }

    return {
        statusOptions: createSortedOptions(statusValues),
        teamOptions: createSortedOptions(teamValues),
        repositoryOptions: createSortedOptions(repositoryValues),
    }
}

/**
 * Преобразует значение в нижний регистр безопасно.
 *
 * @param value Исходная строка.
 * @returns Lowercase представление.
 */
function toLowerSafe(value: string): string {
    return value.toLowerCase()
}

function filterRows(rows: ReadonlyArray<ICcrRow>, filters: ICcrFilters): ReadonlyArray<ICcrRow> {
    const search = String(filters.search).trim().toLowerCase()

    return rows.filter((row): boolean => {
        const rowStatus = String(row.status)
        const rowTeam = String(row.team)
        const rowRepository = String(row.repository)
        const rowIdentifier = String(row.id)
        const isStatusMatch = toFilterMatch(rowStatus, String(filters.status))
        const isTeamMatch = toFilterMatch(rowTeam, String(filters.team))
        const isRepoMatch = toFilterMatch(rowRepository, String(filters.repository))
        const isSearchMatch =
            search.length === 0 ||
            toLowerSafe(rowIdentifier).includes(search) ||
            toLowerSafe(String(row.title)).includes(search) ||
            toLowerSafe(rowRepository).includes(search) ||
            toLowerSafe(String(row.assignee)).includes(search)

        return isStatusMatch && isTeamMatch && isRepoMatch && isSearchMatch
    })
}

interface ICcrFiltersPanelProps {
    readonly filterState: ICcrFilters
    readonly statusOptions: ReadonlyArray<string>
    readonly teamOptions: ReadonlyArray<string>
    readonly repositoryOptions: ReadonlyArray<string>
    readonly onFilterChange: (next: ICcrFilters) => void
}

function CcrFiltersPanel(props: ICcrFiltersPanelProps): ReactElement {
    const handleInputChange = (name: TCcrFilterField, value: string): void => {
        props.onFilterChange({
            ...props.filterState,
            [name]: value,
        })
    }

    const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
        handleInputChange("search", event.currentTarget.value)
    }

    const handleSelectChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        const name = event.currentTarget.name
        if (isCcrFilterField(name) === false) {
            return
        }

        handleInputChange(name, event.currentTarget.value)
    }

    return (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-4">
            <input
                aria-label="Search CCR"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                name="search"
                placeholder="Search title / id / repo / assignee"
                value={props.filterState.search}
                onChange={handleSearchChange}
            />
            <select
                aria-label="Filter by team"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                name="team"
                value={props.filterState.team}
                onChange={handleSelectChange}
            >
                <option value="all">All teams</option>
                {props.teamOptions.map(
                    (team): ReactElement => (
                        <option key={team} value={team}>
                            {team}
                        </option>
                    ),
                )}
            </select>
            <select
                aria-label="Filter by repository"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                name="repository"
                value={props.filterState.repository}
                onChange={handleSelectChange}
            >
                <option value="all">All repos</option>
                {props.repositoryOptions.map(
                    (repository): ReactElement => (
                        <option key={repository} value={repository}>
                            {repository}
                        </option>
                    ),
                )}
            </select>
            <select
                aria-label="Filter by status"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                name="status"
                value={props.filterState.status}
                onChange={handleSelectChange}
            >
                <option value="all">All statuses</option>
                {props.statusOptions.map(
                    (status): ReactElement => (
                        <option key={status} value={status}>
                            {status}
                        </option>
                    ),
                )}
            </select>
        </div>
    )
}

function useCcrFilters(): {
    readonly initialRows: ReadonlyArray<ICcrRow>
    readonly filterOptions: {
        readonly statusOptions: ReadonlyArray<string>
        readonly teamOptions: ReadonlyArray<string>
        readonly repositoryOptions: ReadonlyArray<string>
    }
} {
    const filters = useMemo((): {
        readonly statusOptions: ReadonlyArray<string>
        readonly teamOptions: ReadonlyArray<string>
        readonly repositoryOptions: ReadonlyArray<string>
    } => {
        return findFilterOptions(MOCK_CCR_ROWS)
    }, [])

    return {
        initialRows: MOCK_CCR_ROWS,
        filterOptions: filters,
    }
}

/**
 * Страница списочного управления CCR (reviews) с URL фильтрами и infinite-like loading.
 *
 * @param props Параметры фильтров и callback.
 * @returns Список CCR с поиском, фильтрами и бесконечной подгрузкой.
 */
export function CcrManagementPage(props: ICcrManagementPageProps): ReactElement {
    const [visibleItems, setVisibleItems] = useState<number>(PAGE_SIZE)
    const [searchState, setSearchState] = useState<ICcrFilters>({
        repository: props.repository,
        search: props.search,
        status: props.status,
        team: props.team,
    })

    useEffect((): void => {
        setSearchState({
            repository: props.repository,
            search: props.search,
            status: props.status,
            team: props.team,
        })
        setVisibleItems(PAGE_SIZE)
    }, [props.repository, props.search, props.status, props.team])

    const { filterOptions } = useCcrFilters()
    const filteredRows = useMemo((): ReadonlyArray<ICcrRow> => {
        return filterRows(MOCK_CCR_ROWS, searchState)
    }, [searchState])
    const visibleRows = useMemo((): ReadonlyArray<IReviewRow> => {
        return filteredRows.slice(0, visibleItems)
    }, [filteredRows, visibleItems])

    const handleLoadMore = (): void => {
        setVisibleItems((previousValue): number => {
            return Math.min(previousValue + PAGE_SIZE, filteredRows.length)
        })
    }

    const hasMore = filteredRows.length > visibleItems

    const updateFilters = (nextFilters: ICcrFilters): void => {
        setSearchState(nextFilters)
        props.onFilterChange(nextFilters)
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">CCR Management</h1>
            <p className="text-sm text-slate-600">
                Filters are synced with URL. Shareable state for search, status, team and
                repository.
            </p>
            <CcrFiltersPanel
                filterState={searchState}
                onFilterChange={updateFilters}
                repositoryOptions={filterOptions.repositoryOptions}
                statusOptions={filterOptions.statusOptions}
                teamOptions={filterOptions.teamOptions}
            />
            <ReviewsContent
                hasMore={hasMore}
                isLoadingMore={false}
                onLoadMore={handleLoadMore}
                rows={visibleRows as IReviewsTableProps["rows"]}
            />
        </section>
    )
}
