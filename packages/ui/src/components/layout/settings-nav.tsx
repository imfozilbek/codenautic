import type { ReactElement } from "react"
import {
    Activity,
    AlertTriangle,
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
    RefreshCcw,
    Shield,
    ShieldCheck,
    SlidersHorizontal,
    Users,
    Webhook,
} from "@/components/icons/app-icons"

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
        icon: <SlidersHorizontal aria-hidden="true" size={16} />,
        label: "Contract Validation",
        to: "/settings-contract-validation",
    },
    {
        icon: <Shield aria-hidden="true" size={16} />,
        label: "Privacy Export",
        to: "/settings-privacy-redaction",
    },
    {
        icon: <AlertTriangle aria-hidden="true" size={16} />,
        label: "Degradation",
        to: "/settings-provider-degradation",
    },
    {
        icon: <RefreshCcw aria-hidden="true" size={16} />,
        label: "Concurrency",
        to: "/settings-concurrency",
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
 * Блок ссылок настроек с заголовком.
 *
 * @param props Свойства блока.
 * @returns Секция меню "Settings" для sidebar.
 */
export function SettingsNav(props: ISettingsNavProps): ReactElement {
    return (
        <div className="mt-4">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                Settings
            </p>
            <SidebarNav items={DEFAULT_SETTINGS_NAV_ITEMS} onNavigate={props.onNavigate} />
        </div>
    )
}
