import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PageShell } from "@/components/layout/page-shell"
import { renderWithProviders } from "../../utils/render"

describe("PageShell", (): void => {
    it("when title is provided, then renders h1 heading", (): void => {
        renderWithProviders(<PageShell title="Settings">content</PageShell>)

        const heading = screen.getByRole("heading", { level: 1, name: "Settings" })
        expect(heading).not.toBeNull()
    })

    it("when subtitle is provided, then renders subtitle text", (): void => {
        renderWithProviders(
            <PageShell subtitle="Manage your workspace" title="Settings">
                content
            </PageShell>,
        )

        expect(screen.getByText("Manage your workspace")).not.toBeNull()
    })

    it("when subtitle is not provided, then does not render subtitle", (): void => {
        renderWithProviders(<PageShell title="Settings">content</PageShell>)

        expect(screen.queryByText("Manage your workspace")).toBeNull()
    })

    it("when children are provided, then renders children content", (): void => {
        renderWithProviders(
            <PageShell title="Dashboard">
                <p>Child content here</p>
            </PageShell>,
        )

        expect(screen.getByText("Child content here")).not.toBeNull()
    })

    it("when headerActions are provided, then renders actions alongside title", (): void => {
        renderWithProviders(
            <PageShell headerActions={<button type="button">Export</button>} title="Reports">
                content
            </PageShell>,
        )

        expect(screen.getByRole("button", { name: "Export" })).not.toBeNull()
    })

    it("when layout is standard, then uses section-level spacing", (): void => {
        const { container } = renderWithProviders(
            <PageShell layout="standard" title="Help">
                content
            </PageShell>,
        )

        const root = container.firstElementChild as HTMLElement
        expect(root.className).toContain("space-y-6")
    })

    it("when layout is spacious, then uses page-level spacing", (): void => {
        const { container } = renderWithProviders(
            <PageShell layout="spacious" title="Dashboard">
                content
            </PageShell>,
        )

        const root = container.firstElementChild as HTMLElement
        expect(root.className).toContain("space-y-8")
    })

    it("when layout is centered, then uses centering utilities", (): void => {
        const { container } = renderWithProviders(
            <PageShell layout="centered" title="System Health">
                content
            </PageShell>,
        )

        const root = container.firstElementChild as HTMLElement
        expect(root.className).toContain("mx-auto")
        expect(root.className).toContain("items-center")
    })

    it("when layout is not specified, then defaults to standard", (): void => {
        const { container } = renderWithProviders(<PageShell title="Default">content</PageShell>)

        const root = container.firstElementChild as HTMLElement
        expect(root.className).toContain("space-y-6")
    })
})
