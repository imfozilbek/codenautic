import { act, renderHook } from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { RouterContextProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createQueryClient } from "@/lib/query/query-client"
import { useDashboardShortcuts } from "@/lib/hooks/use-dashboard-shortcuts"
import { routeTree } from "@/routeTree.gen"

/**
 * Обёртка с необходимыми провайдерами для рендера хуков.
 *
 * @param initialPath Начальный путь маршрута.
 * @returns Provider wrapper function.
 */
function createWrapper(initialPath = "/"): (props: { children: ReactNode }) => ReactElement {
    const queryClient = createQueryClient()
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: [initialPath] }),
        defaultPreload: "intent",
        defaultPreloadStaleTime: 0,
    })

    return function Wrapper(props: { children: ReactNode }): ReactElement {
        return (
            <RouterContextProvider router={router}>
                <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
            </RouterContextProvider>
        )
    }
}

describe("useDashboardShortcuts", (): void => {
    afterEach((): void => {
        vi.restoreAllMocks()
    })

    it("when rendered, then isShortcutsHelpOpen is false", (): void => {
        const { result } = renderHook(
            (): ReturnType<typeof useDashboardShortcuts> => {
                return useDashboardShortcuts()
            },
            { wrapper: createWrapper() },
        )

        expect(result.current.isShortcutsHelpOpen).toBe(false)
    })

    it("when rendered, then shortcutsHelpQuery is empty", (): void => {
        const { result } = renderHook(
            (): ReturnType<typeof useDashboardShortcuts> => {
                return useDashboardShortcuts()
            },
            { wrapper: createWrapper() },
        )

        expect(result.current.shortcutsHelpQuery).toBe("")
    })

    it("when rendered, then returns at least one shortcut", (): void => {
        const { result } = renderHook(
            (): ReturnType<typeof useDashboardShortcuts> => {
                return useDashboardShortcuts()
            },
            { wrapper: createWrapper() },
        )

        expect(result.current.filteredShortcuts.length).toBeGreaterThan(0)
    })

    it("when setIsShortcutsHelpOpen called with true, then opens help modal", (): void => {
        const { result } = renderHook(
            (): ReturnType<typeof useDashboardShortcuts> => {
                return useDashboardShortcuts()
            },
            { wrapper: createWrapper() },
        )

        act((): void => {
            result.current.setIsShortcutsHelpOpen(true)
        })

        expect(result.current.isShortcutsHelpOpen).toBe(true)
    })

    it("when setShortcutsHelpQuery is set, then filters shortcuts by query", (): void => {
        const { result } = renderHook(
            (): ReturnType<typeof useDashboardShortcuts> => {
                return useDashboardShortcuts()
            },
            { wrapper: createWrapper() },
        )

        const totalCount = result.current.filteredShortcuts.length

        act((): void => {
            result.current.setShortcutsHelpQuery("command palette")
        })

        expect(result.current.filteredShortcuts.length).toBeLessThanOrEqual(totalCount)
    })

    it("when query matches no shortcuts, then filteredShortcuts is empty", (): void => {
        const { result } = renderHook(
            (): ReturnType<typeof useDashboardShortcuts> => {
                return useDashboardShortcuts()
            },
            { wrapper: createWrapper() },
        )

        act((): void => {
            result.current.setShortcutsHelpQuery("xyznonexistent")
        })

        expect(result.current.filteredShortcuts).toHaveLength(0)
    })

    it("when query is empty after being set, then returns all shortcuts", (): void => {
        const { result } = renderHook(
            (): ReturnType<typeof useDashboardShortcuts> => {
                return useDashboardShortcuts()
            },
            { wrapper: createWrapper() },
        )

        const totalCount = result.current.filteredShortcuts.length

        act((): void => {
            result.current.setShortcutsHelpQuery("palette")
        })

        act((): void => {
            result.current.setShortcutsHelpQuery("")
        })

        expect(result.current.filteredShortcuts.length).toBe(totalCount)
    })

    it("when query has leading and trailing spaces, then trims and filters", (): void => {
        const { result } = renderHook(
            (): ReturnType<typeof useDashboardShortcuts> => {
                return useDashboardShortcuts()
            },
            { wrapper: createWrapper() },
        )

        act((): void => {
            result.current.setShortcutsHelpQuery("  dashboard  ")
        })

        const dashboardShortcuts = result.current.filteredShortcuts.filter((shortcut): boolean =>
            shortcut.label.toLowerCase().includes("dashboard"),
        )

        expect(dashboardShortcuts.length).toBeGreaterThan(0)
    })

    it("when rendered on /reviews, then includes page-scoped reviews filter shortcut", (): void => {
        const { result } = renderHook(
            (): ReturnType<typeof useDashboardShortcuts> => {
                return useDashboardShortcuts()
            },
            { wrapper: createWrapper("/reviews") },
        )

        const reviewsFilter = result.current.filteredShortcuts.find(
            (shortcut): boolean => shortcut.id === "focus-reviews-filters",
        )
        expect(reviewsFilter).toBeDefined()
    })

    it("when rendered on /, then excludes page-scoped reviews filter shortcut", (): void => {
        const { result } = renderHook(
            (): ReturnType<typeof useDashboardShortcuts> => {
                return useDashboardShortcuts()
            },
            { wrapper: createWrapper("/") },
        )

        const reviewsFilter = result.current.filteredShortcuts.find(
            (shortcut): boolean => shortcut.id === "focus-reviews-filters",
        )
        expect(reviewsFilter).toBeUndefined()
    })
})
