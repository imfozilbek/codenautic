import {
    type ReactElement,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "@tanstack/react-router"

import {
    isRouteAccessible,
    searchAccessibleRoutes,
    translateRouteLabelKey,
} from "@/lib/navigation/route-guard-map"
import { useOrganizationSwitcher } from "@/lib/hooks/use-organization-switcher"
import { useSessionRecovery } from "@/lib/hooks/use-session-recovery"
import { usePolicyDrift } from "@/lib/hooks/use-policy-drift"
import { useProviderDegradation } from "@/lib/hooks/use-provider-degradation"
import { useMultiTabSync } from "@/lib/hooks/use-multi-tab-sync"
import { useDashboardShortcuts } from "@/lib/hooks/use-dashboard-shortcuts"
import { OPEN_COMMAND_PALETTE_EVENT } from "@/lib/keyboard/shortcut-registry"

import { AnimatePresence, motion } from "motion/react"

import { Menu } from "@/components/icons/app-icons"
import { Button } from "@heroui/react"

import { CommandPalette } from "./command-palette"
import { Sidebar } from "./sidebar"
import { SidebarActions } from "./sidebar-actions"
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
    const isSidebarCollapsed = false
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
    const commandPaletteInvokerRef = useRef<HTMLElement | null>(null)
    const navigate = useNavigate()
    const location = useLocation()

    const { t } = useTranslation(["navigation"])
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

    const commandPaletteRoutes = useMemo(
        () =>
            searchAccessibleRoutes("", routeGuardContext).map((route) => ({
                label: translateRouteLabelKey(route.labelKey, t),
                path: route.path,
            })),
        [routeGuardContext, t],
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

        document.addEventListener("keydown", handleKeyboardShortcut)

        return (): void => {
            document.removeEventListener("keydown", handleKeyboardShortcut)
        }
    }, [openCommandPalette])

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
        <div className="relative grid h-screen grid-cols-1 overflow-hidden text-foreground lg:grid-cols-[auto_1fr]">
            <a
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
                href="#main-content"
            >
                Skip to main content
            </a>

            {/* Sidebar — full height, hidden on mobile/tablet */}
            <div className="hidden lg:block">
                <Sidebar
                    footerSlot={sidebarFooter}
                    headerSlot={
                        <SidebarActions
                            isCollapsed={isSidebarCollapsed}
                            onOpenCommandPalette={openCommandPalette}
                        />
                    }
                    isCollapsed={isSidebarCollapsed}
                    onNavigate={(): void => {
                        setIsMobileSidebarOpen(false)
                    }}
                    title="Menu"
                />
            </div>

            {/* Content column — scrollable */}
            <div className="flex min-h-0 flex-col">
                {/* Mobile menu button — visible only on small screens */}
                <div className="flex items-center gap-2 p-3 lg:hidden">
                    <Button
                        aria-label={t("navigation:toolbar.openNavigationMenu")}
                        className="rounded-full p-2"
                        size="sm"
                        variant="ghost"
                        onPress={(): void => {
                            setIsMobileSidebarOpen(true)
                        }}
                    >
                        <Menu size={20} />
                    </Button>
                </div>
                <div
                    className="flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6 lg:px-12 xl:px-16"
                    id="main-content"
                >
                    <NotificationAlerts
                        multiTabNotice={multiTab.multiTabNotice}
                        policyDriftNotice={policyDrift.policyDriftNotice}
                        providerDegradation={providerDeg.providerDegradation}
                        restoredDraftMessage={sessionRecovery.restoredDraftMessage}
                        shortcutConflicts={shortcuts.conflicts}
                    />
                    <AnimatePresence mode="wait">
                        <motion.div
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            initial={{ opacity: 0, y: 4 }}
                            key={`page-${location.pathname}`}
                            transition={{
                                duration: 0.15,
                                ease: [0.0, 0.0, 0.2, 1.0],
                            }}
                        >
                            {props.children}
                        </motion.div>
                    </AnimatePresence>
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
