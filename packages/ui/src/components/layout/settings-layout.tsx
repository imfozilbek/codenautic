import { Outlet } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"
import {
    Bot,
    Building2,
    Coins,
    GitBranch,
    GitPullRequest,
    Link2,
    Settings,
    Users,
    Webhook,
} from "lucide-react"

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
        icon: <Settings aria-hidden="true" size={16} />,
        label: "Settings",
        to: "/settings",
    },
    {
        icon: <GitPullRequest aria-hidden="true" size={16} />,
        label: "Code Review",
        to: "/settings-code-review",
    },
    {
        icon: <Bot aria-hidden="true" size={16} />,
        label: "LLM Providers",
        to: "/settings-llm-providers",
    },
    {
        icon: <GitBranch aria-hidden="true" size={16} />,
        label: "Git Providers",
        to: "/settings-git-providers",
    },
    {
        icon: <Link2 aria-hidden="true" size={16} />,
        label: "Integrations",
        to: "/settings-integrations",
    },
    {
        icon: <Webhook aria-hidden="true" size={16} />,
        label: "Webhooks",
        to: "/settings-webhooks",
    },
    {
        icon: <Coins aria-hidden="true" size={16} />,
        label: "Token Usage",
        to: "/settings-token-usage",
    },
    {
        icon: <Building2 aria-hidden="true" size={16} />,
        label: "Organization",
        to: "/settings-organization",
    },
    {
        icon: <Users aria-hidden="true" size={16} />,
        label: "Team",
        to: "/settings-team",
    },
] as const

/**
 * Layout для раздела настроек с локальной навигацией.
 */
export function SettingsLayout(props: ISettingsLayoutProps): ReactElement {
    const title = props.title ?? "Settings"

    return (
        <div className="grid gap-4 md:grid-cols-[230px_1fr]">
            <aside className="rounded-lg bg-[color:color-mix(in_oklab,var(--surface)_84%,transparent)] p-2 shadow-sm">
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground)]/60">
                    {title}
                </p>
                <SidebarNav items={SETTINGS_NAV} />
                <SettingsNav />
            </aside>
            <main className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
                {props.children === undefined ? <Outlet /> : props.children}
            </main>
        </div>
    )
}
