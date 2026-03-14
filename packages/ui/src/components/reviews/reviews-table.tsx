import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

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
        <table aria-label={t("reviews:table.ariaLabel")} className="w-full text-left text-sm">
            <thead>
                <tr className="border-b border-border">
                    <th className="px-3 py-2 font-medium">{t("reviews:table.columnCcr")}</th>
                    <th className="px-3 py-2 font-medium">{t("reviews:table.columnTitle")}</th>
                    <th className="px-3 py-2 font-medium">{t("reviews:table.columnRepository")}</th>
                    <th className="px-3 py-2 font-medium">{t("reviews:table.columnAssignee")}</th>
                    <th className="px-3 py-2 font-medium">{t("reviews:table.columnComments")}</th>
                    <th className="px-3 py-2 font-medium">{t("reviews:table.columnUpdated")}</th>
                    <th className="px-3 py-2 font-medium">{t("reviews:table.columnStatus")}</th>
                </tr>
            </thead>
            <tbody>
                {props.rows.length === 0 ? (
                    <tr>
                        <td className="px-3 py-4 text-center text-text-secondary" colSpan={7}>
                            {t("reviews:table.emptyContent")}
                        </td>
                    </tr>
                ) : (
                    props.rows.map(
                        (row): ReactElement => (
                            <tr key={row.id} className="border-b border-border">
                                <td className="px-3 py-2">
                                    <StyledLink
                                        className={TYPOGRAPHY.cardTitle}
                                        params={{ reviewId: row.id }}
                                        to="/reviews/$reviewId"
                                    >
                                        {row.id}
                                    </StyledLink>
                                </td>
                                <td className="px-3 py-2">{row.title}</td>
                                <td className="px-3 py-2">{row.repository}</td>
                                <td className="px-3 py-2">{row.assignee}</td>
                                <td className="px-3 py-2">{row.comments}</td>
                                <td className="px-3 py-2">{row.updatedAt}</td>
                                <td className="px-3 py-2">
                                    <ReviewStatusBadge status={row.status} />
                                </td>
                            </tr>
                        ),
                    )
                )}
            </tbody>
        </table>
    )
}
