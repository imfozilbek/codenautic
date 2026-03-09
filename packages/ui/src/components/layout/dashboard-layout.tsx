import { type ReactElement, type ReactNode, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "@tanstack/react-router"

import {
    getBreadcrumbs,
    isRouteAccessible,
    searchAccessibleRoutes,
} from "@/lib/navigation/route-guard-map"
import { useOrganizationSwitcher } from "@/lib/hooks/use-organization-switcher"
import { useSessionRecovery } from "@/lib/hooks/use-session-recovery"
import { usePolicyDrift } from "@/lib/hooks/use-policy-drift"
import { useProviderDegradation } from "@/lib/hooks/use-provider-degradation"
import { useMultiTabSync } from "@/lib/hooks/use-multi-tab-sync"
import { useDashboardShortcuts } from "@/lib/hooks/use-dashboard-shortcuts"
import { AnimatedMount } from "@/lib/motion"

import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { MobileSidebar } from "./mobile-sidebar"
import { ShortcutsHelpModal } from "./shortcuts-help-modal"
import { SessionRecoveryModal } from "./session-recovery-modal"
import { NotificationAlerts } from "./notification-alerts"

/**
 * Свойства layout-контейнера для страниц dashboard.
 */
export interface IDashboardLayoutProps {
    /** Основное содержимое страницы. */
    readonly children: ReactNode
    /** Заголовок страницы (рендерится в хедере). */
    readonly title?: string
    /** Имя пользователя для user-menu. */
    readonly userName?: string
    /** Email пользователя для user-menu. */
    readonly userEmail?: string
    /** Действие выхода из системы. */
    readonly onSignOut?: () => Promise<void> | void
}

/**
 * Базовый layout для dashboard-экранов с sidebar, header и глобальными контролями.
 *
 * @param props Конфигурация контента.
 * @returns Обёрнутый контент с верхней панелью.
 */
export function DashboardLayout(props: IDashboardLayoutProps): ReactElement {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
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
        (): ReadonlyArray<string> => getBreadcrumbs(location.pathname),
        [location.pathname],
    )

    const searchableRoutes = useMemo(
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

    const handleSignOut = (): void => {
        if (props.onSignOut === undefined) {
            return
        }

        void props.onSignOut()
    }

    return (
        <div className="relative min-h-screen bg-background text-foreground">
            <Header
                activeOrganizationId={orgSwitcher.activeOrganizationId}
                breadcrumbs={breadcrumbs}
                onMobileMenuOpen={(): void => {
                    setIsMobileSidebarOpen(true)
                }}
                onOrganizationChange={orgSwitcher.handleOrganizationChange}
                onOpenBilling={(): void => {
                    void navigate({ to: "/settings-billing" })
                }}
                onOpenHelp={(): void => {
                    void navigate({ to: "/help-diagnostics" })
                }}
                onOpenSettings={(): void => {
                    void navigate({ to: "/settings" })
                }}
                onSearchRouteNavigate={(to): void => {
                    void navigate({ to })
                }}
                userEmail={props.userEmail}
                userName={props.userName}
                onSignOut={handleSignOut}
                organizations={orgSwitcher.organizations}
                searchRoutes={searchableRoutes}
                title={props.title}
            />
            <MobileSidebar
                isOpen={isMobileSidebarOpen}
                onOpenChange={setIsMobileSidebarOpen}
                title="Menu"
            />
            <div className="mx-auto flex w-full max-w-screen-xl gap-4 px-4 py-4 sm:px-6 2xl:max-w-screen-2xl">
                <div className="hidden flex-shrink-0 self-start md:block">
                    <Sidebar
                        isCollapsed={isSidebarCollapsed}
                        onNavigate={(): void => {
                            setIsMobileSidebarOpen(false)
                        }}
                        onSidebarToggle={(): void => {
                            setIsSidebarCollapsed(
                                (previousValue): boolean => !previousValue,
                            )
                        }}
                        title="Menu"
                    />
                </div>
                <div className="flex-1 rounded-lg border border-border bg-content-bg p-4 shadow-sm">
                    <p className="mb-2 text-xs text-text-subtle">
                        Press ? for keyboard shortcuts.
                    </p>
                    <NotificationAlerts
                        multiTabNotice={multiTab.multiTabNotice}
                        policyDriftNotice={policyDrift.policyDriftNotice}
                        providerDegradation={providerDeg.providerDegradation}
                        restoredDraftMessage={sessionRecovery.restoredDraftMessage}
                        shortcutConflicts={shortcuts.conflicts}
                    />
                    <AnimatedMount motionKey={location.pathname}>
                        {props.children}
                    </AnimatedMount>
                </div>
            </div>
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
