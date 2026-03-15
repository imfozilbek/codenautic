import { type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { Bell, Search } from "@/components/icons/app-icons"
import { Button } from "@heroui/react"

import { ThemeModeToggle } from "./theme-mode-toggle"

/**
 * Props для панели действий в sidebar header.
 */
export interface ISidebarActionsProps {
    /** Открыть Command Palette. */
    readonly onOpenCommandPalette?: () => void
    /** Количество непрочитанных уведомлений. */
    readonly notificationCount?: number
    /** Sidebar в collapsed режиме. */
    readonly isCollapsed?: boolean
}

/**
 * Compact action bar для sidebar header: search trigger, notifications, theme toggle.
 *
 * @param props Конфигурация.
 * @returns Inline action buttons.
 */
export function SidebarActions(props: ISidebarActionsProps): ReactElement {
    const { t } = useTranslation(["navigation"])
    const isCollapsed = props.isCollapsed === true
    const hasNotifications = props.notificationCount !== undefined && props.notificationCount > 0

    const bellButton = (
        <Button
            aria-label={t("navigation:toolbar.notifications", {
                count: props.notificationCount ?? 0,
            })}
            className="h-7 min-h-7 w-7 rounded-full p-0"
            size="sm"
            variant="ghost"
        >
            <span className="relative inline-flex">
                <Bell size={14} />
                {hasNotifications ? (
                    <span
                        aria-hidden="true"
                        className="absolute -right-1 -top-1 inline-flex h-3 w-3 items-center justify-center rounded-full bg-danger text-[8px] leading-none text-danger-foreground"
                    >
                        {props.notificationCount}
                    </span>
                ) : null}
            </span>
        </Button>
    )

    if (isCollapsed) {
        return (
            <div className="flex flex-col items-center gap-1">
                <Button
                    aria-label={t("navigation:toolbar.openCommandPalette")}
                    className="h-7 min-h-7 w-7 rounded-full p-0"
                    size="sm"
                    variant="ghost"
                    onPress={props.onOpenCommandPalette}
                >
                    <Search size={14} />
                </Button>
                {bellButton}
            </div>
        )
    }

    return (
        <div className="space-y-1.5">
            <button
                aria-label={t("navigation:toolbar.openCommandPalette")}
                className="flex w-full items-center gap-2 rounded-md border border-border bg-surface/40 px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-surface hover:text-foreground"
                type="button"
                onClick={(): void => {
                    props.onOpenCommandPalette?.()
                }}
            >
                <Search className="shrink-0" size={13} />
                <span className="flex-1 text-left">Search...</span>
                <kbd className="rounded border border-border/60 px-1 py-px text-[10px] font-medium text-muted">
                    ⌘K
                </kbd>
            </button>
            <div className="flex items-center gap-0.5">
                {bellButton}
                <ThemeModeToggle />
            </div>
        </div>
    )
}
