import type { ReactElement } from "react"

/**
 * Параметры отдельного события timeline.
 */
export interface IActivityTimelineItemProps {
    /** Час/дата события. */
    readonly time: string
    /** Заголовок события. */
    readonly title: string
    /** Описание события. */
    readonly description: string
}

/**
 * Одна запись activity timeline.
 *
 * @param props Данные события.
 * @returns Набор строк timeline.
 */
export function ActivityTimelineItem(props: IActivityTimelineItemProps): ReactElement {
    return (
        <li className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                {props.time}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{props.title}</p>
            <p className="mt-1 text-sm text-slate-600">{props.description}</p>
        </li>
    )
}
