import { type ReactElement, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "@tanstack/react-router"

import {
    getBreadcrumbsWithPaths,
    isRouteAccessible,
    searchAccessibleRoutes,
} from "@/lib/navigation/route-guard-map"
import { useOrganizationSwitcher } from "@/lib/hooks/use-organization-switcher"
import { useSessionRecovery } from "@/lib/hooks/use-session-recovery"
import { usePolicyDrift } from "@/lib/hooks/use-policy-drift"
import { useProviderDegradation } from "@/lib/hooks/use-provider-degradation"
import { useMultiTabSync } from "@/lib/hooks/use-multi-tab-sync"
import { useDashboardShortcuts } from "@/lib/hooks/use-dashboard-shortcuts"
import { OPEN_COMMAND_PALETTE_EVENT } from "@/lib/keyboard/shortcut-registry"
import { AnimatedMount } from "@/lib/motion"

import { CommandPalette } from "./command-palette"
import { ContentToolbar } from "./content-toolbar"
import { Sidebar } from "./sidebar"
import { SidebarFooter } from "./sidebar-footer"
import { MobileSidebar } from "./mobile-sidebar"
import { ShortcutsHelpModal } from "./shortcuts-help-modal"
import { SessionRecoveryModal } from "./session-recovery-modal"
import { NotificationAlerts } from "./notification-alerts"

/**
 * Layout container props for dashboard pages.
 */
export interface IDashboardLayoutProps {
    /** Page content. */
    readonly children: ReactNode
    /** Page title (unused in sidebar-first layout, kept for backward compat). */
    readonly title?: string
    /** User name for user-menu. */
    readonly userName?: string
    /** User email for user-menu. */
    readonly userEmail?: string
    /** Sign out action. */
    readonly onSignOut?: () => Promise<void> | void
}

/**
 * Sidebar-first layout for dashboard screens.
 * Full-height sidebar on the left, content toolbar + page content on the right.
 * Command Palette is managed at this level (Cmd+K listener).
 *
 * @param props Layout configuration.
 * @returns Two-column layout with sidebar navigation and content area.
 */
export function DashboardLayout(props: IDashboardLayoutProps): ReactElement {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
    const commandPaletteInvokerRef = useRef<HTMLElement | null>(null)
    const navigate = useNavigate()
    const location = useLocation()

    const orgSwitcher = useOrganizationSwitcher()
    const sessionRecovery = useSessionRecovery()
    const policyDrift = usePolicyDrift()
    const providerDeg = useProviderDegradation()
    const multiTab = useMultiTabSync(
        orgSwitcher.activeOrganizationId,
        orgSwitcher.setActiveOrganizationId,
    )
    const shortcuts = useDashboardShortcuts()

    const routeGuardContext = useMemo(
        () => ({
            isAuthenticated: true,
            role: policyDrift.activeRoleId,
            tenantId: orgSwitcher.activeOrganizationId,
        }),
        [orgSwitcher.activeOrganizationId, policyDrift.activeRoleId],
    )

    const breadcrumbs = useMemo(
        () => getBreadcrumbsWithPaths(location.pathname),
        [location.pathname],
    )

    const commandPaletteRoutes = useMemo(
        () =>
            searchAccessibleRoutes("", routeGuardContext).map((route) => ({
                label: route.label,
                path: route.path,
            })),
        [routeGuardContext],
    )

    useEffect((): void => {
        if (isRouteAccessible(location.pathname, routeGuardContext)) {
            return
        }

        void navigate({ to: "/settings" })
    }, [location.pathname, navigate, routeGuardContext])

    const openCommandPalette = useCallback((): void => {
        if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
            commandPaletteInvokerRef.current = document.activeElement
        }
        setIsCommandPaletteOpen(true)
    }, [])

    const closeCommandPalette = useCallback((): void => {
        setIsCommandPaletteOpen(false)
    }, [])

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
    }, [openCommandPalette])

    useEffect((): (() => void) | void => {
        if (typeof window === "undefined") {
            return
        }

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

    const handleSignOut = (): void => {
        if (props.onSignOut === undefined) {
            return
        }

        void props.onSignOut()
    }

    const sidebarFooter = (
        <SidebarFooter
            activeOrganizationId={orgSwitcher.activeOrganizationId}
            isCollapsed={isSidebarCollapsed}
            onOpenBilling={(): void => {
                void navigate({ to: "/settings-billing" })
            }}
            onOpenHelp={(): void => {
                void navigate({ to: "/help-diagnostics" })
            }}
            onOpenSettings={(): void => {
                void navigate({ to: "/settings" })
            }}
            onOrganizationChange={orgSwitcher.handleOrganizationChange}
            onSignOut={handleSignOut}
            organizations={orgSwitcher.organizations}
            userEmail={props.userEmail}
            userName={props.userName}
        />
    )

    return (
        <div className="relative grid h-screen grid-cols-1 gap-2 overflow-hidden p-2 text-foreground sm:p-3 md:grid-cols-[auto_1fr]">
            {/* Sidebar — full height, hidden on mobile */}
            <div className="hidden md:block">
                <Sidebar
                    footerSlot={sidebarFooter}
                    isCollapsed={isSidebarCollapsed}
                    onNavigate={(): void => {
                        setIsMobileSidebarOpen(false)
                    }}
                    onSidebarToggle={(): void => {
                        setIsSidebarCollapsed((previousValue): boolean => !previousValue)
                    }}
                    title="Menu"
                />
            </div>

            {/* Content column — scrollable */}
            <div className="flex min-h-0 flex-col gap-2">
                <ContentToolbar
                    breadcrumbs={breadcrumbs}
                    onBreadcrumbNavigate={(to): void => {
                        void navigate({ to })
                    }}
                    onMobileMenuOpen={(): void => {
                        setIsMobileSidebarOpen(true)
                    }}
                    onOpenBilling={(): void => {
                        void navigate({ to: "/settings-billing" })
                    }}
                    onOpenCommandPalette={openCommandPalette}
                    onOpenHelp={(): void => {
                        void navigate({ to: "/help-diagnostics" })
                    }}
                    onOpenSettings={(): void => {
                        void navigate({ to: "/settings" })
                    }}
                    onSignOut={handleSignOut}
                    userEmail={props.userEmail}
                    userName={props.userName}
                />
                <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-content-bg p-4 shadow-sm">
                    <NotificationAlerts
                        multiTabNotice={multiTab.multiTabNotice}
                        policyDriftNotice={policyDrift.policyDriftNotice}
                        providerDegradation={providerDeg.providerDegradation}
                        restoredDraftMessage={sessionRecovery.restoredDraftMessage}
                        shortcutConflicts={shortcuts.conflicts}
                    />
                    <AnimatedMount motionKey={location.pathname}>{props.children}</AnimatedMount>
                </div>
            </div>

            {/* Mobile sidebar drawer */}
            <MobileSidebar
                footerSlot={sidebarFooter}
                isOpen={isMobileSidebarOpen}
                onOpenChange={setIsMobileSidebarOpen}
                title="Menu"
            />

            {/* Global command palette */}
            <CommandPalette
                invokerRef={commandPaletteInvokerRef}
                isOpen={isCommandPaletteOpen}
                onClose={closeCommandPalette}
                onNavigate={(path): void => {
                    void navigate({ to: path })
                }}
                routes={commandPaletteRoutes}
            />

            <ShortcutsHelpModal
                isOpen={shortcuts.isShortcutsHelpOpen}
                onOpenChange={shortcuts.setIsShortcutsHelpOpen}
                onQueryChange={shortcuts.setShortcutsHelpQuery}
                query={shortcuts.shortcutsHelpQuery}
                shortcuts={shortcuts.filteredShortcuts}
            />
            <SessionRecoveryModal
                failureCode={sessionRecovery.sessionFailureCode}
                isOpen={sessionRecovery.isSessionRecoveryOpen}
                onOpenChange={sessionRecovery.setIsSessionRecoveryOpen}
                onReAuthenticate={sessionRecovery.handleReAuthenticate}
            />
        </div>
    )
}
