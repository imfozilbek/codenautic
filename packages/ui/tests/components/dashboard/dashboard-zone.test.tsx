import { screen } from "@testing-library/react"
import userEvent, { type UserEvent } from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DashboardZone } from "@/components/dashboard/dashboard-zone"
import { renderWithProviders } from "../../utils/render"

vi.mock("@/lib/motion", () => ({
    DURATION: { normal: 0 },
    EASING: { move: [0, 0, 1, 1] },
    useReducedMotion: (): boolean => true,
}))

vi.mock("motion/react", () => ({
    motion: new Proxy(
        {},
        {
            get: (_target: object, _prop: string): unknown => {
                return ({
                    children,
                    ...rest
                }: {
                    readonly children?: React.ReactNode
                    readonly [key: string]: unknown
                }): React.ReactElement => {
                    return <div {...rest}>{children}</div>
                }
            },
        },
    ),
    AnimatePresence: ({ children }: { readonly children: React.ReactNode }): React.ReactNode =>
        children,
}))

describe("DashboardZone", (): void => {
    it("when rendered with default props, then shows title and children", (): void => {
        renderWithProviders(
            <DashboardZone title="Zone A">
                <p>zone content</p>
            </DashboardZone>,
        )

        expect(screen.queryByText("Zone A")).not.toBeNull()
        expect(screen.queryByText("zone content")).not.toBeNull()
    })

    it("when defaultExpanded is false, then children are hidden initially", (): void => {
        renderWithProviders(
            <DashboardZone defaultExpanded={false} title="Zone B">
                <p>hidden content</p>
            </DashboardZone>,
        )

        expect(screen.queryByText("Zone B")).not.toBeNull()
        expect(screen.queryByText("hidden content")).toBeNull()
    })

    it("when isVisible is false, then renders nothing", (): void => {
        const { container } = renderWithProviders(
            <DashboardZone isVisible={false} title="Invisible Zone">
                <p>invisible</p>
            </DashboardZone>,
        )

        expect(screen.queryByText("Invisible Zone")).toBeNull()
        expect(container.querySelector("section")).toBeNull()
    })

    it("when expanded zone toggle is clicked, then collapses children", async (): Promise<void> => {
        const user: UserEvent = userEvent.setup()
        renderWithProviders(
            <DashboardZone title="Toggle Zone">
                <p>collapsible content</p>
            </DashboardZone>,
        )

        expect(screen.queryByText("collapsible content")).not.toBeNull()

        const toggleButton = screen.getByRole("button", { name: /Toggle Zone/i })
        expect(toggleButton.getAttribute("aria-expanded")).toBe("true")

        await user.click(toggleButton)
        expect(toggleButton.getAttribute("aria-expanded")).toBe("false")
    })

    it("when priority is primary, then applies primary border styles", (): void => {
        const { container } = renderWithProviders(
            <DashboardZone priority="primary" title="Primary Zone">
                <p>primary content</p>
            </DashboardZone>,
        )

        const section = container.querySelector("section")
        expect(section?.className).toContain("border-l-4")
        expect(section?.className).toContain("border-l-accent/60")
    })

    it("when priority is tertiary, then applies tertiary styles with opacity", (): void => {
        const { container } = renderWithProviders(
            <DashboardZone priority="tertiary" title="Tertiary Zone">
                <p>tertiary content</p>
            </DashboardZone>,
        )

        const section = container.querySelector("section")
        expect(section?.className).toContain("opacity-90")
    })
})
