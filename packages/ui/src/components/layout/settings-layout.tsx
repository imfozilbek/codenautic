import { Outlet } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"
import {
    Activity,
    BellRing,
    Bot,
    Building2,
    Coins,
    CreditCard,
    FileClock,
    GitBranch,
    GitPullRequest,
    KeyRound,
    LibraryBig,
    Link2,
    Paintbrush,
    Settings,
    ShieldCheck,
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
        icon: <Paintbrush aria-hidden="true" size={16} />,
        label: "Appearance",
        to: "/settings-appearance",
    },
    {
        icon: <BellRing aria-hidden="true" size={16} />,
        label: "Notifications",
        to: "/settings-notifications",
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
        icon: <LibraryBig aria-hidden="true" size={16} />,
        label: "Rules Library",
        to: "/settings-rules-library",
    },
    {
        icon: <FileClock aria-hidden="true" size={16} />,
        label: "Audit Logs",
        to: "/settings-audit-logs",
    },
    {
        icon: <Activity aria-hidden="true" size={16} />,
        label: "Jobs Monitor",
        to: "/settings-jobs",
    },
    {
        icon: <CreditCard aria-hidden="true" size={16} />,
        label: "Billing",
        to: "/settings-billing",
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
        icon: <ShieldCheck aria-hidden="true" size={16} />,
        label: "SSO",
        to: "/settings-sso",
    },
    {
        icon: <KeyRound aria-hidden="true" size={16} />,
        label: "BYOK",
        to: "/settings-byok",
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
