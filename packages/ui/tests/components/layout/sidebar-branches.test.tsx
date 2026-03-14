import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { Sidebar } from "@/components/layout"
import { renderWithProviders } from "../../utils/render"

vi.mock("@tanstack/react-router", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@tanstack/react-router")>()
    return {
        ...actual,
        useLocation: () => ({ pathname: "/" }),
        useNavigate: () => vi.fn(),
    }
})

vi.mock("@/lib/motion", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/motion")>()
    return {
        ...actual,
        useReducedMotion: (): boolean => true,
    }
})

describe("Sidebar — reduced motion branch", (): void => {
    it("when prefers-reduced-motion is true, then renders static aside without motion.aside", (): void => {
        renderWithProviders(
            <Sidebar
                isCollapsed={false}
                title="Navigation"
            />,
        )

        expect(screen.getByRole("button", { name: "Collapse navigation" })).not.toBeNull()
    })

    it("when prefers-reduced-motion is true and collapsed, then renders narrow static sidebar", (): void => {
        renderWithProviders(
            <Sidebar
                isCollapsed
                title="Navigation"
            />,
        )

        expect(screen.getByRole("button", { name: "Expand navigation" })).not.toBeNull()
    })

    it("when headerSlot is not provided, then header slot container is not rendered", (): void => {
        const { container } = renderWithProviders(
            <Sidebar
                isCollapsed={false}
                title="Nav"
            />,
        )

        expect(container.querySelector(".mb-2.px-1")).toBeNull()
    })

    it("when headerSlot is provided, then renders it above navigation", (): void => {
        renderWithProviders(
            <Sidebar
                headerSlot={<div data-testid="custom-header">Header content</div>}
                isCollapsed={false}
                title="Nav"
            />,
        )

        expect(screen.getByTestId("custom-header")).not.toBeNull()
    })

    it("when footerSlot is provided, then renders it at sidebar bottom", (): void => {
        renderWithProviders(
            <Sidebar
                footerSlot={<div data-testid="custom-footer">Footer content</div>}
                isCollapsed={false}
                title="Nav"
            />,
        )

        expect(screen.getByTestId("custom-footer")).not.toBeNull()
    })

    it("when footerSlot is not provided, then footer is not rendered", (): void => {
        renderWithProviders(
            <Sidebar
                isCollapsed={false}
                title="Nav"
            />,
        )

        expect(screen.queryByTestId("custom-footer")).toBeNull()
    })

    it("when title is not provided, then renders sidebar with collapse button", (): void => {
        renderWithProviders(
            <Sidebar isCollapsed={false} />,
        )

        expect(screen.getByRole("button", { name: "Collapse navigation" })).not.toBeNull()
    })

    it("when className is provided, then applies it to the container", (): void => {
        const { container } = renderWithProviders(
            <Sidebar
                className="custom-test-class"
                isCollapsed={false}
                title="Nav"
            />,
        )

        const aside = container.querySelector("aside")
        expect(aside?.className).toContain("custom-test-class")
    })
})
