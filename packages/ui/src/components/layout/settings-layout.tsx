import { Outlet } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"

import { SETTINGS_NAV_ITEMS } from "@/lib/navigation/settings-nav-items"

import { SidebarNav } from "./sidebar-nav"

/**
 * Пропсы для layout страницы настроек.
 */
export interface ISettingsLayoutProps {
    /** Заголовок секции. */
    readonly title?: string
    /** Переопределённый контент вместо nested outlet. */
    readonly children?: ReactNode
}

/**
 * Layout для раздела настроек с локальной навигацией.
 */
export function SettingsLayout(props: ISettingsLayoutProps): ReactElement {
    const title = props.title ?? "Settings"

    return (
        <div className="grid gap-4 md:grid-cols-[230px_1fr]">
            <aside className="rounded-lg bg-sidebar-bg p-2 shadow-sm">
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle">
                    {title}
                </p>
                <SidebarNav items={SETTINGS_NAV_ITEMS} />
            </aside>
            <main className="rounded-lg border border-border bg-surface p-4 shadow-sm">
                {props.children === undefined ? <Outlet /> : props.children}
            </main>
        </div>
    )
}
