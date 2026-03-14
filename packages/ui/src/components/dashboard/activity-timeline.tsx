import type { ReactElement } from "react"

import { Card, CardBody, CardHeader } from "@/components/ui"
import { EmptyState } from "@/components/states/empty-state"
import { TYPOGRAPHY } from "@/lib/constants/typography"
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

/**
 * Собирает events по дню для визуального секционирования.
 *
 * @param items Список событий.
 * @returns Словарь: группа -> события.
 */
function groupItemsByDay(
    items: ReadonlyArray<IActivityTimelineEntry>,
): Record<string, ReadonlyArray<IActivityTimelineEntry>> {
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
 * Рисует временную шкалу последних активностей с dot-connector дизайном.
 *
 * @param props Список событий.
 * @returns Секция timeline.
 */
export function ActivityTimeline(props: IActivityTimelineProps): ReactElement {
    const groupedEntries = groupItemsByDay(props.items)

    return (
        <Card className="border border-border/60 bg-surface/80 backdrop-blur-sm">
            <CardHeader className="border-b border-border/40 pb-3">
                <h2 className={TYPOGRAPHY.sectionTitle}>Recent activity</h2>
            </CardHeader>
            <CardBody className="pt-4">
                {props.items.length === 0 ? (
                    <EmptyState
                        description="No recent activity to display."
                        title="No activity yet"
                    />
                ) : (
                    <div className="space-y-5">
                        {Object.entries(groupedEntries).map(
                            ([group, items]): ReactElement => (
                                <section key={group}>
                                    <h3 className={`mb-3 ${TYPOGRAPHY.overline}`}>{group}</h3>
                                    <ul aria-label={`Timeline ${group}`}>
                                        {items.map(
                                            (item, index): ReactElement => (
                                                <ActivityTimelineItem
                                                    key={item.id}
                                                    description={item.description}
                                                    details={item.details}
                                                    isLast={index === items.length - 1}
                                                    time={item.time}
                                                    title={item.title}
                                                />
                                            ),
                                        )}
                                    </ul>
                                </section>
                            ),
                        )}
                    </div>
                )}
            </CardBody>
        </Card>
    )
}
