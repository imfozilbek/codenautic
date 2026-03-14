import { type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { StyledLink } from "@/components/layout/styled-link"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { EnterpriseDataTable } from "@/components/infrastructure/enterprise-data-table"
import { InfiniteScrollContainer } from "@/components/infrastructure/infinite-scroll-container"
import { ReviewsFilters } from "./reviews-filters"
import { type IReviewRow } from "./reviews-table"
import { ReviewStatusBadge } from "./review-status-badge"

/**
 * Параметры списка CCR.
 */
export interface IReviewsContentProps {
    /** Исходный список CCR. */
    readonly rows: ReadonlyArray<IReviewRow>
    /** Показывать ли встроенную панель фильтров списка. */
    readonly showInlineFilters?: boolean
    /** Скрыть заголовок секции (когда страница уже рендерит свой h1). */
    readonly hideTitle?: boolean
    /** Есть ли ещё страницы. */
    readonly hasMore: boolean
    /** Идёт ли фоновая подгрузка. */
    readonly isLoadingMore: boolean
    /** Callback для подгрузки следующего чанка. */
    readonly onLoadMore: () => Promise<void> | void
}

function estimateCcrRowHeight(row: IReviewRow, density: "comfortable" | "compact"): number {
    const baseHeight = density === "compact" ? 44 : 58
    const titleLineCount = Math.max(1, Math.ceil(row.title.length / 62))
    const repositoryLineCount = Math.max(1, Math.ceil(row.repository.length / 40))
    const maxLineCount = Math.max(titleLineCount, repositoryLineCount)

    return baseHeight + (maxLineCount - 1) * 16
}

/**
 * Секция управления CCR в стиле mission control.
 */
export function ReviewsContent(props: IReviewsContentProps): ReactElement {
    const { t } = useTranslation(["reviews"])
    const showInlineFilters = props.showInlineFilters ?? true
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
        if (showInlineFilters === false) {
            return props.rows
        }

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
    }, [assigneeFilter, debouncedSearch, props.rows, showInlineFilters, statusFilter])

    const hasActiveFilter =
        showInlineFilters === true &&
        (statusFilter !== "all" || assigneeFilter !== "all" || debouncedSearch.trim().length > 0)

    return (
        <section className="space-y-4">
            {props.hideTitle === true ? null : (
                <h2 className={TYPOGRAPHY.sectionTitle}>{t("reviews:content.sectionTitle")}</h2>
            )}
            {showInlineFilters === true ? (
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
            ) : null}
            {hasActiveFilter ? (
                <p className="text-sm text-muted-foreground">
                    {t("reviews:content.showingFiltered", {
                        filtered: String(filteredRows.length),
                        total: String(props.rows.length),
                    })}
                </p>
            ) : null}
            {filteredRows.length === 0 && props.rows.length > 0 && hasActiveFilter ? (
                <p className="py-6 text-center text-sm text-text-secondary">
                    {t("reviews:content.noMatchingFilters")}
                </p>
            ) : null}
            <InfiniteScrollContainer
                hasMore={props.hasMore}
                isLoading={props.isLoadingMore}
                loadingText={t("reviews:content.loadingMore")}
                onLoadMore={props.onLoadMore}
            >
                <EnterpriseDataTable
                    ariaLabel={t("reviews:content.tableAriaLabel")}
                    columns={[
                        {
                            accessor: (row): string => row.id,
                            cell: (row): ReactElement => (
                                <StyledLink
                                    className={TYPOGRAPHY.cardTitle}
                                    params={{ reviewId: row.id }}
                                    to="/reviews/$reviewId"
                                >
                                    {row.id}
                                </StyledLink>
                            ),
                            header: t("reviews:content.columnCcrId"),
                            id: "id",
                            pin: "left",
                            size: 140,
                        },
                        {
                            accessor: (row): string => row.title,
                            header: t("reviews:content.columnTitle"),
                            id: "title",
                            size: 280,
                        },
                        {
                            accessor: (row): string => row.repository,
                            header: t("reviews:content.columnRepository"),
                            id: "repository",
                            size: 200,
                        },
                        {
                            accessor: (row): string => row.assignee,
                            header: t("reviews:content.columnAssignee"),
                            id: "assignee",
                            size: 180,
                        },
                        {
                            accessor: (row): number => row.comments,
                            header: t("reviews:content.columnComments"),
                            id: "comments",
                            size: 120,
                        },
                        {
                            accessor: (row): string => row.updatedAt,
                            header: t("reviews:content.columnUpdatedAt"),
                            id: "updatedAt",
                            size: 180,
                        },
                        {
                            accessor: (row): string => row.status,
                            cell: (row): ReactElement => <ReviewStatusBadge status={row.status} />,
                            header: t("reviews:content.columnStatus"),
                            id: "status",
                            size: 180,
                        },
                    ]}
                    emptyMessage={t("reviews:content.emptyMessage")}
                    getRowId={(row): string => row.id}
                    id="ccr-management-table"
                    rows={filteredRows}
                    stickyHeader={{
                        enabled: true,
                        topOffset: 0,
                        withShadow: true,
                    }}
                    virtualization={{
                        estimateRowHeight: {
                            comfortable: 58,
                            compact: 44,
                        },
                        maxBodyHeight: 560,
                        overscan: 12,
                        rowHeightEstimator: estimateCcrRowHeight,
                    }}
                />
            </InfiniteScrollContainer>
        </section>
    )
}

export type { TReviewStatus } from "@/lib/types/ccr-types"
export type { IReviewRow } from "./reviews-table"
