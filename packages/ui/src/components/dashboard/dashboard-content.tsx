import type {ReactElement} from "react"

import {Link} from "@tanstack/react-router"
import {Alert, Card, CardBody, CardHeader} from "@/components/ui"
import {ActivityTimeline, type IActivityTimelineEntry} from "./activity-timeline"
import {StatusDistributionChart, type IStatusDistributionPoint} from "./status-distribution-chart"

/**
 * Запись в work queue.
 */
export interface IWorkQueueItem {
    /** Идентификатор.
     *
     * @example "ccr-1245"
     */
    readonly id: string
    /** Название очереди или задачи. */
    readonly title: string
    /** Направление для deep-link. */
    readonly route: string
    /** Поддерживающий текст. */
    readonly description: string
}

/**
 * Параметры content блока dashboard.
 */
export interface IDashboardContentProps {
    /** Состояние очереди. */
    readonly workQueue: ReadonlyArray<IWorkQueueItem>
    /** Timeline событий. */
    readonly timeline: ReadonlyArray<IActivityTimelineEntry>
    /** Данные для графика статусов. */
    readonly statusDistribution: ReadonlyArray<IStatusDistributionPoint>
}

/**
 * Основной контент dashboard mission control.
 *
 * @param props Наборы виджетов.
 * @returns Контент: очереди + сигналы + активность.
 */
export function DashboardContent(props: IDashboardContentProps): ReactElement {
    const hasCriticalSignals = props.workQueue.some((item): boolean => item.id.startsWith("critical"))

    return (
        <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <h3 className="text-base font-semibold text-slate-900">Signals & Work Queue</h3>
                    </CardHeader>
                    <CardBody>
                        {hasCriticalSignals ? (
                            <Alert className="mb-4" color="warning" title="Ops notice" variant="flat">
                                Есть критические сигналы, проверьте вкладку CCR Management.
                            </Alert>
                        ) : null}
                        <ul className="space-y-2" aria-label="Work queue">
                            {props.workQueue.map((item): ReactElement => (
                                <li
                                    key={item.id}
                                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                                >
                                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                    <p className="text-sm text-slate-600">{item.description}</p>
                                    <Link
                                        className="mt-2 inline-block text-sm text-slate-900 underline underline-offset-4"
                                        to={item.route}
                                    >
                                        Open {item.id}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </CardBody>
                </Card>
                <StatusDistributionChart data={props.statusDistribution} />
            </div>
            <ActivityTimeline items={props.timeline} />
        </section>
    )
}
