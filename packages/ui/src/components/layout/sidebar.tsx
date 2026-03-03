import type { ReactElement, ReactNode } from "react"

import { SidebarNav } from "./sidebar-nav"
import { SettingsNav } from "./settings-nav"
import { Button } from "@/components/ui"

/**
 * Свойства sidebar компонента.
 */
export interface ISidebarProps {
    /** Дополнительный класс для контейнера. */
    readonly className?: string
    /** Заголовок блока навигации. */
    readonly title?: string
    /** Свернут ли сайдбар. */
    readonly isCollapsed?: boolean
    /** Содержимое слева от основного меню (если нужно). */
    readonly headerSlot?: ReactNode
    /** Коллбэк при выборе пункта (close mobile sidebar). */
    readonly onNavigate?: (to?: string) => void
    /** Коллбэк переключения состояния сворачивания. */
    readonly onSidebarToggle?: () => void
}

/**
 * Базовый sidebar для desktop-макета dashboard.
 *
 * @param props Конфигурация.
 * @returns Боковая колонка навигации.
 */
export function Sidebar(props: ISidebarProps): ReactElement {
    const isCollapsed = props.isCollapsed === true
    const widthClass = isCollapsed ? "w-12" : "w-full"

    return (
        <aside
            className={`h-full rounded-lg bg-[color:color-mix(in_oklab,var(--surface)_84%,transparent)] p-2 shadow-sm ${widthClass} ${props.className ?? ""}`}
        >
            <div className="mb-2 flex items-center justify-between px-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground)]/60">
                    {isCollapsed ? " " : (props.title ?? "Navigation")}
                </p>
                <Button
                    aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
                    className="h-7 min-h-7 w-7 rounded-full px-0"
                    isIconOnly
                    radius="full"
                    size="sm"
                    variant="light"
                    onPress={props.onSidebarToggle}
                >
                    {isCollapsed ? "›" : "‹"}
                </Button>
            </div>
            {props.headerSlot !== undefined ? (
                <div className="mb-3 px-2">{props.headerSlot}</div>
            ) : null}
            {isCollapsed ? null : <SidebarNav onNavigate={props.onNavigate} />}
            {isCollapsed ? null : <SettingsNav onNavigate={props.onNavigate} />}
        </aside>
    )
}
