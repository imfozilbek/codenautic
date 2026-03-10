import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
    CommandPalette,
    type ICommandPaletteRouteOption,
} from "@/components/layout/command-palette"
import { renderWithProviders } from "../utils/render"

const RECENT_STORAGE_KEY = "codenautic:ui:command-palette:recent:v1"
const PINNED_STORAGE_KEY = "codenautic:ui:command-palette:pinned:v1"

const sampleRoutes: ReadonlyArray<ICommandPaletteRouteOption> = [
    { label: "Dashboard", path: "/" },
    { label: "CCR Management", path: "/reviews" },
    { label: "Issues tracking", path: "/issues" },
    { label: "Repositories", path: "/repositories" },
    { label: "Reports workspace", path: "/reports" },
    { label: "Settings home", path: "/settings" },
    { label: "Help and diagnostics", path: "/help-diagnostics" },
]

vi.mock("@/lib/motion", () => ({
    DURATION: { normal: 0.25 },
    EASING: { enter: [0.0, 0.0, 0.2, 1.0] },
    useReducedMotion: (): boolean => true,
}))

beforeEach((): void => {
    window.localStorage.removeItem(RECENT_STORAGE_KEY)
    window.localStorage.removeItem(PINNED_STORAGE_KEY)
})

afterEach((): void => {
    window.localStorage.removeItem(RECENT_STORAGE_KEY)
    window.localStorage.removeItem(PINNED_STORAGE_KEY)
})

describe("CommandPalette", (): void => {
    it("when isOpen false, then ничего не рендерится", (): void => {
        const onClose = vi.fn()
        const onNavigate = vi.fn()

        renderWithProviders(
            <CommandPalette
                isOpen={false}
                onClose={onClose}
                onNavigate={onNavigate}
                routes={sampleRoutes}
            />,
        )

        expect(screen.queryByRole("dialog", { name: "Global command palette" })).toBeNull()
    })

    it("when isOpen true, then рендерит dialog с search input и результатами", (): void => {
        const onClose = vi.fn()
        const onNavigate = vi.fn()

        renderWithProviders(
            <CommandPalette
                isOpen={true}
                onClose={onClose}
                onNavigate={onNavigate}
                routes={sampleRoutes}
            />,
        )

        expect(screen.getByRole("dialog", { name: "Global command palette" })).not.toBeNull()
        expect(screen.getByRole("combobox", { name: "Command palette search" })).not.toBeNull()
        expect(screen.getByRole("listbox", { name: "Command palette results" })).not.toBeNull()
    })

    it("when пользователь вводит запрос, then фильтрует результаты", async (): Promise<void> => {
        const user = userEvent.setup()
        const onClose = vi.fn()
        const onNavigate = vi.fn()

        renderWithProviders(
            <CommandPalette
                isOpen={true}
                onClose={onClose}
                onNavigate={onNavigate}
                routes={sampleRoutes}
            />,
        )

        const searchInput = screen.getByRole("combobox", {
            name: "Command palette search",
        })
        await user.type(searchInput, "diagnostics")

        expect(screen.queryByText("Help and diagnostics")).not.toBeNull()
        expect(screen.queryByText("Dashboard")).toBeNull()
    })

    it("when запрос не совпадает ни с чем, then показывает noResults", async (): Promise<void> => {
        const user = userEvent.setup()
        const onClose = vi.fn()
        const onNavigate = vi.fn()

        renderWithProviders(
            <CommandPalette
                isOpen={true}
                onClose={onClose}
                onNavigate={onNavigate}
                routes={sampleRoutes}
            />,
        )

        const searchInput = screen.getByRole("combobox", {
            name: "Command palette search",
        })
        await user.type(searchInput, "xyznonexistent999")

        expect(screen.queryByRole("option")).toBeNull()
    })

    it("when пользователь нажимает Enter, then вызывает onNavigate и onClose", async (): Promise<void> => {
        const user = userEvent.setup()
        const onClose = vi.fn()
        const onNavigate = vi.fn()

        renderWithProviders(
            <CommandPalette
                isOpen={true}
                onClose={onClose}
                onNavigate={onNavigate}
                routes={sampleRoutes}
            />,
        )

        const searchInput = screen.getByRole("combobox", {
            name: "Command palette search",
        })
        await user.type(searchInput, "diagnostics")
        await user.keyboard("{Enter}")

        expect(onNavigate).toHaveBeenCalledWith("/help-diagnostics")
        expect(onClose).toHaveBeenCalled()
    })

    it("when пользователь нажимает Escape, then вызывает onClose", async (): Promise<void> => {
        const user = userEvent.setup()
        const onClose = vi.fn()
        const onNavigate = vi.fn()

        renderWithProviders(
            <CommandPalette
                isOpen={true}
                onClose={onClose}
                onNavigate={onNavigate}
                routes={sampleRoutes}
            />,
        )

        const searchInput = screen.getByRole("combobox", {
            name: "Command palette search",
        })
        await user.click(searchInput)
        await user.keyboard("{Escape}")

        expect(onClose).toHaveBeenCalled()
    })

    it("when пользователь кликает по backdrop, then вызывает onClose", async (): Promise<void> => {
        const user = userEvent.setup()
        const onClose = vi.fn()
        const onNavigate = vi.fn()

        renderWithProviders(
            <CommandPalette
                isOpen={true}
                onClose={onClose}
                onNavigate={onNavigate}
                routes={sampleRoutes}
            />,
        )

        const backdrop = screen.getByRole("button", { name: "Close command palette" })
        await user.click(backdrop)

        expect(onClose).toHaveBeenCalled()
    })

    it("when пользователь навигирует стрелками вниз и вверх, then activeIndex обновляется", async (): Promise<void> => {
        const user = userEvent.setup()
        const onClose = vi.fn()
        const onNavigate = vi.fn()

        renderWithProviders(
            <CommandPalette
                isOpen={true}
                onClose={onClose}
                onNavigate={onNavigate}
                routes={[
                    { label: "Dashboard", path: "/" },
                    { label: "Settings", path: "/settings" },
                ]}
            />,
        )

        const searchInput = screen.getByRole("combobox", {
            name: "Command palette search",
        })

        const initialSelected = screen.getByRole("option", { selected: true })
        const initialId = initialSelected.getAttribute("id")

        await user.click(searchInput)
        await user.keyboard("{ArrowDown}")

        const nextSelected = screen.getByRole("option", { selected: true })
        const nextId = nextSelected.getAttribute("id")
        expect(nextId).not.toBe(initialId)

        await user.keyboard("{ArrowUp}")

        const wrappedSelected = screen.getByRole("option", { selected: true })
        const wrappedId = wrappedSelected.getAttribute("id")
        expect(wrappedId).toBe(initialId)
    })

    it("when ArrowUp от первого элемента, then переходит к последнему (wrap)", async (): Promise<void> => {
        const user = userEvent.setup()
        const onClose = vi.fn()
        const onNavigate = vi.fn()

        renderWithProviders(
            <CommandPalette
                isOpen={true}
                onClose={onClose}
                onNavigate={onNavigate}
                routes={[
                    { label: "First", path: "/first" },
                    { label: "Last", path: "/last" },
                ]}
            />,
        )

        const searchInput = screen.getByRole("combobox", {
            name: "Command palette search",
        })
        await user.click(searchInput)
        await user.keyboard("{ArrowUp}")

        const options = screen.getAllByRole("option")
        const lastOption = options[options.length - 1]
        expect(lastOption).not.toBeUndefined()
        if (lastOption !== undefined) {
            expect(lastOption.getAttribute("aria-selected")).toBe("true")
        }
    })

    it("when пользователь pinает элемент, then pin сохраняется в localStorage", async (): Promise<void> => {
        const user = userEvent.setup()
        const onClose = vi.fn()
        const onNavigate = vi.fn()

        renderWithProviders(
            <CommandPalette
                isOpen={true}
                onClose={onClose}
                onNavigate={onNavigate}
                routes={sampleRoutes}
            />,
        )

        const pinButtons = screen.getAllByRole("button", { name: /Pin / })
        const firstPinButton = pinButtons[0]
        if (firstPinButton !== undefined) {
            await user.click(firstPinButton)
        }

        const storedPinned = window.localStorage.getItem(PINNED_STORAGE_KEY)
        expect(storedPinned).not.toBeNull()
        if (storedPinned !== null) {
            const parsed = JSON.parse(storedPinned) as unknown
            expect(Array.isArray(parsed)).toBe(true)
        }
    })

    it("when пользователь выбирает элемент, then recent commands сохраняются в localStorage", async (): Promise<void> => {
        const user = userEvent.setup()
        const onClose = vi.fn()
        const onNavigate = vi.fn()

        renderWithProviders(
            <CommandPalette
                isOpen={true}
                onClose={onClose}
                onNavigate={onNavigate}
                routes={sampleRoutes}
            />,
        )

        const searchInput = screen.getByRole("combobox", {
            name: "Command palette search",
        })
        await user.type(searchInput, "diagnostics")
        await user.keyboard("{Enter}")

        const storedRecent = window.localStorage.getItem(RECENT_STORAGE_KEY)
        expect(storedRecent).not.toBeNull()
        if (storedRecent !== null) {
            const parsed = JSON.parse(storedRecent) as string[]
            expect(parsed).toContain("/help-diagnostics")
        }
    })

    it("when localStorage содержит невалидный JSON, then gracefully возвращает пустой массив", (): void => {
        window.localStorage.setItem(RECENT_STORAGE_KEY, "not valid json{{{")
        const onClose = vi.fn()
        const onNavigate = vi.fn()

        renderWithProviders(
            <CommandPalette
                isOpen={true}
                onClose={onClose}
                onNavigate={onNavigate}
                routes={sampleRoutes}
            />,
        )

        expect(screen.getByRole("dialog", { name: "Global command palette" })).not.toBeNull()
    })

    it("when localStorage содержит не-массив, then gracefully возвращает пустой массив", (): void => {
        window.localStorage.setItem(RECENT_STORAGE_KEY, '"just a string"')
        const onClose = vi.fn()
        const onNavigate = vi.fn()

        renderWithProviders(
            <CommandPalette
                isOpen={true}
                onClose={onClose}
                onNavigate={onNavigate}
                routes={sampleRoutes}
            />,
        )

        expect(screen.getByRole("dialog", { name: "Global command palette" })).not.toBeNull()
    })

    it("when пользователь наводит мышь на элемент, then activeIndex обновляется", async (): Promise<void> => {
        const user = userEvent.setup()
        const onClose = vi.fn()
        const onNavigate = vi.fn()

        renderWithProviders(
            <CommandPalette
                isOpen={true}
                onClose={onClose}
                onNavigate={onNavigate}
                routes={sampleRoutes}
            />,
        )

        const options = screen.getAllByRole("option")
        if (options.length > 1 && options[1] !== undefined) {
            const selectButton = options[1].querySelector("button")
            if (selectButton !== null) {
                await user.hover(selectButton)
                expect(options[1].getAttribute("aria-selected")).toBe("true")
            }
        }
    })

    it("when пустой routes, then показывает noResults сразу", (): void => {
        const onClose = vi.fn()
        const onNavigate = vi.fn()

        renderWithProviders(
            <CommandPalette isOpen={true} onClose={onClose} onNavigate={onNavigate} routes={[]} />,
        )

        expect(screen.queryByRole("option")).toBeNull()
    })

    it("when кликает по элементу, then вызывает onNavigate с правильным path", async (): Promise<void> => {
        const user = userEvent.setup()
        const onClose = vi.fn()
        const onNavigate = vi.fn()

        renderWithProviders(
            <CommandPalette
                isOpen={true}
                onClose={onClose}
                onNavigate={onNavigate}
                routes={sampleRoutes}
            />,
        )

        const options = screen.getAllByRole("option")
        const firstOption = options[0]
        if (firstOption !== undefined) {
            const selectButton = firstOption.querySelector("button")
            if (selectButton !== null) {
                await user.click(selectButton)
                expect(onNavigate).toHaveBeenCalled()
                expect(onClose).toHaveBeenCalled()
            }
        }
    })
})
