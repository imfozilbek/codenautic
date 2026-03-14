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
    /** Является ли элемент последним в группе (убирает нижний connector). */
    readonly isLast?: boolean
}

/**
 * Одна запись activity timeline с dot-connector дизайном.
 *
 * @param props Данные события.
 * @returns Timeline item с vertical connector.
 */
export function ActivityTimelineItem(props: IActivityTimelineItemProps): ReactElement {
    const isLast = props.isLast ?? false

    return (
        <li className="relative flex gap-4 pb-4">
            {/* Dot + Vertical connector */}
            <div className="relative flex flex-col items-center">
                {/* Dot */}
                <div className="relative z-10 mt-1.5 flex h-3 w-3 items-center justify-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary/80 ring-2 ring-primary/20" />
                </div>

                {/* Connector line */}
                {!isLast ? (
                    <div
                        aria-hidden="true"
                        className="mt-1 w-px grow bg-gradient-to-b from-border to-transparent"
                    />
                ) : null}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 pb-1">
                <div className="flex items-baseline gap-2">
                    <p className={TYPOGRAPHY.overline}>{props.time}</p>
                </div>
                <p className={`mt-0.5 ${TYPOGRAPHY.cardTitle}`}>{props.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{props.description}</p>
                {props.details !== undefined ? (
                    <details className="mt-2">
                        <summary
                            className={`cursor-pointer select-none text-xs font-medium text-primary transition-colors hover:text-primary/80`}
                        >
                            View details
                        </summary>
                        <p className="mt-1.5 rounded-md bg-surface-muted/50 p-2 text-sm text-muted-foreground">
                            {props.details}
                        </p>
                    </details>
                ) : null}
            </div>
        </li>
    )
}
