import type { ReactElement } from "react"
import { motion } from "motion/react"

import { Link } from "@tanstack/react-router"
import { Alert, Card, CardBody, CardHeader } from "@/components/ui"
import { StaggerContainer, STAGGER_ITEM_VARIANTS } from "@/lib/motion"
import { EmptyState } from "@/components/states/empty-state"
import { ActivityTimeline, type IActivityTimelineEntry } from "./activity-timeline"
import { StatusDistributionChart, type IStatusDistributionPoint } from "./status-distribution-chart"

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
    const hasCriticalSignals = props.workQueue.some((item): boolean =>
        item.id.startsWith("critical"),
    )

    return (
        <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <h3 className="text-base font-semibold text-foreground">
                            Signals & Work Queue
                        </h3>
                    </CardHeader>
                    <CardBody>
                        {hasCriticalSignals ? (
                            <Alert className="mb-4" color="warning">
                                <p className="mb-1 text-sm font-semibold text-on-warning">
                                    Ops notice
                                </p>
                                <p className="text-sm text-on-warning/90">
                                    Есть критические сигналы, проверьте вкладку CCR Management.
                                </p>
                            </Alert>
                        ) : null}
                        {props.workQueue.length === 0 ? (
                            <EmptyState
                                description="No items in the work queue right now."
                                title="Queue is empty"
                            />
                        ) : (
                            <StaggerContainer
                                ariaLabel="Work queue"
                                as="ul"
                                className="space-y-2"
                            >
                                {props.workQueue.map(
                                    (item): ReactElement => (
                                        <motion.li
                                            key={item.id}
                                            className="rounded-lg border border-border bg-surface p-3 transition-colors duration-150 hover:bg-surface-muted"
                                            variants={STAGGER_ITEM_VARIANTS}
                                        >
                                            <p className="text-sm font-semibold text-foreground">
                                                {item.title}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {item.description}
                                            </p>
                                            <Link
                                                className="mt-2 inline-block text-sm text-foreground underline underline-offset-4"
                                                to={item.route}
                                            >
                                                Open {item.id}
                                            </Link>
                                        </motion.li>
                                    ),
                                )}
                            </StaggerContainer>
                        )}
                    </CardBody>
                </Card>
                <StatusDistributionChart data={props.statusDistribution} />
            </div>
            <ActivityTimeline items={props.timeline} />
        </section>
    )
}
