import type { ReactElement } from "react"
import {
    Bot,
    Building2,
    Coins,
    GitBranch,
    GitPullRequest,
    Link2,
    SlidersHorizontal,
    Users,
    Webhook,
} from "lucide-react"

import { SidebarNav } from "./sidebar-nav"

/**
 * Свойства блока настроек sidebar.
 */
export interface ISettingsNavProps {
    /** Коллбэк при выборе пункта меню. */
    readonly onNavigate?: (to?: string) => void
}

const DEFAULT_SETTINGS_NAV_ITEMS = [
    {
        icon: <SlidersHorizontal aria-hidden="true" size={16} />,
        label: "General",
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
 * Блок ссылок настроек с заголовком.
 *
 * @param props Свойства блока.
 * @returns Секция меню "Settings" для sidebar.
 */
export function SettingsNav(props: ISettingsNavProps): ReactElement {
    return (
        <div className="mt-4">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground)]/60">
                Settings
            </p>
            <SidebarNav items={DEFAULT_SETTINGS_NAV_ITEMS} onNavigate={props.onNavigate} />
        </div>
    )
}
