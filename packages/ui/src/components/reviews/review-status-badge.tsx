import type { ReactElement } from "react"

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
        <Chip color={STATUS_VISUALS[props.status]} size="sm" variant="soft">
            {STATUS_LABELS[props.status]}
        </Chip>
    )
}
