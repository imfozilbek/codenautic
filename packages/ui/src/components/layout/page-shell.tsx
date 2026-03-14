import type { ReactElement, ReactNode } from "react"

import { TYPOGRAPHY } from "@/lib/constants/typography"
import { PAGE_LAYOUT } from "@/lib/constants/spacing"

/**
 * Layout-вариант для корневого элемента страницы.
 */
type TPageShellLayout = "centered" | "fluid" | "spacious" | "standard"

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
 * Единая обёртка страницы с TYPOGRAPHY-заголовком
 * и стандартизированным spacing.
 *
 * @param props Конфигурация страницы.
 * @returns Структурированная страница.
 */
export function PageShell(props: IPageShellProps): ReactElement {
    const { title, subtitle, layout = "standard", headerActions, children } = props

    const isFluid = layout === "fluid"
    const layoutClassName = isFluid
        ? PAGE_LAYOUT.fluid
        : `${PAGE_LAYOUT[layout]} mx-auto max-w-[1400px]`

    const hasHeaderActions = headerActions !== undefined
    const hasSubtitle = subtitle !== undefined

    return (
        <section className={layoutClassName}>
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
            {children}
        </section>
    )
}
