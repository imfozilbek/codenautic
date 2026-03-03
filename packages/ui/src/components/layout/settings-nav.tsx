import type { ReactElement } from "react"

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
        icon: "🏠",
        label: "General",
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
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Settings
            </p>
            <SidebarNav items={DEFAULT_SETTINGS_NAV_ITEMS} onNavigate={props.onNavigate} />
        </div>
    )
}
