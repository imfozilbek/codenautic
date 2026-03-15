import { type ReactElement, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import {
    Bell,
    Building2,
    ChevronDown,
    ChevronRight,
    Menu,
    Search,
} from "@/components/icons/app-icons"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import {
    Button,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownPopover,
    DropdownTrigger,
} from "@heroui/react"
import { OPEN_COMMAND_PALETTE_EVENT } from "@/lib/keyboard/shortcut-registry"
import type { IBreadcrumbSegment } from "@/lib/navigation/route-guard-map"

import { CommandPalette, type ICommandPaletteRouteOption } from "./command-palette"
import { ThemeModeToggle } from "./theme-mode-toggle"
import { UserMenu } from "./user-menu"

/**
 * Organization option for header workspace switcher.
 */
export interface IHeaderOrganizationOption {
    /** Organization/tenant identifier. */
    readonly id: string
    /** Display label in selector. */
    readonly label: string
}

/**
 * Header component props for the mission-control style navbar.
 */
export interface IHeaderProps {
    /** Unread notification count. */
    readonly notificationCount?: number
    /** User name. */
    readonly userName?: string
    /** User email. */
    readonly userEmail?: string
    /** Sign out action. */
    readonly onSignOut?: () => void
    /** Open mobile navigation drawer. */
    readonly onMobileMenuOpen?: () => void
    /** Available tenant/workspace options. */
    readonly organizations?: ReadonlyArray<IHeaderOrganizationOption>
    /** Active organization ID. */
    readonly activeOrganizationId?: string
    /** Organization change handler. */
    readonly onOrganizationChange?: (organizationId: string) => void
    /** Clickable breadcrumb trail. */
    readonly breadcrumbs?: ReadonlyArray<IBreadcrumbSegment>
    /** Navigate when breadcrumb segment is clicked. */
    readonly onBreadcrumbNavigate?: (path: string) => void
    /** Available routes for command palette. */
    readonly commandPaletteRoutes?: ReadonlyArray<ICommandPaletteRouteOption>
    /** Navigate to selected command palette route. */
    readonly onCommandPaletteNavigate?: (path: string) => void
    /** Open Settings page. */
    readonly onOpenSettings?: () => void
    /** Open Billing page. */
    readonly onOpenBilling?: () => void
    /** Open Help & Diagnostics page. */
    readonly onOpenHelp?: () => void
}

/**
 * @deprecated Use ContentToolbar + SidebarFooter instead.
 * Kept for backward compatibility during migration.
 *
 * @param props Header configuration.
 * @returns Sticky navbar with breadcrumbs, workspace switcher, and user controls.
 */
export function Header(props: IHeaderProps): ReactElement {
    const { t } = useTranslation(["navigation"])
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
    const commandPaletteInvokerRef = useRef<HTMLElement | null>(null)

    const hasNotifications = props.notificationCount !== undefined && props.notificationCount > 0

    const activeOrganization = props.organizations?.find(
        (organization): boolean => organization.id === props.activeOrganizationId,
    )

    const openCommandPalette = (): void => {
        if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
            commandPaletteInvokerRef.current = document.activeElement
        }
        setIsCommandPaletteOpen(true)
    }

    const closeCommandPalette = (): void => {
        setIsCommandPaletteOpen(false)
    }

    useEffect((): (() => void) | void => {
        const handleKeyboardShortcut = (event: KeyboardEvent): void => {
            if (
                (event.ctrlKey !== true && event.metaKey !== true) ||
                event.key.toLowerCase() !== "k"
            ) {
                return
            }

            event.preventDefault()
            openCommandPalette()
        }

        window.addEventListener("keydown", handleKeyboardShortcut)

        return (): void => {
            window.removeEventListener("keydown", handleKeyboardShortcut)
        }
    }, [])

    useEffect((): (() => void) | void => {
        const handleOpenCommandPalette = (): void => {
            openCommandPalette()
        }

        window.addEventListener(
            OPEN_COMMAND_PALETTE_EVENT,
            handleOpenCommandPalette as EventListener,
        )

        return (): void => {
            window.removeEventListener(
                OPEN_COMMAND_PALETTE_EVENT,
                handleOpenCommandPalette as EventListener,
            )
        }
    }, [openCommandPalette])

    const lastBreadcrumb =
        props.breadcrumbs !== undefined && props.breadcrumbs.length > 0
            ? props.breadcrumbs[props.breadcrumbs.length - 1]
            : undefined

    return (
        <header className="sticky top-2 z-40 mx-2 rounded-lg bg-sidebar-bg shadow-sm backdrop-blur sm:mx-3">
            <div className="mx-auto flex h-16 items-center gap-3 px-4">
                {/* Zone 1: Brand */}
                <div className="flex shrink-0 items-center gap-2 md:hidden">
                    <Button
                        className="rounded-full p-2"
                        variant="ghost"
                        aria-label={t("navigation:header.openNavigationMenu")}
                        onPress={props.onMobileMenuOpen}
                    >
                        <Menu size={20} />
                    </Button>
                </div>

                {/* Zone 2: Breadcrumbs */}
                {props.breadcrumbs !== undefined && props.breadcrumbs.length > 0 ? (
                    <nav
                        aria-label={t("navigation:ariaLabel.header.breadcrumb")}
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
                                                className="text-muted transition-colors duration-150 hover:text-foreground"
                                                type="button"
                                                onClick={(): void => {
                                                    props.onBreadcrumbNavigate?.(
                                                        segment.path as string,
                                                    )
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

                {/* Zone 3: Actions + Controls */}
                <div className="ml-auto flex shrink-0 items-center gap-2">
                    {/* Search trigger → opens Command Palette */}
                    <Button
                        aria-label={t("navigation:header.openCommandPalette")}
                        className="hidden gap-1.5 rounded-md px-2.5 sm:inline-flex"
                        size="sm"
                        variant="secondary"
                        onPress={openCommandPalette}
                    >
                        <Search size={15} />
                        <kbd
                            className={`pointer-events-none rounded border border-border bg-surface px-1.5 py-0.5 ${TYPOGRAPHY.microHint} font-medium`}
                        >
                            ⌘K
                        </kbd>
                    </Button>

                    {/* Workspace switcher (HeroUI Dropdown) */}
                    {props.organizations !== undefined ? (
                        <Dropdown>
                            <DropdownTrigger className="hidden sm:inline-flex">
                                <span className="inline-flex items-center gap-1.5">
                                    <Building2
                                        aria-hidden="true"
                                        className="text-muted"
                                        size={15}
                                    />
                                    <span className="text-sm text-foreground">
                                        {activeOrganization?.label ??
                                            t("navigation:header.workspace")}
                                    </span>
                                    <ChevronDown
                                        aria-hidden="true"
                                        className="text-muted"
                                        size={14}
                                    />
                                </span>
                            </DropdownTrigger>
                            <DropdownPopover>
                                <DropdownMenu
                                    aria-label={t("navigation:header.workspaceSwitcher")}
                                    selectionMode="single"
                                    selectedKeys={
                                        props.activeOrganizationId !== undefined
                                            ? new Set([props.activeOrganizationId])
                                            : new Set<string>()
                                    }
                                    onSelectionChange={(keys): void => {
                                        const selected = [...keys][0]
                                        if (typeof selected === "string") {
                                            props.onOrganizationChange?.(selected)
                                        }
                                    }}
                                >
                                    {props.organizations.map(
                                        (organization): ReactElement => (
                                            <DropdownItem key={organization.id}>
                                                {organization.label}
                                            </DropdownItem>
                                        ),
                                    )}
                                </DropdownMenu>
                            </DropdownPopover>
                        </Dropdown>
                    ) : null}

                    {/* Divider between actions and controls */}
                    <div aria-hidden="true" className="mx-1 hidden h-5 w-px bg-border sm:block" />

                    {/* Notification bell */}
                    <Button
                        aria-label={t("navigation:header.notifications", {
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

            {/* Mobile breadcrumb (last segment only) */}
            {lastBreadcrumb !== undefined ? (
                <div className="border-t border-border px-4 py-2 md:hidden">
                    <p className="text-sm text-muted">{lastBreadcrumb.label}</p>
                </div>
            ) : null}

            <CommandPalette
                invokerRef={commandPaletteInvokerRef}
                isOpen={isCommandPaletteOpen}
                onClose={closeCommandPalette}
                onNavigate={(path): void => {
                    props.onCommandPaletteNavigate?.(path)
                }}
                routes={props.commandPaletteRoutes ?? []}
            />
        </header>
    )
}
