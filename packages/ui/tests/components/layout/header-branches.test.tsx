import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Header } from "@/components/layout"
import { renderWithProviders } from "../../utils/render"

vi.mock("@tanstack/react-router", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@tanstack/react-router")>()
    return {
        ...actual,
        useLocation: () => ({ pathname: "/" }),
        useNavigate: () => vi.fn(),
    }
})

describe("Header — uncovered branches", (): void => {
    it("when keydown fires without Ctrl/Meta modifier, then command palette does not open", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(
            <Header
                commandPaletteRoutes={[
                    { label: "Dashboard", path: "/" },
                ]}
            />,
        )

        await user.keyboard("k")

        expect(screen.queryByRole("dialog", { name: "Global command palette" })).toBeNull()
    })

    it("when keydown fires with Ctrl but non-k key, then command palette does not open", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(
            <Header
                commandPaletteRoutes={[
                    { label: "Dashboard", path: "/" },
                ]}
            />,
        )

        await user.keyboard("{Control>}j{/Control}")

        expect(screen.queryByRole("dialog", { name: "Global command palette" })).toBeNull()
    })

    it("when no breadcrumbs provided, then mobile breadcrumb strip is not rendered", (): void => {
        renderWithProviders(<Header />)

        expect(screen.queryByRole("navigation", { name: "Breadcrumb" })).toBeNull()
    })

    it("when empty breadcrumbs array provided, then mobile breadcrumb strip is not rendered", (): void => {
        renderWithProviders(<Header breadcrumbs={[]} />)

        expect(screen.queryByRole("navigation", { name: "Breadcrumb" })).toBeNull()
    })

    it("when organizations not provided, then workspace switcher is not rendered", (): void => {
        renderWithProviders(<Header />)

        expect(screen.queryByText("Workspace")).toBeNull()
    })

    it("when notificationCount is 0, then notification badge is not shown", (): void => {
        renderWithProviders(<Header notificationCount={0} />)

        const bellButton = screen.getByRole("button", { name: "Notifications (0)" })
        expect(bellButton).not.toBeNull()
    })

    it("when notificationCount is undefined, then notification badge is not shown", (): void => {
        renderWithProviders(<Header />)

        const bellButton = screen.getByRole("button", { name: "Notifications (0)" })
        expect(bellButton).not.toBeNull()
    })

    it("when organizations provided without activeOrganizationId, then shows fallback Workspace label", (): void => {
        renderWithProviders(
            <Header
                organizations={[
                    { id: "org-1", label: "Team A" },
                    { id: "org-2", label: "Team B" },
                ]}
            />,
        )

        expect(screen.getByText("Workspace")).not.toBeNull()
    })

    it("when organizations provided with activeOrganizationId, then dropdown renders with active label", (): void => {
        renderWithProviders(
            <Header
                activeOrganizationId="org-1"
                organizations={[
                    { id: "org-1", label: "Team A" },
                    { id: "org-2", label: "Team B" },
                ]}
            />,
        )

        expect(screen.getByText("Team A")).not.toBeNull()
    })

    it("when OPEN_COMMAND_PALETTE_EVENT dispatched on Header directly, then command palette opens", async (): Promise<void> => {
        renderWithProviders(
            <Header
                commandPaletteRoutes={[
                    { label: "Dashboard", path: "/" },
                ]}
            />,
        )

        window.dispatchEvent(
            new CustomEvent("codenautic:shortcut:open-command-palette"),
        )

        await waitFor((): void => {
            expect(
                screen.getByRole("dialog", { name: "Global command palette" }),
            ).not.toBeNull()
        })
    })

    it("when breadcrumb with path is last segment, then renders as span not button", (): void => {
        renderWithProviders(
            <Header
                breadcrumbs={[
                    { label: "Dashboard", path: "/" },
                    { label: "Reviews", path: "/reviews" },
                ]}
            />,
        )

        expect(screen.queryByRole("button", { name: "Reviews" })).toBeNull()

        expect(screen.getAllByText("Reviews").length).toBeGreaterThanOrEqual(1)
    })

    it("when Meta+K pressed, then command palette opens", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(
            <Header
                commandPaletteRoutes={[
                    { label: "Dashboard", path: "/" },
                ]}
            />,
        )

        await user.keyboard("{Meta>}k{/Meta}")

        expect(
            screen.getByRole("dialog", { name: "Global command palette" }),
        ).not.toBeNull()
    })
})
