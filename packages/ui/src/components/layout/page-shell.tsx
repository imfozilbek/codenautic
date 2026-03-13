import type { ReactElement, ReactNode } from "react"
import { motion } from "motion/react"

import { TYPOGRAPHY } from "@/lib/constants/typography"
import { PAGE_LAYOUT } from "@/lib/constants/spacing"
import { DURATION, EASING } from "@/lib/motion"
import { useReducedMotion } from "@/lib/motion"

/**
 * Layout-вариант для корневого элемента страницы.
 */
type TPageShellLayout = "centered" | "spacious" | "standard"

/**
 * Props для единой обёртки страницы.
 */
export interface IPageShellProps {
    /** Заголовок страницы (h1). */
    readonly title: string
    /** Подзаголовок (опционально, отображается под h1). */
    readonly subtitle?: string
    /** Layout variant (по умолчанию "standard"). */
    readonly layout?: TPageShellLayout
    /** Actions рядом с заголовком (кнопки, фильтры). */
    readonly headerActions?: ReactNode
    /** Содержимое страницы. */
    readonly children: ReactNode
}

/**
 * Единая обёртка страницы с TYPOGRAPHY-заголовком,
 * стандартизированным spacing и fade-in enter-анимацией.
 *
 * @param props Конфигурация страницы.
 * @returns Структурированная страница с анимацией входа.
 */
export function PageShell(props: IPageShellProps): ReactElement {
    const { title, subtitle, layout = "standard", headerActions, children } = props
    const prefersReducedMotion = useReducedMotion()

    const layoutClassName = `${PAGE_LAYOUT[layout]} mx-auto max-w-[1400px]`

    const hasHeaderActions = headerActions !== undefined
    const hasSubtitle = subtitle !== undefined

    const header = (
        <div
            className={
                hasHeaderActions
                    ? "flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-start sm:justify-between"
                    : undefined
            }
        >
            <div>
                <h1 className={TYPOGRAPHY.pageTitle}>{title}</h1>
                {hasSubtitle ? <p className={TYPOGRAPHY.pageSubtitle}>{subtitle}</p> : null}
            </div>
            {hasHeaderActions ? headerActions : null}
        </div>
    )

    if (prefersReducedMotion) {
        return (
            <section className={layoutClassName}>
                {header}
                {children}
            </section>
        )
    }

    return (
        <motion.section
            animate={{ opacity: 1, y: 0 }}
            className={layoutClassName}
            initial={{ opacity: 0, y: 4 }}
            transition={{
                duration: DURATION.normal,
                ease: EASING.enter,
            }}
        >
            {header}
            {children}
        </motion.section>
    )
}
