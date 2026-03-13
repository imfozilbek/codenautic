import { type ReactElement, type ReactNode, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChevronDown, ChevronRight } from "@/components/icons/app-icons"

import { DURATION, EASING, useReducedMotion } from "@/lib/motion"
import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Визуальный приоритет зоны dashboard.
 * Определяет толщину левого бордера и отступ.
 */
export type TDashboardZonePriority = "primary" | "secondary" | "tertiary"

/**
 * Маппинг приоритета зоны на CSS-классы left-border + padding.
 */
const ZONE_PRIORITY_STYLES: Record<TDashboardZonePriority, string> = {
    primary: "border-l-4 border-l-primary/60 pl-4",
    secondary: "border-l-2 border-l-border pl-3",
    tertiary: "border-l border-l-border/50 pl-3 opacity-90",
}

/**
 * Свойства collapsible zone dashboard.
 */
export interface IDashboardZoneProps {
    /** Заголовок зоны. */
    readonly title: string
    /** Содержимое зоны. */
    readonly children: ReactNode
    /** Начальное состояние (по умолчанию раскрыта). */
    readonly defaultExpanded?: boolean
    /** Управляемое состояние видимости (для layout presets). */
    readonly isVisible?: boolean
    /** Визуальный приоритет зоны (по умолчанию "secondary"). */
    readonly priority?: TDashboardZonePriority
}

/**
 * Collapsible section wrapper для dashboard зон с expand/collapse animation.
 * Используется для progressive disclosure — зоны C-F скрыты по умолчанию.
 *
 * @param props Конфигурация зоны.
 * @returns Collapsible dashboard zone.
 */
export function DashboardZone(props: IDashboardZoneProps): ReactElement | null {
    const [isExpanded, setIsExpanded] = useState(props.defaultExpanded !== false)
    const prefersReducedMotion = useReducedMotion()
    const priorityClass = ZONE_PRIORITY_STYLES[props.priority ?? "secondary"]

    if (props.isVisible === false) {
        return null
    }

    return (
        <section className={`space-y-3 ${priorityClass}`}>
            <button
                aria-expanded={isExpanded}
                className="flex w-full items-center gap-2 text-left"
                type="button"
                onClick={(): void => {
                    setIsExpanded((prev): boolean => !prev)
                }}
            >
                <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                <span className={TYPOGRAPHY.sectionTitle}>{props.title}</span>
            </button>
            <AnimatePresence initial={false}>
                {isExpanded ? (
                    <motion.div
                        key="zone-content"
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        initial={{ height: 0, opacity: 0 }}
                        style={{ overflow: "hidden" }}
                        transition={{
                            duration: prefersReducedMotion ? 0 : DURATION.normal,
                            ease: EASING.move,
                        }}
                    >
                        {props.children}
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </section>
    )
}
