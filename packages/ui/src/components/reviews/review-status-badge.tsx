import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { Chip } from "@/components/ui"
import { type TReviewStatus } from "@/lib/types/ccr-types"

/**
 * Параметры бейджа статуса.
 */
export interface IReviewStatusBadgeProps {
    /** Статус CCR. */
    readonly status: TReviewStatus
}

/**
 * Цветовые пары по статусам.
 */
type TReviewStatusChipColor = "accent" | "default" | "danger" | "success" | "warning"

const STATUS_VISUALS: Record<TReviewStatus, TReviewStatusChipColor> = {
    approved: "success",
    in_progress: "accent",
    new: "default",
    queued: "warning",
    rejected: "danger",
}

/**
 * Компонент статуса ревью.
 *
 * @param props Конфигурация.
 * @returns Чип с цветным статусом.
 */
export function ReviewStatusBadge(props: IReviewStatusBadgeProps): ReactElement {
    const { t } = useTranslation(["reviews"])

    const statusLabels: Record<TReviewStatus, string> = {
        approved: t("reviews:statusBadge.approved"),
        in_progress: t("reviews:statusBadge.inProgress"),
        new: t("reviews:statusBadge.new"),
        queued: t("reviews:statusBadge.queued"),
        rejected: t("reviews:statusBadge.rejected"),
    }

    return (
        <Chip color={STATUS_VISUALS[props.status]} size="sm" variant="soft">
            {statusLabels[props.status]}
        </Chip>
    )
}
