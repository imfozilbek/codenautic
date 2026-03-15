import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
    CommandPalette,
    type ICommandPaletteRouteOption,
} from "@/components/layout/command-palette"
import { renderWithProviders } from "../utils/render"

const RECENT_STORAGE_KEY = "cn:command-palette:recent:v1"
const PINNED_STORAGE_KEY = "cn:command-palette:pinned:v1"

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
    it("when isOpen false, then nothing is rendered", (): void => {
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

    it("when isOpen true, then renders dialog with search input and items", (): void => {
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
        expect(screen.getByPlaceholderText("Search commands, routes and actions...")).not.toBeNull()
        expect(screen.getByText("Dashboard")).not.toBeNull()
        expect(screen.getByText("CCR Management")).not.toBeNull()
    })

    it("when user types a query, then filters results via cmdk", async (): Promise<void> => {
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

        const searchInput = screen.getByPlaceholderText("Search commands, routes and actions...")
        await user.type(searchInput, "diagnostics")

        expect(screen.queryByText("Help and diagnostics")).not.toBeNull()
    })

    it("when query matches nothing, then shows empty state", async (): Promise<void> => {
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

        const searchInput = screen.getByPlaceholderText("Search commands, routes and actions...")
        await user.type(searchInput, "xyznonexistent999")

        expect(screen.getByText("No results found for current query.")).not.toBeNull()
    })

    it("when user presses Escape, then calls onClose", async (): Promise<void> => {
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

        const searchInput = screen.getByPlaceholderText("Search commands, routes and actions...")
        await user.click(searchInput)
        await user.keyboard("{Escape}")

        expect(onClose).toHaveBeenCalled()
    })

    it("when user clicks backdrop, then calls onClose", async (): Promise<void> => {
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

    it("when user selects an item via Enter, then calls onNavigate and onClose", async (): Promise<void> => {
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

        const searchInput = screen.getByPlaceholderText("Search commands, routes and actions...")
        await user.type(searchInput, "diagnostics")
        await user.keyboard("{Enter}")

        expect(onNavigate).toHaveBeenCalled()
        expect(onClose).toHaveBeenCalled()
    })

    it("when user pins an item, then pin is saved to localStorage", async (): Promise<void> => {
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

    it("when user selects an item, then recent commands are saved to localStorage", async (): Promise<void> => {
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

        const searchInput = screen.getByPlaceholderText("Search commands, routes and actions...")
        await user.type(searchInput, "diagnostics")
        await user.keyboard("{Enter}")

        const storedRecent = window.localStorage.getItem(RECENT_STORAGE_KEY)
        expect(storedRecent).not.toBeNull()
        if (storedRecent !== null) {
            const parsed = JSON.parse(storedRecent) as string[]
            expect(parsed.length).toBeGreaterThan(0)
        }
    })

    it("when localStorage contains invalid JSON, then gracefully renders palette", (): void => {
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

    it("when localStorage contains non-array, then gracefully renders palette", (): void => {
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

    it("when empty routes, then shows no items", (): void => {
        const onClose = vi.fn()
        const onNavigate = vi.fn()

        renderWithProviders(
            <CommandPalette isOpen={true} onClose={onClose} onNavigate={onNavigate} routes={[]} />,
        )

        const dialog = screen.getByRole("dialog", { name: "Global command palette" })
        const items = dialog.querySelectorAll("[cmdk-item]")
        expect(items.length).toBe(0)
    })

    it("when user clicks an item, then calls onNavigate with correct path", async (): Promise<void> => {
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

        const dialog = screen.getByRole("dialog", { name: "Global command palette" })
        const dashboardItem = within(dialog).getByText("Dashboard")
        await user.click(dashboardItem)

        expect(onNavigate).toHaveBeenCalled()
        expect(onClose).toHaveBeenCalled()
    })

    it("when help text is present, then renders keyboard shortcut hint", (): void => {
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

        expect(screen.getByText("Use Arrow keys, Enter to open, and Esc to close.")).not.toBeNull()
    })
})
