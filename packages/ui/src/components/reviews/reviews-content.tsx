import { type ReactElement, useMemo, useState } from "react"

import { useDebounce } from "@/lib/hooks/use-debounce"
import { InfiniteScrollContainer } from "@/components/infrastructure/infinite-scroll-container"
import { ReviewsFilters } from "./reviews-filters"
import { ReviewsTable, type IReviewRow } from "./reviews-table"
import { type TReviewStatus } from "./review-status-badge"

/**
 * Параметры списка CCR.
 */
export interface IReviewsContentProps {
    /** Исходный список CCR. */
    readonly rows: ReadonlyArray<IReviewRow>
    /** Есть ли ещё страницы. */
    readonly hasMore: boolean
    /** Идёт ли фоновая подгрузка. */
    readonly isLoadingMore: boolean
    /** Callback для подгрузки следующего чанка. */
    readonly onLoadMore: () => Promise<void> | void
}

/**
 * Секция управления CCR в стиле mission control.
 */
export function ReviewsContent(props: IReviewsContentProps): ReactElement {
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [assigneeFilter, setAssigneeFilter] = useState<string>("all")
    const debouncedSearch = useDebounce(search, 220)

    const statusOptions = useMemo((): string[] => {
        const statuses = new Set<string>()
        for (const row of props.rows) {
            statuses.add(row.status)
        }
        return Array.from(statuses).sort()
    }, [props.rows])

    const assigneeOptions = useMemo((): string[] => {
        const assignees = new Set<string>()
        for (const row of props.rows) {
            assignees.add(row.assignee)
        }
        return Array.from(assignees).sort()
    }, [props.rows])

    const filteredRows = useMemo((): readonly IReviewRow[] => {
        return props.rows.filter((row): boolean => {
            const searchNormalized = debouncedSearch.trim().toLowerCase()
            const statusMatches = statusFilter === "all" || row.status === statusFilter
            const assigneeMatches = assigneeFilter === "all" || row.assignee === assigneeFilter
            const textMatches =
                searchNormalized.length === 0 ||
                row.id.toLowerCase().includes(searchNormalized) ||
                row.title.toLowerCase().includes(searchNormalized) ||
                row.repository.toLowerCase().includes(searchNormalized)
            return statusMatches && assigneeMatches && textMatches
        })
    }, [assigneeFilter, debouncedSearch, props.rows, statusFilter])

    const hasActiveFilter =
        statusFilter !== "all" || assigneeFilter !== "all" || debouncedSearch.trim().length > 0

    return (
        <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">CCR Management</h2>
            <ReviewsFilters
                assignee={assigneeFilter}
                assigneeOptions={assigneeOptions}
                search={search}
                status={statusFilter}
                statusOptions={statusOptions}
                onAssigneeChange={setAssigneeFilter}
                onReset={(): void => {
                    setSearch("")
                    setStatusFilter("all")
                    setAssigneeFilter("all")
                }}
                onSearchChange={setSearch}
                onStatusChange={setStatusFilter}
            />
            {hasActiveFilter ? (
                <p className="text-sm text-slate-600">
                    Showing {filteredRows.length} from {props.rows.length} CCR entries.
                </p>
            ) : null}
            <InfiniteScrollContainer
                hasMore={props.hasMore}
                isLoading={props.isLoadingMore}
                loadingText="Подгружаем дополнительные CCR..."
                onLoadMore={props.onLoadMore}
            >
                <ReviewsTable rows={filteredRows as IReviewRow[]} />
            </InfiniteScrollContainer>
        </section>
    )
}

/**
 * Тип статуса для удобства сборки фильтров.
 */
export type { TReviewStatus }
