import { describe, expect, it, vi } from "vitest"

import {
    KeyboardShortcutRegistry,
    detectShortcutConflicts,
    type IShortcutDefinition,
} from "@/lib/keyboard/shortcut-registry"

function withTarget(event: KeyboardEvent, target: EventTarget): KeyboardEvent {
    Object.defineProperty(event, "target", {
        configurable: true,
        value: target,
    })
    return event
}

describe("keyboard shortcut registry", (): void => {
    it("детектит конфликтующие shortcut signatures", (): void => {
        const conflicts = detectShortcutConflicts([
            {
                handler: (): void => {
                    return
                },
                id: "cmdk-a",
                keys: "ctrl+k",
                label: "Open palette A",
                scope: "global",
            },
            {
                handler: (): void => {
                    return
                },
                id: "cmdk-b",
                keys: "ctrl+k",
                label: "Open palette B",
                scope: "global",
            },
        ])

        expect(conflicts.length).toBe(1)
        expect(conflicts.at(0)?.signature).toBe("ctrl+k")
    })

    it("не перехватывает ввод в текстовых полях по умолчанию", (): void => {
        const handler = vi.fn<(event: KeyboardEvent) => void>()
        const registry = new KeyboardShortcutRegistry([
            {
                handler: (event): void => {
                    handler(event)
                },
                id: "open-palette",
                keys: "ctrl+k",
                label: "Open command palette",
                scope: "global",
            },
        ])

        const input = document.createElement("input")
        input.type = "text"
        const event = withTarget(
            new KeyboardEvent("keydown", {
                ctrlKey: true,
                key: "k",
            }),
            input,
        )

        const handled = registry.handleKeydown(event, {
            routePath: "/reviews",
        })

        expect(handled).toBe(false)
        expect(handler).not.toHaveBeenCalled()
    })

    it("поддерживает последовательности и route-aware enable", (): void => {
        const handler = vi.fn<(routePath: string) => void>()
        const shortcuts: ReadonlyArray<IShortcutDefinition> = [
            {
                handler: (_event, context): void => {
                    handler(context.routePath)
                },
                id: "goto-dashboard",
                keys: "g d",
                label: "Go to dashboard",
                scope: "global",
            },
            {
                handler: (_event): void => {
                    handler("page-scope")
                },
                id: "reviews-only-action",
                keys: "f",
                label: "Focus reviews filters",
                routePredicate: (routePath: string): boolean => routePath === "/reviews",
                scope: "page",
            },
        ]
        const registry = new KeyboardShortcutRegistry(shortcuts)
        const target = document.body

        const first = withTarget(
            new KeyboardEvent("keydown", {
                key: "g",
            }),
            target,
        )
        const second = withTarget(
            new KeyboardEvent("keydown", {
                key: "d",
            }),
            target,
        )

        const firstHandled = registry.handleKeydown(first, {
            routePath: "/settings",
        })
        const secondHandled = registry.handleKeydown(second, {
            routePath: "/settings",
        })

        const pageShortcut = withTarget(
            new KeyboardEvent("keydown", {
                key: "f",
            }),
            target,
        )
        const pageHandled = registry.handleKeydown(pageShortcut, {
            routePath: "/settings",
        })

        expect(firstHandled).toBe(false)
        expect(secondHandled).toBe(true)
        expect(pageHandled).toBe(false)
        expect(handler).toHaveBeenCalledWith("/settings")
    })
})
