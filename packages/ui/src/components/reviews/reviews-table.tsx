import type { ReactElement } from "react"

import {
    StyledLink,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
} from "@/components/ui"
import { type TReviewStatus } from "@/lib/types/ccr-types"
import { ReviewStatusBadge } from "./review-status-badge"

/**
 * Тип строки CCR review.
 */
export interface IReviewRow {
    /** Идентификатор CCR. */
    readonly id: string
    /** Заголовок/тема. */
    readonly title: string
    /** Репозиторий. */
    readonly repository: string
    /** Владелец/владелица. */
    readonly assignee: string
    /** Статус. */
    readonly status: TReviewStatus
    /** Кол-во комментариев. */
    readonly comments: number
    /** Последнее изменение. */
    readonly updatedAt: string
}

/**
 * Пропсы таблицы reviews.
 */
export interface IReviewsTableProps {
    /** Список CCR для вывода. */
    readonly rows: ReadonlyArray<IReviewRow>
}

/**
 * Таблица CCR.
 */
export function ReviewsTable(props: IReviewsTableProps): ReactElement {
    return (
        <Table aria-label="CCR reviews table">
            <TableHeader>
                <TableColumn>CCR</TableColumn>
                <TableColumn>Title</TableColumn>
                <TableColumn>Repository</TableColumn>
                <TableColumn>Assignee</TableColumn>
                <TableColumn>Comments</TableColumn>
                <TableColumn>Updated</TableColumn>
                <TableColumn>Status</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No CCRs found for this filter set">
                {props.rows.map(
                    (row): ReactElement => (
                        <TableRow key={row.id}>
                            <TableCell>
                                <StyledLink
                                    className="text-sm font-semibold text-foreground"
                                    params={{ reviewId: row.id }}
                                    to="/reviews/$reviewId"
                                >
                                    {row.id}
                                </StyledLink>
                            </TableCell>
                            <TableCell>{row.title}</TableCell>
                            <TableCell>{row.repository}</TableCell>
                            <TableCell>{row.assignee}</TableCell>
                            <TableCell>{row.comments}</TableCell>
                            <TableCell>{row.updatedAt}</TableCell>
                            <TableCell>
                                <ReviewStatusBadge status={row.status} />
                            </TableCell>
                        </TableRow>
                    ),
                )}
            </TableBody>
        </Table>
    )
}
