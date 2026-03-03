import type {ReactElement, ReactNode} from "react"

import {SidebarNav} from "./sidebar-nav"
import {SettingsNav} from "./settings-nav"

/**
 * Свойства sidebar компонента.
 */
export interface ISidebarProps {
    /** Дополнительный класс для контейнера. */
    readonly className?: string
    /** Заголовок блока навигации. */
    readonly title?: string
    /** Содержимое слева от основного меню (если нужно). */
    readonly headerSlot?: ReactNode
    /** Коллбэк при выборе пункта (close mobile sidebar). */
    readonly onNavigate?: (to?: string) => void
}

/**
 * Базовый sidebar для desktop-макета dashboard.
 *
 * @param props Конфигурация.
 * @returns Боковая колонка навигации.
 */
export function Sidebar(props: ISidebarProps): ReactElement {
    return (
        <aside className={`h-full w-full rounded-lg bg-white/75 p-2 shadow-sm ${props.className ?? ""}`}>
            {props.headerSlot !== undefined ? <div className="mb-3 px-2">{props.headerSlot}</div> : null}
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {props.title ?? "Navigation"}
            </p>
            <SidebarNav onNavigate={props.onNavigate} />
            <SettingsNav onNavigate={props.onNavigate} />
        </aside>
    )
}
