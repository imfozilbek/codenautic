import { type ReactElement, type RefObject, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { AnimatePresence, motion } from "motion/react"

import { TYPOGRAPHY } from "@/lib/constants/typography"
import { DURATION, EASING, useReducedMotion } from "@/lib/motion"

/**
 * Command palette item group category key (maps to `navigation:commandPalette.group.*`).
 */
type TCommandPaletteGroup =
    | "ccrs"
    | "issues"
    | "repos"
    | "reports"
    | "settings"
    | "actions"
    | "general"

/**
 * Single command palette item.
 */
interface ICommandPaletteItem {
    readonly group: TCommandPaletteGroup
    readonly id: string
    readonly keywords: string
    readonly label: string
    readonly path: string
}

/**
 * Grouped section of command palette items.
 */
interface ICommandPaletteGroupSection {
    readonly group: TCommandPaletteGroup
    readonly items: ReadonlyArray<ICommandPaletteItem>
}

/**
 * Route option for command palette navigation.
 */
export interface ICommandPaletteRouteOption {
    /** Route label. */
    readonly label: string
    /** Route path. */
    readonly path: string
}

/**
 * Props for the CommandPalette component.
 */
export interface ICommandPaletteProps {
    /** Whether the palette is open. */
    readonly isOpen: boolean
    /** Callback to close the palette. */
    readonly onClose: () => void
    /** Available routes. */
    readonly routes: ReadonlyArray<ICommandPaletteRouteOption>
    /** Navigate to a selected route. */
    readonly onNavigate: (path: string) => void
    /** Element that opened the palette, for focus restoration. */
    readonly invokerRef?: RefObject<HTMLElement | null>
}

const COMMAND_PALETTE_RECENT_STORAGE_KEY = "codenautic:ui:command-palette:recent:v1"
const COMMAND_PALETTE_PINNED_STORAGE_KEY = "codenautic:ui:command-palette:pinned:v1"
const MAX_RECENT_COMMANDS = 8

/**
 * Ключи статических команд для i18n (`navigation:commandPalette.*`).
 */
interface IStaticCommandKey {
    readonly group: TCommandPaletteGroup
    readonly id: string
    readonly keywords: string
    readonly labelKey: "openCcrManagement" | "openDiagnosticsCenter" | "openRepositories" | "openReportsWorkspace"
    readonly path: string
}

const STATIC_COMMAND_KEYS: ReadonlyArray<IStaticCommandKey> = [
    {
        group: "actions",
        id: "action-open-reviews",
        keywords: "review ccr management triage",
        labelKey: "openCcrManagement",
        path: "/reviews",
    },
    {
        group: "actions",
        id: "action-open-diagnostics",
        keywords: "diagnostics degradation help support",
        labelKey: "openDiagnosticsCenter",
        path: "/help-diagnostics",
    },
    {
        group: "actions",
        id: "action-open-repositories",
        keywords: "repositories onboarding scan",
        labelKey: "openRepositories",
        path: "/repositories",
    },
    {
        group: "actions",
        id: "action-open-reports",
        keywords: "reports analytics export generation viewer",
        labelKey: "openReportsWorkspace",
        path: "/reports",
    },
]

function inferCommandPaletteGroup(path: string): TCommandPaletteGroup {
    if (path.startsWith("/reviews")) {
        return "ccrs"
    }
    if (path.startsWith("/issues")) {
        return "issues"
    }
    if (path.startsWith("/repositories")) {
        return "repos"
    }
    if (path.startsWith("/reports")) {
        return "reports"
    }
    if (path.startsWith("/settings")) {
        return "settings"
    }
    return "general"
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
    routes: ReadonlyArray<ICommandPaletteRouteOption>,
    translateCommandLabel: (key: string) => string,
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
    const actionItems = STATIC_COMMAND_KEYS.filter((definition): boolean => {
        return routePaths.has(definition.path)
    }).map((definition): ICommandPaletteItem => {
        return {
            group: definition.group,
            id: definition.id,
            keywords: definition.keywords,
            label: translateCommandLabel(definition.labelKey),
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
 * Global command palette with search, pin, recents, and keyboard navigation.
 * Extracts the full command palette UI from Header into a standalone component.
 *
 * @param props Configuration.
 * @returns Command palette modal overlay.
 */
export function CommandPalette(props: ICommandPaletteProps): ReactElement | null {
    const { t } = useTranslation(["navigation"])
    const [query, setQuery] = useState("")
    const [activeIndex, setActiveIndex] = useState(0)
    const [recentCommands, setRecentCommands] = useState<ReadonlyArray<string>>(() => {
        return readStringArrayFromStorage(COMMAND_PALETTE_RECENT_STORAGE_KEY)
    })
    const [pinnedCommands, setPinnedCommands] = useState<ReadonlyArray<string>>(() => {
        return readStringArrayFromStorage(COMMAND_PALETTE_PINNED_STORAGE_KEY)
    })
    const inputRef = useRef<HTMLInputElement | null>(null)
    const prefersReducedMotion = useReducedMotion()

    const tDynamic = useMemo(
        () => t as unknown as (key: string) => string,
        [t],
    )

    const translateCommandLabel = useMemo(
        () =>
            (key: string): string =>
                tDynamic(`navigation:commandPalette.${key}`),
        [tDynamic],
    )

    const translateGroupLabel = useMemo(
        () =>
            (group: TCommandPaletteGroup): string =>
                tDynamic(`navigation:commandPalette.group.${group}`),
        [tDynamic],
    )

    const allItems = useMemo((): ReadonlyArray<ICommandPaletteItem> => {
        return createCommandPaletteItems(props.routes, translateCommandLabel)
    }, [props.routes, translateCommandLabel])

    const filteredItems = useMemo((): ReadonlyArray<ICommandPaletteItem> => {
        const normalizedQuery = query.trim().toLowerCase()
        const searchedItems =
            normalizedQuery.length === 0
                ? allItems
                : allItems.filter((item): boolean => {
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
    }, [allItems, query, pinnedCommands, recentCommands])

    const groupedItems = useMemo((): ReadonlyArray<ICommandPaletteGroupSection> => {
        return groupCommandPaletteItems(filteredItems)
    }, [filteredItems])

    const registerRecentCommand = (path: string): void => {
        const nextRecent = [path, ...recentCommands.filter((item): boolean => item !== path)].slice(
            0,
            MAX_RECENT_COMMANDS,
        )
        setRecentCommands(nextRecent)
        writeStringArrayToStorage(COMMAND_PALETTE_RECENT_STORAGE_KEY, nextRecent)
    }

    const restoreFocus = (): void => {
        if (typeof window !== "undefined") {
            window.requestAnimationFrame((): void => {
                props.invokerRef?.current?.focus()
            })
        }
    }

    const handleClose = (): void => {
        props.onClose()
        restoreFocus()
    }

    const handleSelection = (item: ICommandPaletteItem): void => {
        props.onNavigate(item.path)
        registerRecentCommand(item.path)
        handleClose()
    }

    const togglePinned = (path: string): void => {
        const nextPinned = pinnedCommands.includes(path)
            ? pinnedCommands.filter((item): boolean => item !== path)
            : [path, ...pinnedCommands]
        setPinnedCommands(nextPinned)
        writeStringArrayToStorage(COMMAND_PALETTE_PINNED_STORAGE_KEY, nextPinned)
    }

    useEffect((): void => {
        if (props.isOpen !== true) {
            return
        }

        setQuery("")
        setActiveIndex(0)
        inputRef.current?.focus()
    }, [props.isOpen])

    useEffect((): void => {
        if (activeIndex < filteredItems.length) {
            return
        }

        setActiveIndex(0)
    }, [activeIndex, filteredItems.length])

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (event.key === "ArrowDown") {
            event.preventDefault()
            if (filteredItems.length === 0) {
                return
            }
            setActiveIndex((prev): number => (prev + 1) % filteredItems.length)
            return
        }
        if (event.key === "ArrowUp") {
            event.preventDefault()
            if (filteredItems.length === 0) {
                return
            }
            setActiveIndex((prev): number => {
                const next = prev - 1
                if (next >= 0) {
                    return next
                }
                return filteredItems.length - 1
            })
            return
        }
        if (event.key === "Escape") {
            event.preventDefault()
            handleClose()
            return
        }
        if (event.key !== "Enter") {
            return
        }

        event.preventDefault()
        const target = filteredItems[activeIndex]
        if (target === undefined) {
            return
        }

        handleSelection(target)
    }

    const paletteContent = (
        <div
            aria-label="Global command palette"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16"
            role="dialog"
        >
            <button
                aria-label="Close command palette"
                className="absolute inset-0 h-full w-full cursor-default bg-foreground/50"
                type="button"
                onClick={handleClose}
            />
            <div className="relative z-10 w-full max-w-2xl rounded-xl border border-border bg-surface p-3 shadow-2xl">
                <input
                    aria-activedescendant={
                        filteredItems[activeIndex] === undefined
                            ? undefined
                            : createCommandPaletteOptionId(
                                  filteredItems[activeIndex].id,
                                  activeIndex,
                              )
                    }
                    aria-autocomplete="list"
                    aria-controls="header-command-palette-results"
                    aria-expanded={filteredItems.length > 0}
                    aria-label="Command palette search"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    placeholder={t("navigation:commandPalette.placeholder")}
                    ref={inputRef}
                    role="combobox"
                    type="text"
                    value={query}
                    onChange={(event): void => {
                        setQuery(event.currentTarget.value)
                        setActiveIndex(0)
                    }}
                    onKeyDown={handleKeyDown}
                />
                <div
                    aria-label="Command palette results"
                    className="mt-3 max-h-[60vh] overflow-y-auto rounded-lg border border-border"
                    id="header-command-palette-results"
                    role="listbox"
                >
                    {filteredItems.length === 0 ? (
                        <p className="px-3 py-4 text-sm text-text-subtle">
                            {t("navigation:commandPalette.noResults")}
                        </p>
                    ) : (
                        groupedItems.map(
                            (section): ReactElement => (
                                <div
                                    key={section.group}
                                    className="border-b border-border last:border-b-0"
                                >
                                    <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-text-subtle">
                                        {translateGroupLabel(section.group)}
                                    </p>
                                    {section.items.map((item): ReactElement => {
                                        const itemIndex = filteredItems.findIndex(
                                            (candidate): boolean => candidate.id === item.id,
                                        )
                                        const isActive = itemIndex === activeIndex
                                        const isPinned = pinnedCommands.includes(item.path)

                                        return (
                                            <div
                                                key={item.id}
                                                aria-selected={isActive}
                                                className={`grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-2 text-sm transition-colors duration-150 ${
                                                    isActive ? "bg-primary/10" : "bg-transparent"
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
                                                        handleSelection(item)
                                                    }}
                                                    onMouseEnter={(): void => {
                                                        setActiveIndex(itemIndex)
                                                    }}
                                                >
                                                    <span className="font-medium">
                                                        {item.label}
                                                    </span>
                                                    <span
                                                        className={`ml-2 ${TYPOGRAPHY.microHint}`}
                                                    >
                                                        {item.path}
                                                    </span>
                                                </button>
                                                <button
                                                    aria-label={`${isPinned ? t("navigation:commandPalette.pinned") : t("navigation:commandPalette.pin")} ${item.label}`}
                                                    className="rounded border border-border px-2 py-1 text-[11px] text-text-secondary transition-colors duration-150 hover:bg-surface-muted"
                                                    type="button"
                                                    onClick={(): void => {
                                                        togglePinned(item.path)
                                                    }}
                                                >
                                                    {isPinned ? t("navigation:commandPalette.pinned") : t("navigation:commandPalette.pin")}
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            ),
                        )
                    )}
                </div>
                <p className={`mt-2 ${TYPOGRAPHY.microHint}`}>
                    {t("navigation:commandPalette.helpText")}
                </p>
            </div>
        </div>
    )

    if (prefersReducedMotion) {
        if (props.isOpen !== true) {
            return null
        }

        return paletteContent
    }

    return (
        <AnimatePresence>
            {props.isOpen === true ? (
                <motion.div
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    transition={{
                        duration: DURATION.normal,
                        ease: EASING.enter,
                    }}
                >
                    {paletteContent}
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}
