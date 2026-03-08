import { screen, waitFor } from "@testing-library/react"
import userEvent, { type UserEvent } from "@testing-library/user-event"
import type { ReactElement } from "react"
import { describe, expect, it, vi } from "vitest"

import { THEME_PRESETS, type ThemeMode } from "@/lib/theme/theme-provider"
import { renderWithProviders } from "../utils/render"
import {
    DashboardLayout,
    Header,
    MobileSidebar,
    Sidebar,
    SidebarNav,
    ThemeToggle,
} from "@/components/layout"
import { SettingsNav } from "@/components/layout/settings-nav"

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

interface ILayoutHarnessProps {
    readonly children: ReactElement
}

function DashboardLayoutHarness(props: ILayoutHarnessProps): ReactElement {
    return (
        <DashboardLayout
            onSignOut={(): void => {
                return undefined
            }}
            title="Техстатус"
            userEmail="dev@example.com"
            userName="Dev"
        >
            {props.children}
        </DashboardLayout>
    )
}

describe("layout components", (): void => {
    it("рендерит Header с брендом и темным режимом переключателя", (): void => {
        const onOrganizationChange = vi.fn()
        const onRoleChange = vi.fn()
        const onSearchRouteNavigate = vi.fn()
        renderWithProviders(
            <Header
                activeOrganizationId="platform-team"
                activeRoleId="admin"
                notificationCount={3}
                onMobileMenuOpen={(): void => {
                    return undefined
                }}
                onOrganizationChange={onOrganizationChange}
                onRoleChange={onRoleChange}
                onSearchRouteNavigate={onSearchRouteNavigate}
                organizations={[
                    {
                        id: "platform-team",
                        label: "Platform Team",
                    },
                    {
                        id: "frontend-team",
                        label: "Frontend Team",
                    },
                ]}
                roleOptions={[
                    {
                        id: "viewer",
                        label: "Viewer",
                    },
                    {
                        id: "admin",
                        label: "Admin",
                    },
                ]}
                searchRoutes={[
                    {
                        label: "Dashboard",
                        path: "/",
                    },
                    {
                        label: "Settings home",
                        path: "/settings",
                    },
                ]}
                title="Reviews"
                userEmail="reviewer@example.com"
                userName="Reviewer"
            />,
            {
                defaultThemeMode: "dark" as ThemeMode,
            },
        )

        expect(screen.queryByText("CodeNautic")).not.toBeNull()
        expect(screen.getAllByText("Reviews").length).toBeGreaterThanOrEqual(1)
        expect(screen.queryByRole("button", { name: "Open navigation menu" })).not.toBeNull()
        expect(screen.queryByRole("button", { name: "Notifications (3)" })).not.toBeNull()
        expect(screen.queryByRole("radiogroup", { name: "Theme mode" })).not.toBeNull()
        expect(screen.queryAllByText("Reviewer").length).toBeGreaterThan(0)
        expect(
            screen.getByRole("combobox", { name: "Organization workspace switcher" }),
        ).not.toBeNull()
        expect(screen.getByText("Current: Platform Team")).not.toBeNull()
        expect(screen.getByRole("combobox", { name: "RBAC role switcher" })).not.toBeNull()
        expect(screen.getByText("Active: Admin")).not.toBeNull()
        expect(screen.getByLabelText("Global route search")).not.toBeNull()
        expect(onOrganizationChange).not.toHaveBeenCalled()
        expect(onRoleChange).not.toHaveBeenCalled()
        expect(onSearchRouteNavigate).not.toHaveBeenCalled()
    })

    it("выполняет global search submit и вызывает route navigate callback", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSearchRouteNavigate = vi.fn()

        renderWithProviders(
            <Header
                onSearchRouteNavigate={onSearchRouteNavigate}
                searchRoutes={[
                    {
                        label: "Dashboard",
                        path: "/",
                    },
                    {
                        label: "Settings home",
                        path: "/settings",
                    },
                ]}
            />,
        )

        const searchInput = screen.getByLabelText("Global route search")
        await user.type(searchInput, "settings{enter}")

        expect(onSearchRouteNavigate).toHaveBeenCalledWith("/settings")
    })

    it("открывает command palette через Ctrl+K и выполняет действие клавиатурой", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSearchRouteNavigate = vi.fn()

        renderWithProviders(
            <Header
                onSearchRouteNavigate={onSearchRouteNavigate}
                searchRoutes={[
                    {
                        label: "Dashboard",
                        path: "/",
                    },
                    {
                        label: "CCR Management",
                        path: "/reviews",
                    },
                    {
                        label: "Provider Degradation",
                        path: "/settings-provider-degradation",
                    },
                    {
                        label: "Help and diagnostics",
                        path: "/help-diagnostics",
                    },
                ]}
            />,
        )

        await user.keyboard("{Control>}k{/Control}")

        expect(screen.getByRole("dialog", { name: "Global command palette" })).not.toBeNull()
        const paletteSearch = screen.getByRole("combobox", { name: "Command palette search" })
        await user.type(paletteSearch, "diagnostics")
        await user.keyboard("{Enter}")

        expect(onSearchRouteNavigate).toHaveBeenCalledWith("/help-diagnostics")
    })

    it("поддерживает aria-activedescendant при навигации по command palette", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(
            <Header
                searchRoutes={[
                    {
                        label: "Dashboard",
                        path: "/",
                    },
                    {
                        label: "CCR Management",
                        path: "/reviews",
                    },
                    {
                        label: "Help and diagnostics",
                        path: "/help-diagnostics",
                    },
                ]}
            />,
        )

        await user.keyboard("{Control>}k{/Control}")

        const paletteSearch = screen.getByRole("combobox", { name: "Command palette search" })
        expect(paletteSearch).toHaveAttribute("aria-controls", "header-command-palette-results")

        const initialOption = screen.getByRole("option", { selected: true })
        const initialOptionId = initialOption.getAttribute("id") ?? ""
        expect(initialOptionId).not.toBe("")
        expect(initialOptionId.includes("/")).toBe(false)
        expect(initialOptionId.startsWith("header-command-palette-option-")).toBe(true)
        expect(paletteSearch).toHaveAttribute("aria-activedescendant", initialOptionId)

        await user.keyboard("{ArrowDown}")

        const nextOption = screen.getByRole("option", { selected: true })
        const nextOptionId = nextOption.getAttribute("id") ?? ""
        expect(nextOptionId).not.toBe("")
        expect(nextOptionId.includes("/")).toBe(false)
        expect(nextOptionId).not.toBe(initialOptionId)
        expect(paletteSearch).toHaveAttribute("aria-activedescendant", nextOptionId)
    })

    it("возвращает фокус на инициатор после закрытия command palette по Escape", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(
            <Header
                searchRoutes={[
                    {
                        label: "Dashboard",
                        path: "/",
                    },
                ]}
            />,
        )

        const trigger = screen.getByRole("button", { name: "Open navigation menu" })
        trigger.focus()

        await user.keyboard("{Control>}k{/Control}")
        expect(screen.getByRole("dialog", { name: "Global command palette" })).not.toBeNull()

        await user.keyboard("{Escape}")

        await waitFor((): void => {
            expect(screen.queryByRole("dialog", { name: "Global command palette" })).toBeNull()
            expect(document.activeElement).toBe(trigger)
        })
    })

    it("открывает shortcuts overlay по ? и позволяет фильтровать список", async (): Promise<void> => {
        const user = userEvent.setup()
        currentRoute = "/reviews"

        renderWithProviders(
            <DashboardLayoutHarness>
                <p>Shortcut help content</p>
            </DashboardLayoutHarness>,
            {
                defaultThemeMode: "light" as ThemeMode,
            },
        )

        await user.keyboard("?")

        expect(screen.getByText("Keyboard shortcuts")).not.toBeNull()
        const searchInput = screen.getByRole("textbox", { name: "Search shortcuts" })
        await user.type(searchInput, "dashboard")
        expect(screen.getByRole("list", { name: "Shortcuts list" })).not.toBeNull()
        expect(screen.getByText("Go to dashboard")).not.toBeNull()
    })

    it("обрабатывает callback для collapse sidebar", async (): Promise<void> => {
        const user: UserEvent = userEvent.setup()
        const onNavigate = vi.fn()
        const onSidebarToggle = vi.fn()
        currentRoute = "/"

        renderWithProviders(
            <Sidebar
                isCollapsed={false}
                onNavigate={onNavigate}
                onSidebarToggle={onSidebarToggle}
                title="Navigation"
            />,
            {
                defaultThemeMode: "light" as ThemeMode,
            },
        )

        expect(screen.queryByText("Navigation")).not.toBeNull()
        expect(screen.queryByRole("button", { name: /Dashboard/ })).not.toBeNull()
        expect(screen.queryByRole("button", { name: /CCR Management/ })).not.toBeNull()

        const collapseButton = screen.getByRole("button", { name: "Collapse navigation" })
        await user.click(collapseButton)
        expect(onSidebarToggle).toHaveBeenCalledTimes(1)
        expect(onNavigate).toHaveBeenCalledTimes(0)
    })

    it("передаёт выбор пункта навигации в коллбэк", async (): Promise<void> => {
        const user = userEvent.setup()
        const onNavigate = vi.fn()
        currentRoute = "/settings"

        renderWithProviders(
            <SidebarNav
                items={[
                    {
                        icon: <span>🏠</span>,
                        label: "Dashboard",
                        to: "/",
                    },
                    {
                        icon: <span>⚙️</span>,
                        isDisabled: true,
                        label: "Disabled",
                        to: "/disabled",
                    },
                    {
                        icon: <span>🧩</span>,
                        label: "Settings",
                        to: "/settings",
                    },
                ]}
                onNavigate={onNavigate}
            />,
            {
                defaultThemeMode: "light" as ThemeMode,
            },
        )

        const settingsButton = screen.getByRole("button", { name: /Settings/ })
        await user.click(settingsButton)
        expect(onNavigate).toHaveBeenCalledWith("/settings")

        const dashboardButton = screen.getByRole("button", { name: /Dashboard/ })
        await user.click(dashboardButton)
        expect(onNavigate).toHaveBeenCalledWith("/")
    })

    it("рендерит mobile sidebar с заголовком", (): void => {
        const onOpenChange = vi.fn()

        renderWithProviders(
            <MobileSidebar isOpen={false} onOpenChange={onOpenChange} title="Menu" />,
        )
        expect(onOpenChange).not.toHaveBeenCalled()
    })

    it("рендерит mobile sidebar в открытом состоянии", (): void => {
        const onOpenChange = vi.fn()
        renderWithProviders(<MobileSidebar isOpen onOpenChange={onOpenChange} title="Menu" />)
        expect(screen.queryByText("Menu")).not.toBeNull()
        expect(onOpenChange).not.toHaveBeenCalled()
    })

    it("меняет theme mode и preset через ThemeToggle", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ThemeToggle />)

        const lightModeButton = screen.getByRole("button", { name: "Use light theme" })
        const darkModeButton = screen.getByRole("button", { name: "Use dark theme" })
        const presetButton = screen.getByRole("button", {
            name: `Set ${THEME_PRESETS.at(1)?.label ?? ""} theme preset`,
        })

        await user.click(darkModeButton)
        await waitFor(() => {
            expect(darkModeButton.getAttribute("aria-pressed")).toBe("true")
            expect(lightModeButton.getAttribute("aria-pressed")).toBe("false")
        })

        await user.click(lightModeButton)
        await waitFor(() => {
            expect(lightModeButton.getAttribute("aria-pressed")).toBe("true")
        })

        await user.click(presetButton)
        await waitFor(() => {
            expect(presetButton.getAttribute("aria-pressed")).toBe("true")
        })
        expect(screen.queryByText(`Preset: ${THEME_PRESETS.at(1)?.label ?? ""}`)).not.toBeNull()
    })

    it("рендерит dashboard layout с контентом", (): void => {
        renderWithProviders(
            <DashboardLayoutHarness>
                <p>Panel content</p>
            </DashboardLayoutHarness>,
            {
                defaultThemeMode: "light" as ThemeMode,
            },
        )

        expect(screen.queryAllByText("Dev").length).toBeGreaterThan(0)
        expect(screen.queryByText("Panel content")).not.toBeNull()
        expect(screen.queryAllByText("Техстатус").length).toBeGreaterThan(0)
    })

    it("переключает организацию и применяет tenant route guard", async (): Promise<void> => {
        const user = userEvent.setup()
        mockNavigate.mockClear()
        currentRoute = "/settings-team"

        renderWithProviders(
            <DashboardLayoutHarness>
                <p>Panel content</p>
            </DashboardLayoutHarness>,
            {
                defaultThemeMode: "light" as ThemeMode,
            },
        )

        const switcher = screen.getByRole("combobox", { name: "Organization workspace switcher" })
        await user.selectOptions(switcher, "frontend-team")

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalled()
        })
    })

    it("показывает forced re-auth modal и восстанавливает pending intent", async (): Promise<void> => {
        const user = userEvent.setup()
        mockNavigate.mockClear()
        currentRoute = "/settings-code-review"

        renderWithProviders(
            <DashboardLayoutHarness>
                <input aria-label="Draft field" defaultValue="" />
            </DashboardLayoutHarness>,
            {
                defaultThemeMode: "light" as ThemeMode,
            },
        )

        const draftField = screen.getByRole("textbox", { name: "Draft field" })
        await user.type(draftField, "pending draft comment")

        window.dispatchEvent(
            new CustomEvent("codenautic:session-expired", {
                detail: {
                    code: 401,
                    pendingIntent: "/reviews",
                },
            }),
        )

        expect(screen.getByText("Session expired")).not.toBeNull()
        expect(screen.getByText(/Authentication failed with 401/)).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Re-authenticate" }))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith({
                to: "/reviews",
            })
        })
        expect(screen.getByText(/Recovered draft from/)).not.toBeNull()
    })

    it("реагирует на runtime policy drift и уводит на safe fallback route", async (): Promise<void> => {
        mockNavigate.mockClear()
        currentRoute = "/settings-organization"

        renderWithProviders(
            <DashboardLayoutHarness>
                <p>Protected admin content</p>
            </DashboardLayoutHarness>,
            {
                defaultThemeMode: "light" as ThemeMode,
            },
        )

        window.dispatchEvent(
            new CustomEvent("codenautic:policy-drift", {
                detail: {
                    nextRole: "viewer",
                    reason: "Admin access revoked by security policy update.",
                },
            }),
        )

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith({
                to: "/settings",
            })
        })
        expect(screen.getByText("Runtime policy drift detected")).not.toBeNull()
        expect(screen.getByText(/Policy changed to viewer/)).not.toBeNull()
    })

    it("показывает global degraded banner при provider outage событии", async (): Promise<void> => {
        currentRoute = "/settings"

        renderWithProviders(
            <DashboardLayoutHarness>
                <p>Provider status</p>
            </DashboardLayoutHarness>,
            {
                defaultThemeMode: "light" as ThemeMode,
            },
        )

        window.dispatchEvent(
            new CustomEvent("codenautic:provider-degradation", {
                detail: {
                    affectedFeatures: ["Review generation", "Chat completion"],
                    eta: "30m",
                    level: "degraded",
                    provider: "llm",
                    runbookUrl: "https://status.codenautic.local/runbooks/llm",
                },
            }),
        )

        await waitFor(() => {
            expect(screen.getByText("Provider degradation mode")).not.toBeNull()
        })
        expect(screen.getByText(/llm degraded/)).not.toBeNull()
        expect(screen.getByRole("link", { name: "Open runbook" })).not.toBeNull()
    })

    it("синхронизирует tenant/theme из другой вкладки и показывает non-blocking уведомление", async (): Promise<void> => {
        mockNavigate.mockClear()
        currentRoute = "/settings-team"

        renderWithProviders(
            <DashboardLayoutHarness>
                <p>Cross-tab content</p>
            </DashboardLayoutHarness>,
            {
                defaultThemeMode: "light" as ThemeMode,
            },
        )

        window.dispatchEvent(
            new StorageEvent("storage", {
                key: "codenautic:tenant:active",
                newValue: "frontend-team",
            }),
        )

        await waitFor(() => {
            expect(screen.getByText("Multi-tab sync applied")).not.toBeNull()
        })
        expect(screen.getByText(/Tenant synchronized from another tab/)).not.toBeNull()
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith({
                to: "/settings",
            })
        })

        window.dispatchEvent(
            new StorageEvent("storage", {
                key: "codenautic:ui:theme-mode",
                newValue: "dark",
            }),
        )
        await waitFor(() => {
            expect(screen.getByText(/Theme synchronized from another tab/)).not.toBeNull()
        })
    })

    it("рендерит секции настроек", (): void => {
        renderWithProviders(<SettingsNav />)

        expect(screen.queryByText("Settings")).not.toBeNull()
        expect(screen.queryByRole("button", { name: /General/ })).not.toBeNull()
        expect(screen.queryByRole("button", { name: /LLM Providers/ })).not.toBeNull()
        expect(screen.queryByRole("button", { name: /Code Review/ })).not.toBeNull()
        expect(screen.queryByRole("button", { name: /Git Providers/ })).not.toBeNull()
    })
})
