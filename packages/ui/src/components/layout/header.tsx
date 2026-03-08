import { type ReactElement, useEffect, useRef, useState } from "react"

import { Bell, Menu, Rocket } from "@/components/icons/app-icons"
import { Button } from "@/components/ui"
import {
    FOCUS_GLOBAL_SEARCH_EVENT,
    OPEN_COMMAND_PALETTE_EVENT,
} from "@/lib/keyboard/shortcut-registry"

import { CommandPalette, type ICommandPaletteRouteOption } from "./command-palette"
import { ThemeModeToggle } from "./theme-mode-toggle"
import { UserMenu } from "./user-menu"

/**
 * Organization option for header switcher.
 */
export interface IHeaderOrganizationOption {
    /** Organization/tenant identifier. */
    readonly id: string
    /** Display label in selector. */
    readonly label: string
}

/**
 * Role option for RBAC preview.
 */
export interface IHeaderRoleOption {
    /** Technical role id. */
    readonly id: string
    /** Human-readable role label. */
    readonly label: string
}

/**
 * Route option for global search.
 */
export interface IHeaderSearchRouteOption {
    /** Route label. */
    readonly label: string
    /** Route path. */
    readonly path: string
}

/**
 * Header component props.
 */
export interface IHeaderProps {
    /** Title in the center of navbar. */
    readonly title?: string
    /** Unread notification count. */
    readonly notificationCount?: number
    /** User name. */
    readonly userName?: string
    /** User email. */
    readonly userEmail?: string
    /** Sign out action. */
    readonly onSignOut?: () => void
    /** Open mobile navigation. */
    readonly onMobileMenuOpen?: () => void
    /** Available tenant/workspace options. */
    readonly organizations?: ReadonlyArray<IHeaderOrganizationOption>
    /** Active organization. */
    readonly activeOrganizationId?: string
    /** Organization change handler. */
    readonly onOrganizationChange?: (organizationId: string) => void
    /** Available RBAC role options. */
    readonly roleOptions?: ReadonlyArray<IHeaderRoleOption>
    /** Active role. */
    readonly activeRoleId?: string
    /** Role change handler. */
    readonly onRoleChange?: (roleId: string) => void
    /** Breadcrumb trail. */
    readonly breadcrumbs?: ReadonlyArray<string>
    /** Available routes for global search. */
    readonly searchRoutes?: ReadonlyArray<IHeaderSearchRouteOption>
    /** Navigate to selected route. */
    readonly onSearchRouteNavigate?: (path: string) => void
    /** Open Settings page. */
    readonly onOpenSettings?: () => void
    /** Open Billing page. */
    readonly onOpenBilling?: () => void
    /** Open Help & Diagnostics page. */
    readonly onOpenHelp?: () => void
}

/**
 * Application header with logo, search, org/role switchers, and controls.
 * Command palette is extracted to its own component.
 * Theme preset selection moved to /settings-appearance.
 *
 * @param props Header configuration.
 * @returns Navbar with theme toggle, user menu, and command palette.
 */
export function Header(props: IHeaderProps): ReactElement {
    const [searchQuery, setSearchQuery] = useState("")
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
    const searchInputRef = useRef<HTMLInputElement | null>(null)
    const commandPaletteInvokerRef = useRef<HTMLElement | null>(null)
    const hasNotifications = props.notificationCount !== undefined && props.notificationCount > 0
    const activeOrganization = props.organizations?.find((organization): boolean => {
        return organization.id === props.activeOrganizationId
    })
    const activeRole = props.roleOptions?.find((role): boolean => {
        return role.id === props.activeRoleId
    })

    const commandPaletteRoutes: ReadonlyArray<ICommandPaletteRouteOption> =
        props.searchRoutes ?? []

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
        if (typeof window === "undefined") {
            return
        }

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
        if (typeof window === "undefined") {
            return
        }

        const handleOpenCommandPalette = (): void => {
            openCommandPalette()
        }
        const handleFocusGlobalSearch = (): void => {
            searchInputRef.current?.focus()
            searchInputRef.current?.select()
        }

        window.addEventListener(
            OPEN_COMMAND_PALETTE_EVENT,
            handleOpenCommandPalette as EventListener,
        )
        window.addEventListener(FOCUS_GLOBAL_SEARCH_EVENT, handleFocusGlobalSearch as EventListener)

        return (): void => {
            window.removeEventListener(
                OPEN_COMMAND_PALETTE_EVENT,
                handleOpenCommandPalette as EventListener,
            )
            window.removeEventListener(
                FOCUS_GLOBAL_SEARCH_EVENT,
                handleFocusGlobalSearch as EventListener,
            )
        }
    }, [openCommandPalette])

    return (
        <div className="border-b border-border bg-header-bg backdrop-blur">
            <div className="mx-auto flex h-16 items-center gap-3 px-3">
                <div className={props.title === undefined ? "md:hidden" : "hidden md:flex"}>
                    <Button
                        isIconOnly
                        radius="full"
                        variant="light"
                        aria-label="Open navigation menu"
                        onPress={props.onMobileMenuOpen}
                    >
                        <Menu size={20} />
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Rocket aria-hidden="true" className="text-primary" size={20} />
                    <p className="text-base font-bold tracking-tight text-foreground">CodeNautic</p>
                </div>
                <div className="mx-auto hidden md:block">
                    {props.title !== undefined ? (
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium text-text-tertiary">{props.title}</p>
                            {props.breadcrumbs === undefined ? null : (
                                <p className="text-[11px] text-text-subtle">
                                    {props.breadcrumbs.join(" / ")}
                                </p>
                            )}
                        </div>
                    ) : null}
                </div>
                {props.searchRoutes === undefined ? null : (
                    <div className="hidden min-w-[230px] md:block">
                        <input
                            aria-label="Global route search"
                            className="w-full rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground transition-shadow duration-200 focus:shadow-md"
                            placeholder="Global search (Ctrl+K)"
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(event): void => {
                                setSearchQuery(event.currentTarget.value)
                            }}
                            onKeyDown={(event): void => {
                                if (event.key !== "Enter") {
                                    return
                                }

                                const normalizedQuery = searchQuery.trim().toLowerCase()
                                if (normalizedQuery.length === 0) {
                                    openCommandPalette()
                                    return
                                }

                                const matchedRoute = props.searchRoutes?.find(
                                    (route): boolean => {
                                        return `${route.label} ${route.path}`
                                            .toLowerCase()
                                            .includes(normalizedQuery)
                                    },
                                )

                                if (matchedRoute !== undefined) {
                                    props.onSearchRouteNavigate?.(matchedRoute.path)
                                    setSearchQuery("")
                                }
                            }}
                        />
                    </div>
                )}
                {props.organizations === undefined && props.roleOptions === undefined ? null : (
                    <div className="hidden items-start gap-2 md:flex">
                        {props.organizations === undefined ? null : (
                            <div className="min-w-[180px]">
                                <label
                                    className="text-[11px] uppercase tracking-[0.08em] text-text-subtle"
                                    htmlFor="header-organization-switcher"
                                >
                                    Workspace
                                </label>
                                <select
                                    aria-label="Organization workspace switcher"
                                    className="mt-0.5 w-full rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
                                    id="header-organization-switcher"
                                    value={props.activeOrganizationId}
                                    onChange={(event): void => {
                                        props.onOrganizationChange?.(event.currentTarget.value)
                                    }}
                                >
                                    {props.organizations.map(
                                        (organization): ReactElement => (
                                            <option key={organization.id} value={organization.id}>
                                                {organization.label}
                                            </option>
                                        ),
                                    )}
                                </select>
                                <p className="text-[11px] text-text-subtle">
                                    Current: {activeOrganization?.label ?? "Unknown workspace"}
                                </p>
                            </div>
                        )}
                        {props.roleOptions === undefined ? null : (
                            <div className="min-w-[140px]">
                                <label
                                    className="text-[11px] uppercase tracking-[0.08em] text-text-subtle"
                                    htmlFor="header-rbac-role-switcher"
                                >
                                    Role preview
                                </label>
                                <select
                                    aria-label="RBAC role switcher"
                                    className="mt-0.5 w-full rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
                                    id="header-rbac-role-switcher"
                                    value={props.activeRoleId}
                                    onChange={(event): void => {
                                        props.onRoleChange?.(event.currentTarget.value)
                                    }}
                                >
                                    {props.roleOptions.map(
                                        (role): ReactElement => (
                                            <option key={role.id} value={role.id}>
                                                {role.label}
                                            </option>
                                        ),
                                    )}
                                </select>
                                <p className="text-[11px] text-text-subtle">
                                    Active: {activeRole?.label ?? "Unknown role"}
                                </p>
                            </div>
                        )}
                    </div>
                )}
                <div className="ml-auto flex items-center gap-2">
                    <Button
                        isIconOnly
                        radius="full"
                        variant="light"
                        aria-label={`Notifications (${props.notificationCount ?? 0})`}
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
            {props.title === undefined ? null : (
                <div className="border-t border-border px-3 py-2 md:hidden">
                    <p className="text-sm text-text-tertiary">{props.title}</p>
                </div>
            )}
            <CommandPalette
                invokerRef={commandPaletteInvokerRef}
                isOpen={isCommandPaletteOpen}
                onClose={closeCommandPalette}
                onNavigate={(path): void => {
                    props.onSearchRouteNavigate?.(path)
                }}
                routes={commandPaletteRoutes}
            />
        </div>
    )
}
