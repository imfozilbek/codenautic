import type { ReactElement } from "react"

import { Chip } from "@/components/ui"

/**
 * Статусы CCR для бейджа.
 */
export type TReviewStatus = "new" | "queued" | "in_progress" | "approved" | "rejected"

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
const STATUS_VISUALS: Record<TReviewStatus, string> = {
    approved: "success",
    in_progress: "primary",
    new: "secondary",
    queued: "warning",
    rejected: "danger",
}

/**
 * Текстовые метки статусов.
 */
const STATUS_LABELS: Record<TReviewStatus, string> = {
    approved: "Approved",
    in_progress: "In progress",
    new: "New",
    queued: "Queued",
    rejected: "Rejected",
}

/**
 * Компонент статуса ревью.
 *
 * @param props Конфигурация.
 * @returns Чип с цветным статусом.
 */
export function ReviewStatusBadge(props: IReviewStatusBadgeProps): ReactElement {
    return (
        <Chip color={STATUS_VISUALS[props.status]} size="sm" variant="flat">
            {STATUS_LABELS[props.status]}
        </Chip>
    )
}
