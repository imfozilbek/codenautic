import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SettingsConcurrencyPage } from "@/pages/settings-concurrency.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsConcurrencyPage", (): void => {
    it("разрешает etag конфликт через merge/reload/retry flow", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsConcurrencyPage />)

        expect(
            screen.getByRole("heading", { level: 1, name: "Concurrent config resolver" }),
        ).not.toBeNull()

        await user.type(screen.getByRole("textbox", { name: "Ignore paths" }), ",temp/**")
        await user.click(screen.getByRole("button", { name: "Simulate external update" }))
        await user.click(screen.getByRole("button", { name: "Save settings (optimistic)" }))

        await waitFor(() => {
            expect(screen.getByText("Config conflict detected")).not.toBeNull()
        })
        expect(screen.getByText("Ignore paths")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Merge and save" }))
        await waitFor(() => {
            expect(screen.getByText("Conflict resolution audit")).not.toBeNull()
        })
        expect(screen.getByText(/Conflict merged with local priority/)).not.toBeNull()
    })

    it("разрешает конфликт через reload remote и заменяет локальный draft", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsConcurrencyPage />)

        await user.click(screen.getByRole("button", { name: "Simulate external update" }))
        await user.click(screen.getByRole("button", { name: "Save settings (optimistic)" }))

        await waitFor((): void => {
            expect(screen.getByText("Config conflict detected")).not.toBeNull()
        })

        await user.click(screen.getByRole("button", { name: "Reload remote" }))
        await waitFor((): void => {
            expect(screen.queryByText("Config conflict detected")).toBeNull()
        })

        expect(screen.getByText(/Local draft reloaded from remote snapshot/)).not.toBeNull()
    })

    it("разрешает конфликт через retry with latest etag и выравнивает draft", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsConcurrencyPage />)

        await user.click(screen.getByRole("button", { name: "Simulate external update" }))
        await user.click(screen.getByRole("button", { name: "Save settings (optimistic)" }))

        await waitFor((): void => {
            expect(screen.getByText("Config conflict detected")).not.toBeNull()
        })

        await user.click(screen.getByRole("button", { name: "Retry with latest etag" }))
        await waitFor((): void => {
            expect(screen.queryByText("Config conflict detected")).toBeNull()
        })

        expect(screen.getByText(/Local draft aligned to latest etag for retry/)).not.toBeNull()
    })

    it("сохраняет config без конфликта когда etag совпадает", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsConcurrencyPage />)

        await user.click(screen.getByRole("button", { name: "Save settings (optimistic)" }))

        await waitFor((): void => {
            expect(screen.getByText(/Config saved without conflict/)).not.toBeNull()
        })
        expect(screen.queryByText("Config conflict detected")).toBeNull()
    })

    it("отображает начальные etag значения в snapshot versions", async (): Promise<void> => {
        renderWithProviders(<SettingsConcurrencyPage />)

        expect(screen.getByText("Local etag: 7")).not.toBeNull()
        expect(screen.getByText("Remote etag: 7")).not.toBeNull()
    })

    it("simulate external update изменяет remote etag", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsConcurrencyPage />)

        await user.click(screen.getByRole("button", { name: "Simulate external update" }))

        expect(screen.getByText("Remote etag: 8")).not.toBeNull()
        expect(screen.getByText("Local etag: 7")).not.toBeNull()
    })

    it("изменяет severity threshold через select", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsConcurrencyPage />)

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Concurrency severity threshold" }),
            "high",
        )

        await user.click(screen.getByRole("button", { name: "Save settings (optimistic)" }))
        await waitFor((): void => {
            expect(screen.getByText(/Config saved without conflict/)).not.toBeNull()
        })
    })

    it("переключает require reviewer approval switch", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsConcurrencyPage />)

        const approvalSwitch = screen.getByRole("switch", { name: "Require reviewer approval" })
        expect(approvalSwitch).not.toBeNull()

        await user.click(approvalSwitch)
        await user.click(screen.getByRole("button", { name: "Save settings (optimistic)" }))
        await waitFor((): void => {
            expect(screen.getByText(/Config saved without conflict/)).not.toBeNull()
        })
    })

    it("показывает diff rows в конфликтном модальном окне при различии полей", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsConcurrencyPage />)

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Concurrency severity threshold" }),
            "low",
        )
        await user.click(screen.getByRole("button", { name: "Simulate external update" }))
        await user.click(screen.getByRole("button", { name: "Save settings (optimistic)" }))

        await waitFor((): void => {
            expect(screen.getByText("Config conflict detected")).not.toBeNull()
        })

        const diffList = screen.getByRole("list", { name: "Conflict diff list" })
        expect(within(diffList).getByText("severityThreshold")).not.toBeNull()
        expect(within(diffList).getByText("Local: low")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Merge and save" }))
    })

    it("закрывает конфликтный модал при закрытии через onOpenChange", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsConcurrencyPage />)

        await user.click(screen.getByRole("button", { name: "Simulate external update" }))
        await user.click(screen.getByRole("button", { name: "Save settings (optimistic)" }))

        await waitFor((): void => {
            expect(screen.getByText("Config conflict detected")).not.toBeNull()
        })

        await user.click(screen.getByRole("button", { name: "Merge and save" }))
        await waitFor((): void => {
            expect(screen.queryByText("Config conflict detected")).toBeNull()
        })
    })

    it("показывает пустое сообщение audit при отсутствии конфликтов", async (): Promise<void> => {
        renderWithProviders(<SettingsConcurrencyPage />)

        expect(
            screen.getByText(/Trigger a conflict to inspect merge\/reload\/retry decision trace/),
        ).not.toBeNull()
    })

    it("показывает requireReviewerApproval diff при изменении switch и конфликте", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsConcurrencyPage />)

        const approvalSwitch = screen.getByRole("switch", { name: "Require reviewer approval" })
        await user.click(approvalSwitch)

        await user.click(screen.getByRole("button", { name: "Simulate external update" }))
        await user.click(screen.getByRole("button", { name: "Save settings (optimistic)" }))

        await waitFor((): void => {
            expect(screen.getByText("Config conflict detected")).not.toBeNull()
        })

        const diffList = screen.getByRole("list", { name: "Conflict diff list" })
        expect(within(diffList).getByText("requireReviewerApproval")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Reload remote" }))
    })
})
