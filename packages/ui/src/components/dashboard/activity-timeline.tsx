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
    /** Расширенные детали. */
    readonly details?: string
    /** Группа по дню (Today/Yesterday/etc). */
    readonly group?: string
}

/**
 * Секция activity timeline на dashboard.
 */
export interface IActivityTimelineProps {
    /** События timeline. */
    readonly items: ReadonlyArray<IActivityTimelineEntry>
}

/** Собирает events по дню для визуального секционирования. */
const groupItemsByDay = (
    items: ReadonlyArray<IActivityTimelineEntry>,
): Record<string, ReadonlyArray<IActivityTimelineEntry>> => {
    return items.reduce<Record<string, ReadonlyArray<IActivityTimelineEntry>>>(
        (acc, item): Record<string, ReadonlyArray<IActivityTimelineEntry>> => {
            const group = item.group ?? "Today"
            return {
                ...acc,
                [group]: [...(acc[group] ?? []), item],
            }
        },
        {},
    )
}

/**
 * Рисует временную шкалу последних активностей.
 *
 * @param props Список событий.
 * @returns Секция timeline.
 */
export function ActivityTimeline(props: IActivityTimelineProps): ReactElement {
    const groupedEntries = groupItemsByDay(props.items)

    return (
        <Card>
            <CardHeader>
                <h2 className="text-base font-semibold text-foreground">Recent activity</h2>
            </CardHeader>
            <CardBody>
                {Object.entries(groupedEntries).map(
                    ([group, items]): ReactElement => (
                        <section key={group} className="space-y-2">
                            <h3 className="mt-2 text-sm font-semibold text-foreground">{group}</h3>
                            <ul className="space-y-2" aria-label={`Timeline ${group}`}>
                                {items.map(
                                    (item): ReactElement => (
                                        <ActivityTimelineItem key={item.id} {...item} />
                                    ),
                                )}
                            </ul>
                        </section>
                    ),
                )}
            </CardBody>
        </Card>
    )
}
