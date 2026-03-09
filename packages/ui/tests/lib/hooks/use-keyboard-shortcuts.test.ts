import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts"
import type { IShortcutDefinition } from "@/lib/keyboard/shortcut-registry"

/**
 * Создаёт KeyboardEvent и диспатчит на window.
 *
 * @param key Нажатая клавиша.
 * @param modifiers Модификаторы.
 */
function fireKeydown(
    key: string,
    modifiers: { ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean; shiftKey?: boolean } = {},
): void {
    const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...modifiers,
    })
    window.dispatchEvent(event)
}

describe("useKeyboardShortcuts", (): void => {
    afterEach((): void => {
        vi.restoreAllMocks()
    })

    it("when rendered with shortcuts, then returns enabled shortcuts", (): void => {
        const handler = vi.fn()
        const shortcuts: ReadonlyArray<IShortcutDefinition> = [
            {
                handler,
                id: "test-shortcut",
                keys: "ctrl+k",
                label: "Test shortcut",
                scope: "global",
            },
        ]

        const { result } = renderHook((): ReturnType<typeof useKeyboardShortcuts> => {
            return useKeyboardShortcuts({
                routePath: "/",
                shortcuts,
            })
        })

        expect(result.current.shortcuts).toHaveLength(1)
        expect(result.current.shortcuts[0]?.id).toBe("test-shortcut")
    })

    it("when matching key combination is pressed, then calls handler", (): void => {
        const handler = vi.fn()
        const shortcuts: ReadonlyArray<IShortcutDefinition> = [
            {
                handler,
                id: "save",
                keys: "ctrl+s",
                label: "Save",
                scope: "global",
            },
        ]

        renderHook((): ReturnType<typeof useKeyboardShortcuts> => {
            return useKeyboardShortcuts({
                routePath: "/",
                shortcuts,
            })
        })

        act((): void => {
            fireKeydown("s", { ctrlKey: true })
        })

        expect(handler).toHaveBeenCalledOnce()
    })

    it("when non-matching key is pressed, then does not call handler", (): void => {
        const handler = vi.fn()
        const shortcuts: ReadonlyArray<IShortcutDefinition> = [
            {
                handler,
                id: "save",
                keys: "ctrl+s",
                label: "Save",
                scope: "global",
            },
        ]

        renderHook((): ReturnType<typeof useKeyboardShortcuts> => {
            return useKeyboardShortcuts({
                routePath: "/",
                shortcuts,
            })
        })

        act((): void => {
            fireKeydown("k", { ctrlKey: true })
        })

        expect(handler).not.toHaveBeenCalled()
    })

    it("when shortcut has routePredicate and route does not match, then shortcut is not enabled", (): void => {
        const handler = vi.fn()
        const shortcuts: ReadonlyArray<IShortcutDefinition> = [
            {
                handler,
                id: "reviews-filter",
                keys: "f",
                label: "Focus filter",
                routePredicate: (routePath: string): boolean => routePath === "/reviews",
                scope: "page",
            },
        ]

        const { result } = renderHook((): ReturnType<typeof useKeyboardShortcuts> => {
            return useKeyboardShortcuts({
                routePath: "/dashboard",
                shortcuts,
            })
        })

        expect(result.current.shortcuts).toHaveLength(0)
    })

    it("when shortcut has routePredicate and route matches, then shortcut is enabled", (): void => {
        const handler = vi.fn()
        const shortcuts: ReadonlyArray<IShortcutDefinition> = [
            {
                handler,
                id: "reviews-filter",
                keys: "f",
                label: "Focus filter",
                routePredicate: (routePath: string): boolean => routePath === "/reviews",
                scope: "page",
            },
        ]

        const { result } = renderHook((): ReturnType<typeof useKeyboardShortcuts> => {
            return useKeyboardShortcuts({
                routePath: "/reviews",
                shortcuts,
            })
        })

        expect(result.current.shortcuts).toHaveLength(1)
    })

    it("when duplicate shortcut keys exist, then reports conflicts", (): void => {
        const shortcuts: ReadonlyArray<IShortcutDefinition> = [
            {
                handler: vi.fn(),
                id: "shortcut-a",
                keys: "ctrl+k",
                label: "Shortcut A",
                scope: "global",
            },
            {
                handler: vi.fn(),
                id: "shortcut-b",
                keys: "ctrl+k",
                label: "Shortcut B",
                scope: "global",
            },
        ]

        const { result } = renderHook((): ReturnType<typeof useKeyboardShortcuts> => {
            return useKeyboardShortcuts({
                routePath: "/",
                shortcuts,
            })
        })

        expect(result.current.conflicts).toHaveLength(1)
        expect(result.current.conflicts[0]?.ids).toContain("shortcut-a")
        expect(result.current.conflicts[0]?.ids).toContain("shortcut-b")
    })

    it("when no conflicts exist, then conflicts array is empty", (): void => {
        const shortcuts: ReadonlyArray<IShortcutDefinition> = [
            {
                handler: vi.fn(),
                id: "shortcut-a",
                keys: "ctrl+k",
                label: "Shortcut A",
                scope: "global",
            },
            {
                handler: vi.fn(),
                id: "shortcut-b",
                keys: "ctrl+j",
                label: "Shortcut B",
                scope: "global",
            },
        ]

        const { result } = renderHook((): ReturnType<typeof useKeyboardShortcuts> => {
            return useKeyboardShortcuts({
                routePath: "/",
                shortcuts,
            })
        })

        expect(result.current.conflicts).toHaveLength(0)
    })

    it("when unmounted, then removes keydown listener", (): void => {
        const removeSpy = vi.spyOn(window, "removeEventListener")
        const shortcuts: ReadonlyArray<IShortcutDefinition> = [
            {
                handler: vi.fn(),
                id: "test",
                keys: "ctrl+k",
                label: "Test",
                scope: "global",
            },
        ]

        const { unmount } = renderHook((): ReturnType<typeof useKeyboardShortcuts> => {
            return useKeyboardShortcuts({
                routePath: "/",
                shortcuts,
            })
        })

        unmount()

        const keydownRemoved = removeSpy.mock.calls.some((call): boolean => call[0] === "keydown")
        expect(keydownRemoved).toBe(true)
    })
})
