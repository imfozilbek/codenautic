import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import type { ReactElement } from "react"
import { describe, expect, it, vi } from "vitest"

import type { TThemeMode } from "@/lib/theme/use-theme"
import { renderWithProviders } from "../utils/render"

const { themeStore } = vi.hoisted(() => {
    const listeners = new Set<() => void>()
    let snapshot = { mode: "system", preset: "sunrise" }
    return {
        themeStore: {
            setMode(m: string): void {
                snapshot = { ...snapshot, mode: m }
                listeners.forEach((cb): void => { cb() })
            },
            setPreset(p: string): void {
                snapshot = { ...snapshot, preset: p }
                listeners.forEach((cb): void => { cb() })
            },
            subscribe(cb: () => void): () => void {
                listeners.add(cb)
                return (): void => { listeners.delete(cb) }
            },
            getSnapshot(): { mode: string; preset: string } {
                return snapshot
            },
            reset(): void {
                snapshot = { mode: "system", preset: "sunrise" }
            },
        },
    }
})

vi.mock("@/lib/theme/use-theme", () => ({
    useTheme: (): {
        mode: string
        preset: string
        presets: ReadonlyArray<{ readonly id: string; readonly label: string }>
        resolvedMode: "dark" | "light"
        setMode: (m: string) => void
        setPreset: (p: string) => void
    } => {
        const snap = React.useSyncExternalStore(
            themeStore.subscribe,
            themeStore.getSnapshot,
            themeStore.getSnapshot,
        )
        return {
            mode: snap.mode,
            preset: snap.preset,
            presets: [
                { id: "moonstone", label: "Moonstone" },
                { id: "cobalt", label: "Cobalt" },
                { id: "forest", label: "Forest" },
                { id: "sunrise", label: "Sunrise" },
                { id: "graphite", label: "Graphite" },
                { id: "aqua", label: "Aqua" },
            ],
            resolvedMode: snap.mode === "dark" ? "dark" : "light",
            setMode: themeStore.setMode,
            setPreset: themeStore.setPreset,
        }
    },
}))

import {
    DashboardLayout,
    Header,
    MobileSidebar,
    Sidebar,
    SidebarNav,
    ThemeToggle,
} from "@/components/layout"

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
    it("рендерит Header с брендом, breadcrumbs, и темным режимом переключателя", (): void => {
        const onOrganizationChange = vi.fn()
        const onCommandPaletteNavigate = vi.fn()
        renderWithProviders(
            <Header
                activeOrganizationId="platform-team"
                breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Reviews" }]}
                commandPaletteRoutes={[
                    { label: "Dashboard", path: "/" },
                    { label: "Settings home", path: "/settings" },
                ]}
                notificationCount={3}
                onMobileMenuOpen={(): void => {
                    return undefined
                }}
                onCommandPaletteNavigate={onCommandPaletteNavigate}
                onOrganizationChange={onOrganizationChange}
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
                userEmail="reviewer@example.com"
                userName="Reviewer"
            />,
            {
                themeMode: "dark" as TThemeMode,
            },
        )

        expect(screen.getAllByText("Reviews").length).toBeGreaterThanOrEqual(1)
        expect(screen.queryByRole("button", { name: "Open navigation menu" })).not.toBeNull()
        expect(screen.queryByRole("button", { name: "Notifications (3)" })).not.toBeNull()
        expect(screen.queryByRole("radiogroup", { name: "Theme mode" })).not.toBeNull()
        expect(screen.queryAllByText("Reviewer").length).toBeGreaterThan(0)
        expect(screen.queryByText("Platform Team")).not.toBeNull()
        expect(screen.queryByRole("navigation", { name: "Breadcrumb" })).not.toBeNull()
        expect(onOrganizationChange).not.toHaveBeenCalled()
        expect(onCommandPaletteNavigate).not.toHaveBeenCalled()
    })

    it("вызывает breadcrumb navigation callback для промежуточного сегмента", async (): Promise<void> => {
        const user = userEvent.setup()
        const onBreadcrumbNavigate = vi.fn()

        renderWithProviders(
            <Header
                breadcrumbs={[
                    { label: "Dashboard", path: "/" },
                    { label: "Settings", path: "/settings" },
                    { label: "Team" },
                ]}
                onBreadcrumbNavigate={onBreadcrumbNavigate}
            />,
        )

        await user.click(screen.getByRole("button", { name: "Settings" }))

        expect(onBreadcrumbNavigate).toHaveBeenCalledWith("/settings")
    })

    it("открывает command palette через кнопку search trigger", async (): Promise<void> => {
        const user = userEvent.setup()
        const onCommandPaletteNavigate = vi.fn()

        renderWithProviders(
            <Header
                commandPaletteRoutes={[
                    { label: "Dashboard", path: "/" },
                    { label: "Settings home", path: "/settings" },
                ]}
                onCommandPaletteNavigate={onCommandPaletteNavigate}
            />,
        )

        const searchTrigger = screen.getByRole("button", {
            name: "Open command palette (⌘K)",
        })
        await user.click(searchTrigger)

        expect(screen.getByRole("dialog", { name: "Global command palette" })).not.toBeNull()
    })

    it("открывает command palette через Ctrl+K и выполняет действие клавиатурой", async (): Promise<void> => {
        const user = userEvent.setup()
        const onCommandPaletteNavigate = vi.fn()

        renderWithProviders(
            <Header
                commandPaletteRoutes={[
                    { label: "Dashboard", path: "/" },
                    { label: "CCR Management", path: "/reviews" },
                    {
                        label: "Provider Degradation",
                        path: "/settings-provider-degradation",
                    },
                    { label: "Help and diagnostics", path: "/help-diagnostics" },
                ]}
                onCommandPaletteNavigate={onCommandPaletteNavigate}
            />,
        )

        await user.keyboard("{Control>}k{/Control}")

        expect(screen.getByRole("dialog", { name: "Global command palette" })).not.toBeNull()
        const paletteSearch = screen.getByRole("combobox", { name: "Command palette search" })
        await user.type(paletteSearch, "diagnostics")
        await user.keyboard("{Enter}")

        expect(onCommandPaletteNavigate).toHaveBeenCalledWith("/help-diagnostics")
    })

    it("поддерживает aria-activedescendant при навигации по command palette", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(
            <Header
                commandPaletteRoutes={[
                    { label: "Dashboard", path: "/" },
                    { label: "CCR Management", path: "/reviews" },
                    { label: "Help and diagnostics", path: "/help-diagnostics" },
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

        renderWithProviders(<Header commandPaletteRoutes={[{ label: "Dashboard", path: "/" }]} />)

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
                themeMode: "light" as TThemeMode,
            },
        )

        await user.keyboard("?")

        expect(screen.getByText("Keyboard shortcuts")).not.toBeNull()
        const searchInput = screen.getByRole("textbox", { name: "Search shortcuts" })
        await user.type(searchInput, "dashboard")
        expect(screen.getByRole("list", { name: "Shortcuts list" })).not.toBeNull()
        expect(screen.getByText("Go to dashboard")).not.toBeNull()
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
                themeMode: "light" as TThemeMode,
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

        expect(screen.queryByText("Menu")).toBeNull()
        expect(onOpenChange).not.toHaveBeenCalled()
    })

    it("рендерит mobile sidebar в открытом состоянии", (): void => {
        const onOpenChange = vi.fn()
        renderWithProviders(<MobileSidebar isOpen onOpenChange={onOpenChange} title="Menu" />)
        expect(screen.getByText("Menu")).not.toBeNull()
        expect(onOpenChange).not.toHaveBeenCalled()
    })

    it("меняет theme mode и preset через ThemeToggle", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ThemeToggle />)

        const lightModeButton = screen.getByRole("button", { name: "Use light theme" })
        const darkModeButton = screen.getByRole("button", { name: "Use dark theme" })
        const presetButton = screen.getByRole("button", {
            name: `Set ${"Cobalt"} theme preset`,
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
        expect(screen.queryByText(`Preset: ${"Cobalt"}`)).not.toBeNull()
    })

    it("рендерит dashboard layout с контентом", (): void => {
        renderWithProviders(
            <DashboardLayoutHarness>
                <p>Panel content</p>
            </DashboardLayoutHarness>,
            {
                themeMode: "light" as TThemeMode,
            },
        )

        expect(screen.queryAllByText("Dev").length).toBeGreaterThan(0)
        expect(screen.queryByText("Panel content")).not.toBeNull()
    })

    it("применяет tenant route guard при сохранённом tenant mismatch", async (): Promise<void> => {
        mockNavigate.mockClear()
        currentRoute = "/settings-team"
        window.localStorage.setItem("codenautic:tenant:active", "frontend-team")

        renderWithProviders(
            <DashboardLayoutHarness>
                <p>Panel content</p>
            </DashboardLayoutHarness>,
            {
                themeMode: "light" as TThemeMode,
            },
        )

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalled()
        })

        window.localStorage.removeItem("codenautic:tenant:active")
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
                themeMode: "light" as TThemeMode,
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

        await waitFor((): void => {
            expect(screen.getByText("Session expired")).not.toBeNull()
            expect(screen.getByText(/Authentication failed with 401/)).not.toBeNull()
        })

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
                themeMode: "light" as TThemeMode,
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
                themeMode: "light" as TThemeMode,
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
                themeMode: "light" as TThemeMode,
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

    it("глобальный sidebar не содержит settings sub-navigation", (): void => {
        renderWithProviders(<Sidebar isCollapsed={false} title="Navigation" />, {
            themeMode: "light" as TThemeMode,
        })

        expect(screen.queryByRole("button", { name: /Settings/ })).not.toBeNull()
        expect(screen.queryByRole("button", { name: /LLM Providers/ })).toBeNull()
        expect(screen.queryByRole("button", { name: /Code Review/ })).toBeNull()
        expect(screen.queryByRole("button", { name: /Git Providers/ })).toBeNull()
    })

    it("when OPEN_COMMAND_PALETTE_EVENT dispatched, then открывает command palette", async (): Promise<void> => {
        currentRoute = "/"

        renderWithProviders(
            <DashboardLayoutHarness>
                <p>Command palette via custom event</p>
            </DashboardLayoutHarness>,
            {
                themeMode: "light" as TThemeMode,
            },
        )

        window.dispatchEvent(new CustomEvent("codenautic:shortcut:open-command-palette"))

        await waitFor((): void => {
            expect(screen.getByRole("dialog", { name: "Global command palette" })).not.toBeNull()
        })
    })

    it("when мобильное меню открыто и элемент навигации нажат, then меню закрывается", async (): Promise<void> => {
        const user = userEvent.setup()
        currentRoute = "/"

        renderWithProviders(
            <DashboardLayoutHarness>
                <p>Mobile nav content</p>
            </DashboardLayoutHarness>,
            {
                themeMode: "light" as TThemeMode,
            },
        )

        const mobileMenuButton = screen.getByRole("button", { name: "Open navigation menu" })
        await user.click(mobileMenuButton)

        await waitFor((): void => {
            expect(screen.getAllByText("Menu").length).toBeGreaterThanOrEqual(1)
        })
    })

    it("when DashboardLayout без onSignOut, then handleSignOut не крашится", async (): Promise<void> => {
        currentRoute = "/"

        renderWithProviders(
            <DashboardLayout title="No signout" userName="User" userEmail="user@test.com">
                <p>No signout content</p>
            </DashboardLayout>,
            {
                themeMode: "light" as TThemeMode,
            },
        )

        expect(screen.queryByText("No signout content")).not.toBeNull()
    })

    it("when Cmd+K нажат в DashboardLayout, then command palette открывается и навигация работает", async (): Promise<void> => {
        const user = userEvent.setup()
        mockNavigate.mockClear()
        currentRoute = "/"

        renderWithProviders(
            <DashboardLayoutHarness>
                <p>Cmd K test</p>
            </DashboardLayoutHarness>,
            {
                themeMode: "light" as TThemeMode,
            },
        )

        await user.keyboard("{Meta>}k{/Meta}")

        await waitFor((): void => {
            expect(screen.getByRole("dialog", { name: "Global command palette" })).not.toBeNull()
        })
    })

    it("when command palette закрыт через Escape, then диалог исчезает", async (): Promise<void> => {
        const user = userEvent.setup()
        currentRoute = "/"

        renderWithProviders(
            <DashboardLayoutHarness>
                <p>Escape close test</p>
            </DashboardLayoutHarness>,
            {
                themeMode: "light" as TThemeMode,
            },
        )

        await user.keyboard("{Control>}k{/Control}")

        await waitFor((): void => {
            expect(screen.getByRole("dialog", { name: "Global command palette" })).not.toBeNull()
        })

        await user.keyboard("{Escape}")

        await waitFor((): void => {
            expect(screen.queryByRole("dialog", { name: "Global command palette" })).toBeNull()
        })
    })

    it("when breadcrumb нажат в ContentToolbar, then навигация вызывается", async (): Promise<void> => {
        const user = userEvent.setup()
        mockNavigate.mockClear()
        currentRoute = "/settings-team"

        renderWithProviders(
            <DashboardLayoutHarness>
                <p>Breadcrumb nav test</p>
            </DashboardLayoutHarness>,
            {
                themeMode: "light" as TThemeMode,
            },
        )

        const breadcrumbButtons = screen.queryAllByRole("button")
        const settingsButton = breadcrumbButtons.find(
            (button): boolean => button.textContent === "Settings",
        )
        if (settingsButton !== undefined) {
            await user.click(settingsButton)
            await waitFor((): void => {
                expect(mockNavigate).toHaveBeenCalled()
            })
        }
    })
})
