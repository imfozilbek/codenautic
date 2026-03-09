import type { ReactElement } from "react"
import type { LinkProps } from "@tanstack/react-router"
import {
    Activity,
    AlertTriangle,
    BellRing,
    Bot,
    Building2,
    ChartNoAxesColumn,
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
    Settings,
    Shield,
    ShieldCheck,
    SlidersHorizontal,
    Users,
    Webhook,
} from "@/components/icons/app-icons"

/**
 * Single settings navigation item.
 */
export interface ISettingsNavItem {
    /** Display label for the item. */
    readonly label: string
    /** Route path for the item. */
    readonly to: LinkProps["to"]
    /** Icon element rendered alongside the label. */
    readonly icon: ReactElement
}

/**
 * Logical group of settings navigation items.
 */
export interface ISettingsNavGroup {
    /** Unique group identifier. */
    readonly key: string
    /** Display label for the group. */
    readonly label: string
    /** Short description shown on the overview page. */
    readonly description: string
    /** Icon element for the group header. */
    readonly icon: ReactElement
    /** Navigation items within this group. */
    readonly items: ReadonlyArray<ISettingsNavItem>
}

/**
 * Grouped settings navigation data — source of truth for all settings nav.
 *
 * 7 groups, 22 items total.
 */
export const SETTINGS_NAV_GROUPS: ReadonlyArray<ISettingsNavGroup> = [
    {
        key: "general",
        label: "General",
        description: "Workspace defaults, appearance, and notification preferences.",
        icon: <SlidersHorizontal aria-hidden="true" size={20} />,
        items: [
            {
                label: "General",
                to: "/settings",
                icon: <SlidersHorizontal aria-hidden="true" size={16} />,
            },
            {
                label: "Appearance",
                to: "/settings-appearance",
                icon: <Paintbrush aria-hidden="true" size={16} />,
            },
            {
                label: "Notifications",
                to: "/settings-notifications",
                icon: <BellRing aria-hidden="true" size={16} />,
            },
        ],
    },
    {
        key: "code-review",
        label: "Code Review",
        description: "Review policies, custom rules, and contract validation.",
        icon: <GitPullRequest aria-hidden="true" size={20} />,
        items: [
            {
                label: "Code Review",
                to: "/settings-code-review",
                icon: <GitPullRequest aria-hidden="true" size={16} />,
            },
            {
                label: "Rules Library",
                to: "/settings-rules-library",
                icon: <LibraryBig aria-hidden="true" size={16} />,
            },
            {
                label: "Contract Validation",
                to: "/settings-contract-validation",
                icon: <Settings aria-hidden="true" size={16} />,
            },
        ],
    },
    {
        key: "providers",
        label: "Providers",
        description: "LLM models, Git platforms, integrations, and webhooks.",
        icon: <Bot aria-hidden="true" size={20} />,
        items: [
            {
                label: "LLM Providers",
                to: "/settings-llm-providers",
                icon: <Bot aria-hidden="true" size={16} />,
            },
            {
                label: "Git Providers",
                to: "/settings-git-providers",
                icon: <GitBranch aria-hidden="true" size={16} />,
            },
            {
                label: "Integrations",
                to: "/settings-integrations",
                icon: <Link2 aria-hidden="true" size={16} />,
            },
            {
                label: "Webhooks",
                to: "/settings-webhooks",
                icon: <Webhook aria-hidden="true" size={16} />,
            },
        ],
    },
    {
        key: "security",
        label: "Security & Compliance",
        description: "Privacy controls, audit logs, SSO, and encryption keys.",
        icon: <Shield aria-hidden="true" size={20} />,
        items: [
            {
                label: "Privacy Export",
                to: "/settings-privacy-redaction",
                icon: <Shield aria-hidden="true" size={16} />,
            },
            {
                label: "Audit Logs",
                to: "/settings-audit-logs",
                icon: <FileClock aria-hidden="true" size={16} />,
            },
            {
                label: "SSO",
                to: "/settings-sso",
                icon: <ShieldCheck aria-hidden="true" size={16} />,
            },
            {
                label: "BYOK",
                to: "/settings-byok",
                icon: <KeyRound aria-hidden="true" size={16} />,
            },
        ],
    },
    {
        key: "operations",
        label: "Operations",
        description: "Degradation mode, concurrency limits, and job monitoring.",
        icon: <Activity aria-hidden="true" size={20} />,
        items: [
            {
                label: "Degradation",
                to: "/settings-provider-degradation",
                icon: <AlertTriangle aria-hidden="true" size={16} />,
            },
            {
                label: "Concurrency",
                to: "/settings-concurrency",
                icon: <RefreshCcw aria-hidden="true" size={16} />,
            },
            {
                label: "Jobs Monitor",
                to: "/settings-jobs",
                icon: <Activity aria-hidden="true" size={16} />,
            },
        ],
    },
    {
        key: "billing",
        label: "Billing & Usage",
        description: "Subscription plans, token consumption, and adoption metrics.",
        icon: <CreditCard aria-hidden="true" size={20} />,
        items: [
            {
                label: "Billing",
                to: "/settings-billing",
                icon: <CreditCard aria-hidden="true" size={16} />,
            },
            {
                label: "Token Usage",
                to: "/settings-token-usage",
                icon: <Coins aria-hidden="true" size={16} />,
            },
            {
                label: "Adoption Analytics",
                to: "/settings-adoption-analytics",
                icon: <ChartNoAxesColumn aria-hidden="true" size={16} />,
            },
        ],
    },
    {
        key: "organization",
        label: "Organization",
        description: "Workspace settings and team member management.",
        icon: <Building2 aria-hidden="true" size={20} />,
        items: [
            {
                label: "Organization",
                to: "/settings-organization",
                icon: <Building2 aria-hidden="true" size={16} />,
            },
            {
                label: "Team",
                to: "/settings-team",
                icon: <Users aria-hidden="true" size={16} />,
            },
        ],
    },
]

/**
 * Flat list of all settings navigation items — used by sidebar nav.
 */
export const SETTINGS_NAV_ITEMS: ReadonlyArray<ISettingsNavItem> = SETTINGS_NAV_GROUPS.flatMap(
    (group) => group.items,
)
