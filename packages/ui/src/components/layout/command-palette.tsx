import {
    type KeyboardEvent as ReactKeyboardEvent,
    type ReactElement,
    type RefObject,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react"
import { useTranslation } from "react-i18next"
import { Command } from "cmdk"
import { AnimatePresence, motion } from "motion/react"

import { useDynamicTranslation } from "@/lib/i18n"
import { useReducedMotion } from "motion/react"

import { TYPOGRAPHY } from "@/lib/constants/typography"

import type { ICommandPaletteItem, TCommandPaletteGroup } from "./command-palette.constants"
import {
    COMMAND_PALETTE_PINNED_STORAGE_KEY,
    COMMAND_PALETTE_RECENT_STORAGE_KEY,
    MAX_RECENT_COMMANDS,
} from "./command-palette.constants"
import {
    createCommandPaletteItems,
    readStringArrayFromStorage,
    sortByReferenceOrder,
    writeStringArrayToStorage,
} from "./command-palette.utils"

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

/**
 * Ordered group keys for consistent section rendering.
 */
const GROUP_ORDER: ReadonlyArray<TCommandPaletteGroup> = [
    "actions",
    "ccrs",
    "issues",
    "repos",
    "reports",
    "settings",
    "general",
]

/**
 * Global command palette with search, pin, recents, and keyboard navigation.
 * Built on cmdk for automatic fuzzy search, keyboard navigation, and accessibility.
 *
 * @param props Configuration.
 * @returns Command palette modal overlay.
 */
export function CommandPalette(props: ICommandPaletteProps): ReactElement | null {
    const { t } = useTranslation(["navigation"])
    const { td } = useDynamicTranslation(["navigation"])
    const prefersReducedMotion = useReducedMotion()

    const [recentCommands, setRecentCommands] = useState<ReadonlyArray<string>>(() => {
        return readStringArrayFromStorage(COMMAND_PALETTE_RECENT_STORAGE_KEY)
    })
    const [pinnedCommands, setPinnedCommands] = useState<ReadonlyArray<string>>(() => {
        return readStringArrayFromStorage(COMMAND_PALETTE_PINNED_STORAGE_KEY)
    })

    const translateCommandLabel = useMemo(
        () =>
            (key: string): string =>
                td(`navigation:commandPalette.${key}`),
        [td],
    )

    const translateGroupLabel = useCallback(
        (group: TCommandPaletteGroup): string => td(`navigation:commandPalette.group.${group}`),
        [td],
    )

    const allItems = useMemo((): ReadonlyArray<ICommandPaletteItem> => {
        return createCommandPaletteItems(props.routes, translateCommandLabel)
    }, [props.routes, translateCommandLabel])

    const pinnedItems = useMemo((): ReadonlyArray<ICommandPaletteItem> => {
        return sortByReferenceOrder(
            allItems.filter((item): boolean => pinnedCommands.includes(item.path)),
            pinnedCommands,
        )
    }, [allItems, pinnedCommands])

    const recentItems = useMemo((): ReadonlyArray<ICommandPaletteItem> => {
        return sortByReferenceOrder(
            allItems.filter((item): boolean => {
                return (
                    recentCommands.includes(item.path) &&
                    pinnedCommands.includes(item.path) === false
                )
            }),
            recentCommands,
        )
    }, [allItems, recentCommands, pinnedCommands])

    const baselineItems = useMemo((): ReadonlyArray<ICommandPaletteItem> => {
        return [...allItems]
            .filter((item): boolean => {
                return (
                    pinnedCommands.includes(item.path) === false &&
                    recentCommands.includes(item.path) === false
                )
            })
            .sort((left, right): number => left.label.localeCompare(right.label))
    }, [allItems, pinnedCommands, recentCommands])

    /**
     * Groups baseline items by their group category for rendering as Command.Group sections.
     */
    const groupedBaseline = useMemo((): ReadonlyArray<{
        readonly group: TCommandPaletteGroup
        readonly items: ReadonlyArray<ICommandPaletteItem>
    }> => {
        const map = new Map<TCommandPaletteGroup, ICommandPaletteItem[]>()

        baselineItems.forEach((item): void => {
            const existing = map.get(item.group)
            if (existing === undefined) {
                map.set(item.group, [item])
                return
            }
            existing.push(item)
        })

        return GROUP_ORDER.filter((group): boolean => map.has(group)).map(
            (
                group,
            ): {
                readonly group: TCommandPaletteGroup
                readonly items: ReadonlyArray<ICommandPaletteItem>
            } => ({
                group,
                items: map.get(group) ?? [],
            }),
        )
    }, [baselineItems])

    const registerRecentCommand = useCallback(
        (path: string): void => {
            const nextRecent = [
                path,
                ...recentCommands.filter((item): boolean => item !== path),
            ].slice(0, MAX_RECENT_COMMANDS)
            setRecentCommands(nextRecent)
            writeStringArrayToStorage(COMMAND_PALETTE_RECENT_STORAGE_KEY, nextRecent)
        },
        [recentCommands],
    )

    const restoreFocus = useCallback((): void => {
        if (typeof window !== "undefined") {
            window.requestAnimationFrame((): void => {
                props.invokerRef?.current?.focus()
            })
        }
    }, [props.invokerRef])

    const handleClose = useCallback((): void => {
        props.onClose()
        restoreFocus()
    }, [props.onClose, restoreFocus])

    const handleSelection = useCallback(
        (item: ICommandPaletteItem): void => {
            props.onNavigate(item.path)
            registerRecentCommand(item.path)
            handleClose()
        },
        [props.onNavigate, registerRecentCommand, handleClose],
    )

    const togglePinned = useCallback(
        (path: string): void => {
            const nextPinned = pinnedCommands.includes(path)
                ? pinnedCommands.filter((item): boolean => item !== path)
                : [path, ...pinnedCommands]
            setPinnedCommands(nextPinned)
            writeStringArrayToStorage(COMMAND_PALETTE_PINNED_STORAGE_KEY, nextPinned)
        },
        [pinnedCommands],
    )

    useEffect((): void => {
        if (props.isOpen !== true) {
            return
        }

        setRecentCommands(readStringArrayFromStorage(COMMAND_PALETTE_RECENT_STORAGE_KEY))
        setPinnedCommands(readStringArrayFromStorage(COMMAND_PALETTE_PINNED_STORAGE_KEY))
    }, [props.isOpen])

    /**
     * Renders a single command item row with select and pin buttons.
     */
    const renderItem = useCallback(
        (item: ICommandPaletteItem): ReactElement => {
            const isPinned = pinnedCommands.includes(item.path)

            return (
                <Command.Item
                    key={item.id}
                    keywords={[item.keywords]}
                    value={`${item.label} ${item.path} ${item.keywords}`}
                    onSelect={(): void => {
                        handleSelection(item)
                    }}
                >
                    <div className="grid w-full grid-cols-[1fr_auto] items-center gap-2">
                        <div className="text-left text-foreground">
                            <span className="font-medium">{item.label}</span>
                            <span className={`ml-2 ${TYPOGRAPHY.microHint}`}>{item.path}</span>
                        </div>
                        <button
                            aria-label={`${isPinned ? t("navigation:commandPalette.pinned") : t("navigation:commandPalette.pin")} ${item.label}`}
                            className="rounded border border-border px-2 py-1 text-[11px] text-muted transition-colors duration-150 hover:bg-surface-secondary"
                            type="button"
                            onClick={(event): void => {
                                event.stopPropagation()
                                togglePinned(item.path)
                            }}
                            onKeyDown={(event): void => {
                                event.stopPropagation()
                            }}
                        >
                            {isPinned
                                ? t("navigation:commandPalette.pinned")
                                : t("navigation:commandPalette.pin")}
                        </button>
                    </div>
                </Command.Item>
            )
        },
        [pinnedCommands, handleSelection, togglePinned, t],
    )

    /**
     * Handles Escape key on the dialog overlay to close the palette.
     */
    const handleDialogKeyDown = useCallback(
        (event: ReactKeyboardEvent<HTMLDivElement>): void => {
            if (event.key === "Escape") {
                event.preventDefault()
                handleClose()
            }
        },
        [handleClose],
    )

    const paletteContent = (
        <div
            aria-label={t("navigation:ariaLabel.commandPalette.globalPalette")}
            aria-modal="true"
            className="fixed inset-0 z-50"
            role="dialog"
            onKeyDown={handleDialogKeyDown}
        >
            <button
                aria-label={t("navigation:ariaLabel.commandPalette.closePalette")}
                className="fixed inset-0 h-full w-full cursor-default bg-foreground/50"
                type="button"
                onClick={handleClose}
            />
            <div className="fixed left-1/2 top-16 z-10 w-[672px] -translate-x-1/2 rounded-xl border border-border bg-surface p-3 shadow-2xl">
                <Command
                    className="flex w-full flex-col"
                    label={t("navigation:ariaLabel.commandPalette.globalPalette")}
                >
                    <Command.Input
                        aria-label={t("navigation:ariaLabel.commandPalette.searchInput")}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                        placeholder={t("navigation:commandPalette.placeholder")}
                    />
                    <Command.List className="mt-3 max-h-[60vh] overflow-y-auto rounded-lg border border-border [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2 [&_[cmdk-item]]:text-sm [&_[cmdk-item]]:transition-colors [&_[cmdk-item]]:duration-150 [&_[cmdk-item][data-selected=true]]:bg-accent/10 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group]:not(:last-child)]:border-b [&_[cmdk-group]:not(:last-child)]:border-border">
                        <Command.Empty>
                            <p className="px-3 py-4 text-sm text-muted">
                                {t("navigation:commandPalette.noResults")}
                            </p>
                        </Command.Empty>

                        {pinnedItems.length > 0 ? (
                            <Command.Group heading={translateGroupLabel("actions")} value="pinned">
                                {pinnedItems.map(renderItem)}
                            </Command.Group>
                        ) : null}

                        {recentItems.length > 0 ? (
                            <Command.Group heading={translateGroupLabel("general")} value="recent">
                                {recentItems.map(renderItem)}
                            </Command.Group>
                        ) : null}

                        {groupedBaseline.map(
                            (section): ReactElement => (
                                <Command.Group
                                    key={section.group}
                                    heading={translateGroupLabel(section.group)}
                                    value={section.group}
                                >
                                    {section.items.map(renderItem)}
                                </Command.Group>
                            ),
                        )}
                    </Command.List>
                </Command>
                <p className={`mt-2 ${TYPOGRAPHY.microHint}`}>
                    {t("navigation:commandPalette.helpText")}
                </p>
            </div>
        </div>
    )

    if (props.isOpen !== true) {
        return null
    }

    return paletteContent
}
