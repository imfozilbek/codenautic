import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ShortcutsHelpModal } from "@/components/layout/shortcuts-help-modal"
import { renderWithProviders } from "../../utils/render"

describe("ShortcutsHelpModal", (): void => {
    it("when open with shortcuts, then renders list", (): void => {
        renderWithProviders(
            <ShortcutsHelpModal
                isOpen={true}
                onOpenChange={vi.fn()}
                onQueryChange={vi.fn()}
                query=""
                shortcuts={[
                    { id: "search", label: "Search", keys: "Ctrl+K", scope: "global" },
                    { id: "save", label: "Save", keys: "Ctrl+S", scope: "page" },
                ]}
            />,
        )

        expect(screen.getByText("Search")).toBeDefined()
        expect(screen.getByText("Save")).toBeDefined()
        expect(screen.getByText("Ctrl+K")).toBeDefined()
        expect(screen.getByText("Ctrl+S")).toBeDefined()
        expect(screen.getByText("global")).toBeDefined()
        expect(screen.getByText("page")).toBeDefined()
    })

    it("when typing in search, then calls onQueryChange", async (): Promise<void> => {
        const onQueryChange = vi.fn()

        renderWithProviders(
            <ShortcutsHelpModal
                isOpen={true}
                onOpenChange={vi.fn()}
                onQueryChange={onQueryChange}
                query=""
                shortcuts={[]}
            />,
        )

        const input = screen.getByLabelText("Search shortcuts")
        await userEvent.type(input, "ctrl")

        expect(onQueryChange).toHaveBeenCalled()
    })

    it("when not open, then does not render content", (): void => {
        renderWithProviders(
            <ShortcutsHelpModal
                isOpen={false}
                onOpenChange={vi.fn()}
                onQueryChange={vi.fn()}
                query=""
                shortcuts={[{ id: "search", label: "Search", keys: "Ctrl+K", scope: "global" }]}
            />,
        )

        expect(screen.queryByText("Keyboard shortcuts")).toBeNull()
    })

    it("when empty shortcuts list, then renders empty list", (): void => {
        renderWithProviders(
            <ShortcutsHelpModal
                isOpen={true}
                onOpenChange={vi.fn()}
                onQueryChange={vi.fn()}
                query=""
                shortcuts={[]}
            />,
        )

        const list = screen.getByLabelText("Shortcuts list")
        expect(list.children.length).toBe(0)
    })
})
