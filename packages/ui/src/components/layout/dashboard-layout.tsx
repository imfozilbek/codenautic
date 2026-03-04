import { type ReactElement, type ReactNode, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "@tanstack/react-router"
import { readUiRoleFromStorage, writeUiRoleToStorage, type TUiRole } from "@/lib/permissions/ui-policy"
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
    type TTenantId,
} from "@/lib/navigation/route-guard-map"
import { Alert, Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@/components/ui"

import { Header } from "./header"
import type { IHeaderOrganizationOption } from "./header"
import type { IHeaderRoleOption } from "./header"
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

const DEFAULT_ORGANIZATION_ID = ORGANIZATION_OPTIONS[0].id as TTenantId

const ROLE_OPTIONS: ReadonlyArray<IHeaderRoleOption> = [
    {
        id: "viewer",
        label: "Viewer",
    },
    {
        id: "developer",
        label: "Developer",
    },
    {
        id: "lead",
        label: "Lead",
    },
    {
        id: "admin",
        label: "Admin",
    },
]

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
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [activeOrganizationId, setActiveOrganizationId] =
        useState<TTenantId>(DEFAULT_ORGANIZATION_ID)
    const [activeRoleId, setActiveRoleId] = useState<TUiRole>(() => {
        return readUiRoleFromStorage()
    })
    const [isSessionRecoveryOpen, setIsSessionRecoveryOpen] = useState(false)
    const [sessionFailureCode, setSessionFailureCode] = useState<401 | 419>(401)
    const [restoredDraftMessage, setRestoredDraftMessage] = useState<string | undefined>(undefined)
    const navigate = useNavigate()
    const location = useLocation()
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

    const handleSignOut = (): void => {
        if (props.onSignOut === undefined) {
            return
        }

        void props.onSignOut()
    }

    const handleOrganizationChange = (organizationId: string): void => {
        if (
            organizationId !== "platform-team"
            && organizationId !== "frontend-team"
            && organizationId !== "runtime-team"
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
    }

    const handleRoleChange = (roleId: string): void => {
        if (roleId !== "viewer" && roleId !== "developer" && roleId !== "lead" && roleId !== "admin") {
            return
        }

        setActiveRoleId(roleId)
        writeUiRoleToStorage(roleId)
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
            if (
                (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
                !== true
            ) {
                return
            }

            if (target instanceof HTMLInputElement) {
                const isTextInput =
                    target.type === "text"
                    || target.type === "email"
                    || target.type === "search"
                    || target.type === "url"
                    || target.type === "tel"
                    || target.type === "password"
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

    const handleSearchRouteNavigate = (to: string): void => {
        void navigate({
            to,
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
        <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)]">
            <Header
                activeOrganizationId={activeOrganizationId}
                activeRoleId={activeRoleId}
                breadcrumbs={breadcrumbs}
                onMobileMenuOpen={(): void => {
                    setIsMobileSidebarOpen(true)
                }}
                onOrganizationChange={handleOrganizationChange}
                onRoleChange={handleRoleChange}
                onSearchRouteNavigate={handleSearchRouteNavigate}
                userEmail={props.userEmail}
                userName={props.userName}
                onSignOut={handleSignOut}
                organizations={ORGANIZATION_OPTIONS}
                roleOptions={ROLE_OPTIONS}
                searchRoutes={searchableRoutes}
                title={props.title}
            />
            <MobileSidebar
                isOpen={isMobileSidebarOpen}
                onOpenChange={setIsMobileSidebarOpen}
                title="Menu"
            />
            <div className="mx-auto flex w-full max-w-screen-xl gap-4 px-4 py-4 sm:px-6">
                <div className="hidden min-h-0 flex-shrink-0 md:block">
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
                <div className="min-h-0 flex-1 rounded-lg border border-[var(--border)] bg-[color:color-mix(in_oklab,var(--surface)_88%,transparent)] p-4 shadow-sm">
                    {restoredDraftMessage === undefined ? null : (
                        <Alert color="success" title="Session recovered" variant="flat">
                            {restoredDraftMessage}
                        </Alert>
                    )}
                    {props.children}
                </div>
            </div>
            <Modal isOpen={isSessionRecoveryOpen} onOpenChange={setIsSessionRecoveryOpen}>
                <ModalContent>
                    <ModalHeader>Session expired</ModalHeader>
                    <ModalBody>
                        <p className="text-sm text-[var(--foreground)]/80">
                            Authentication failed with {sessionFailureCode}. Re-authentication is
                            required to continue safely.
                        </p>
                        <p className="text-xs text-[var(--foreground)]/70">
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
