import { Outlet } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"

import { SidebarNav } from "./sidebar-nav"
import { SettingsNav } from "./settings-nav"

/**
 * Пропсы для layout страницы настроек.
 */
export interface ISettingsLayoutProps {
    /** Заголовок секции. */
    readonly title?: string
    /** Переопределённый контент вместо nested outlet. */
    readonly children?: ReactNode
}

const SETTINGS_NAV = [
    {
        icon: "⚙️",
        label: "Settings",
        to: "/settings",
    },
    {
        icon: "🧩",
        label: "Code Review",
        to: "/settings-code-review",
    },
    {
        icon: "🧠",
        label: "LLM Providers",
        to: "/settings-llm-providers",
    },
    {
        icon: "🐙",
        label: "Git Providers",
        to: "/settings-git-providers",
    },
    {
        icon: "🔗",
        label: "Integrations",
        to: "/settings-integrations",
    },
    {
        icon: "🪝",
        label: "Webhooks",
        to: "/settings-webhooks",
    },
    {
        icon: "💳",
        label: "Token Usage",
        to: "/settings-token-usage",
    },
    {
        icon: "🏢",
        label: "Organization",
        to: "/settings-organization",
    },
] as const

/**
 * Layout для раздела настроек с локальной навигацией.
 */
export function SettingsLayout(props: ISettingsLayoutProps): ReactElement {
    const title = props.title ?? "Settings"

    return (
        <div className="grid gap-4 md:grid-cols-[230px_1fr]">
            <aside className="rounded-lg bg-white/75 p-2 shadow-sm">
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {title}
                </p>
                <SidebarNav items={SETTINGS_NAV} />
                <SettingsNav />
            </aside>
            <main className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                {props.children === undefined ? <Outlet /> : props.children}
            </main>
        </div>
    )
}
