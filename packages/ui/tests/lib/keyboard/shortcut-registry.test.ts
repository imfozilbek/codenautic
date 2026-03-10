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

    it("when no definitions have conflicts, then returns empty conflicts", (): void => {
        const conflicts = detectShortcutConflicts([
            {
                handler: (): void => {
                    return
                },
                id: "a",
                keys: "ctrl+k",
                label: "A",
                scope: "global",
            },
            {
                handler: (): void => {
                    return
                },
                id: "b",
                keys: "ctrl+j",
                label: "B",
                scope: "global",
            },
        ])

        expect(conflicts.length).toBe(0)
    })

    it("when definitions is empty, then returns empty conflicts", (): void => {
        const conflicts = detectShortcutConflicts([])
        expect(conflicts.length).toBe(0)
    })

    it("when key alias cmd is used, then normalizes to meta", (): void => {
        const handler = vi.fn()
        const registry = new KeyboardShortcutRegistry([
            {
                handler,
                id: "cmd-palette",
                keys: "cmd+k",
                label: "Command palette",
                scope: "global",
            },
        ])

        const event = withTarget(
            new KeyboardEvent("keydown", {
                metaKey: true,
                key: "k",
            }),
            document.body,
        )

        const handled = registry.handleKeydown(event, { routePath: "/" })

        expect(handled).toBe(true)
        expect(handler).toHaveBeenCalledOnce()
    })

    it("when key alias option is used, then normalizes to alt", (): void => {
        const handler = vi.fn()
        const registry = new KeyboardShortcutRegistry([
            {
                handler,
                id: "alt-action",
                keys: "option+a",
                label: "Alt action",
                scope: "global",
            },
        ])

        const event = withTarget(
            new KeyboardEvent("keydown", {
                altKey: true,
                key: "a",
            }),
            document.body,
        )

        const handled = registry.handleKeydown(event, { routePath: "/" })

        expect(handled).toBe(true)
        expect(handler).toHaveBeenCalledOnce()
    })

    it("when slash key is pressed, then normalizes to 'slash'", (): void => {
        const handler = vi.fn()
        const registry = new KeyboardShortcutRegistry([
            {
                handler,
                id: "search",
                keys: "/",
                label: "Focus search",
                scope: "global",
            },
        ])

        const event = withTarget(
            new KeyboardEvent("keydown", {
                key: "/",
            }),
            document.body,
        )

        const handled = registry.handleKeydown(event, { routePath: "/" })

        expect(handled).toBe(true)
        expect(handler).toHaveBeenCalledOnce()
    })

    it("when question mark key is pressed, then normalizes to 'question'", (): void => {
        const handler = vi.fn()
        const registry = new KeyboardShortcutRegistry([
            {
                handler,
                id: "help",
                keys: "?",
                label: "Show help",
                scope: "global",
            },
        ])

        const event = withTarget(
            new KeyboardEvent("keydown", {
                key: "?",
                shiftKey: true,
            }),
            document.body,
        )

        const handled = registry.handleKeydown(event, { routePath: "/" })

        expect(handled).toBe(true)
        expect(handler).toHaveBeenCalledOnce()
    })

    it("when space key is pressed and keys defined as spacebar, then matches", (): void => {
        const handler = vi.fn()
        const registry = new KeyboardShortcutRegistry([
            {
                handler,
                id: "spacebar-action",
                keys: "spacebar",
                label: "Spacebar action",
                scope: "global",
            },
        ])

        const event = withTarget(
            new KeyboardEvent("keydown", {
                key: " ",
            }),
            document.body,
        )

        const handled = registry.handleKeydown(event, { routePath: "/" })

        expect(handled).toBe(true)
        expect(handler).toHaveBeenCalledOnce()
    })

    it("when allowInInput is true, then fires handler on text input target", (): void => {
        const handler = vi.fn()
        const registry = new KeyboardShortcutRegistry([
            {
                allowInInput: true,
                handler,
                id: "escape",
                keys: "escape",
                label: "Close",
                scope: "global",
            },
        ])

        const input = document.createElement("input")
        input.type = "text"
        const event = withTarget(
            new KeyboardEvent("keydown", {
                key: "Escape",
            }),
            input,
        )

        const handled = registry.handleKeydown(event, { routePath: "/" })

        expect(handled).toBe(true)
        expect(handler).toHaveBeenCalledOnce()
    })

    it("when target is textarea, then blocks shortcut by default", (): void => {
        const handler = vi.fn()
        const registry = new KeyboardShortcutRegistry([
            {
                handler,
                id: "shortcut",
                keys: "k",
                label: "Shortcut",
                scope: "global",
            },
        ])

        const textarea = document.createElement("textarea")
        const event = withTarget(
            new KeyboardEvent("keydown", {
                key: "k",
            }),
            textarea,
        )

        const handled = registry.handleKeydown(event, { routePath: "/" })

        expect(handled).toBe(false)
        expect(handler).not.toHaveBeenCalled()
    })

    it("when target is contenteditable, then blocks shortcut by default", (): void => {
        const handler = vi.fn()
        const registry = new KeyboardShortcutRegistry([
            {
                handler,
                id: "shortcut",
                keys: "k",
                label: "Shortcut",
                scope: "global",
            },
        ])

        const div = document.createElement("div")
        div.contentEditable = "true"
        const event = withTarget(
            new KeyboardEvent("keydown", {
                key: "k",
            }),
            div,
        )

        const handled = registry.handleKeydown(event, { routePath: "/" })

        expect(handled).toBe(false)
        expect(handler).not.toHaveBeenCalled()
    })

    it("when target is non-text input type, then does not block shortcut", (): void => {
        const handler = vi.fn()
        const registry = new KeyboardShortcutRegistry([
            {
                handler,
                id: "shortcut",
                keys: "k",
                label: "Shortcut",
                scope: "global",
            },
        ])

        const input = document.createElement("input")
        input.type = "checkbox"
        const event = withTarget(
            new KeyboardEvent("keydown", {
                key: "k",
            }),
            input,
        )

        const handled = registry.handleKeydown(event, { routePath: "/" })

        expect(handled).toBe(true)
        expect(handler).toHaveBeenCalledOnce()
    })

    it("when getEnabledShortcuts is called with matching route, then returns descriptors", (): void => {
        const registry = new KeyboardShortcutRegistry([
            {
                handler: vi.fn(),
                id: "global-action",
                keys: "ctrl+k",
                label: "Global Action",
                scope: "global",
            },
            {
                handler: vi.fn(),
                id: "reviews-filter",
                keys: "f",
                label: "Focus filter",
                routePredicate: (routePath: string): boolean => routePath === "/reviews",
                scope: "page",
            },
        ])

        const enabledOnReviews = registry.getEnabledShortcuts({ routePath: "/reviews" })
        const enabledOnDashboard = registry.getEnabledShortcuts({ routePath: "/dashboard" })

        expect(enabledOnReviews).toHaveLength(2)
        expect(enabledOnDashboard).toHaveLength(1)
        expect(enabledOnDashboard[0]?.id).toBe("global-action")
    })

    it("when getConflicts is called, then returns detected conflicts", (): void => {
        const registry = new KeyboardShortcutRegistry([
            {
                handler: vi.fn(),
                id: "a",
                keys: "ctrl+k",
                label: "A",
                scope: "global",
            },
            {
                handler: vi.fn(),
                id: "b",
                keys: "ctrl+k",
                label: "B",
                scope: "global",
            },
        ])

        const conflicts = registry.getConflicts()
        expect(conflicts).toHaveLength(1)
        expect(conflicts[0]?.ids).toContain("a")
        expect(conflicts[0]?.ids).toContain("b")
    })

    it("when return alias is used in keys, then normalizes to enter", (): void => {
        const handler = vi.fn()
        const registry = new KeyboardShortcutRegistry([
            {
                handler,
                id: "submit",
                keys: "return",
                label: "Submit",
                scope: "global",
            },
        ])

        const event = withTarget(
            new KeyboardEvent("keydown", {
                key: "Enter",
            }),
            document.body,
        )

        const handled = registry.handleKeydown(event, { routePath: "/" })

        expect(handled).toBe(true)
        expect(handler).toHaveBeenCalledOnce()
    })

    it("when esc alias is used in keys, then normalizes to escape", (): void => {
        const handler = vi.fn()
        const registry = new KeyboardShortcutRegistry([
            {
                handler,
                id: "close",
                keys: "esc",
                label: "Close",
                scope: "global",
            },
        ])

        const event = withTarget(
            new KeyboardEvent("keydown", {
                key: "Escape",
            }),
            document.body,
        )

        const handled = registry.handleKeydown(event, { routePath: "/" })

        expect(handled).toBe(true)
        expect(handler).toHaveBeenCalledOnce()
    })

    it("when no shortcuts match at all, then returns false and buffer is cleared", (): void => {
        const registry = new KeyboardShortcutRegistry([
            {
                handler: vi.fn(),
                id: "save",
                keys: "ctrl+s",
                label: "Save",
                scope: "global",
            },
        ])

        const event = withTarget(
            new KeyboardEvent("keydown", {
                key: "a",
            }),
            document.body,
        )

        const handled = registry.handleKeydown(event, { routePath: "/" })
        expect(handled).toBe(false)
    })

    it("when page route predicate matches, then page shortcut fires", (): void => {
        const handler = vi.fn()
        const registry = new KeyboardShortcutRegistry([
            {
                handler,
                id: "page-action",
                keys: "f",
                label: "Focus",
                routePredicate: (routePath: string): boolean => routePath === "/reviews",
                scope: "page",
            },
        ])

        const event = withTarget(
            new KeyboardEvent("keydown", {
                key: "f",
            }),
            document.body,
        )

        const handled = registry.handleKeydown(event, { routePath: "/reviews" })
        expect(handled).toBe(true)
        expect(handler).toHaveBeenCalledOnce()
    })

    it("when three conflicting shortcuts exist, then detects all in one conflict", (): void => {
        const conflicts = detectShortcutConflicts([
            {
                handler: (): void => {
                    return
                },
                id: "a",
                keys: "ctrl+k",
                label: "A",
                scope: "global",
            },
            {
                handler: (): void => {
                    return
                },
                id: "b",
                keys: "ctrl+k",
                label: "B",
                scope: "global",
            },
            {
                handler: (): void => {
                    return
                },
                id: "c",
                keys: "ctrl+k",
                label: "C",
                scope: "global",
            },
        ])

        expect(conflicts.length).toBe(1)
        expect(conflicts[0]?.ids).toHaveLength(3)
    })

    it("when modifier order differs in key definition, then still matches", (): void => {
        const handler = vi.fn()
        const registry = new KeyboardShortcutRegistry([
            {
                handler,
                id: "reorder",
                keys: "shift+ctrl+a",
                label: "Reorder test",
                scope: "global",
            },
        ])

        const event = withTarget(
            new KeyboardEvent("keydown", {
                ctrlKey: true,
                shiftKey: true,
                key: "a",
            }),
            document.body,
        )

        const handled = registry.handleKeydown(event, { routePath: "/" })
        expect(handled).toBe(true)
        expect(handler).toHaveBeenCalledOnce()
    })

    it("when input type is email, then blocks shortcut by default", (): void => {
        const handler = vi.fn()
        const registry = new KeyboardShortcutRegistry([
            {
                handler,
                id: "action",
                keys: "k",
                label: "Action",
                scope: "global",
            },
        ])

        const input = document.createElement("input")
        input.type = "email"
        const event = withTarget(new KeyboardEvent("keydown", { key: "k" }), input)

        const handled = registry.handleKeydown(event, { routePath: "/" })
        expect(handled).toBe(false)
    })

    it("when input type is password, then blocks shortcut by default", (): void => {
        const handler = vi.fn()
        const registry = new KeyboardShortcutRegistry([
            {
                handler,
                id: "action",
                keys: "k",
                label: "Action",
                scope: "global",
            },
        ])

        const input = document.createElement("input")
        input.type = "password"
        const event = withTarget(new KeyboardEvent("keydown", { key: "k" }), input)

        const handled = registry.handleKeydown(event, { routePath: "/" })
        expect(handled).toBe(false)
    })

    it("when input type is search, then blocks shortcut by default", (): void => {
        const handler = vi.fn()
        const registry = new KeyboardShortcutRegistry([
            {
                handler,
                id: "action",
                keys: "k",
                label: "Action",
                scope: "global",
            },
        ])

        const input = document.createElement("input")
        input.type = "search"
        const event = withTarget(new KeyboardEvent("keydown", { key: "k" }), input)

        const handled = registry.handleKeydown(event, { routePath: "/" })
        expect(handled).toBe(false)
    })
})
