import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { Table } from "@heroui/react"
import { StyledLink } from "@/components/layout/styled-link"
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
        <Table>
            <Table.ScrollContainer>
                <Table.Content aria-label={t("reviews:table.ariaLabel")}>
                    <Table.Header>
                        <Table.Column isRowHeader>{t("reviews:table.columnCcr")}</Table.Column>
                        <Table.Column>{t("reviews:table.columnTitle")}</Table.Column>
                        <Table.Column>{t("reviews:table.columnRepository")}</Table.Column>
                        <Table.Column>{t("reviews:table.columnAssignee")}</Table.Column>
                        <Table.Column>{t("reviews:table.columnComments")}</Table.Column>
                        <Table.Column>{t("reviews:table.columnUpdated")}</Table.Column>
                        <Table.Column>{t("reviews:table.columnStatus")}</Table.Column>
                    </Table.Header>
                    <Table.Body>
                        {props.rows.length === 0 ? (
                            <Table.Row>
                                <Table.Cell>{t("reviews:table.emptyContent")}</Table.Cell>
                                <Table.Cell>{""}</Table.Cell>
                                <Table.Cell>{""}</Table.Cell>
                                <Table.Cell>{""}</Table.Cell>
                                <Table.Cell>{""}</Table.Cell>
                                <Table.Cell>{""}</Table.Cell>
                                <Table.Cell>{""}</Table.Cell>
                            </Table.Row>
                        ) : (
                            props.rows.map(
                                (row): ReactElement => (
                                    <Table.Row key={row.id}>
                                        <Table.Cell>
                                            <StyledLink
                                                className={TYPOGRAPHY.cardTitle}
                                                params={{ reviewId: row.id }}
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
                            )
                        )}
                    </Table.Body>
                </Table.Content>
            </Table.ScrollContainer>
        </Table>
    )
}
