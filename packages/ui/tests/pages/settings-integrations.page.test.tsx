import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SettingsIntegrationsPage } from "@/pages/settings-integrations.page"
import { renderWithProviders } from "../utils/render"

const {
    mockUseExternalContext,
    mockUpdateSource,
    mockRefreshSource,
    mockShowToastSuccess,
    mockShowToastInfo,
    mockShowToastError,
} = vi.hoisted(() => ({
    mockUseExternalContext: vi.fn(),
    mockUpdateSource: vi.fn(async (): Promise<unknown> => ({ source: {} })),
    mockRefreshSource: vi.fn(async (): Promise<unknown> => ({ accepted: true })),
    mockShowToastSuccess: vi.fn(),
    mockShowToastInfo: vi.fn(),
    mockShowToastError: vi.fn(),
}))

vi.mock("@/lib/hooks/queries/use-external-context", () => ({
    useExternalContext: mockUseExternalContext,
}))

vi.mock("@/lib/notifications/toast", () => ({
    showToastSuccess: mockShowToastSuccess,
    showToastInfo: mockShowToastInfo,
    showToastError: mockShowToastError,
}))

function findCardByProviderName(providerName: string): HTMLElement {
    const card = screen.getByText(providerName).closest('[data-slot="card"]')
    if (card === null) {
        throw new Error(`Card for provider "${providerName}" not found`)
    }
    return card as HTMLElement
}

function createDefaultExternalContextMock(): ReturnType<typeof mockUseExternalContext> {
    return {
        sourcesQuery: {
            isPending: false,
            error: null,
            data: {
                sources: [
                    {
                        id: "jira",
                        name: "Jira Context",
                        type: "JIRA",
                        status: "CONNECTED",
                        enabled: true,
                        itemCount: 21,
                        lastSyncedAt: "2026-03-05T08:00:00Z",
                    },
                    {
                        id: "sentry",
                        name: "Sentry Context",
                        type: "SENTRY",
                        status: "DEGRADED",
                        enabled: false,
                        itemCount: 9,
                    },
                ],
            },
        },
        previewQuery: {
            isPending: false,
            error: null,
            data: {
                sourceId: "jira",
                items: [
                    {
                        id: "item-1",
                        title: "CN-404",
                        excerpt: "Service timeout in upstream provider",
                        url: "https://example.com/CN-404",
                    },
                ],
                total: 1,
            },
        },
        updateSource: {
            isPending: false,
            mutateAsync: mockUpdateSource,
        },
        refreshSource: {
            isPending: false,
            mutateAsync: mockRefreshSource,
        },
    }
}

describe("settings integrations page", (): void => {
    it("рендерит external context sources и preview", async (): Promise<void> => {
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        expect(screen.getByRole("heading", { name: "Integrations" })).not.toBeNull()
        expect(screen.getByText("External Context Sources")).not.toBeNull()
        expect(screen.getByText("Jira Context")).not.toBeNull()
        expect(screen.getByText("CN-404")).not.toBeNull()
    })

    it("делегирует source actions в useExternalContext mutations", async (): Promise<void> => {
        const user = userEvent.setup()
        mockUseExternalContext.mockReturnValue({
            sourcesQuery: {
                isPending: false,
                error: null,
                data: {
                    sources: [
                        {
                            id: "jira",
                            name: "Jira Context",
                            type: "JIRA",
                            status: "CONNECTED",
                            enabled: true,
                            itemCount: 21,
                            lastSyncedAt: "2026-03-05T08:00:00Z",
                        },
                    ],
                },
            },
            previewQuery: {
                isPending: false,
                error: null,
                data: {
                    sourceId: "jira",
                    items: [],
                    total: 0,
                },
            },
            updateSource: {
                isPending: false,
                mutateAsync: mockUpdateSource,
            },
            refreshSource: {
                isPending: false,
                mutateAsync: mockRefreshSource,
            },
        })

        renderWithProviders(<SettingsIntegrationsPage />)

        await user.click(screen.getByRole("button", { name: "Disable" }))
        await user.click(screen.getByRole("button", { name: "Refresh" }))

        expect(mockUpdateSource).toHaveBeenCalledWith({
            sourceId: "jira",
            enabled: false,
        })
        expect(mockRefreshSource).toHaveBeenCalledWith("jira")
    })

    it("when страница рендерится, then отображает connection health summary с корректными счётчиками", (): void => {
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        expect(screen.getByText("Connection health summary")).not.toBeNull()
        expect(
            screen.getByText((_, element): boolean => {
                return element?.textContent === "Connected: 2" && element.tagName === "P"
            }),
        ).not.toBeNull()
        expect(
            screen.getByText((_, element): boolean => {
                return element?.textContent === "Degraded: 1" && element.tagName === "P"
            }),
        ).not.toBeNull()
        expect(
            screen.getByText((_, element): boolean => {
                return element?.textContent === "Disconnected: 1" && element.tagName === "P"
            }),
        ).not.toBeNull()
    })

    it("when страница рендерится, then отображает все четыре интеграции с описаниями", (): void => {
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        expect(screen.getByText("Jira")).not.toBeNull()
        expect(screen.getByText("Issue sync и ticket linking для review findings.")).not.toBeNull()

        expect(screen.getByText("Linear")).not.toBeNull()
        expect(
            screen.getByText("Lightweight issue routing для triage и ownership."),
        ).not.toBeNull()

        expect(screen.getByText("Sentry")).not.toBeNull()
        expect(
            screen.getByText("Production incidents и error alerts correlation."),
        ).not.toBeNull()

        expect(screen.getByText("Slack")).not.toBeNull()
        expect(
            screen.getByText("Delivery channel for notifications and review events."),
        ).not.toBeNull()
    })

    it("when страница рендерится, then отображает статусные чипы Connected, Degraded, Disconnected", (): void => {
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        const connectedChips = screen.getAllByText("Connected")
        expect(connectedChips.length).toBeGreaterThanOrEqual(2)

        const degradedChips = screen.getAllByText("Degraded")
        expect(degradedChips.length).toBeGreaterThanOrEqual(1)

        expect(screen.getByText("Disconnected")).not.toBeNull()
    })

    it("when страница рендерится, then отображает secret/token статус и last sync для каждой интеграции", (): void => {
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        const configuredElements = screen.getAllByText(/Secret\/token:/)
        expect(configuredElements.length).toBe(4)

        expect(screen.getByText(/configured · Last sync: 2026-03-04 09:12/)).not.toBeNull()
        expect(screen.getByText(/not configured · Last sync: not synced yet/)).not.toBeNull()
    })

    it("when нажимается Disconnect на подключённой интеграции, then показывается toast", async (): Promise<void> => {
        const user = userEvent.setup()
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        const jiraCard = findCardByProviderName("Jira")
        const disconnectButton = within(jiraCard).getByRole("button", { name: "Disconnect" })
        await user.click(disconnectButton)

        expect(mockShowToastInfo).toHaveBeenCalledWith("Jira connection state updated.")
    })

    it("when нажимается Connect на отключённой интеграции, then показывается toast", async (): Promise<void> => {
        const user = userEvent.setup()
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        const linearCard = findCardByProviderName("Linear")
        const connectButton = within(linearCard).getByRole("button", { name: "Connect" })
        await user.click(connectButton)

        expect(mockShowToastInfo).toHaveBeenCalledWith("Linear connection state updated.")
    })

    it("when нажимается Save configuration, then показывается toast подтверждения", async (): Promise<void> => {
        const user = userEvent.setup()
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        const jiraCard = findCardByProviderName("Jira")
        const saveButton = within(jiraCard).getByRole("button", {
            name: "Save configuration",
        })
        await user.click(saveButton)

        expect(mockShowToastSuccess).toHaveBeenCalledWith("Jira configuration saved.")
    })

    it("when нажимается Test connection для здоровой интеграции, then показывается success toast", async (): Promise<void> => {
        const user = userEvent.setup()
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        const jiraCard = findCardByProviderName("Jira")
        const testButton = within(jiraCard).getByRole("button", {
            name: /Test Jira connection/,
        })
        await user.click(testButton)

        expect(mockShowToastSuccess).toHaveBeenCalledWith("Jira is healthy.")
    })

    it("when нажимается Test connection для отключённой интеграции, then показывается error toast", async (): Promise<void> => {
        const user = userEvent.setup()
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        const linearCard = findCardByProviderName("Linear")
        const testButton = within(linearCard).getByRole("button", {
            name: /Test Linear connection/,
        })
        await user.click(testButton)

        expect(mockShowToastError).toHaveBeenCalledWith("Linear health check failed.")
    })

    it("when пользователь изменяет workspace поле, then значение обновляется", async (): Promise<void> => {
        const user = userEvent.setup()
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        const workspaceInputs = screen.getAllByLabelText("Workspace / endpoint")
        expect(workspaceInputs.length).toBe(4)

        const linearWorkspace = workspaceInputs[1] as HTMLInputElement
        await user.clear(linearWorkspace)
        await user.type(linearWorkspace, "new-workspace")

        expect(linearWorkspace.value).toBe("new-workspace")
    })

    it("when пользователь изменяет target поле, then значение обновляется", async (): Promise<void> => {
        const user = userEvent.setup()
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        const targetInputs = screen.getAllByLabelText("Target")
        expect(targetInputs.length).toBe(4)

        const linearTarget = targetInputs[1] as HTMLInputElement
        await user.clear(linearTarget)
        await user.type(linearTarget, "TEAM")

        expect(linearTarget.value).toBe("TEAM")
    })

    it("when переключается sync switch, then состояние syncEnabled обновляется", async (): Promise<void> => {
        const user = userEvent.setup()
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        const syncSwitches = screen.getAllByRole("switch", { name: "Enable sync" })
        expect(syncSwitches.length).toBe(4)

        await user.click(syncSwitches[0] as HTMLElement)

        expect(syncSwitches[0] as HTMLElement).not.toBeNull()
    })

    it("when переключается notifications switch, then состояние notificationsEnabled обновляется", async (): Promise<void> => {
        const user = userEvent.setup()
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        const notifSwitches = screen.getAllByRole("switch", { name: "Enable notifications" })
        expect(notifSwitches.length).toBe(4)

        await user.click(notifSwitches[1] as HTMLElement)

        expect(notifSwitches[1] as HTMLElement).not.toBeNull()
    })

    it("when context sources загружаются, then показывается loading текст", (): void => {
        mockUseExternalContext.mockReturnValue({
            sourcesQuery: {
                isPending: true,
                error: null,
                data: undefined,
            },
            previewQuery: {
                isPending: false,
                error: null,
                data: undefined,
            },
            updateSource: {
                isPending: false,
                mutateAsync: mockUpdateSource,
            },
            refreshSource: {
                isPending: false,
                mutateAsync: mockRefreshSource,
            },
        })

        renderWithProviders(<SettingsIntegrationsPage />)

        expect(screen.getByText("Loading external context sources...")).not.toBeNull()
    })

    it("when context sources не удалось загрузить, then показывается сообщение об ошибке", (): void => {
        mockUseExternalContext.mockReturnValue({
            sourcesQuery: {
                isPending: false,
                error: new Error("Network error"),
                data: undefined,
            },
            previewQuery: {
                isPending: false,
                error: null,
                data: undefined,
            },
            updateSource: {
                isPending: false,
                mutateAsync: mockUpdateSource,
            },
            refreshSource: {
                isPending: false,
                mutateAsync: mockRefreshSource,
            },
        })

        renderWithProviders(<SettingsIntegrationsPage />)

        expect(screen.getByText("Failed to load context sources.")).not.toBeNull()
    })

    it("when Save configuration с пустым workspace, then secretConfigured становится false", async (): Promise<void> => {
        const user = userEvent.setup()
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        const workspaceInputs = screen.getAllByLabelText("Workspace / endpoint")
        const jiraWorkspace = workspaceInputs[0] as HTMLInputElement
        await user.clear(jiraWorkspace)

        const jiraCard = findCardByProviderName("Jira")
        const saveButton = within(jiraCard).getByRole("button", {
            name: "Save configuration",
        })
        await user.click(saveButton)

        expect(mockShowToastSuccess).toHaveBeenCalledWith("Jira configuration saved.")
    })

    it("when Connect нажимается на Linear с заполненными полями, then статус обновляется", async (): Promise<void> => {
        const user = userEvent.setup()
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        const linearCard = findCardByProviderName("Linear")
        const connectButton = within(linearCard).getByRole("button", {
            name: "Connect",
        })
        await user.click(connectButton)

        expect(mockShowToastInfo).toHaveBeenCalledWith("Linear connection state updated.")
    })

    it("when updateSource mutation отклоняется, then показывается error toast", async (): Promise<void> => {
        const user = userEvent.setup()
        const failingUpdateSource = vi.fn(async (): Promise<never> => {
            throw new Error("Update failed")
        })

        mockUseExternalContext.mockReturnValue({
            sourcesQuery: {
                isPending: false,
                error: null,
                data: {
                    sources: [
                        {
                            id: "jira",
                            name: "Jira Context",
                            type: "JIRA",
                            status: "CONNECTED",
                            enabled: true,
                            itemCount: 21,
                            lastSyncedAt: "2026-03-05T08:00:00Z",
                        },
                    ],
                },
            },
            previewQuery: {
                isPending: false,
                error: null,
                data: { sourceId: "jira", items: [], total: 0 },
            },
            updateSource: {
                isPending: false,
                mutateAsync: failingUpdateSource,
            },
            refreshSource: {
                isPending: false,
                mutateAsync: mockRefreshSource,
            },
        })

        renderWithProviders(<SettingsIntegrationsPage />)

        await user.click(screen.getByRole("button", { name: "Disable" }))

        expect(failingUpdateSource).toHaveBeenCalledWith({
            sourceId: "jira",
            enabled: false,
        })
        expect(mockShowToastError).toHaveBeenCalledWith("Unable to update context source.")
    })

    it("when refreshSource mutation отклоняется, then показывается error toast", async (): Promise<void> => {
        const user = userEvent.setup()
        const failingRefreshSource = vi.fn(async (): Promise<never> => {
            throw new Error("Refresh failed")
        })

        mockUseExternalContext.mockReturnValue({
            sourcesQuery: {
                isPending: false,
                error: null,
                data: {
                    sources: [
                        {
                            id: "jira",
                            name: "Jira Context",
                            type: "JIRA",
                            status: "CONNECTED",
                            enabled: true,
                            itemCount: 21,
                            lastSyncedAt: "2026-03-05T08:00:00Z",
                        },
                    ],
                },
            },
            previewQuery: {
                isPending: false,
                error: null,
                data: { sourceId: "jira", items: [], total: 0 },
            },
            updateSource: {
                isPending: false,
                mutateAsync: mockUpdateSource,
            },
            refreshSource: {
                isPending: false,
                mutateAsync: failingRefreshSource,
            },
        })

        renderWithProviders(<SettingsIntegrationsPage />)

        await user.click(screen.getByRole("button", { name: "Refresh" }))

        expect(failingRefreshSource).toHaveBeenCalledWith("jira")
        expect(mockShowToastError).toHaveBeenCalledWith(
            "Unable to queue context source refresh.",
        )
    })

    it("when подключённая интеграция отключается и затем снова подключается, then показываются toast для обоих действий", async (): Promise<void> => {
        const user = userEvent.setup()
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        const slackCard = findCardByProviderName("Slack")

        const disconnectButton = within(slackCard).getByRole("button", {
            name: "Disconnect",
        })
        await user.click(disconnectButton)

        expect(mockShowToastInfo).toHaveBeenCalledWith("Slack connection state updated.")

        const connectButton = within(slackCard).getByRole("button", {
            name: "Connect",
        })
        await user.click(connectButton)

        expect(mockShowToastInfo).toHaveBeenCalledWith("Slack connection state updated.")
    })

    it("when Test connection нажимается на Sentry (connected), then проверяется здоровье", async (): Promise<void> => {
        const user = userEvent.setup()
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        const sentryCard = findCardByProviderName("Sentry")
        const testButton = within(sentryCard).getByRole("button", {
            name: /Test Sentry connection/,
        })
        await user.click(testButton)

        expect(mockShowToastSuccess).toHaveBeenCalledWith("Sentry is healthy.")
    })

    it("when Save configuration для Sentry, then показывается toast подтверждения", async (): Promise<void> => {
        const user = userEvent.setup()
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        const sentryCard = findCardByProviderName("Sentry")
        const saveButton = within(sentryCard).getByRole("button", {
            name: "Save configuration",
        })
        await user.click(saveButton)

        expect(mockShowToastSuccess).toHaveBeenCalledWith("Sentry configuration saved.")
    })

    it("when страница рендерится, then кнопки Disconnect отображаются для подключённых интеграций", (): void => {
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        const disconnectButtons = screen.getAllByRole("button", { name: "Disconnect" })
        expect(disconnectButtons.length).toBe(3)

        const connectButtons = screen.getAllByRole("button", { name: "Connect" })
        expect(connectButtons.length).toBe(1)
    })

    it("when страница рендерится, then субтайтл и описание context sources отображаются корректно", (): void => {
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        expect(
            screen.getByText(
                "Configure Jira, Linear, Sentry and Slack connections for issues, alerts and notifications.",
            ),
        ).not.toBeNull()
        expect(
            screen.getByText(
                "Manage indexed sources and inspect loaded context snippets.",
            ),
        ).not.toBeNull()
    })

    it("when Save configuration для Linear с пустым target, then toast подтверждения показывается", async (): Promise<void> => {
        const user = userEvent.setup()
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        const targetInputs = screen.getAllByLabelText("Target")
        const linearTarget = targetInputs[1] as HTMLInputElement
        await user.clear(linearTarget)

        const linearCard = findCardByProviderName("Linear")
        const saveButton = within(linearCard).getByRole("button", {
            name: "Save configuration",
        })
        await user.click(saveButton)

        expect(mockShowToastSuccess).toHaveBeenCalledWith("Linear configuration saved.")
    })

    it("when Test Slack connection нажимается, then проверяется здоровье Slack", async (): Promise<void> => {
        const user = userEvent.setup()
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        const slackCard = findCardByProviderName("Slack")
        const testButton = within(slackCard).getByRole("button", {
            name: /Test Slack connection/,
        })
        await user.click(testButton)

        expect(mockShowToastSuccess).toHaveBeenCalledWith("Slack is healthy.")
    })

    it("when Save configuration для Slack, then сохраняется конфигурация", async (): Promise<void> => {
        const user = userEvent.setup()
        mockUseExternalContext.mockReturnValue(createDefaultExternalContextMock())

        renderWithProviders(<SettingsIntegrationsPage />)

        const slackCard = findCardByProviderName("Slack")
        const saveButton = within(slackCard).getByRole("button", {
            name: "Save configuration",
        })
        await user.click(saveButton)

        expect(mockShowToastSuccess).toHaveBeenCalledWith("Slack configuration saved.")
    })
})
