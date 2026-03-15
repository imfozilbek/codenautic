import { useMemo, useState } from "react"
import { useLocation, useNavigate } from "@tanstack/react-router"
import { useHotkeys } from "react-hotkeys-hook"

import {
    detectShortcutConflicts,
    FOCUS_REVIEWS_FILTERS_EVENT,
    OPEN_COMMAND_PALETTE_EVENT,
    type IShortcutConflict,
    type IShortcutDefinition,
    type IShortcutDescriptor,
} from "@/lib/keyboard/shortcut-registry"

/**
 * Результат хука управления keyboard shortcuts для dashboard.
 */
export interface IDashboardShortcutsResult {
    /** Открыт ли модал помощи по shortcuts. */
    readonly isShortcutsHelpOpen: boolean
    /** Обработчик открытия/закрытия модала. */
    readonly setIsShortcutsHelpOpen: (value: boolean) => void
    /** Текущий поисковый запрос в модале shortcuts. */
    readonly shortcutsHelpQuery: string
    /** Обработчик изменения поискового запроса. */
    readonly setShortcutsHelpQuery: (value: string) => void
    /** Отфильтрованные shortcuts по поисковому запросу. */
    readonly filteredShortcuts: ReadonlyArray<IShortcutDescriptor>
    /** Конфликты между shortcuts. */
    readonly conflicts: ReadonlyArray<IShortcutConflict>
}

/**
 * Статические определения shortcuts для conflict detection и модала помощи.
 */
const SHORTCUT_DEFINITIONS: ReadonlyArray<IShortcutDefinition> = [
    {
        handler: (): void => {},
        id: "open-command-palette-meta",
        keys: "meta+k",
        label: "Open command palette",
        scope: "global",
    },
    {
        handler: (): void => {},
        id: "open-command-palette-ctrl",
        keys: "ctrl+k",
        label: "Open command palette",
        scope: "global",
    },
    {
        handler: (): void => {},
        id: "open-command-palette-slash",
        keys: "slash",
        label: "Open command palette",
        scope: "global",
    },
    {
        handler: (): void => {},
        id: "goto-dashboard",
        keys: "g d",
        label: "Go to dashboard",
        scope: "global",
    },
    {
        handler: (): void => {},
        id: "goto-reviews",
        keys: "g r",
        label: "Go to ccr management",
        scope: "global",
    },
    {
        handler: (): void => {},
        id: "focus-reviews-filters",
        keys: "f",
        label: "Focus reviews filters",
        routePredicate: (routePath: string): boolean => routePath === "/reviews",
        scope: "page",
    },
    {
        handler: (): void => {},
        id: "open-shortcuts-help",
        keys: "question",
        label: "Open shortcuts help",
        scope: "global",
    },
]

/**
 * Управляет keyboard shortcuts для dashboard: определения, поиск, фильтрация
 * и состояние модала помощи.
 *
 * @returns Состояние shortcuts и обработчики модала.
 */
export function useDashboardShortcuts(): IDashboardShortcutsResult {
    const navigate = useNavigate()
    const location = useLocation()
    const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false)
    const [shortcutsHelpQuery, setShortcutsHelpQuery] = useState("")

    const dispatchCommandPalette = (): void => {
        window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT))
    }

    useHotkeys("meta+k", dispatchCommandPalette, { preventDefault: true })
    useHotkeys("ctrl+k", dispatchCommandPalette, { preventDefault: true })
    useHotkeys("/", dispatchCommandPalette, { preventDefault: true })

    useHotkeys(
        "g, d",
        (): void => {
            void navigate({ to: "/" })
        },
        { preventDefault: true },
    )

    useHotkeys(
        "g, r",
        (): void => {
            void navigate({ to: "/reviews" })
        },
        { preventDefault: true },
    )

    useHotkeys(
        "f",
        (): void => {
            if (location.pathname !== "/reviews") {
                return
            }
            window.dispatchEvent(new CustomEvent(FOCUS_REVIEWS_FILTERS_EVENT))
        },
        { preventDefault: true },
        [location.pathname],
    )

    useHotkeys(
        "?",
        (): void => {
            setIsShortcutsHelpOpen(true)
        },
        { preventDefault: true, useKey: true },
    )

    const conflicts = useMemo((): ReadonlyArray<IShortcutConflict> => {
        return detectShortcutConflicts(SHORTCUT_DEFINITIONS)
    }, [])

    const allDescriptors = useMemo((): ReadonlyArray<IShortcutDescriptor> => {
        return SHORTCUT_DEFINITIONS.filter((definition): boolean => {
            if (definition.routePredicate === undefined) {
                return true
            }
            return definition.routePredicate(location.pathname)
        }).map(
            (definition): IShortcutDescriptor => ({
                id: definition.id,
                keys: definition.keys,
                label: definition.label,
                scope: definition.scope,
            }),
        )
    }, [location.pathname])

    const filteredShortcuts = useMemo((): ReadonlyArray<IShortcutDescriptor> => {
        const normalizedQuery = shortcutsHelpQuery.trim().toLowerCase()
        if (normalizedQuery.length === 0) {
            return allDescriptors
        }

        return allDescriptors.filter((shortcut): boolean => {
            return `${shortcut.label} ${shortcut.keys} ${shortcut.scope}`
                .toLowerCase()
                .includes(normalizedQuery)
        })
    }, [allDescriptors, shortcutsHelpQuery])

    return {
        conflicts,
        filteredShortcuts,
        isShortcutsHelpOpen,
        setIsShortcutsHelpOpen,
        setShortcutsHelpQuery,
        shortcutsHelpQuery,
    }
}
