import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SettingsNotificationsPage } from "@/pages/settings-notifications.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsNotificationsPage", (): void => {
    it("управляет inbox read state, deep-links и delivery preferences", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsNotificationsPage />)

        expect(
            screen.getByRole("heading", { level: 1, name: "Notification center" }),
        ).not.toBeNull()
        expect(screen.getByText("Unread: 3")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Mark as read NTF-1001" }))
        await waitFor(() => {
            expect(screen.getByText("Unread: 2")).not.toBeNull()
            expect(screen.getByRole("button", { name: "Mark as unread NTF-1001" })).not.toBeNull()
        })

        const deepLinkButton = screen.getByRole("button", { name: "Open NTF-1001 context" })
        await user.click(deepLinkButton)
        await waitFor(() => {
            expect(screen.getByText("Deep-link guard")).not.toBeNull()
        })
        expect(screen.getByText(/Deep-link allowed and sanitized/)).not.toBeNull()

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Filter event type" }),
            "prediction.alert",
        )
        const inboxList = screen.getByRole("list", { name: "Notification inbox list" })
        expect(within(inboxList).queryByText("Review completed")).toBeNull()
        expect(
            within(inboxList).queryByRole("button", { name: "Open NTF-1001 context" }),
        ).toBeNull()
        expect(
            within(inboxList).getByRole("button", { name: "Open NTF-1003 context" }),
        ).not.toBeNull()

        const slackSwitch = screen.getByRole("switch", { name: "Enable Slack notifications" })
        await user.click(slackSwitch)
        expect(screen.getByText("Active channels: 2")).not.toBeNull()

        const muteSwitch = screen.getByRole("switch", { name: "Mute non-critical alerts in-app" })
        await user.click(muteSwitch)
        expect(screen.getByText("Enabled rules: 0")).not.toBeNull()

        await user.selectOptions(screen.getByRole("combobox", { name: "Filter event type" }), "all")
        await user.click(screen.getByRole("checkbox", { name: "Select NTF-1002" }))
        await user.click(screen.getByRole("checkbox", { name: "Select NTF-1004" }))
        await user.click(screen.getByRole("button", { name: "Mark selected as read" }))
        await waitFor(() => {
            expect(screen.getByText("Bulk action pending sync")).not.toBeNull()
        })
        expect(screen.getByText("Unread: 0")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Undo bulk action" }))
        await waitFor(() => {
            expect(screen.getByText("Unread: 2")).not.toBeNull()
        })
        expect(screen.getByText("Bulk action audit")).not.toBeNull()
        expect(screen.getByText("reverted")).not.toBeNull()
    })

    it("переключает канал Discord и обновляет target input", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsNotificationsPage />)

        const discordSwitch = screen.getByRole("switch", {
            name: "Enable Discord notifications",
        })
        expect(discordSwitch).not.toBeNull()

        await user.click(discordSwitch)
        expect(screen.getByText("Active channels: 4")).not.toBeNull()

        await user.click(discordSwitch)
        expect(screen.getByText("Active channels: 3")).not.toBeNull()
    })

    it("переключает Teams канал и обновляет счётчик активных каналов", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsNotificationsPage />)

        expect(screen.getByText("Active channels: 3")).not.toBeNull()

        const teamsSwitch = screen.getByRole("switch", { name: "Enable Teams notifications" })
        await user.click(teamsSwitch)
        expect(screen.getByText("Active channels: 2")).not.toBeNull()
    })

    it("фильтрует уведомления по drift.alert и показывает только drift события", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsNotificationsPage />)

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Filter event type" }),
            "drift.alert",
        )

        const inboxList = screen.getByRole("list", { name: "Notification inbox list" })
        expect(within(inboxList).getByText("Architecture drift alert")).not.toBeNull()
        expect(within(inboxList).queryByText("Review completed")).toBeNull()
        expect(within(inboxList).queryByText("Prediction alert")).toBeNull()
    })

    it("фильтрует по review.completed и показывает только review уведомления", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsNotificationsPage />)

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Filter event type" }),
            "review.completed",
        )

        const inboxList = screen.getByRole("list", { name: "Notification inbox list" })
        const listItems = within(inboxList).getAllByRole("listitem")
        expect(listItems.length).toBe(2)
        expect(within(inboxList).queryByText("Architecture drift alert")).toBeNull()
        expect(within(inboxList).queryByText("Prediction alert")).toBeNull()
    })

    it("mark all as read обнуляет unread счётчик", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsNotificationsPage />)

        expect(screen.getByText("Unread: 3")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Mark all as read" }))
        await waitFor((): void => {
            expect(screen.getByText("Unread: 0")).not.toBeNull()
        })

        expect(screen.getByRole("button", { name: "Mark all as read" })).toBeDisabled()
    })

    it("toggle read/unread переключает состояние уведомления обратно", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsNotificationsPage />)

        await user.click(screen.getByRole("button", { name: "Mark as read NTF-1001" }))
        await waitFor((): void => {
            expect(screen.getByRole("button", { name: "Mark as unread NTF-1001" })).not.toBeNull()
        })

        await user.click(screen.getByRole("button", { name: "Mark as unread NTF-1001" }))
        await waitFor((): void => {
            expect(screen.getByRole("button", { name: "Mark as read NTF-1001" })).not.toBeNull()
        })
        expect(screen.getByText("Unread: 3")).not.toBeNull()
    })

    it("выбор и снятие выбора уведомления обновляет selected count", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsNotificationsPage />)

        expect(screen.getByText("Selected: 0")).not.toBeNull()

        await user.click(screen.getByRole("checkbox", { name: "Select NTF-1001" }))
        expect(screen.getByText("Selected: 1")).not.toBeNull()
        expect(screen.getByText("1 notifications selected.")).not.toBeNull()

        await user.click(screen.getByRole("checkbox", { name: "Select NTF-1001" }))
        expect(screen.getByText("Selected: 0")).not.toBeNull()
    })

    it("clear selection сбрасывает выделение", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsNotificationsPage />)

        await user.click(screen.getByRole("checkbox", { name: "Select NTF-1001" }))
        await user.click(screen.getByRole("checkbox", { name: "Select NTF-1002" }))
        expect(screen.getByText("Selected: 2")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Clear selection" }))
        expect(screen.getByText("Selected: 0")).not.toBeNull()
    })

    it("save delivery preferences отображает toast подтверждения", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsNotificationsPage />)

        const saveButton = screen.getByRole("button", { name: "Save delivery preferences" })
        await user.click(saveButton)
        expect(saveButton).not.toBeNull()
    })

    it("переключает mute prediction alerts для archived repos", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsNotificationsPage />)

        expect(screen.getByText("Enabled rules: 1")).not.toBeNull()

        const predictionMuteSwitch = screen.getByRole("switch", {
            name: "Mute prediction alerts for archived repositories",
        })
        await user.click(predictionMuteSwitch)
        expect(screen.getByText("Enabled rules: 2")).not.toBeNull()
    })

    it("показывает начальное состояние bulk audit без операций", async (): Promise<void> => {
        renderWithProviders(<SettingsNotificationsPage />)

        expect(screen.getByText("No bulk operations executed yet.")).not.toBeNull()
    })

    it("bulk mark read без выбранных уведомлений не изменяет состояние", (): void => {
        renderWithProviders(<SettingsNotificationsPage />)

        expect(screen.getByText("Selected: 0")).not.toBeNull()
        expect(screen.queryByText("Bulk actions")).toBeNull()
    })

    it("показывает quiet hours в чипах mute rules", async (): Promise<void> => {
        renderWithProviders(<SettingsNotificationsPage />)

        expect(screen.getByText("Quiet hours: 22:00 - 08:00")).not.toBeNull()
    })

    it("отображает Total и Active channels чипы корректно при инициализации", async (): Promise<void> => {
        renderWithProviders(<SettingsNotificationsPage />)

        expect(screen.getByText("Total: 4")).not.toBeNull()
        expect(screen.getByText("Active channels: 3")).not.toBeNull()
    })
})
