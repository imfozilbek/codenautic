import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import {
    StyledLink,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
} from "@/components/ui"
import { TYPOGRAPHY } from "@/lib/constants/typography"
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
    const { t } = useTranslation(["reviews"])

    return (
        <Table aria-label={t("reviews:table.ariaLabel")}>
            <TableHeader>
                <TableColumn>{t("reviews:table.columnCcr")}</TableColumn>
                <TableColumn>{t("reviews:table.columnTitle")}</TableColumn>
                <TableColumn>{t("reviews:table.columnRepository")}</TableColumn>
                <TableColumn>{t("reviews:table.columnAssignee")}</TableColumn>
                <TableColumn>{t("reviews:table.columnComments")}</TableColumn>
                <TableColumn>{t("reviews:table.columnUpdated")}</TableColumn>
                <TableColumn>{t("reviews:table.columnStatus")}</TableColumn>
            </TableHeader>
            <TableBody emptyContent={t("reviews:table.emptyContent")}>
                {props.rows.map(
                    (row): ReactElement => (
                        <TableRow key={row.id}>
                            <TableCell>
                                <StyledLink
                                    className={TYPOGRAPHY.cardTitle}
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
