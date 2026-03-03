import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { RepositoryOverviewPage } from "@/pages/repository-overview.page"
import { renderWithProviders } from "../utils/render"

describe("repository overview page", (): void => {
    it("рендерит ключевые метрики и архитектурный summary для известного репозитория", (): void => {
        renderWithProviders(<RepositoryOverviewPage repositoryId="frontend-team/ui-dashboard" />)

        expect(screen.getByText("frontend-team/ui-dashboard")).not.toBeNull()
        expect(screen.getByText("Tech stack")).not.toBeNull()
        expect(screen.getByText("Architecture summary")).not.toBeNull()
        expect(screen.getByLabelText("Repository health score")).not.toBeNull()
    })

    it("показывает fallback для неизвестного репозитория", (): void => {
        renderWithProviders(<RepositoryOverviewPage repositoryId="unknown/repo" />)

        expect(
            screen.getByText("Скан-результат репозитория не найден"),
        ).not.toBeNull()
        expect(screen.getByText("unknown/repo")).not.toBeNull()
        expect(screen.getByRole("link", { name: "К списку репозиториев" })).not.toBeNull()
    })

    it("открывает диалог расписания и сохраняет cron", async (): Promise<void> => {
        const onRescanScheduleChange = vi.fn()
        const user = userEvent.setup()

        renderWithProviders(
            <RepositoryOverviewPage
                onRescanScheduleChange={onRescanScheduleChange}
                repositoryId="frontend-team/ui-dashboard"
            />,
        )

        await user.click(screen.getByRole("button", { name: "Настроить расписание рескана" }))
        await user.selectOptions(
            screen.getByRole("combobox", { name: "Режим расписания рескана" }),
            "daily",
        )
        await user.selectOptions(screen.getByRole("combobox", { name: "Минута" }), "30")
        await user.selectOptions(screen.getByRole("combobox", { name: "Час" }), "3")
        await user.click(screen.getByRole("button", { name: "Сохранить расписание" }))

        expect(onRescanScheduleChange).toHaveBeenCalledWith({
            cronExpression: "30 3 * * *",
            mode: "daily",
            repositoryId: "frontend-team/ui-dashboard",
        })
    })
})
