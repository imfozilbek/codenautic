import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SettingsIntegrationsPage } from "@/pages/settings-integrations.page"
import { renderWithProviders } from "../utils/render"

const { mockUseExternalContext, mockUpdateSource, mockRefreshSource } = vi.hoisted(() => ({
    mockUseExternalContext: vi.fn(),
    mockUpdateSource: vi.fn(async (): Promise<unknown> => ({ source: {} })),
    mockRefreshSource: vi.fn(async (): Promise<unknown> => ({ accepted: true })),
}))

vi.mock("@/lib/hooks/queries/use-external-context", () => ({
    useExternalContext: mockUseExternalContext,
}))

describe("settings integrations page", (): void => {
    it("рендерит external context sources и preview", async (): Promise<void> => {
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
        })

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
})
