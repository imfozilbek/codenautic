import { type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { Bell, ChevronRight, Menu, Search } from "@/components/icons/app-icons"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { Button } from "@heroui/react"
import type { IBreadcrumbSegment } from "@/lib/navigation/route-guard-map"

import { ThemeModeToggle } from "./theme-mode-toggle"
import { UserMenu } from "./user-menu"

/**
 * Props for the content-area toolbar that replaces the old full-width Header.
 */
export interface IContentToolbarProps {
    /** Clickable breadcrumb trail. */
    readonly breadcrumbs?: ReadonlyArray<IBreadcrumbSegment>
    /** Navigate when breadcrumb segment is clicked. */
    readonly onBreadcrumbNavigate?: (path: string) => void
    /** Open the global command palette. */
    readonly onOpenCommandPalette?: () => void
    /** Unread notification count. */
    readonly notificationCount?: number
    /** Open mobile navigation drawer. */
    readonly onMobileMenuOpen?: () => void
    /** User name for user menu. */
    readonly userName?: string
    /** User email for user menu. */
    readonly userEmail?: string
    /** Sign out action. */
    readonly onSignOut?: () => void
    /** Open Settings page. */
    readonly onOpenSettings?: () => void
    /** Open Billing page. */
    readonly onOpenBilling?: () => void
    /** Open Help & Diagnostics page. */
    readonly onOpenHelp?: () => void
}

/**
 * Compact toolbar rendered at the top of the content area.
 * Contains breadcrumbs, search trigger, notifications, theme toggle, and user menu.
 *
 * @param props Toolbar configuration.
 * @returns Content toolbar element.
 */
export function ContentToolbar(props: IContentToolbarProps): ReactElement {
    const { t } = useTranslation(["navigation"])
    const hasNotifications = props.notificationCount !== undefined && props.notificationCount > 0

    const lastBreadcrumb =
        props.breadcrumbs !== undefined && props.breadcrumbs.length > 0
            ? props.breadcrumbs[props.breadcrumbs.length - 1]
            : undefined

    return (
        <div className="flex h-12 items-center gap-2 rounded-lg bg-sidebar-bg px-4 shadow-sm backdrop-blur sm:gap-3">
            {/* Mobile menu button */}
            <div className="flex shrink-0 items-center md:hidden">
                <Button
                    aria-label={t("navigation:toolbar.openNavigationMenu")}
                    className="rounded-full p-2"
                    size="sm"
                    variant="ghost"
                    onPress={props.onMobileMenuOpen}
                >
                    <Menu size={18} />
                </Button>
            </div>

            {/* Desktop breadcrumbs */}
            {props.breadcrumbs !== undefined && props.breadcrumbs.length > 0 ? (
                <nav
                    aria-label={t("navigation:ariaLabel.contentToolbar.breadcrumb")}
                    className="hidden min-w-0 flex-1 md:flex"
                >
                    <ol className="flex items-center gap-1.5 text-sm">
                        {props.breadcrumbs.map((segment, index): ReactElement => {
                            const isLast = index === (props.breadcrumbs?.length ?? 0) - 1

                            return (
                                <li
                                    key={`${segment.label}-${String(index)}`}
                                    className="flex items-center gap-1.5"
                                >
                                    {index > 0 ? (
                                        <ChevronRight
                                            aria-hidden="true"
                                            className="text-muted"
                                            size={14}
                                        />
                                    ) : null}
                                    {segment.path !== undefined && !isLast ? (
                                        <button
                                            className="rounded-sm text-muted transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                                            type="button"
                                            onClick={(): void => {
                                                props.onBreadcrumbNavigate?.(segment.path as string)
                                            }}
                                        >
                                            {segment.label}
                                        </button>
                                    ) : (
                                        <span className="font-medium text-foreground">
                                            {segment.label}
                                        </span>
                                    )}
                                </li>
                            )
                        })}
                    </ol>
                </nav>
            ) : (
                <div className="hidden flex-1 md:block" />
            )}

            {/* Mobile breadcrumb (last segment only) */}
            {lastBreadcrumb !== undefined ? (
                <p className="flex-1 truncate text-sm text-muted md:hidden">
                    {lastBreadcrumb.label}
                </p>
            ) : (
                <div className="flex-1 md:hidden" />
            )}

            {/* Actions */}
            <div className="ml-auto flex shrink-0 items-center gap-2">
                {/* Search trigger → opens Command Palette */}
                <Button
                    aria-label={t("navigation:toolbar.openCommandPalette")}
                    className="hidden gap-1.5 rounded-md px-2.5 sm:inline-flex"
                    size="sm"
                    variant="secondary"
                    onPress={props.onOpenCommandPalette}
                >
                    <Search size={15} />
                    <kbd
                        className={`pointer-events-none rounded border border-border bg-surface px-1.5 py-0.5 ${TYPOGRAPHY.microHint} font-medium`}
                    >
                        ⌘K
                    </kbd>
                </Button>

                <div aria-hidden="true" className="mx-1 hidden h-5 w-px bg-border sm:block" />

                {/* Notification bell */}
                <Button
                    aria-label={t("navigation:toolbar.notifications", {
                        count: props.notificationCount ?? 0,
                    })}
                    className="rounded-full p-2"
                    size="sm"
                    variant="ghost"
                >
                    <span className="relative inline-flex">
                        <Bell size={16} />
                        {hasNotifications ? (
                            <span
                                aria-hidden="true"
                                className="absolute -right-1.5 -top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] leading-none text-danger-foreground"
                            >
                                {props.notificationCount}
                            </span>
                        ) : null}
                    </span>
                </Button>

                <ThemeModeToggle />

                <UserMenu
                    onOpenBilling={props.onOpenBilling}
                    onOpenHelp={props.onOpenHelp}
                    onOpenSettings={props.onOpenSettings}
                    onSignOut={props.onSignOut}
                    userEmail={props.userEmail}
                    userName={props.userName}
                />
            </div>
        </div>
    )
}
