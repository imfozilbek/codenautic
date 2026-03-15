import { type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useDebounceValue } from "usehooks-ts"

import { Table } from "@heroui/react"
import { StyledLink } from "@/components/layout/styled-link"
import { TYPOGRAPHY } from "@/lib/constants/typography"
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

/**
 * Секция управления CCR в стиле mission control.
 */
export function ReviewsContent(props: IReviewsContentProps): ReactElement {
    const { t } = useTranslation(["reviews"])
    const showInlineFilters = props.showInlineFilters ?? true
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [assigneeFilter, setAssigneeFilter] = useState<string>("all")
    const [debouncedSearch] = useDebounceValue(search, 220)

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
                <p className="text-sm text-muted">
                    {t("reviews:content.showingFiltered", {
                        filtered: String(filteredRows.length),
                        total: String(props.rows.length),
                    })}
                </p>
            ) : null}
            {filteredRows.length === 0 && props.rows.length > 0 && hasActiveFilter ? (
                <p className="py-6 text-center text-sm text-muted">
                    {t("reviews:content.noMatchingFilters")}
                </p>
            ) : null}
            <InfiniteScrollContainer
                hasMore={props.hasMore}
                isLoading={props.isLoadingMore}
                loadingText={t("reviews:content.loadingMore")}
                onLoadMore={props.onLoadMore}
            >
                <Table>
                    <Table.ScrollContainer>
                        <Table.Content aria-label={t("reviews:content.tableAriaLabel")}>
                            <Table.Header>
                                <Table.Column isRowHeader>
                                    {t("reviews:content.columnCcrId")}
                                </Table.Column>
                                <Table.Column>{t("reviews:content.columnTitle")}</Table.Column>
                                <Table.Column>{t("reviews:content.columnRepository")}</Table.Column>
                                <Table.Column>{t("reviews:content.columnAssignee")}</Table.Column>
                                <Table.Column>{t("reviews:content.columnComments")}</Table.Column>
                                <Table.Column>{t("reviews:content.columnUpdatedAt")}</Table.Column>
                                <Table.Column>{t("reviews:content.columnStatus")}</Table.Column>
                            </Table.Header>
                            <Table.Body>
                                {filteredRows.map(
                                    (row): ReactElement => (
                                        <Table.Row key={row.id}>
                                            <Table.Cell>
                                                <StyledLink
                                                    className={TYPOGRAPHY.cardTitle}
                                                    params={{
                                                        reviewId: row.id,
                                                    }}
                                                    to="/reviews/$reviewId"
                                                >
                                                    {row.id}
                                                </StyledLink>
                                            </Table.Cell>
                                            <Table.Cell>{row.title}</Table.Cell>
                                            <Table.Cell>{row.repository}</Table.Cell>
                                            <Table.Cell>{row.assignee}</Table.Cell>
                                            <Table.Cell>{row.comments}</Table.Cell>
                                            <Table.Cell>{row.updatedAt}</Table.Cell>
                                            <Table.Cell>
                                                <ReviewStatusBadge status={row.status} />
                                            </Table.Cell>
                                        </Table.Row>
                                    ),
                                )}
                            </Table.Body>
                        </Table.Content>
                    </Table.ScrollContainer>
                </Table>
            </InfiniteScrollContainer>
        </section>
    )
}

export type { TReviewStatus } from "@/lib/types/ccr-types"
export type { IReviewRow } from "./reviews-table"
