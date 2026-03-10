import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SidebarNav } from "@/components/layout"
import { renderWithProviders } from "../../utils/render"

const mockNavigate = vi.fn()
let currentRoute = "/"
vi.mock("@tanstack/react-router", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@tanstack/react-router")>()
    return {
        ...actual,
        useLocation: () => ({ pathname: currentRoute }),
        useNavigate: () => mockNavigate,
    }
})

describe("SidebarNav — uncovered branches", (): void => {
    it("when item without to pressed without onNavigate, then does not navigate or crash", async (): Promise<void> => {
        const user = userEvent.setup()
        mockNavigate.mockClear()
        currentRoute = "/"

        renderWithProviders(
            <SidebarNav
                items={[
                    {
                        icon: <span>X</span>,
                        label: "No Route Item",
                    },
                ]}
            />,
        )

        const button = screen.getByRole("button", { name: /No Route Item/ })
        await user.click(button)

        expect(mockNavigate).not.toHaveBeenCalled()
    })

    it("when item without to pressed with onNavigate, then calls onNavigate with undefined", async (): Promise<void> => {
        const user = userEvent.setup()
        const onNavigate = vi.fn()
        mockNavigate.mockClear()
        currentRoute = "/"

        renderWithProviders(
            <SidebarNav
                items={[
                    {
                        icon: <span>X</span>,
                        label: "No Route Item",
                    },
                ]}
                onNavigate={onNavigate}
            />,
        )

        const button = screen.getByRole("button", { name: /No Route Item/ })
        await user.click(button)

        expect(onNavigate).toHaveBeenCalledWith(undefined)
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    it("when item without to is pressed with onNavigate, then calls onNavigate and skips router navigate", async (): Promise<void> => {
        const user = userEvent.setup()
        const onNavigate = vi.fn()
        mockNavigate.mockClear()
        currentRoute = "/"

        renderWithProviders(
            <SidebarNav
                items={[
                    {
                        icon: <span>A</span>,
                        label: "No Route",
                    },
                ]}
                onNavigate={onNavigate}
            />,
        )

        const button = screen.getByRole("button", { name: /No Route/ })
        await user.click(button)

        expect(onNavigate).toHaveBeenCalledWith(undefined)
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    it("when navigable item clicked and currently on that route, then calls onNavigate but skips router navigate", async (): Promise<void> => {
        const user = userEvent.setup()
        const onNavigate = vi.fn()
        mockNavigate.mockClear()
        currentRoute = "/reviews"

        renderWithProviders(
            <SidebarNav
                items={[
                    {
                        icon: <span>R</span>,
                        label: "Reviews",
                        to: "/reviews",
                    },
                ]}
                onNavigate={onNavigate}
            />,
        )

        const button = screen.getByRole("button", { name: /Reviews/ })
        await user.click(button)

        expect(onNavigate).toHaveBeenCalledWith("/reviews")
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    it("when navigable item pressed on different route, then calls onNavigate and router navigate", async (): Promise<void> => {
        const user = userEvent.setup()
        const onNavigate = vi.fn()
        mockNavigate.mockClear()
        currentRoute = "/"

        renderWithProviders(
            <SidebarNav
                items={[
                    {
                        icon: <span>R</span>,
                        label: "Reviews",
                        to: "/reviews",
                    },
                ]}
                onNavigate={onNavigate}
            />,
        )

        const button = screen.getByRole("button", { name: /Reviews/ })
        await user.click(button)

        expect(onNavigate).toHaveBeenCalledWith("/reviews")
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/reviews" })
    })

    it("when isCollapsed is true, then renders icon-only buttons with title tooltip", (): void => {
        currentRoute = "/"

        renderWithProviders(
            <SidebarNav
                isCollapsed
                items={[
                    {
                        icon: <span data-testid="icon-home">H</span>,
                        label: "Dashboard",
                        to: "/",
                    },
                    {
                        icon: <span data-testid="icon-reviews">R</span>,
                        label: "Reviews",
                        to: "/reviews",
                    },
                ]}
            />,
        )

        const dashboardButton = screen.getByRole("button", { name: "Dashboard" })
        expect(dashboardButton).not.toBeNull()

        const reviewsButton = screen.getByRole("button", { name: "Reviews" })
        expect(reviewsButton).not.toBeNull()

        const listItems = screen.getAllByRole("listitem")
        expect(listItems[0]?.getAttribute("title")).toBe("Dashboard")
    })

    it("when item has no icon, then startContent is not rendered in expanded mode", (): void => {
        currentRoute = "/"

        renderWithProviders(
            <SidebarNav
                items={[
                    {
                        label: "No Icon Item",
                        to: "/no-icon",
                    },
                ]}
            />,
        )

        const button = screen.getByRole("button", { name: /No Icon Item/ })
        expect(button).not.toBeNull()
    })

    it("when item.to matches child route, then item is active", (): void => {
        currentRoute = "/reviews/detail/123"

        renderWithProviders(
            <SidebarNav
                items={[
                    {
                        icon: <span>R</span>,
                        label: "Reviews",
                        to: "/reviews",
                    },
                ]}
            />,
        )

        const button = screen.getByRole("button", { name: /Reviews/ })
        expect(button.getAttribute("aria-current")).toBe("page")
    })

    it("when root item to=/ and pathname is not root, then item is not active", (): void => {
        currentRoute = "/reviews"

        renderWithProviders(
            <SidebarNav
                items={[
                    {
                        icon: <span>H</span>,
                        label: "Home",
                        to: "/",
                    },
                ]}
            />,
        )

        const button = screen.getByRole("button", { name: /Home/ })
        expect(button.getAttribute("aria-current")).toBeNull()
    })

    it("when no items provided, then renders default navigation from i18n", (): void => {
        currentRoute = "/"

        renderWithProviders(<SidebarNav />)

        expect(screen.getByRole("button", { name: /Dashboard/ })).not.toBeNull()
    })
})
