import { type ReactElement, type ReactNode, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import type { TTenantId, TUiRole } from "@/lib/access/access-types"
import { useAuthAccess } from "@/lib/auth/auth-access"
import { useUiRole } from "@/lib/permissions/ui-policy"
import { POLICY_DRIFT_EVENT_NAME, isPolicyDriftEventDetail } from "@/lib/permissions/policy-drift"
import { queryKeys } from "@/lib/query/query-keys"
import {
    PROVIDER_DEGRADATION_EVENT,
    isProviderDegradationDetail,
    type IProviderDegradationEventDetail,
} from "@/lib/providers/degradation-mode"
import {
    MULTI_TAB_SYNC_CHANNEL,
    TENANT_STORAGE_KEY,
    THEME_MODE_STORAGE_KEY,
    THEME_PRESET_STORAGE_KEY,
    isMultiTabSyncMessage,
    type TMultiTabSyncMessage,
} from "@/lib/sync/multi-tab-consistency"
import {
    buildDraftFieldKey,
    clearSessionPendingIntent,
    readSessionDraftSnapshot,
    readSessionPendingIntent,
    writeSessionDraftSnapshot,
    writeSessionPendingIntent,
    type ISessionExpiredEventDetail,
} from "@/lib/session/session-recovery"
import {
    getBreadcrumbs,
    isRouteAccessible,
    searchAccessibleRoutes,
} from "@/lib/navigation/route-guard-map"
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts"
import {
    FOCUS_GLOBAL_SEARCH_EVENT,
    FOCUS_REVIEWS_FILTERS_EVENT,
    OPEN_COMMAND_PALETTE_EVENT,
    type IShortcutDefinition,
} from "@/lib/keyboard/shortcut-registry"
import {
    Alert,
    Button,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
} from "@/components/ui"
import { AnimatedAlert, AnimatedMount } from "@/lib/motion"

import { Header } from "./header"
import type { IHeaderOrganizationOption } from "./header"
import { Sidebar } from "./sidebar"
import { MobileSidebar } from "./mobile-sidebar"

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

const ORGANIZATION_OPTIONS: ReadonlyArray<IHeaderOrganizationOption> = [
    {
        id: "platform-team",
        label: "Platform Team",
    },
    {
        id: "frontend-team",
        label: "Frontend Team",
    },
    {
        id: "runtime-team",
        label: "Runtime Team",
    },
]

const DEFAULT_ORGANIZATION_ID = resolveDefaultOrganizationId()

function resolveDefaultOrganizationId(): TTenantId {
    const firstOrganization = ORGANIZATION_OPTIONS[0]
    if (firstOrganization === undefined) {
        return "platform-team"
    }

    return firstOrganization.id as TTenantId
}

function readStoredActiveOrganizationId(fallbackTenantId: TTenantId | undefined): TTenantId {
    if (typeof window !== "undefined") {
        try {
            const storedTenantId = window.localStorage.getItem(TENANT_STORAGE_KEY)
            if (
                storedTenantId === "platform-team" ||
                storedTenantId === "frontend-team" ||
                storedTenantId === "runtime-team"
            ) {
                return storedTenantId
            }
        } catch {
            return fallbackTenantId ?? DEFAULT_ORGANIZATION_ID
        }
    }

    return fallbackTenantId ?? DEFAULT_ORGANIZATION_ID
}

function clearTenantScopedStorage(previousTenantId: string, nextTenantId: string): void {
    if (typeof window === "undefined") {
        return
    }

    Object.keys(window.localStorage).forEach((storageKey): void => {
        if (storageKey.startsWith("codenautic:tenant:")) {
            window.localStorage.removeItem(storageKey)
        }
    })

    window.localStorage.setItem("codenautic:tenant:active", nextTenantId)
    window.sessionStorage.setItem("codenautic:tenant:last-switch", new Date().toISOString())
    window.dispatchEvent(
        new CustomEvent("codenautic:tenant-switched", {
            detail: {
                nextTenantId,
                previousTenantId,
            },
        }),
    )
}

/**
 * Базовый layout для dashboard-экранов с HeroUI navbar и глобальными контролями.
 *
 * @param props Конфигурация контента.
 * @returns Обёрнутый контент с верхней панелью.
 */
export function DashboardLayout(props: IDashboardLayoutProps): ReactElement {
    const authAccess = useAuthAccess()
    const persistedRoleId = useUiRole()
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [activeOrganizationId, setActiveOrganizationId] = useState<TTenantId>(() => {
        return readStoredActiveOrganizationId(authAccess?.tenantId)
    })
    const [policyRoleOverride, setPolicyRoleOverride] = useState<TUiRole | undefined>(undefined)
    const [isSessionRecoveryOpen, setIsSessionRecoveryOpen] = useState(false)
    const [sessionFailureCode, setSessionFailureCode] = useState<401 | 419>(401)
    const [restoredDraftMessage, setRestoredDraftMessage] = useState<string | undefined>(undefined)
    const [policyDriftNotice, setPolicyDriftNotice] = useState<string | undefined>(undefined)
    const [providerDegradation, setProviderDegradation] = useState<
        IProviderDegradationEventDetail | undefined
    >(undefined)
    const [multiTabNotice, setMultiTabNotice] = useState<string | undefined>(undefined)
    const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false)
    const [shortcutsHelpQuery, setShortcutsHelpQuery] = useState("")
    const navigate = useNavigate()
    const location = useLocation()
    const queryClient = useQueryClient()
    const activeRoleId = policyRoleOverride ?? persistedRoleId
    const routeGuardContext = useMemo(
        () => ({
            isAuthenticated: true,
            role: activeRoleId,
            tenantId: activeOrganizationId,
        }),
        [activeOrganizationId, activeRoleId],
    )
    const breadcrumbs = useMemo((): ReadonlyArray<string> => {
        return getBreadcrumbs(location.pathname)
    }, [location.pathname])
    const searchableRoutes = useMemo(() => {
        return searchAccessibleRoutes("", routeGuardContext).map((route) => ({
            label: route.label,
            path: route.path,
        }))
    }, [routeGuardContext])
    const shortcutDefinitions = useMemo((): ReadonlyArray<IShortcutDefinition> => {
        return [
            {
                handler: (): void => {
                    window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT))
                },
                id: "open-command-palette-meta",
                keys: "meta+k",
                label: "Open command palette",
                scope: "global",
            },
            {
                handler: (): void => {
                    window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT))
                },
                id: "open-command-palette-ctrl",
                keys: "ctrl+k",
                label: "Open command palette",
                scope: "global",
            },
            {
                handler: (): void => {
                    window.dispatchEvent(new CustomEvent(FOCUS_GLOBAL_SEARCH_EVENT))
                },
                id: "focus-global-search",
                keys: "slash",
                label: "Focus global search",
                scope: "global",
            },
            {
                handler: (): void => {
                    void navigate({
                        to: "/",
                    })
                },
                id: "goto-dashboard",
                keys: "g d",
                label: "Go to dashboard",
                scope: "global",
            },
            {
                handler: (): void => {
                    void navigate({
                        to: "/reviews",
                    })
                },
                id: "goto-reviews",
                keys: "g r",
                label: "Go to ccr management",
                scope: "global",
            },
            {
                handler: (): void => {
                    window.dispatchEvent(new CustomEvent(FOCUS_REVIEWS_FILTERS_EVENT))
                },
                id: "focus-reviews-filters",
                keys: "f",
                label: "Focus reviews filters",
                routePredicate: (routePath: string): boolean => routePath === "/reviews",
                scope: "page",
            },
            {
                handler: (): void => {
                    setIsShortcutsHelpOpen(true)
                },
                id: "open-shortcuts-help",
                keys: "question",
                label: "Open shortcuts help",
                scope: "global",
            },
        ]
    }, [navigate])
    const keyboardShortcuts = useKeyboardShortcuts({
        routePath: location.pathname,
        shortcuts: shortcutDefinitions,
    })
    const filteredShortcuts = useMemo(() => {
        const normalizedQuery = shortcutsHelpQuery.trim().toLowerCase()
        if (normalizedQuery.length === 0) {
            return keyboardShortcuts.shortcuts
        }

        return keyboardShortcuts.shortcuts.filter((shortcut): boolean => {
            return `${shortcut.label} ${shortcut.keys} ${shortcut.scope}`
                .toLowerCase()
                .includes(normalizedQuery)
        })
    }, [keyboardShortcuts.shortcuts, shortcutsHelpQuery])

    const handleSignOut = (): void => {
        if (props.onSignOut === undefined) {
            return
        }

        void props.onSignOut()
    }

    useEffect((): void => {
        if (authAccess === undefined) {
            return
        }

        setActiveOrganizationId(readStoredActiveOrganizationId(authAccess.tenantId))
    }, [authAccess])

    useEffect((): void => {
        if (policyRoleOverride === undefined) {
            return
        }

        if (policyRoleOverride !== persistedRoleId) {
            return
        }

        setPolicyRoleOverride(undefined)
    }, [persistedRoleId, policyRoleOverride])

    const handleOrganizationChange = (organizationId: string): void => {
        if (
            organizationId !== "platform-team" &&
            organizationId !== "frontend-team" &&
            organizationId !== "runtime-team"
        ) {
            return
        }

        if (organizationId === activeOrganizationId) {
            return
        }

        const organization = ORGANIZATION_OPTIONS.find((item): boolean => {
            return item.id === organizationId
        })
        if (organization === undefined) {
            return
        }

        const isConfirmed =
            typeof window === "undefined"
                ? true
                : window.confirm(`Switch workspace to ${organization.label}?`)
        if (isConfirmed !== true) {
            return
        }

        clearTenantScopedStorage(activeOrganizationId, organizationId)
        setActiveOrganizationId(organizationId)
        window.localStorage.setItem(TENANT_STORAGE_KEY, organizationId)
        if (typeof window.BroadcastChannel === "function") {
            const channel = new window.BroadcastChannel(MULTI_TAB_SYNC_CHANNEL)
            channel.postMessage({
                tenantId: organizationId,
                type: "tenant",
            } satisfies TMultiTabSyncMessage)
            channel.close()
        }
    }

    useEffect((): void => {
        if (isRouteAccessible(location.pathname, routeGuardContext)) {
            return
        }

        void navigate({
            to: "/settings",
        })
    }, [location.pathname, navigate, routeGuardContext])

    useEffect((): (() => void) | void => {
        if (typeof window === "undefined") {
            return
        }

        const handleSessionExpired = (event: Event): void => {
            const customEvent = event as CustomEvent<ISessionExpiredEventDetail>
            const detail = customEvent.detail
            const code = detail?.code === 419 ? 419 : 401
            const pendingIntent = detail?.pendingIntent ?? location.pathname

            setSessionFailureCode(code)
            setIsSessionRecoveryOpen(true)
            writeSessionPendingIntent(pendingIntent)
        }

        const handleInputAutosave = (event: Event): void => {
            const target = event.target
            const isInputElement = target instanceof HTMLInputElement
            const isTextAreaElement = target instanceof HTMLTextAreaElement
            if (isInputElement !== true && isTextAreaElement !== true) {
                return
            }

            if (isInputElement) {
                const isTextInput =
                    target.type === "text" ||
                    target.type === "email" ||
                    target.type === "search" ||
                    target.type === "url" ||
                    target.type === "tel"
                if (isTextInput !== true) {
                    return
                }
            }

            const value = target.value.trim()
            if (value.length === 0) {
                return
            }

            writeSessionDraftSnapshot({
                fieldKey: buildDraftFieldKey(target),
                path: location.pathname,
                updatedAt: new Date().toISOString(),
                value: target.value,
            })
        }

        window.addEventListener("codenautic:session-expired", handleSessionExpired as EventListener)
        document.addEventListener("input", handleInputAutosave, true)

        return (): void => {
            window.removeEventListener(
                "codenautic:session-expired",
                handleSessionExpired as EventListener,
            )
            document.removeEventListener("input", handleInputAutosave, true)
        }
    }, [location.pathname])

    useEffect((): (() => void) | void => {
        if (typeof window === "undefined") {
            return
        }

        const handlePolicyDrift = (event: Event): void => {
            const customEvent = event as CustomEvent<unknown>
            const detail = customEvent.detail
            if (isPolicyDriftEventDetail(detail) !== true) {
                return
            }

            setPolicyRoleOverride(detail.nextRole)
            setPolicyDriftNotice(
                `Policy changed to ${detail.nextRole}: ${detail.reason}. UI permissions were refreshed.`,
            )
            void queryClient.invalidateQueries({ queryKey: queryKeys.auth.session() })
            void queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all() })
        }

        window.addEventListener(POLICY_DRIFT_EVENT_NAME, handlePolicyDrift as EventListener)

        return (): void => {
            window.removeEventListener(POLICY_DRIFT_EVENT_NAME, handlePolicyDrift as EventListener)
        }
    }, [queryClient])

    useEffect((): (() => void) | void => {
        if (typeof window === "undefined") {
            return
        }

        const handleProviderDegradation = (event: Event): void => {
            const customEvent = event as CustomEvent<unknown>
            const detail = customEvent.detail
            if (isProviderDegradationDetail(detail) !== true) {
                return
            }

            if (detail.level === "operational") {
                setProviderDegradation(undefined)
                return
            }

            setProviderDegradation(detail)
        }

        window.addEventListener(
            PROVIDER_DEGRADATION_EVENT,
            handleProviderDegradation as EventListener,
        )

        return (): void => {
            window.removeEventListener(
                PROVIDER_DEGRADATION_EVENT,
                handleProviderDegradation as EventListener,
            )
        }
    }, [])

    useEffect((): (() => void) | void => {
        if (typeof window === "undefined" || typeof window.BroadcastChannel !== "function") {
            return
        }

        const channel = new window.BroadcastChannel(MULTI_TAB_SYNC_CHANNEL)
        const handleMessage = (event: MessageEvent<unknown>): void => {
            const data = event.data
            if (isMultiTabSyncMessage(data) !== true) {
                return
            }

            if (data.type === "tenant" && data.tenantId !== activeOrganizationId) {
                setActiveOrganizationId(data.tenantId)
                setMultiTabNotice(`Tenant switched in another tab: ${data.tenantId}.`)
                return
            }

            if (data.type === "permissions") {
                setMultiTabNotice(`Permissions updated in another tab: ${data.role}.`)
                void queryClient.invalidateQueries({ queryKey: queryKeys.auth.session() })
                void queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all() })
                return
            }

            if (data.type === "theme") {
                setMultiTabNotice("Theme updated in another tab and synchronized.")
            }
        }

        channel.addEventListener("message", handleMessage)

        return (): void => {
            channel.removeEventListener("message", handleMessage)
            channel.close()
        }
    }, [activeOrganizationId, queryClient])

    useEffect((): (() => void) | void => {
        if (typeof window === "undefined") {
            return
        }

        const handleStorageSync = (event: StorageEvent): void => {
            if (event.key === TENANT_STORAGE_KEY && event.newValue !== null) {
                if (
                    (event.newValue === "platform-team" ||
                        event.newValue === "frontend-team" ||
                        event.newValue === "runtime-team") &&
                    event.newValue !== activeOrganizationId
                ) {
                    setActiveOrganizationId(event.newValue)
                    setMultiTabNotice(`Tenant synchronized from another tab: ${event.newValue}.`)
                }
                return
            }

            if (event.key === THEME_MODE_STORAGE_KEY || event.key === THEME_PRESET_STORAGE_KEY) {
                setMultiTabNotice("Theme synchronized from another tab.")
            }
        }

        window.addEventListener("storage", handleStorageSync)
        return (): void => {
            window.removeEventListener("storage", handleStorageSync)
        }
    }, [activeOrganizationId])

    const handleSearchRouteNavigate = (to: string): void => {
        void navigate({
            to,
        })
    }

    const handleOpenSettings = (): void => {
        void navigate({
            to: "/settings",
        })
    }

    const handleOpenBilling = (): void => {
        void navigate({
            to: "/settings-billing",
        })
    }

    const handleOpenHelpDiagnostics = (): void => {
        void navigate({
            to: "/help-diagnostics",
        })
    }

    const handleReAuthenticate = (): void => {
        const pendingIntent = readSessionPendingIntent()
        const draftSnapshot = readSessionDraftSnapshot()

        setIsSessionRecoveryOpen(false)

        if (draftSnapshot !== undefined) {
            setRestoredDraftMessage(
                `Recovered draft from ${draftSnapshot.fieldKey} (${draftSnapshot.path}).`,
            )
            window.dispatchEvent(
                new CustomEvent("codenautic:session-draft-restored", {
                    detail: draftSnapshot,
                }),
            )
        }

        clearSessionPendingIntent()
        void navigate({
            to: pendingIntent ?? location.pathname,
        })
    }

    return (
        <div className="relative min-h-screen bg-background text-foreground">
            <Header
                activeOrganizationId={activeOrganizationId}
                breadcrumbs={breadcrumbs}
                onMobileMenuOpen={(): void => {
                    setIsMobileSidebarOpen(true)
                }}
                onOrganizationChange={handleOrganizationChange}
                onOpenBilling={handleOpenBilling}
                onOpenHelp={handleOpenHelpDiagnostics}
                onOpenSettings={handleOpenSettings}
                onSearchRouteNavigate={handleSearchRouteNavigate}
                userEmail={props.userEmail}
                userName={props.userName}
                onSignOut={handleSignOut}
                organizations={ORGANIZATION_OPTIONS}
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
                            setIsSidebarCollapsed((previousValue): boolean => !previousValue)
                        }}
                        title="Menu"
                    />
                </div>
                <div className="flex-1 rounded-lg border border-border bg-content-bg p-4 shadow-sm">
                    <p className="mb-2 text-xs text-text-subtle">
                        Press ? for keyboard shortcuts.
                    </p>
                    <AnimatedAlert
                        isVisible={keyboardShortcuts.conflicts.length > 0}
                    >
                        <Alert
                            color="warning"
                            title="Keyboard shortcut conflicts detected"
                            variant="flat"
                        >
                            {keyboardShortcuts.conflicts
                                .map((conflict): string => {
                                    return `${conflict.signature}: ${conflict.ids.join(", ")}`
                                })
                                .join(" | ")}
                        </Alert>
                    </AnimatedAlert>
                    <AnimatedAlert isVisible={multiTabNotice !== undefined}>
                        <Alert color="primary" title="Multi-tab sync applied" variant="flat">
                            {multiTabNotice}
                        </Alert>
                    </AnimatedAlert>
                    <AnimatedAlert isVisible={providerDegradation !== undefined}>
                        {providerDegradation !== undefined ? (
                            <Alert color="danger" title="Provider degradation mode" variant="flat">
                                {providerDegradation.provider} degraded. Affected:{" "}
                                {providerDegradation.affectedFeatures.join(", ")}. ETA:{" "}
                                {providerDegradation.eta}.{" "}
                                <a
                                    className="underline underline-offset-4"
                                    href={providerDegradation.runbookUrl}
                                    rel="noreferrer"
                                    target="_blank"
                                >
                                    Open runbook
                                </a>
                            </Alert>
                        ) : null}
                    </AnimatedAlert>
                    <AnimatedAlert isVisible={policyDriftNotice !== undefined}>
                        <Alert color="warning" title="Runtime policy drift detected" variant="flat">
                            {policyDriftNotice}
                        </Alert>
                    </AnimatedAlert>
                    <AnimatedAlert isVisible={restoredDraftMessage !== undefined}>
                        <Alert color="success" title="Session recovered" variant="flat">
                            {restoredDraftMessage}
                        </Alert>
                    </AnimatedAlert>
                    <AnimatedMount motionKey={location.pathname}>
                        {props.children}
                    </AnimatedMount>
                </div>
            </div>
            <Modal
                isOpen={isShortcutsHelpOpen}
                onOpenChange={(nextOpenState): void => {
                    setIsShortcutsHelpOpen(nextOpenState)
                    if (nextOpenState !== true) {
                        setShortcutsHelpQuery("")
                    }
                }}
            >
                <ModalContent>
                    <ModalHeader>Keyboard shortcuts</ModalHeader>
                    <ModalBody>
                        <input
                            aria-label="Search shortcuts"
                            className="w-full rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground"
                            placeholder="Search by key or action"
                            type="text"
                            value={shortcutsHelpQuery}
                            onChange={(event): void => {
                                setShortcutsHelpQuery(event.currentTarget.value)
                            }}
                        />
                        <p className="text-xs text-text-subtle">Press ? for help.</p>
                        <ul
                            aria-label="Shortcuts list"
                            className="max-h-72 space-y-2 overflow-y-auto"
                        >
                            {filteredShortcuts.map(
                                (shortcut): ReactElement => (
                                    <li
                                        key={shortcut.id}
                                        className="flex items-center justify-between rounded-md border border-border px-2 py-1"
                                    >
                                        <span className="text-sm text-foreground">
                                            {shortcut.label}
                                        </span>
                                        <span className="flex items-center gap-2 text-xs text-text-secondary">
                                            <span className="rounded border border-border px-2 py-0.5">
                                                {shortcut.scope}
                                            </span>
                                            <span className="rounded border border-border px-2 py-0.5">
                                                {shortcut.keys}
                                            </span>
                                        </span>
                                    </li>
                                ),
                            )}
                        </ul>
                    </ModalBody>
                </ModalContent>
            </Modal>
            <Modal isOpen={isSessionRecoveryOpen} onOpenChange={setIsSessionRecoveryOpen}>
                <ModalContent>
                    <ModalHeader>Session expired</ModalHeader>
                    <ModalBody>
                        <p className="text-sm text-text-tertiary">
                            Authentication failed with {sessionFailureCode}. Re-authentication is
                            required to continue safely.
                        </p>
                        <p className="text-xs text-text-secondary">
                            Drafts and pending intent were autosaved and will be restored after
                            successful sign-in.
                        </p>
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            variant="flat"
                            onPress={(): void => {
                                setIsSessionRecoveryOpen(false)
                            }}
                        >
                            Later
                        </Button>
                        <Button color="primary" onPress={handleReAuthenticate}>
                            Re-authenticate
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    )
}
