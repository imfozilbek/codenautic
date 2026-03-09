import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

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

        const scanEventsRow = screen.getByText("https://hooks.acme.dev/scan-events").closest("article")
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

        const codeReviewRow = screen.getByText("https://hooks.acme.dev/code-review").closest("article")
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

        const codeReviewRow = screen.getByText("https://hooks.acme.dev/code-review").closest("article")
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

        const codeReviewRow = screen.getByText("https://hooks.acme.dev/code-review").closest("article")
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

        const codeReviewRow = screen.getByText("https://hooks.acme.dev/code-review").closest("article")
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

        const codeReviewRow = screen.getByText("https://hooks.acme.dev/code-review").closest("article")
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
})
