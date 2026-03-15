import { type ReactElement, type ReactNode, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChevronDown, ChevronRight } from "@/components/icons/app-icons"

import { useReducedMotion } from "motion/react"


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
    primary: "border-l-4 border-l-accent/60 pl-4",
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
                className="group flex w-full items-center gap-2 rounded-md py-1 text-left transition-colors duration-150 hover:bg-surface-secondary/50"
                type="button"
                onClick={(): void => {
                    setIsExpanded((prev): boolean => !prev)
                }}
            >
                <span
                    aria-hidden="true"
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-secondary/60 text-muted transition-colors group-hover:bg-accent/10 group-hover:text-accent"
                >
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
                            duration: prefersReducedMotion === true ? 0 : 0.25,
                            ease: [0.4, 0.0, 0.2, 1.0],
                        }}
                    >
                        {props.children}
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </section>
    )
}
