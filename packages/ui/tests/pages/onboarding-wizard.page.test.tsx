import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { OnboardingWizardPage } from "@/pages/onboarding-wizard.page"
import { renderWithProviders } from "../utils/render"

describe("OnboardingWizardPage", (): void => {
    it("не пускает на следующий шаг без корректного URL репозитория", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<OnboardingWizardPage />)

        const repositoryInput = screen.getByRole("textbox", { name: "URL репозитория" })
        const nextButton = screen.getByRole("button", { name: "Далее" })

        await user.type(repositoryInput, "bad-url")
        await user.click(nextButton)

        expect(screen.queryByText("Введите корректный URL репозитория")).not.toBeNull()
        expect(screen.queryByText("Настроить сканирование")).toBeNull()
    })

    it("валидирует второй шаг и проводит пользователя к обзору перед запуском", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<OnboardingWizardPage />)

        const repositoryInput = screen.getByRole("textbox", { name: "URL репозитория" })
        await user.type(repositoryInput, "https://github.com/example/repository")
        await user.click(screen.getByRole("button", { name: "Далее" }))

        const workersInput = screen.getByRole("spinbutton", { name: "Количество воркеров" })
        await user.clear(workersInput)
        await user.type(workersInput, "0")
        await user.click(screen.getByRole("button", { name: "Далее" }))

        expect(screen.queryByText("Количество воркеров должно быть не меньше 1")).not.toBeNull()

        await user.clear(workersInput)
        await user.type(workersInput, "8")
        await user.click(screen.getByRole("button", { name: "Далее" }))

        expect(screen.queryByText("Проверьте выбранные настройки:")).not.toBeNull()
    })

    it("запускает сканирование с выбранными параметрами", async (): Promise<void> => {
        const user = userEvent.setup()
        const onScanStart = vi.fn()

        renderWithProviders(
            <OnboardingWizardPage
                onScanStart={onScanStart}
            />,
        )

        await user.type(
            screen.getByRole("textbox", { name: "URL репозитория" }),
            "https://github.com/example/repository",
        )
        await user.click(screen.getByRole("button", { name: "Далее" }))
        await user.click(screen.getByRole("button", { name: "Далее" }))
        await user.click(screen.getByRole("button", { name: "Запустить сканирование" }))

        expect(onScanStart).toHaveBeenCalledTimes(1)
        expect(onScanStart.mock.calls.at(0)?.at(0)).toMatchObject({
            repositoryUrl: "https://github.com/example/repository",
            scanMode: "incremental",
            scanSchedule: "manual",
            scanThreads: 4,
            includeSubmodules: true,
            includeHistory: false,
            notifyEmail: "",
        })
    })
})

