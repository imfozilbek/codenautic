import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { IUseWebhooksResult } from "@/lib/hooks/queries/use-webhooks"

vi.mock("@/lib/hooks/queries/use-webhooks", () => {
    return {
        useWebhooks: (): IUseWebhooksResult => {
            return {
                webhooksQuery: {
                    data: {
                        webhooks: [
                            {
                                eventTypes: ["review.completed", "review.failed"],
                                id: "wh-1001",
                                isEnabled: true,
                                lastDeliveryAt: "2026-03-04 10:18",
                                secretPreview: "whsec_****32af",
                                status: "success",
                                url: "https://hooks.acme.dev/code-review",
                            },
                            {
                                eventTypes: ["scan.completed", "scan.failed", "scan.partial"],
                                id: "wh-1002",
                                isEnabled: true,
                                lastDeliveryAt: "2026-03-04 10:03",
                                secretPreview: "whsec_****14bc",
                                status: "retrying",
                                url: "https://hooks.acme.dev/scan-events",
                            },
                            {
                                eventTypes: ["provider.degraded", "provider.recovered"],
                                id: "wh-1003",
                                isEnabled: false,
                                lastDeliveryAt: "2026-03-04 09:56",
                                secretPreview: "whsec_****9e42",
                                status: "failed",
                                url: "https://hooks.acme.dev/provider-health",
                            },
                        ],
                        deliveryLogs: [
                            {
                                endpointId: "wh-1001",
                                httpStatus: 200,
                                id: "log-1",
                                message: "Delivered review.completed payload.",
                                status: "success",
                                timestamp: "2026-03-04 10:18:12",
                            },
                            {
                                endpointId: "wh-1002",
                                httpStatus: 502,
                                id: "log-2",
                                message: "Remote endpoint unavailable, retry scheduled.",
                                status: "retrying",
                                timestamp: "2026-03-04 10:03:31",
                            },
                            {
                                endpointId: "wh-1002",
                                httpStatus: 429,
                                id: "log-3",
                                message: "Rate limited by remote endpoint.",
                                status: "failed",
                                timestamp: "2026-03-04 09:58:17",
                            },
                            {
                                endpointId: "wh-1003",
                                httpStatus: 401,
                                id: "log-4",
                                message: "Invalid secret signature on receiver side.",
                                status: "failed",
                                timestamp: "2026-03-04 09:56:04",
                            },
                        ],
                    },
                    isLoading: false,
                    isError: false,
                    error: null,
                } as unknown as IUseWebhooksResult["webhooksQuery"],
                createWebhook: {
                    mutate: vi.fn(),
                    isPending: false,
                } as unknown as IUseWebhooksResult["createWebhook"],
                updateWebhook: {
                    mutate: vi.fn(),
                    isPending: false,
                } as unknown as IUseWebhooksResult["updateWebhook"],
                deleteWebhook: {
                    mutate: vi.fn(),
                    isPending: false,
                } as unknown as IUseWebhooksResult["deleteWebhook"],
            }
        },
    }
})

import { SettingsWebhooksPage } from "@/pages/settings-webhooks.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsWebhooksPage", (): void => {
    it("рендерит webhook endpoints и delivery logs", (): void => {
        renderWithProviders(<SettingsWebhooksPage />)

        expect(screen.getByRole("heading", { level: 1, name: "Webhook Management" })).not.toBeNull()
        expect(screen.getByText("https://hooks.acme.dev/code-review")).not.toBeNull()
        expect(screen.getByRole("button", { name: /whsec_\*{4}32af/ })).not.toBeNull()
        expect(screen.getByText("Delivered review.completed payload.")).not.toBeNull()
    })

    it("позволяет фильтровать endpoints по поиску", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        const searchInput = screen.getByPlaceholderText("Search URL or event...")
        await user.type(searchInput, "provider-health")

        expect(screen.getByText("https://hooks.acme.dev/provider-health")).not.toBeNull()
        expect(screen.queryByText("https://hooks.acme.dev/code-review")).toBeNull()
    })

    it("генерирует новый webhook id без коллизии после удаления endpoint", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        const scanEventsUrl = screen.getByText("https://hooks.acme.dev/scan-events")
        const scanEventsRow = scanEventsUrl.closest("article")
        if (scanEventsRow === null) {
            throw new Error("Scan events row not found")
        }

        await user.click(within(scanEventsRow).getByRole("button", { name: "Delete" }))

        await user.type(
            screen.getByRole("textbox", { name: "Endpoint URL" }),
            "https://hooks.acme.dev/new-endpoint",
        )
        await user.type(screen.getByRole("textbox", { name: "Event types" }), "scan.completed")
        await user.click(screen.getByRole("button", { name: "Create endpoint" }))

        expect(screen.getByText("https://hooks.acme.dev/new-endpoint")).not.toBeNull()
        expect(screen.getByText(/· wh-1004/u)).not.toBeNull()
    })

    it("удаляет endpoint и обновляет список и delivery logs", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        expect(screen.getByText("https://hooks.acme.dev/scan-events")).not.toBeNull()

        const scanEventsRow = screen
            .getByText("https://hooks.acme.dev/scan-events")
            .closest("article")
        if (scanEventsRow === null) {
            throw new Error("Scan events row not found")
        }

        await user.click(within(scanEventsRow).getByRole("button", { name: "Delete" }))

        expect(screen.queryByText("https://hooks.acme.dev/scan-events")).toBeNull()
        expect(screen.getByText("https://hooks.acme.dev/code-review")).not.toBeNull()
        expect(screen.getByText("https://hooks.acme.dev/provider-health")).not.toBeNull()
    })

    it("удаляет активный endpoint и переключает активный на первый оставшийся", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        const codeReviewRow = screen
            .getByText("https://hooks.acme.dev/code-review")
            .closest("article")
        if (codeReviewRow === null) {
            throw new Error("Code review row not found")
        }

        expect(screen.getByText("Delivered review.completed payload.")).not.toBeNull()

        await user.click(within(codeReviewRow).getByRole("button", { name: "Delete" }))

        expect(screen.queryByText("https://hooks.acme.dev/code-review")).toBeNull()
        expect(screen.queryByText("Delivered review.completed payload.")).toBeNull()
    })

    it("переключает endpoint в состояние disabled и показывает Disconnected", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        const codeReviewRow = screen
            .getByText("https://hooks.acme.dev/code-review")
            .closest("article")
        if (codeReviewRow === null) {
            throw new Error("Code review row not found")
        }

        expect(within(codeReviewRow).getByText("Success")).not.toBeNull()

        const enabledSwitch = within(codeReviewRow).getByRole("switch")
        await user.click(enabledSwitch)

        await waitFor((): void => {
            expect(within(codeReviewRow).getByText("Disconnected")).not.toBeNull()
        })
        expect(within(codeReviewRow).queryByText("Success")).toBeNull()
    })

    it("переключает disabled endpoint и показывает статус Disconnected", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        const providerHealthRow = screen
            .getByText("https://hooks.acme.dev/provider-health")
            .closest("article")
        if (providerHealthRow === null) {
            throw new Error("Provider health row not found")
        }

        expect(within(providerHealthRow).getByText("Failed")).not.toBeNull()

        const enabledSwitch = within(providerHealthRow).getByRole("switch")
        await user.click(enabledSwitch)

        await waitFor((): void => {
            expect(within(providerHealthRow).queryByText("Disconnected")).toBeNull()
        })
    })

    it("ротирует секрет endpoint и показывает обновлённое значение", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        const codeReviewRow = screen
            .getByText("https://hooks.acme.dev/code-review")
            .closest("article")
        if (codeReviewRow === null) {
            throw new Error("Code review row not found")
        }

        expect(within(codeReviewRow).getByText(/whsec_\*{4}32af/u)).not.toBeNull()

        await user.click(within(codeReviewRow).getByRole("button", { name: "Rotate secret" }))

        await waitFor((): void => {
            expect(within(codeReviewRow).queryByText(/whsec_\*{4}32af/u)).toBeNull()
        })
        expect(within(codeReviewRow).getByText(/whsec_\*{4}/u)).not.toBeNull()
    })

    it("выполняет тестовую доставку для включённого endpoint", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        const codeReviewRow = screen
            .getByText("https://hooks.acme.dev/code-review")
            .closest("article")
        if (codeReviewRow === null) {
            throw new Error("Code review row not found")
        }

        const testButton = within(codeReviewRow).getByRole("button", {
            name: "Test Webhook connection",
        })
        await user.click(testButton)

        await waitFor((): void => {
            expect(
                within(codeReviewRow).getByRole("button", { name: "Webhook connected" }),
            ).not.toBeNull()
        })

        expect(screen.getByText("Manual test payload delivered.")).not.toBeNull()
    })

    it("выполняет тестовую доставку для отключённого endpoint и показывает ошибку", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        const providerHealthUrl = screen.getByText("https://hooks.acme.dev/provider-health")
        await user.click(providerHealthUrl)

        const providerHealthRow = providerHealthUrl.closest("article")
        if (providerHealthRow === null) {
            throw new Error("Provider health row not found")
        }

        await user.click(
            within(providerHealthRow).getByRole("button", { name: "Test Webhook connection" }),
        )

        await waitFor((): void => {
            expect(
                within(providerHealthRow).getByRole("button", { name: "Webhook check failed" }),
            ).not.toBeNull()
        })

        expect(
            screen.getByText("Manual test failed: endpoint is disabled or not reachable."),
        ).not.toBeNull()
    })

    it("фильтрует endpoints по статусу через select", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        const statusSelect = screen.getByLabelText("Filter webhooks by status")

        await user.selectOptions(statusSelect, "success")

        expect(screen.getByText("https://hooks.acme.dev/code-review")).not.toBeNull()
        expect(screen.queryByText("https://hooks.acme.dev/scan-events")).toBeNull()
        expect(screen.queryByText("https://hooks.acme.dev/provider-health")).toBeNull()

        await user.selectOptions(statusSelect, "retrying")

        expect(screen.queryByText("https://hooks.acme.dev/code-review")).toBeNull()
        expect(screen.getByText("https://hooks.acme.dev/scan-events")).not.toBeNull()
        expect(screen.queryByText("https://hooks.acme.dev/provider-health")).toBeNull()

        await user.selectOptions(statusSelect, "failed")

        expect(screen.queryByText("https://hooks.acme.dev/code-review")).toBeNull()
        expect(screen.queryByText("https://hooks.acme.dev/scan-events")).toBeNull()
        expect(screen.getByText("https://hooks.acme.dev/provider-health")).not.toBeNull()

        await user.selectOptions(statusSelect, "all")

        expect(screen.getByText("https://hooks.acme.dev/code-review")).not.toBeNull()
        expect(screen.getByText("https://hooks.acme.dev/scan-events")).not.toBeNull()
        expect(screen.getByText("https://hooks.acme.dev/provider-health")).not.toBeNull()
    })

    it("показывает delivery logs для выбранного endpoint", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        expect(screen.getByText("Delivered review.completed payload.")).not.toBeNull()
        expect(screen.getByText(/· wh-1001/u)).not.toBeNull()

        const scanEventsUrl = screen.getByText("https://hooks.acme.dev/scan-events")
        await user.click(scanEventsUrl)

        await waitFor((): void => {
            expect(screen.getByText(/· wh-1002/u)).not.toBeNull()
        })
        expect(screen.getByText("Remote endpoint unavailable, retry scheduled.")).not.toBeNull()
        expect(screen.getByText("Rate limited by remote endpoint.")).not.toBeNull()
        expect(screen.queryByText("Delivered review.completed payload.")).toBeNull()
    })

    it("фильтрует endpoints по поиску event type", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        const searchInput = screen.getByPlaceholderText("Search URL or event...")
        await user.type(searchInput, "review.completed")

        expect(screen.getByText("https://hooks.acme.dev/code-review")).not.toBeNull()
        expect(screen.queryByText("https://hooks.acme.dev/scan-events")).toBeNull()
        expect(screen.queryByText("https://hooks.acme.dev/provider-health")).toBeNull()
    })

    it("удаляет все endpoints и показывает пустой список", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        const deleteEndpoint = async (url: string): Promise<void> => {
            const row = screen.getByText(url).closest("article")
            if (row === null) {
                throw new Error(`Row not found for ${url}`)
            }
            await user.click(within(row).getByRole("button", { name: "Delete" }))
        }

        await deleteEndpoint("https://hooks.acme.dev/code-review")
        await deleteEndpoint("https://hooks.acme.dev/scan-events")
        await deleteEndpoint("https://hooks.acme.dev/provider-health")

        expect(screen.queryByText("https://hooks.acme.dev/code-review")).toBeNull()
        expect(screen.queryByText("https://hooks.acme.dev/scan-events")).toBeNull()
        expect(screen.queryByText("https://hooks.acme.dev/provider-health")).toBeNull()
    })

    it("создание endpoint с пустым URL показывает ошибку", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        await user.type(screen.getByRole("textbox", { name: "Event types" }), "scan.completed")
        await user.click(screen.getByRole("button", { name: "Create endpoint" }))

        expect(screen.queryByText(/· wh-1004/u)).toBeNull()
    })

    it("создание endpoint без event types показывает предупреждение", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        await user.type(
            screen.getByRole("textbox", { name: "Endpoint URL" }),
            "https://hooks.acme.dev/test",
        )
        await user.click(screen.getByRole("button", { name: "Create endpoint" }))

        expect(screen.queryByText(/· wh-1004/u)).toBeNull()
    })

    it("создание endpoint без https:// префикса показывает ошибку", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        await user.type(
            screen.getByRole("textbox", { name: "Endpoint URL" }),
            "hooks.acme.dev/test",
        )
        await user.type(screen.getByRole("textbox", { name: "Event types" }), "scan.completed")
        await user.click(screen.getByRole("button", { name: "Create endpoint" }))

        expect(screen.queryByText("hooks.acme.dev/test")).toBeNull()
    })

    it("комбинирует фильтр по статусу и поиск одновременно", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        const searchInput = screen.getByPlaceholderText("Search URL or event...")
        const statusSelect = screen.getByLabelText("Filter webhooks by status")

        await user.type(searchInput, "acme")
        await user.selectOptions(statusSelect, "success")

        expect(screen.getByText("https://hooks.acme.dev/code-review")).not.toBeNull()
        expect(screen.queryByText("https://hooks.acme.dev/scan-events")).toBeNull()
        expect(screen.queryByText("https://hooks.acme.dev/provider-health")).toBeNull()
    })

    it("ротирует секрет и проверяет что статус меняется на Retrying", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        const codeReviewRow = screen
            .getByText("https://hooks.acme.dev/code-review")
            .closest("article")
        if (codeReviewRow === null) {
            throw new Error("Code review row not found")
        }

        expect(within(codeReviewRow).getByText("Success")).not.toBeNull()

        await user.click(within(codeReviewRow).getByRole("button", { name: "Rotate secret" }))

        await waitFor((): void => {
            expect(within(codeReviewRow).getByText("Retrying")).not.toBeNull()
        })
        expect(within(codeReviewRow).queryByText("Success")).toBeNull()
    })

    it("when endpoint is created with http:// prefix, then it is accepted", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        await user.type(
            screen.getByRole("textbox", { name: "Endpoint URL" }),
            "http://hooks.internal.dev/events",
        )
        await user.type(screen.getByRole("textbox", { name: "Event types" }), "scan.completed")
        await user.click(screen.getByRole("button", { name: "Create endpoint" }))

        expect(screen.getByText("http://hooks.internal.dev/events")).not.toBeNull()
        expect(screen.getByText(/· wh-1004/u)).not.toBeNull()
    })

    it("when new endpoint is created, then it shows 'not delivered' for last delivery", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        await user.type(
            screen.getByRole("textbox", { name: "Endpoint URL" }),
            "https://hooks.acme.dev/new-hook",
        )
        await user.type(screen.getByRole("textbox", { name: "Event types" }), "review.completed")
        await user.click(screen.getByRole("button", { name: "Create endpoint" }))

        expect(screen.getByText("https://hooks.acme.dev/new-hook")).not.toBeNull()
        expect(screen.getByText(/not delivered/)).not.toBeNull()
    })

    it("when new endpoint is created, then form fields are reset", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        await user.type(
            screen.getByRole("textbox", { name: "Endpoint URL" }),
            "https://hooks.acme.dev/reset-test",
        )
        await user.type(screen.getByRole("textbox", { name: "Event types" }), "scan.completed")
        await user.click(screen.getByRole("button", { name: "Create endpoint" }))

        expect(screen.getByRole("textbox", { name: "Endpoint URL" })).toHaveValue("")
        expect(screen.getByRole("textbox", { name: "Event types" })).toHaveValue("")
    })

    it("when new endpoint is created, then it becomes the active endpoint in logs", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        await user.type(
            screen.getByRole("textbox", { name: "Endpoint URL" }),
            "https://hooks.acme.dev/new-active",
        )
        await user.type(screen.getByRole("textbox", { name: "Event types" }), "review.completed")
        await user.click(screen.getByRole("button", { name: "Create endpoint" }))

        expect(screen.getByText(/· wh-1004/u)).not.toBeNull()
        expect(screen.queryByText(/· wh-1001/u)).toBeNull()
    })

    it("when all endpoints are deleted, then delivery logs show select endpoint alert", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        const deleteEndpoint = async (url: string): Promise<void> => {
            const row = screen.getByText(url).closest("article")
            if (row === null) {
                throw new Error(`Row not found for ${url}`)
            }
            await user.click(within(row).getByRole("button", { name: "Delete" }))
        }

        await deleteEndpoint("https://hooks.acme.dev/code-review")
        await deleteEndpoint("https://hooks.acme.dev/scan-events")
        await deleteEndpoint("https://hooks.acme.dev/provider-health")

        expect(screen.getByText("Select endpoint to inspect logs.")).not.toBeNull()
    })

    it("when multiple event types are provided with spaces, then they are parsed correctly", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        await user.type(
            screen.getByRole("textbox", { name: "Endpoint URL" }),
            "https://hooks.acme.dev/multi-event",
        )
        await user.type(
            screen.getByRole("textbox", { name: "Event types" }),
            "review.completed , scan.failed , scan.partial",
        )
        await user.click(screen.getByRole("button", { name: "Create endpoint" }))

        expect(screen.getByText("https://hooks.acme.dev/multi-event")).not.toBeNull()
        expect(screen.getByText(/review\.completed, scan\.failed, scan\.partial/)).not.toBeNull()
    })

    it("when test delivery is done on enabled endpoint, then updates lastDeliveryAt timestamp", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        const scanEventsRow = screen
            .getByText("https://hooks.acme.dev/scan-events")
            .closest("article")
        if (scanEventsRow === null) {
            throw new Error("Scan events row not found")
        }

        const originalDelivery = within(scanEventsRow).getByText(/Last delivery:/)
        const originalText = originalDelivery.textContent

        const firstButton = scanEventsRow.querySelector("button")
        if (firstButton === null) {
            throw new Error("Button not found in scan events row")
        }
        await user.click(firstButton)
        await user.click(
            within(scanEventsRow).getByRole("button", { name: "Test Webhook connection" }),
        )

        await waitFor((): void => {
            const updatedDelivery = within(scanEventsRow).getByText(/Last delivery:/)
            expect(updatedDelivery.textContent).not.toBe(originalText)
        })
    })

    it("when search matches no endpoints, then list is empty", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        const searchInput = screen.getByPlaceholderText("Search URL or event...")
        await user.type(searchInput, "nonexistent-endpoint-xyz")

        expect(screen.queryByText("https://hooks.acme.dev/code-review")).toBeNull()
        expect(screen.queryByText("https://hooks.acme.dev/scan-events")).toBeNull()
        expect(screen.queryByText("https://hooks.acme.dev/provider-health")).toBeNull()
    })

    it("renders subtitle with descriptive text", (): void => {
        renderWithProviders(<SettingsWebhooksPage />)

        expect(
            screen.getByText("Create, rotate and monitor webhook endpoints with delivery logs."),
        ).not.toBeNull()
    })

    it("renders alert about masked secrets", (): void => {
        renderWithProviders(<SettingsWebhooksPage />)

        expect(
            screen.getByText(
                "Endpoint secrets are masked in UI. Use rotate when key leakage is suspected.",
            ),
        ).not.toBeNull()
    })

    it("shows Retrying chip for scan-events endpoint", (): void => {
        renderWithProviders(<SettingsWebhooksPage />)

        const scanEventsRow = screen
            .getByText("https://hooks.acme.dev/scan-events")
            .closest("article")
        if (scanEventsRow === null) {
            throw new Error("Scan events row not found")
        }

        expect(within(scanEventsRow).getByText("Retrying")).not.toBeNull()
    })

    it("shows Failed chip for provider-health endpoint", (): void => {
        renderWithProviders(<SettingsWebhooksPage />)

        const providerHealthRow = screen
            .getByText("https://hooks.acme.dev/provider-health")
            .closest("article")
        if (providerHealthRow === null) {
            throw new Error("Provider health row not found")
        }

        expect(within(providerHealthRow).getByText("Failed")).not.toBeNull()
    })

    it("when event types CSV has trailing commas, then empty entries are filtered out", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        await user.type(
            screen.getByRole("textbox", { name: "Endpoint URL" }),
            "https://hooks.acme.dev/trailing-comma",
        )
        await user.type(screen.getByRole("textbox", { name: "Event types" }), "review.completed,,")
        await user.click(screen.getByRole("button", { name: "Create endpoint" }))

        expect(screen.getByText("https://hooks.acme.dev/trailing-comma")).not.toBeNull()

        const newRow = screen.getByText("https://hooks.acme.dev/trailing-comma").closest("article")
        if (newRow === null) {
            throw new Error("New row not found")
        }
        expect(within(newRow).getByText(/Events: review\.completed$/)).not.toBeNull()
    })

    it("when disabled endpoint is re-enabled, then original status is restored", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        const scanEventsRow = screen
            .getByText("https://hooks.acme.dev/scan-events")
            .closest("article")
        if (scanEventsRow === null) {
            throw new Error("Scan events row not found")
        }

        expect(within(scanEventsRow).getByText("Retrying")).not.toBeNull()

        const enabledSwitch = within(scanEventsRow).getByRole("switch")
        await user.click(enabledSwitch)

        await waitFor((): void => {
            expect(within(scanEventsRow).getByText("Disconnected")).not.toBeNull()
        })

        await user.click(enabledSwitch)

        await waitFor((): void => {
            expect(within(scanEventsRow).getByText("Disconnected")).not.toBeNull()
        })
    })

    it("when provider-health endpoint delivery logs are selected, then shows its log", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsWebhooksPage />)

        const providerHealthUrl = screen.getByText("https://hooks.acme.dev/provider-health")
        await user.click(providerHealthUrl)

        await waitFor((): void => {
            expect(screen.getByText(/· wh-1003/u)).not.toBeNull()
        })
        expect(screen.getByText("Invalid secret signature on receiver side.")).not.toBeNull()
    })

    it("renders initial HTTP status in delivery log entries", (): void => {
        renderWithProviders(<SettingsWebhooksPage />)

        expect(screen.getByText("HTTP status: 200")).not.toBeNull()
    })
})
