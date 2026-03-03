import type { ReactElement } from "react"

import { Card, CardBody, CardHeader } from "@/components/ui"
import { ActivityTimelineItem } from "./activity-timeline-item"

/**
 * Параметры для элемента временной шкалы.
 */
export interface IActivityTimelineEntry {
    /** Уникальный ключ. */
    readonly id: string
    /** Время события. */
    readonly time: string
    /** Заголовок события. */
    readonly title: string
    /** Детали. */
    readonly description: string
}

/**
 * Секция activity timeline на dashboard.
 */
export interface IActivityTimelineProps {
    /** События timeline. */
    readonly items: ReadonlyArray<IActivityTimelineEntry>
}

/**
 * Рисует временную шкалу последних активностей.
 *
 * @param props Список событий.
 * @returns Секция timeline.
 */
export function ActivityTimeline(props: IActivityTimelineProps): ReactElement {
    return (
        <Card>
            <CardHeader>
                <h2 className="text-base font-semibold text-slate-900">Recent activity</h2>
            </CardHeader>
            <CardBody>
                <ul className="space-y-2" aria-label="Timeline">
                    {props.items.map(
                        (item): ReactElement => (
                            <ActivityTimelineItem key={item.id} {...item} />
                        ),
                    )}
                </ul>
            </CardBody>
        </Card>
    )
}
