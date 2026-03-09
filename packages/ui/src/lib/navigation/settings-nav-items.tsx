import type { ReactElement } from "react"
import type { TFunction } from "i18next"
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
 * Создаёт сгруппированные navigation items для settings с переведёнными метками.
 *
 * @param t Функция перевода из react-i18next.
 * @returns 7 групп, 22 items total.
 */
export function createSettingsNavGroups(
    t: TFunction<ReadonlyArray<"navigation">>,
): ReadonlyArray<ISettingsNavGroup> {
    return [
        {
            key: "general",
            label: t("navigation:settingsGroup.general"),
            description: t("navigation:settingsGroup.generalDescription"),
            icon: <SlidersHorizontal aria-hidden="true" size={20} />,
            items: [
                {
                    label: t("navigation:settingsItem.general"),
                    to: "/settings",
                    icon: <SlidersHorizontal aria-hidden="true" size={16} />,
                },
                {
                    label: t("navigation:settingsItem.appearance"),
                    to: "/settings-appearance",
                    icon: <Paintbrush aria-hidden="true" size={16} />,
                },
                {
                    label: t("navigation:settingsItem.notifications"),
                    to: "/settings-notifications",
                    icon: <BellRing aria-hidden="true" size={16} />,
                },
            ],
        },
        {
            key: "code-review",
            label: t("navigation:settingsGroup.codeReview"),
            description: t("navigation:settingsGroup.codeReviewDescription"),
            icon: <GitPullRequest aria-hidden="true" size={20} />,
            items: [
                {
                    label: t("navigation:settingsItem.codeReview"),
                    to: "/settings-code-review",
                    icon: <GitPullRequest aria-hidden="true" size={16} />,
                },
                {
                    label: t("navigation:settingsItem.rulesLibrary"),
                    to: "/settings-rules-library",
                    icon: <LibraryBig aria-hidden="true" size={16} />,
                },
                {
                    label: t("navigation:settingsItem.contractValidation"),
                    to: "/settings-contract-validation",
                    icon: <Settings aria-hidden="true" size={16} />,
                },
            ],
        },
        {
            key: "providers",
            label: t("navigation:settingsGroup.providers"),
            description: t("navigation:settingsGroup.providersDescription"),
            icon: <Bot aria-hidden="true" size={20} />,
            items: [
                {
                    label: t("navigation:settingsItem.llmProviders"),
                    to: "/settings-llm-providers",
                    icon: <Bot aria-hidden="true" size={16} />,
                },
                {
                    label: t("navigation:settingsItem.gitProviders"),
                    to: "/settings-git-providers",
                    icon: <GitBranch aria-hidden="true" size={16} />,
                },
                {
                    label: t("navigation:settingsItem.integrations"),
                    to: "/settings-integrations",
                    icon: <Link2 aria-hidden="true" size={16} />,
                },
                {
                    label: t("navigation:settingsItem.webhooks"),
                    to: "/settings-webhooks",
                    icon: <Webhook aria-hidden="true" size={16} />,
                },
            ],
        },
        {
            key: "security",
            label: t("navigation:settingsGroup.securityCompliance"),
            description: t("navigation:settingsGroup.securityComplianceDescription"),
            icon: <Shield aria-hidden="true" size={20} />,
            items: [
                {
                    label: t("navigation:settingsItem.privacyExport"),
                    to: "/settings-privacy-redaction",
                    icon: <Shield aria-hidden="true" size={16} />,
                },
                {
                    label: t("navigation:settingsItem.auditLogs"),
                    to: "/settings-audit-logs",
                    icon: <FileClock aria-hidden="true" size={16} />,
                },
                {
                    label: t("navigation:settingsItem.sso"),
                    to: "/settings-sso",
                    icon: <ShieldCheck aria-hidden="true" size={16} />,
                },
                {
                    label: t("navigation:settingsItem.byok"),
                    to: "/settings-byok",
                    icon: <KeyRound aria-hidden="true" size={16} />,
                },
            ],
        },
        {
            key: "operations",
            label: t("navigation:settingsGroup.operations"),
            description: t("navigation:settingsGroup.operationsDescription"),
            icon: <Activity aria-hidden="true" size={20} />,
            items: [
                {
                    label: t("navigation:settingsItem.degradation"),
                    to: "/settings-provider-degradation",
                    icon: <AlertTriangle aria-hidden="true" size={16} />,
                },
                {
                    label: t("navigation:settingsItem.concurrency"),
                    to: "/settings-concurrency",
                    icon: <RefreshCcw aria-hidden="true" size={16} />,
                },
                {
                    label: t("navigation:settingsItem.jobsMonitor"),
                    to: "/settings-jobs",
                    icon: <Activity aria-hidden="true" size={16} />,
                },
            ],
        },
        {
            key: "billing",
            label: t("navigation:settingsGroup.billingUsage"),
            description: t("navigation:settingsGroup.billingUsageDescription"),
            icon: <CreditCard aria-hidden="true" size={20} />,
            items: [
                {
                    label: t("navigation:settingsItem.billing"),
                    to: "/settings-billing",
                    icon: <CreditCard aria-hidden="true" size={16} />,
                },
                {
                    label: t("navigation:settingsItem.tokenUsage"),
                    to: "/settings-token-usage",
                    icon: <Coins aria-hidden="true" size={16} />,
                },
                {
                    label: t("navigation:settingsItem.adoptionAnalytics"),
                    to: "/settings-adoption-analytics",
                    icon: <ChartNoAxesColumn aria-hidden="true" size={16} />,
                },
            ],
        },
        {
            key: "organization",
            label: t("navigation:settingsGroup.organization"),
            description: t("navigation:settingsGroup.organizationDescription"),
            icon: <Building2 aria-hidden="true" size={20} />,
            items: [
                {
                    label: t("navigation:settingsItem.organization"),
                    to: "/settings-organization",
                    icon: <Building2 aria-hidden="true" size={16} />,
                },
                {
                    label: t("navigation:settingsItem.team"),
                    to: "/settings-team",
                    icon: <Users aria-hidden="true" size={16} />,
                },
            ],
        },
    ]
}

/**
 * Создаёт плоский список всех settings navigation items — используется sidebar nav.
 *
 * @param t Функция перевода из react-i18next.
 * @returns Flat list of settings items.
 */
export function createSettingsNavItems(
    t: TFunction<ReadonlyArray<"navigation">>,
): ReadonlyArray<ISettingsNavItem> {
    return createSettingsNavGroups(t).flatMap(
        (group): ReadonlyArray<ISettingsNavItem> => group.items,
    )
}
