import type { ReactElement } from "react"

import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Параметры отдельного события timeline.
 */
export interface IActivityTimelineItemProps {
    /** Час/дата события. */
    readonly time: string
    /** Заголовок события. */
    readonly title: string
    /** Короткое описание. */
    readonly description: string
    /** Детальные сведения события. */
    readonly details?: string
}

/**
 * Одна запись activity timeline.
 *
 * @param props Данные события.
 * @returns Набор строк timeline.
 */
export function ActivityTimelineItem(props: IActivityTimelineItemProps): ReactElement {
    return (
        <li className="rounded-lg border border-border bg-surface p-3">
            <p className={TYPOGRAPHY.overline}>
                {props.time}
            </p>
            <p className={`mt-1 ${TYPOGRAPHY.cardTitle}`}>{props.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{props.description}</p>
            {props.details === undefined ? null : (
                <details className="mt-2">
                    <summary className={`cursor-pointer ${TYPOGRAPHY.label}`}>
                        View details
                    </summary>
                    <p className="mt-2 text-sm text-muted-foreground">{props.details}</p>
                </details>
            )}
        </li>
    )
}
