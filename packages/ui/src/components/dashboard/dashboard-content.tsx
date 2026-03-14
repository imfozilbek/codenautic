import type { ReactElement } from "react"
import { motion } from "motion/react"
import { AlertTriangle, ChevronRight } from "@/components/icons/app-icons"

import { Card, CardContent, CardHeader } from "@heroui/react"
import { StyledLink, type IStyledLinkProps } from "@/components/layout/styled-link"
import { StaggerContainer, STAGGER_ITEM_VARIANTS } from "@/lib/motion"
import { EmptyState } from "@/components/states/empty-state"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { ActivityTimeline, type IActivityTimelineEntry } from "./activity-timeline"
import { StatusDistributionChart, type IStatusDistributionPoint } from "./status-distribution-chart"

/**
 * Запись в work queue.
 */
export interface IWorkQueueItem {
    /**
     * Идентификатор.
     *
     * @example "ccr-1245"
     */
    readonly id: string
    /** Название очереди или задачи. */
    readonly title: string
    /** Направление для deep-link (должно совпадать с зарегистрированным маршрутом). */
    readonly route: IStyledLinkProps["to"]
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
 * Glass morphism cards, severity-aware work queue, timeline.
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
                <Card className="border border-border/60 bg-surface/80 backdrop-blur-sm">
                    <CardHeader className="border-b border-border/30 pb-3">
                        <h3 className={TYPOGRAPHY.subsectionTitle}>Signals & Work Queue</h3>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {hasCriticalSignals ? (
                            <div className="mb-4 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/8 p-3">
                                <AlertTriangle
                                    aria-hidden="true"
                                    className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                                />
                                <div>
                                    <p className={`${TYPOGRAPHY.cardTitle} text-warning`}>
                                        Ops notice
                                    </p>
                                    <p className="mt-0.5 text-sm text-foreground/80">
                                        Есть критические сигналы, проверьте вкладку CCR Management.
                                    </p>
                                </div>
                            </div>
                        ) : null}
                        {props.workQueue.length === 0 ? (
                            <EmptyState
                                description="No items in the work queue right now."
                                title="Queue is empty"
                            />
                        ) : (
                            <StaggerContainer ariaLabel="Work queue" as="ul" className="space-y-2">
                                {props.workQueue.map(
                                    (item): ReactElement => (
                                        <WorkQueueCard key={item.id} item={item} />
                                    ),
                                )}
                            </StaggerContainer>
                        )}
                    </CardContent>
                </Card>
                <StatusDistributionChart data={props.statusDistribution} />
            </div>
            <ActivityTimeline items={props.timeline} />
        </section>
    )
}

/**
 * Параметры карточки work queue.
 */
interface IWorkQueueCardProps {
    /** Данные элемента очереди. */
    readonly item: IWorkQueueItem
}

/**
 * Карточка элемента work queue с hover-эффектом и chevron.
 *
 * @param props Элемент очереди.
 * @returns Styled work queue card.
 */
function WorkQueueCard(props: IWorkQueueCardProps): ReactElement {
    const { item } = props
    const isCritical = item.id.startsWith("critical")

    return (
        <motion.li
            className={[
                "group flex items-center justify-between gap-3",
                "rounded-lg border p-3",
                "transition-all duration-150",
                isCritical
                    ? "border-warning/30 bg-warning/5 hover:bg-warning/10"
                    : "border-border/50 bg-surface hover:bg-surface-muted",
            ].join(" ")}
            variants={STAGGER_ITEM_VARIANTS}
        >
            <div className="min-w-0 flex-1">
                <p className={TYPOGRAPHY.cardTitle}>{item.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
                <StyledLink
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
                    to={item.route}
                >
                    Open {item.id}
                    <ChevronRight aria-hidden="true" className="h-3 w-3" />
                </StyledLink>
            </div>
        </motion.li>
    )
}
