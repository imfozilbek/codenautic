import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { renderWithProviders } from "../../utils/render"

vi.mock("@tanstack/react-router", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@tanstack/react-router")>()
    return {
        ...actual,
        useLocation: () => ({ pathname: "/" }),
        useNavigate: () => vi.fn(),
    }
})

vi.mock("@/lib/hooks/use-organization-switcher", () => ({
    useOrganizationSwitcher: () => ({
        activeOrganizationId: "org-1",
        organizations: [],
        handleOrganizationChange: vi.fn(),
        setActiveOrganizationId: vi.fn(),
    }),
}))

vi.mock("@/lib/hooks/use-session-recovery", () => ({
    useSessionRecovery: () => ({
        isSessionRecoveryOpen: false,
        setIsSessionRecoveryOpen: vi.fn(),
        handleReAuthenticate: vi.fn(),
        sessionFailureCode: undefined,
        restoredDraftMessage: undefined,
    }),
}))

vi.mock("@/lib/hooks/use-policy-drift", () => ({
    usePolicyDrift: () => ({
        activeRoleId: "admin",
        policyDriftNotice: undefined,
    }),
}))

vi.mock("@/lib/hooks/use-provider-degradation", () => ({
    useProviderDegradation: () => ({
        providerDegradation: undefined,
    }),
}))

vi.mock("@/lib/hooks/use-multi-tab-sync", () => ({
    useMultiTabSync: () => ({
        multiTabNotice: undefined,
    }),
}))

vi.mock("@/lib/hooks/use-dashboard-shortcuts", () => ({
    useDashboardShortcuts: () => ({
        conflicts: [],
        isShortcutsHelpOpen: false,
        setIsShortcutsHelpOpen: vi.fn(),
        shortcutsHelpQuery: "",
        setShortcutsHelpQuery: vi.fn(),
        filteredShortcuts: [],
    }),
}))

vi.mock("motion/react", async (importOriginal) => {
    const actual = await importOriginal<typeof import("motion/react")>()
    return {
        ...actual,
        useReducedMotion: (): boolean => true,
    }
})

describe("DashboardLayout", (): void => {
    it("when rendered, then shows skip to main content link", (): void => {
        renderWithProviders(
            <DashboardLayout>
                <p>Page content</p>
            </DashboardLayout>,
        )

        expect(screen.getByText("Skip to main content")).not.toBeNull()
    })

    it("when rendered with children, then displays page content", (): void => {
        renderWithProviders(
            <DashboardLayout>
                <p>Dashboard page</p>
            </DashboardLayout>,
        )

        expect(screen.getByText("Dashboard page")).not.toBeNull()
    })

    it("when rendered, then has main content area", (): void => {
        const { container } = renderWithProviders(
            <DashboardLayout>
                <p>Content</p>
            </DashboardLayout>,
        )

        const mainContent = container.querySelector("#main-content")
        expect(mainContent).not.toBeNull()
    })
})
