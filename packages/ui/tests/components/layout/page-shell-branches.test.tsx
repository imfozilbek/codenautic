import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { PageShell } from "@/components/layout/page-shell"
import { renderWithProviders } from "../../utils/render"

vi.mock("@/lib/motion", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/motion")>()
    return {
        ...actual,
        useReducedMotion: (): boolean => true,
    }
})

describe("PageShell — reduced motion branch", (): void => {
    it("when prefers-reduced-motion is true, then renders static section without motion animation", (): void => {
        const { container } = renderWithProviders(<PageShell title="Settings">content</PageShell>)

        const heading = screen.getByRole("heading", { level: 1, name: "Settings" })
        expect(heading).not.toBeNull()

        const section = container.querySelector("section")
        expect(section).not.toBeNull()
        expect(section?.tagName).toBe("SECTION")
    })

    it("when prefers-reduced-motion is true with subtitle and headerActions, then renders both", (): void => {
        renderWithProviders(
            <PageShell
                headerActions={<button type="button">Export</button>}
                subtitle="Manage settings"
                title="Settings"
            >
                content
            </PageShell>,
        )

        expect(screen.getByRole("heading", { level: 1, name: "Settings" })).not.toBeNull()
        expect(screen.getByText("Manage settings")).not.toBeNull()
        expect(screen.getByRole("button", { name: "Export" })).not.toBeNull()
    })

    it("when prefers-reduced-motion is true without headerActions, then header div has no flex layout class", (): void => {
        renderWithProviders(<PageShell title="Simple Page">content</PageShell>)

        const heading = screen.getByRole("heading", { level: 1, name: "Simple Page" })
        const headerDiv = heading.parentElement?.parentElement
        expect(headerDiv?.className ?? "").toBe("")
    })

    it("when prefers-reduced-motion is true with spacious layout, then applies correct spacing", (): void => {
        const { container } = renderWithProviders(
            <PageShell layout="spacious" title="Dashboard">
                spacious content
            </PageShell>,
        )

        const root = container.firstElementChild as HTMLElement
        expect(root.className).toContain("space-y-8")
    })
})
