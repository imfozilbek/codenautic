import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { GIT_PROVIDER_CONNECTION_STATUS } from "@/lib/api/endpoints/git-providers.endpoint"
import { SettingsGitProvidersPage } from "@/pages/settings-git-providers.page"
import { renderWithProviders } from "../utils/render"

const { mockTestConnection, mockUpdateConnection, mockUseGitProviders } = vi.hoisted(() => ({
    mockTestConnection: vi.fn(async (): Promise<{ readonly ok: boolean }> => ({ ok: true })),
    mockUpdateConnection: vi.fn(async (): Promise<{ readonly ok: boolean }> => ({ ok: true })),
    mockUseGitProviders: vi.fn(),
}))

vi.mock("@/lib/hooks/queries", () => ({
    useGitProviders: mockUseGitProviders,
}))

afterEach((): void => {
    vi.clearAllMocks()
})

describe("SettingsGitProvidersPage", (): void => {
    it("рендерит подключенные git providers и connectivity блок", (): void => {
        mockUseGitProviders.mockReturnValue({
            providersQuery: {
                data: {
                    providers: [
                        {
                            account: "acme-org",
                            connected: true,
                            id: "github",
                            isKeySet: true,
                            lastSyncAt: "2026-03-03 08:00",
                            provider: "GitHub",
                            status: GIT_PROVIDER_CONNECTION_STATUS.connected,
                        },
                        {
                            account: "runtime-team",
                            connected: false,
                            id: "gitlab",
                            isKeySet: false,
                            lastSyncAt: undefined,
                            provider: "GitLab",
                            status: GIT_PROVIDER_CONNECTION_STATUS.disconnected,
                        },
                    ],
                },
            },
            updateConnection: {
                isPending: false,
                mutateAsync: mockUpdateConnection,
                variables: undefined,
            },
            testConnection: {
                mutateAsync: mockTestConnection,
            },
        })

        renderWithProviders(<SettingsGitProvidersPage />)

        expect(screen.getByRole("heading", { level: 1, name: "Git Providers" })).not.toBeNull()
        expect(screen.getByText("Connectivity checks")).not.toBeNull()
        expect(screen.getByText("GitHub")).not.toBeNull()
        expect(screen.getByText("GitLab")).not.toBeNull()
        expect(screen.getByText("At least one token is configured.")).not.toBeNull()
    })

    it("делегирует reconnect действие в updateConnection mutation", async (): Promise<void> => {
        const user = userEvent.setup()
        mockUseGitProviders.mockReturnValue({
            providersQuery: {
                data: {
                    providers: [
                        {
                            account: "acme-org",
                            connected: true,
                            id: "github",
                            isKeySet: true,
                            lastSyncAt: "2026-03-03 08:00",
                            provider: "GitHub",
                            status: GIT_PROVIDER_CONNECTION_STATUS.connected,
                        },
                    ],
                },
            },
            updateConnection: {
                isPending: false,
                mutateAsync: mockUpdateConnection,
                variables: undefined,
            },
            testConnection: {
                mutateAsync: mockTestConnection,
            },
        })

        renderWithProviders(<SettingsGitProvidersPage />)

        await user.click(screen.getByRole("button", { name: "Force reconnect" }))

        expect(mockUpdateConnection).toHaveBeenCalledWith({
            connected: false,
            providerId: "github",
        })
    })
})
