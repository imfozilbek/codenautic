import {
    getWindowLocalStorage,
    safeStorageGetJson,
    safeStorageSetJson,
} from "@/lib/utils/safe-storage"

import type { ICommandPaletteItem, TCommandPaletteGroup } from "./command-palette.constants"
import { STATIC_COMMAND_KEYS } from "./command-palette.constants"

/**
 * Infers the command palette group from a route path prefix.
 *
 * @param path - The route path to classify.
 * @returns The group category the path belongs to.
 */
export function inferCommandPaletteGroup(path: string): TCommandPaletteGroup {
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

/**
 * Reads a string array from localStorage, returning an empty array on any
 * failure (missing key, invalid JSON, non-array value, SSR environment).
 *
 * @param storageKey - The localStorage key to read.
 * @returns The parsed string array, or an empty array on failure.
 */
export function readStringArrayFromStorage(storageKey: string): ReadonlyArray<string> {
    const parsed = safeStorageGetJson<unknown>(getWindowLocalStorage(), storageKey, null)
    if (Array.isArray(parsed) === false) {
        return []
    }

    return parsed.filter((item): item is string => typeof item === "string")
}

/**
 * Writes a string array to localStorage, silently ignoring failures
 * (quota exceeded, SSR environment, etc.).
 *
 * @param storageKey - The localStorage key to write.
 * @param value - The string array to persist.
 */
export function writeStringArrayToStorage(storageKey: string, value: ReadonlyArray<string>): void {
    safeStorageSetJson(getWindowLocalStorage(), storageKey, value)
}

/**
 * Builds the full list of command palette items by combining dynamic route
 * items with static action commands (translated via the provided callback).
 *
 * @param routes - The dynamic route options available in the app.
 * @param translateCommandLabel - A function that resolves an i18n key to its translated label.
 * @returns A combined list of route-based and static action items.
 */
export function createCommandPaletteItems(
    routes: ReadonlyArray<{ readonly label: string; readonly path: string }>,
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

/**
 * Sorts items according to an ordered reference list of paths.
 * Items whose path appears in `orderedPaths` are placed first (in that order);
 * remaining items are appended in lexicographic path order.
 *
 * @param items - The items to sort (must have a `path` property).
 * @param orderedPaths - The reference ordering of paths.
 * @returns A new array sorted by the reference order.
 */
export function sortByReferenceOrder<TValue extends { readonly path: string }>(
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
