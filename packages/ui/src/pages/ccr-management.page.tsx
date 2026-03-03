import {type ChangeEvent, type ReactElement, useEffect, useMemo, useState} from "react"

import {ReviewsContent, type IReviewRow} from "@/components/reviews/reviews-content"
import {type IReviewsTableProps} from "@/components/reviews/reviews-table"

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

    const statusOptions = useMemo((): ReadonlyArray<string> => {
        return Array.from(new Set(CCR_SORT_ORDER.concat(MOCK_CCR_ROWS.map((row): string => row.status)))).sort()
    }, [])

    const teamOptions = useMemo((): ReadonlyArray<string> => {
        return Array.from(new Set(MOCK_CCR_ROWS.map((row): string => row.team))).sort()
    }, [])

    const repositoryOptions = useMemo((): ReadonlyArray<string> => {
        return Array.from(new Set(MOCK_CCR_ROWS.map((row): string => row.repository))).sort()
    }, [])

    const sortedRows = useMemo((): ReadonlyArray<ICcrRow> => {
        const search = searchState.search.trim().toLowerCase()

        return MOCK_CCR_ROWS.filter((row): boolean => {
            const isStatusMatch =
                searchState.status.length === 0 || searchState.status === "all" || row.status === searchState.status
            const isTeamMatch =
                searchState.team.length === 0 || searchState.team === "all" || row.team === searchState.team
            const isRepoMatch =
                searchState.repository.length === 0 ||
                searchState.repository === "all" ||
                row.repository === searchState.repository
            const isSearchMatch =
                search.length === 0 ||
                row.id.toLowerCase().includes(search) ||
                row.title.toLowerCase().includes(search) ||
                row.repository.toLowerCase().includes(search) ||
                row.assignee.toLowerCase().includes(search)

            return isStatusMatch && isTeamMatch && isRepoMatch && isSearchMatch
        })
    }, [searchState.repository, searchState.search, searchState.status, searchState.team])

    const visibleRows = useMemo((): ReadonlyArray<IReviewRow> => {
        return sortedRows.slice(0, visibleItems)
    }, [sortedRows, visibleItems])

    const hasMore = sortedRows.length > visibleItems

    const handleLoadMore = async (): Promise<void> => {
        setVisibleItems((previousValue): number => {
            return Math.min(previousValue + PAGE_SIZE, sortedRows.length)
        })
    }

    const handleFilterUpdate = (event: ChangeEvent<HTMLSelectElement | HTMLInputElement>): void => {
        const {name, value} = event.currentTarget
        const nextFilters = {
            ...searchState,
            [name]: value,
        }
        setSearchState(nextFilters)
        props.onFilterChange(nextFilters)
    }

    const searchInputValue = searchState.search

    const handleSearchInput = (event: ChangeEvent<HTMLInputElement>): void => {
        const next = event.currentTarget.value
        const nextFilters = {
            ...searchState,
            search: next,
        }
        setSearchState(nextFilters)
        props.onFilterChange(nextFilters)
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">CCR Management</h1>
            <p className="text-sm text-slate-600">
                Filters are synced with URL. Shareable state for search, status, team and repository.
            </p>
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-4">
                <input
                    aria-label="Search CCR"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                    name="search"
                    placeholder="Search title / id / repo / assignee"
                    value={searchInputValue}
                    onChange={handleSearchInput}
                />
                <select
                    aria-label="Filter by team"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    name="team"
                    value={searchState.team}
                    onChange={handleFilterUpdate}
                >
                    <option value="all">All teams</option>
                    {teamOptions.map((team): ReactElement => (
                        <option key={team} value={team}>
                            {team}
                        </option>
                    ))}
                </select>
                <select
                    aria-label="Filter by repository"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    name="repository"
                    value={searchState.repository}
                    onChange={handleFilterUpdate}
                >
                    <option value="all">All repos</option>
                    {repositoryOptions.map((repository): ReactElement => (
                        <option key={repository} value={repository}>
                            {repository}
                        </option>
                    ))}
                </select>
                <select
                    aria-label="Filter by status"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    name="status"
                    value={searchState.status}
                    onChange={handleFilterUpdate}
                >
                    <option value="all">All statuses</option>
                    {statusOptions.map((status): ReactElement => (
                        <option key={status} value={status}>
                            {status}
                        </option>
                    ))}
                </select>
            </div>
            <ReviewsContent
                hasMore={hasMore}
                isLoadingMore={false}
                onLoadMore={handleLoadMore}
                rows={visibleRows as IReviewsTableProps["rows"]}
            />
        </section>
    )
}
