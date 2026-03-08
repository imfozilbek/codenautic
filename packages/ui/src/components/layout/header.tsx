import { type ReactElement, useEffect, useMemo, useRef, useState } from "react"

import { Bell, Menu } from "@/components/icons/app-icons"
import { Button } from "@/components/ui"
import {
    FOCUS_GLOBAL_SEARCH_EVENT,
    OPEN_COMMAND_PALETTE_EVENT,
} from "@/lib/keyboard/shortcut-registry"

import { ThemeToggle } from "./theme-toggle"
import { UserMenu } from "./user-menu"

/**
 * Опция выбора организации в header switcher.
 */
export interface IHeaderOrganizationOption {
    /** Идентификатор организации/tenant. */
    readonly id: string
    /** Отображаемое название в selector. */
    readonly label: string
}

/**
 * Опция роли для RBAC preview.
 */
export interface IHeaderRoleOption {
    /** Технический id роли. */
    readonly id: string
    /** Человекочитаемая подпись роли. */
    readonly label: string
}

export interface IHeaderSearchRouteOption {
    /** Подпись маршрута. */
    readonly label: string
    /** Путь маршрута. */
    readonly path: string
}

const COMMAND_PALETTE_RECENT_STORAGE_KEY = "codenautic:ui:command-palette:recent:v1"
const COMMAND_PALETTE_PINNED_STORAGE_KEY = "codenautic:ui:command-palette:pinned:v1"
const MAX_RECENT_COMMANDS = 8

type TCommandPaletteGroup =
    | "CCRs"
    | "Issues"
    | "Repos"
    | "Reports"
    | "Settings"
    | "Actions"
    | "General"

interface ICommandPaletteItem {
    readonly group: TCommandPaletteGroup
    readonly id: string
    readonly keywords: string
    readonly label: string
    readonly path: string
}

interface ICommandPaletteGroupSection {
    readonly group: TCommandPaletteGroup
    readonly items: ReadonlyArray<ICommandPaletteItem>
}

interface IStaticCommandDefinition {
    readonly group: TCommandPaletteGroup
    readonly id: string
    readonly keywords: string
    readonly label: string
    readonly path: string
}

const STATIC_COMMAND_DEFINITIONS: ReadonlyArray<IStaticCommandDefinition> = [
    {
        group: "Actions",
        id: "action-open-reviews",
        keywords: "review ccr management triage",
        label: "Open CCR Management",
        path: "/reviews",
    },
    {
        group: "Actions",
        id: "action-open-diagnostics",
        keywords: "diagnostics degradation help support",
        label: "Open Diagnostics Center",
        path: "/help-diagnostics",
    },
    {
        group: "Actions",
        id: "action-open-repositories",
        keywords: "repositories onboarding scan",
        label: "Open Repositories",
        path: "/repositories",
    },
    {
        group: "Actions",
        id: "action-open-reports",
        keywords: "reports analytics export generation viewer",
        label: "Open Reports Workspace",
        path: "/reports",
    },
]

function inferCommandPaletteGroup(path: string): TCommandPaletteGroup {
    if (path.startsWith("/reviews")) {
        return "CCRs"
    }
    if (path.startsWith("/issues")) {
        return "Issues"
    }
    if (path.startsWith("/repositories")) {
        return "Repos"
    }
    if (path.startsWith("/reports")) {
        return "Reports"
    }
    if (path.startsWith("/settings")) {
        return "Settings"
    }
    return "General"
}

function createCommandPaletteOptionId(itemId: string, itemIndex: number): string {
    const normalized = itemId
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
    const safePart = normalized.length > 0 ? normalized : "item"

    return `header-command-palette-option-${safePart}-${String(itemIndex)}`
}

function readStringArrayFromStorage(storageKey: string): ReadonlyArray<string> {
    if (typeof window === "undefined") {
        return []
    }

    try {
        const raw = window.localStorage.getItem(storageKey)
        if (raw === null) {
            return []
        }

        const parsed = JSON.parse(raw) as unknown
        if (Array.isArray(parsed) === false) {
            return []
        }

        return parsed.filter((item): item is string => typeof item === "string")
    } catch (_error: unknown) {
        return []
    }
}

function writeStringArrayToStorage(storageKey: string, value: ReadonlyArray<string>): void {
    if (typeof window === "undefined") {
        return
    }

    try {
        window.localStorage.setItem(storageKey, JSON.stringify(value))
    } catch (_error: unknown) {
        return
    }
}

function createCommandPaletteItems(
    routes: ReadonlyArray<IHeaderSearchRouteOption>,
): ReadonlyArray<ICommandPaletteItem> {
    const routeItems = routes.map((route): ICommandPaletteItem => {
        return {
            group: inferCommandPaletteGroup(route.path),
            id: `route-${route.path}`,
            keywords: `${route.label} ${route.path}`.toLowerCase(),
            label: route.label,
            path: route.path,
        }
    })
    const routePaths = new Set(routes.map((route): string => route.path))
    const actionItems = STATIC_COMMAND_DEFINITIONS.filter((definition): boolean => {
        return routePaths.has(definition.path)
    }).map((definition): ICommandPaletteItem => {
        return {
            group: definition.group,
            id: definition.id,
            keywords: definition.keywords,
            label: definition.label,
            path: definition.path,
        }
    })

    return [...actionItems, ...routeItems]
}

function sortByReferenceOrder<TValue extends { readonly path: string }>(
    items: ReadonlyArray<TValue>,
    orderedPaths: ReadonlyArray<string>,
): ReadonlyArray<TValue> {
    const positions = new Map<string, number>()
    orderedPaths.forEach((path, index): void => {
        positions.set(path, index)
    })

    return [...items].sort((left, right): number => {
        const leftPosition = positions.get(left.path)
        const rightPosition = positions.get(right.path)
        if (leftPosition === undefined && rightPosition === undefined) {
            return left.path.localeCompare(right.path)
        }
        if (leftPosition === undefined) {
            return 1
        }
        if (rightPosition === undefined) {
            return -1
        }
        return leftPosition - rightPosition
    })
}

function groupCommandPaletteItems(
    items: ReadonlyArray<ICommandPaletteItem>,
): ReadonlyArray<ICommandPaletteGroupSection> {
    const order: TCommandPaletteGroup[] = []
    const map = new Map<TCommandPaletteGroup, ICommandPaletteItem[]>()

    items.forEach((item): void => {
        const existing = map.get(item.group)
        if (existing === undefined) {
            order.push(item.group)
            map.set(item.group, [item])
            return
        }

        existing.push(item)
    })

    return order.map((group): ICommandPaletteGroupSection => {
        return {
            group,
            items: map.get(group) ?? [],
        }
    })
}

/**
 * Параметры для layout header.
 */
export interface IHeaderProps {
    /** Заголовок в центре навбара. */
    readonly title?: string
    /** Количество непрочитанных уведомлений. */
    readonly notificationCount?: number
    /** Имя пользователя. */
    readonly userName?: string
    /** Почта пользователя для дополнительного текста. */
    readonly userEmail?: string
    /** Действие выхода. */
    readonly onSignOut?: () => void
    /** Открыть мобильную панель навигации. */
    readonly onMobileMenuOpen?: () => void
    /** Список доступных tenant/workspace. */
    readonly organizations?: ReadonlyArray<IHeaderOrganizationOption>
    /** Активная организация. */
    readonly activeOrganizationId?: string
    /** Смена организации/workspace. */
    readonly onOrganizationChange?: (organizationId: string) => void
    /** Доступные роли для RBAC preview. */
    readonly roleOptions?: ReadonlyArray<IHeaderRoleOption>
    /** Активная роль. */
    readonly activeRoleId?: string
    /** Смена роли в UI policy preview. */
    readonly onRoleChange?: (roleId: string) => void
    /** Breadcrumb trail активного экрана. */
    readonly breadcrumbs?: ReadonlyArray<string>
    /** Доступные маршруты для global search shortcut. */
    readonly searchRoutes?: ReadonlyArray<IHeaderSearchRouteOption>
    /** Навигация по выбранному маршруту из global search. */
    readonly onSearchRouteNavigate?: (path: string) => void
    /** Открыть страницу Settings из user-menu. */
    readonly onOpenSettings?: () => void
    /** Открыть страницу Billing из user-menu. */
    readonly onOpenBilling?: () => void
    /** Открыть страницу Help & Diagnostics из user-menu. */
    readonly onOpenHelp?: () => void
}

/**
 * Общий header для приложений с hero ui shell.
 *
 * @param props Параметры header.
 * @returns Navbar c переключателем темы и блоком пользователя.
 */
export function Header(props: IHeaderProps): ReactElement {
    const [searchQuery, setSearchQuery] = useState("")
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
    const [commandPaletteQuery, setCommandPaletteQuery] = useState("")
    const [activeCommandIndex, setActiveCommandIndex] = useState(0)
    const [recentCommands, setRecentCommands] = useState<ReadonlyArray<string>>(() => {
        return readStringArrayFromStorage(COMMAND_PALETTE_RECENT_STORAGE_KEY)
    })
    const [pinnedCommands, setPinnedCommands] = useState<ReadonlyArray<string>>(() => {
        return readStringArrayFromStorage(COMMAND_PALETTE_PINNED_STORAGE_KEY)
    })
    const searchInputRef = useRef<HTMLInputElement | null>(null)
    const commandPaletteInputRef = useRef<HTMLInputElement | null>(null)
    const commandPaletteInvokerRef = useRef<HTMLElement | null>(null)
    const hasNotifications = props.notificationCount !== undefined && props.notificationCount > 0
    const activeOrganization = props.organizations?.find((organization): boolean => {
        return organization.id === props.activeOrganizationId
    })
    const activeRole = props.roleOptions?.find((role): boolean => {
        return role.id === props.activeRoleId
    })
    const filteredSearchRoutes = useMemo((): ReadonlyArray<IHeaderSearchRouteOption> => {
        if (props.searchRoutes === undefined) {
            return []
        }

        const normalizedQuery = searchQuery.trim().toLowerCase()
        if (normalizedQuery.length === 0) {
            return props.searchRoutes
        }

        return props.searchRoutes.filter((route): boolean => {
            return `${route.label} ${route.path}`.toLowerCase().includes(normalizedQuery)
        })
    }, [props.searchRoutes, searchQuery])
    const commandPaletteItems = useMemo((): ReadonlyArray<ICommandPaletteItem> => {
        if (props.searchRoutes === undefined) {
            return []
        }
        return createCommandPaletteItems(props.searchRoutes)
    }, [props.searchRoutes])
    const filteredCommandPaletteItems = useMemo((): ReadonlyArray<ICommandPaletteItem> => {
        const normalizedQuery = commandPaletteQuery.trim().toLowerCase()
        const searchedItems =
            normalizedQuery.length === 0
                ? commandPaletteItems
                : commandPaletteItems.filter((item): boolean => {
                      const searchable = `${item.label} ${item.path} ${item.keywords}`.toLowerCase()
                      return searchable.includes(normalizedQuery)
                  })
        const pinned = sortByReferenceOrder(
            searchedItems.filter((item): boolean => pinnedCommands.includes(item.path)),
            pinnedCommands,
        )
        const recent = sortByReferenceOrder(
            searchedItems.filter((item): boolean => {
                return (
                    recentCommands.includes(item.path) &&
                    pinnedCommands.includes(item.path) === false
                )
            }),
            recentCommands,
        )
        const baseline = searchedItems.filter((item): boolean => {
            return (
                pinnedCommands.includes(item.path) === false &&
                recentCommands.includes(item.path) === false
            )
        })
        const sortedBaseline = [...baseline].sort((left, right): number => {
            return left.label.localeCompare(right.label)
        })

        return [...pinned, ...recent, ...sortedBaseline]
    }, [commandPaletteItems, commandPaletteQuery, pinnedCommands, recentCommands])
    const groupedCommandPaletteItems = useMemo((): ReadonlyArray<ICommandPaletteGroupSection> => {
        return groupCommandPaletteItems(filteredCommandPaletteItems)
    }, [filteredCommandPaletteItems])

    const closeCommandPalette = (): void => {
        setIsCommandPaletteOpen(false)
        setCommandPaletteQuery("")
        setActiveCommandIndex(0)

        if (typeof window !== "undefined") {
            window.requestAnimationFrame((): void => {
                commandPaletteInvokerRef.current?.focus()
            })
        }
    }

    const openCommandPalette = (): void => {
        if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
            commandPaletteInvokerRef.current = document.activeElement
        }

        setIsCommandPaletteOpen(true)
    }

    const registerRecentCommand = (path: string): void => {
        const nextRecent = [path, ...recentCommands.filter((item): boolean => item !== path)].slice(
            0,
            MAX_RECENT_COMMANDS,
        )
        setRecentCommands(nextRecent)
        writeStringArrayToStorage(COMMAND_PALETTE_RECENT_STORAGE_KEY, nextRecent)
    }

    const handleCommandSelection = (item: ICommandPaletteItem): void => {
        props.onSearchRouteNavigate?.(item.path)
        registerRecentCommand(item.path)
        closeCommandPalette()
    }

    const togglePinnedCommand = (path: string): void => {
        const nextPinned = pinnedCommands.includes(path)
            ? pinnedCommands.filter((item): boolean => item !== path)
            : [path, ...pinnedCommands]
        setPinnedCommands(nextPinned)
        writeStringArrayToStorage(COMMAND_PALETTE_PINNED_STORAGE_KEY, nextPinned)
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

    useEffect((): void => {
        if (isCommandPaletteOpen !== true) {
            return
        }

        commandPaletteInputRef.current?.focus()
    }, [isCommandPaletteOpen])

    useEffect((): void => {
        if (activeCommandIndex < filteredCommandPaletteItems.length) {
            return
        }

        setActiveCommandIndex(0)
    }, [activeCommandIndex, filteredCommandPaletteItems.length])

    return (
        <div className="border-b border-border bg-[color:color-mix(in_oklab,var(--surface)_88%,transparent)] backdrop-blur">
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
                <p className="text-sm font-semibold tracking-wide text-foreground">CodeNautic</p>
                <div className="mx-auto hidden md:block">
                    {props.title !== undefined ? (
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium text-foreground/80">{props.title}</p>
                            {props.breadcrumbs === undefined ? null : (
                                <p className="text-[11px] text-foreground/60">
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
                            className="w-full rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
                            list="header-global-route-search"
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

                                const targetRoute = filteredSearchRoutes[0]
                                if (targetRoute === undefined) {
                                    return
                                }

                                props.onSearchRouteNavigate?.(targetRoute.path)
                                registerRecentCommand(targetRoute.path)
                                setSearchQuery("")
                            }}
                        />
                        <datalist id="header-global-route-search">
                            {filteredSearchRoutes.map(
                                (route): ReactElement => (
                                    <option
                                        key={route.path}
                                        value={`${route.label} (${route.path})`}
                                    />
                                ),
                            )}
                        </datalist>
                    </div>
                )}
                {props.organizations === undefined && props.roleOptions === undefined ? null : (
                    <div className="hidden items-start gap-2 md:flex">
                        {props.organizations === undefined ? null : (
                            <div className="min-w-[220px]">
                                <label
                                    className="text-[11px] uppercase tracking-[0.08em] text-foreground/60"
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
                                <p className="text-[11px] text-foreground/60">
                                    Current: {activeOrganization?.label ?? "Unknown workspace"}
                                </p>
                            </div>
                        )}
                        {props.roleOptions === undefined ? null : (
                            <div className="min-w-[170px]">
                                <label
                                    className="text-[11px] uppercase tracking-[0.08em] text-foreground/60"
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
                                <p className="text-[11px] text-foreground/60">
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
                                    className="absolute -right-1.5 -top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] leading-none text-white"
                                >
                                    {props.notificationCount}
                                </span>
                            ) : null}
                        </span>
                    </Button>
                    <ThemeToggle />
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
                    <p className="text-sm text-foreground/80">{props.title}</p>
                </div>
            )}
            {isCommandPaletteOpen === true ? (
                <div
                    aria-label="Global command palette"
                    aria-modal="true"
                    className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-16"
                    role="dialog"
                >
                    <button
                        aria-label="Close command palette"
                        className="absolute inset-0 h-full w-full cursor-default"
                        type="button"
                        onClick={closeCommandPalette}
                    />
                    <div className="relative z-10 w-full max-w-2xl rounded-xl border border-border bg-surface p-3 shadow-2xl">
                        <input
                            aria-activedescendant={
                                filteredCommandPaletteItems[activeCommandIndex] === undefined
                                    ? undefined
                                    : createCommandPaletteOptionId(
                                          filteredCommandPaletteItems[activeCommandIndex].id,
                                          activeCommandIndex,
                                      )
                            }
                            aria-autocomplete="list"
                            aria-controls="header-command-palette-results"
                            aria-expanded={filteredCommandPaletteItems.length > 0}
                            aria-label="Command palette search"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            placeholder="Search commands, routes and actions..."
                            ref={commandPaletteInputRef}
                            role="combobox"
                            type="text"
                            value={commandPaletteQuery}
                            onChange={(event): void => {
                                setCommandPaletteQuery(event.currentTarget.value)
                                setActiveCommandIndex(0)
                            }}
                            onKeyDown={(event): void => {
                                if (event.key === "ArrowDown") {
                                    event.preventDefault()
                                    if (filteredCommandPaletteItems.length === 0) {
                                        return
                                    }
                                    setActiveCommandIndex((previousIndex): number => {
                                        return (
                                            (previousIndex + 1) % filteredCommandPaletteItems.length
                                        )
                                    })
                                    return
                                }
                                if (event.key === "ArrowUp") {
                                    event.preventDefault()
                                    if (filteredCommandPaletteItems.length === 0) {
                                        return
                                    }
                                    setActiveCommandIndex((previousIndex): number => {
                                        const nextIndex = previousIndex - 1
                                        if (nextIndex >= 0) {
                                            return nextIndex
                                        }
                                        return filteredCommandPaletteItems.length - 1
                                    })
                                    return
                                }
                                if (event.key === "Escape") {
                                    event.preventDefault()
                                    closeCommandPalette()
                                    return
                                }
                                if (event.key !== "Enter") {
                                    return
                                }

                                event.preventDefault()
                                const targetCommand =
                                    filteredCommandPaletteItems[activeCommandIndex]
                                if (targetCommand === undefined) {
                                    return
                                }

                                handleCommandSelection(targetCommand)
                            }}
                        />
                        <div
                            aria-label="Command palette results"
                            className="mt-3 max-h-[60vh] overflow-y-auto rounded-lg border border-border"
                            id="header-command-palette-results"
                            role="listbox"
                        >
                            {filteredCommandPaletteItems.length === 0 ? (
                                <p className="px-3 py-4 text-sm text-foreground/60">
                                    No results found for current query.
                                </p>
                            ) : (
                                groupedCommandPaletteItems.map(
                                    (section): ReactElement => (
                                        <div
                                            key={section.group}
                                            className="border-b border-border last:border-b-0"
                                        >
                                            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/60">
                                                {section.group}
                                            </p>
                                            {section.items.map((item): ReactElement => {
                                                const itemIndex =
                                                    filteredCommandPaletteItems.findIndex(
                                                        (candidate): boolean =>
                                                            candidate.id === item.id,
                                                    )
                                                const isActive = itemIndex === activeCommandIndex
                                                const isPinned = pinnedCommands.includes(item.path)

                                                return (
                                                    <div
                                                        key={item.id}
                                                        aria-selected={isActive}
                                                        className={`grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-2 text-sm ${
                                                            isActive
                                                                ? "bg-[color:color-mix(in_oklab,var(--primary)_12%,var(--surface))]"
                                                                : "bg-transparent"
                                                        }`}
                                                        id={createCommandPaletteOptionId(
                                                            item.id,
                                                            itemIndex,
                                                        )}
                                                        role="option"
                                                    >
                                                        <button
                                                            className="text-left text-foreground"
                                                            type="button"
                                                            onClick={(): void => {
                                                                handleCommandSelection(item)
                                                            }}
                                                            onMouseEnter={(): void => {
                                                                setActiveCommandIndex(itemIndex)
                                                            }}
                                                        >
                                                            <span className="font-medium">
                                                                {item.label}
                                                            </span>
                                                            <span className="ml-2 text-[11px] text-foreground/60">
                                                                {item.path}
                                                            </span>
                                                        </button>
                                                        <button
                                                            aria-label={`${isPinned ? "Unpin" : "Pin"} ${item.label}`}
                                                            className="rounded border border-border px-2 py-1 text-[11px] text-foreground/70"
                                                            type="button"
                                                            onClick={(): void => {
                                                                togglePinnedCommand(item.path)
                                                            }}
                                                        >
                                                            {isPinned ? "Pinned" : "Pin"}
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ),
                                )
                            )}
                        </div>
                        <p className="mt-2 text-[11px] text-foreground/60">
                            Use Arrow keys, Enter to open, and Esc to close.
                        </p>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
