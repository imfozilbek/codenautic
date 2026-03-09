import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { OnboardingWizardPage } from "@/pages/onboarding-wizard"
import { renderWithProviders } from "../utils/render"

async function moveToRepositoryStep(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await user.click(screen.getByRole("button", { name: "Connect provider" }))
    await user.click(screen.getByRole("button", { name: "Далее" }))
}

describe("OnboardingWizardPage", (): void => {
    it("не пускает на следующий шаг без корректного URL репозитория", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<OnboardingWizardPage />)
        await moveToRepositoryStep(user)

        const repositoryInput = screen.getByRole("textbox", { name: "URL репозитория" })
        const nextButton = screen.getByRole("button", { name: "Далее" })

        await user.type(repositoryInput, "bad-url")
        await user.click(nextButton)

        expect(screen.queryByText("Введите корректный URL репозитория")).not.toBeNull()
        expect(screen.queryByRole("button", { name: "Запустить сканирование" })).toBeNull()
    })

    it("валидирует второй шаг и проводит пользователя к обзору перед запуском", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<OnboardingWizardPage />)
        await moveToRepositoryStep(user)

        const repositoryInput = screen.getByRole("textbox", { name: "URL репозитория" })
        await user.type(repositoryInput, "https://github.com/example/repository")
        await user.click(screen.getByRole("button", { name: "Далее" }))
        expect(screen.queryByText("Проверьте выбранные настройки:")).not.toBeNull()

        const workersInput = screen.getByRole("spinbutton", { name: "Количество воркеров" })
        await user.clear(workersInput)
        await user.type(workersInput, "0")
        await user.click(screen.getByRole("button", { name: "Запустить сканирование" }))

        expect(screen.queryByText(/Количество воркеров/u)).not.toBeNull()

        await user.clear(workersInput)
        await user.type(workersInput, "8")
        await user.click(screen.getByRole("button", { name: "Запустить сканирование" }))
    })

    it("запускает сканирование с выбранными параметрами", async (): Promise<void> => {
        const user = userEvent.setup()
        const onScanStart = vi.fn()

        renderWithProviders(<OnboardingWizardPage onScanStart={onScanStart} />)
        await moveToRepositoryStep(user)

        await user.type(
            screen.getByRole("textbox", { name: "URL репозитория" }),
            "https://github.com/example/repository",
        )
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

    it("валидирует список репозиториев в bulk-режиме и показывает ошибки по строкам", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<OnboardingWizardPage />)
        await moveToRepositoryStep(user)

        await user.click(screen.getByRole("radio", { name: "Массовый onboarding (bulk)" }))
        await user.type(
            screen.getByRole("textbox", {
                name: "Список репозиториев (по одной ссылке на строку)",
            }),
            "https://github.com/org/first\ninvalid-url",
        )
        await user.click(screen.getByRole("button", { name: "Далее" }))

        expect(screen.queryByText("Некорректные ссылки: 2: invalid-url")).not.toBeNull()
        expect(screen.queryByText(/Выбрано/u)).not.toBeNull()
    })

    it("запускает bulk onboarding по общему шаблону и показывает ошибочный репозиторий", async (): Promise<void> => {
        const user = userEvent.setup()
        const onScanStart = vi.fn()

        renderWithProviders(<OnboardingWizardPage onScanStart={onScanStart} />)
        await moveToRepositoryStep(user)

        await user.click(screen.getByRole("radio", { name: "Массовый onboarding (bulk)" }))
        await user.type(
            screen.getByRole("textbox", {
                name: "Список репозиториев (по одной ссылке на строку)",
            }),
            "https://github.com/org/first\nhttps://github.com/org/second",
        )
        await user.click(screen.getByRole("button", { name: "Далее" }))
        await user.click(screen.getByRole("button", { name: "Запустить сканирование" }))

        expect(onScanStart).toHaveBeenCalledTimes(1)
        expect(onScanStart.mock.calls.at(0)?.at(0)).toMatchObject({
            onboardingMode: "bulk",
            scanMode: "incremental",
            scanSchedule: "manual",
            scanThreads: 4,
            includeSubmodules: true,
            includeHistory: false,
            notifyEmail: "",
            targetRepositories: ["https://github.com/org/first", "https://github.com/org/second"],
        })
        expect(screen.queryByText("Прогресс массового сканирования")).not.toBeNull()
        expect(
            screen.queryByText("Сканирование прервано: ошибка доступа к репозиторию"),
        ).not.toBeNull()
    })

    it("показывает предпросмотр шаблона и применяет его в single режиме", async (): Promise<void> => {
        const user = userEvent.setup()
        const onScanStart = vi.fn()

        renderWithProviders(<OnboardingWizardPage onScanStart={onScanStart} />)
        await moveToRepositoryStep(user)

        await user.type(
            screen.getByRole("textbox", { name: "URL репозитория" }),
            "https://github.com/example/repository",
        )
        await user.click(screen.getByRole("button", { name: "Далее" }))

        await user.click(await screen.findByRole("radio", { name: "Security Baseline — v1.2.0" }))
        expect(screen.queryByText("Что будет применено")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Применить шаблон" }))
        expect(screen.queryAllByText(/Mode:/u).length).toBeGreaterThan(0)
        await user.click(screen.getByRole("button", { name: "Запустить сканирование" }))

        expect(onScanStart).toHaveBeenCalledTimes(1)
        expect(onScanStart.mock.calls.at(0)?.at(0)).toMatchObject({
            onboardingTemplateId: "security-baseline",
            appliedTemplate: {
                id: "security-baseline",
                name: "Security Baseline",
                rulesPreset: "security-first",
                version: "v1.2.0",
            },
            scanMode: "full",
            scanSchedule: "daily",
            scanThreads: 8,
            includeSubmodules: true,
            includeHistory: true,
            notifyEmail: "security-ops@example.com",
            tags: "security, policy, sensitive",
        })
    })

    it("поддерживает rollback после применения шаблона", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<OnboardingWizardPage />)
        await moveToRepositoryStep(user)

        await user.type(
            screen.getByRole("textbox", { name: "URL репозитория" }),
            "https://github.com/example/repository",
        )
        await user.click(screen.getByRole("button", { name: "Далее" }))

        const workersInput = screen.getByRole("spinbutton", { name: "Количество воркеров" })
        await user.clear(workersInput)
        await user.type(workersInput, "2")

        await user.click(await screen.findByRole("radio", { name: "Quality Scan — v1.0.1" }))
        await user.click(screen.getByRole("button", { name: "Применить шаблон" }))
        expect(
            screen.getByRole<HTMLInputElement>("spinbutton", {
                name: "Количество воркеров",
            }).value,
        ).toBe("6")

        await user.click(screen.getByText("Применённые шаблоны (audit log)"))
        await user.click(screen.getByRole("button", { name: "Откатить последнее применение" }))
        expect(screen.queryByText("Применённые шаблоны (audit log)")).not.toBeNull()
    })

    it("навигация назад возвращает на предыдущий шаг", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<OnboardingWizardPage />)
        await moveToRepositoryStep(user)

        expect(screen.queryByText("URL репозитория")).not.toBeNull()

        const backButton = screen.getByRole("button", { name: "Назад" })
        await user.click(backButton)

        expect(screen.queryByText("Git-провайдер")).not.toBeNull()
        expect(screen.queryByText("URL репозитория")).toBeNull()
    })

    it("кнопка 'Назад' заблокирована на первом шаге", async (): Promise<void> => {
        renderWithProviders(<OnboardingWizardPage />)

        const backButton = screen.getByRole("button", { name: "Назад" })
        expect(backButton).toHaveAttribute("disabled")
    })

    it("показывает индикатор шагов и позволяет вернуться на пройденный шаг", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<OnboardingWizardPage />)
        await moveToRepositoryStep(user)

        await user.type(
            screen.getByRole("textbox", { name: "URL репозитория" }),
            "https://github.com/example/repository",
        )
        await user.click(screen.getByRole("button", { name: "Далее" }))

        expect(screen.queryByText("Проверьте выбранные настройки:")).not.toBeNull()

        const stepOneButton = screen.getByRole("button", { name: /Шаг 1/u })
        await user.click(stepOneButton)

        expect(screen.queryByText("Git-провайдер")).not.toBeNull()
        expect(screen.queryByText("Проверьте выбранные настройки:")).toBeNull()
    })

    it("финальный шаг отображает кнопку 'Запустить сканирование' вместо 'Далее'", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<OnboardingWizardPage />)
        await moveToRepositoryStep(user)

        await user.type(
            screen.getByRole("textbox", { name: "URL репозитория" }),
            "https://github.com/example/repository",
        )
        await user.click(screen.getByRole("button", { name: "Далее" }))

        expect(screen.queryByRole("button", { name: "Далее" })).toBeNull()
        expect(
            screen.queryByRole("button", { name: "Запустить сканирование" }),
        ).not.toBeNull()
    })

    it("не пускает на следующий шаг без подключения провайдера", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<OnboardingWizardPage />)

        await user.click(screen.getByRole("button", { name: "Далее" }))

        expect(screen.queryByText("Сначала подключите Git-провайдера.")).not.toBeNull()
        expect(screen.queryByText("URL репозитория")).toBeNull()
    })

    it("показывает пустое состояние в bulk-режиме при отсутствии URL", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<OnboardingWizardPage />)
        await moveToRepositoryStep(user)

        await user.click(screen.getByRole("radio", { name: "Массовый onboarding (bulk)" }))

        expect(
            screen.queryByText("Добавьте URL репозиториев в поле выше."),
        ).not.toBeNull()
    })

    it("поддерживает выбор/снятие всех репозиториев в bulk-режиме", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<OnboardingWizardPage />)
        await moveToRepositoryStep(user)

        await user.click(screen.getByRole("radio", { name: "Массовый onboarding (bulk)" }))
        await user.type(
            screen.getByRole("textbox", {
                name: "Список репозиториев (по одной ссылке на строку)",
            }),
            "https://github.com/org/repo-a\nhttps://github.com/org/repo-b",
        )

        expect(screen.queryByText(/Выбрано/u)).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Снять все" }))
        expect(screen.queryByText(/Выбрано/u)).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Выбрать все" }))
        expect(screen.queryByText(/Выбрано/u)).not.toBeNull()
    })

    it("поддерживает паузу и возобновление bulk-задач", async (): Promise<void> => {
        const user = userEvent.setup()
        const onScanStart = vi.fn()

        renderWithProviders(<OnboardingWizardPage onScanStart={onScanStart} />)
        await moveToRepositoryStep(user)

        await user.click(screen.getByRole("radio", { name: "Массовый onboarding (bulk)" }))
        await user.type(
            screen.getByRole("textbox", {
                name: "Список репозиториев (по одной ссылке на строку)",
            }),
            "https://github.com/org/first\nhttps://github.com/org/second\nhttps://github.com/org/third",
        )
        await user.click(screen.getByRole("button", { name: "Далее" }))
        await user.click(screen.getByRole("button", { name: "Запустить сканирование" }))

        expect(screen.queryByText("Прогресс массового сканирования")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Пауза" }))
        expect(screen.queryAllByText("Пауза").length).toBeGreaterThan(0)

        await user.click(screen.getByRole("button", { name: "Возобновить" }))
        expect(screen.queryAllByText("В процессе").length).toBeGreaterThan(0)
    })

    it("поддерживает отмену всех bulk-задач", async (): Promise<void> => {
        const user = userEvent.setup()
        const onScanStart = vi.fn()

        renderWithProviders(<OnboardingWizardPage onScanStart={onScanStart} />)
        await moveToRepositoryStep(user)

        await user.click(screen.getByRole("radio", { name: "Массовый onboarding (bulk)" }))
        await user.type(
            screen.getByRole("textbox", {
                name: "Список репозиториев (по одной ссылке на строку)",
            }),
            "https://github.com/org/first\nhttps://github.com/org/second\nhttps://github.com/org/third",
        )
        await user.click(screen.getByRole("button", { name: "Далее" }))
        await user.click(screen.getByRole("button", { name: "Запустить сканирование" }))

        await user.click(screen.getByRole("button", { name: "Отменить все" }))
        expect(screen.queryAllByText("Отменено").length).toBeGreaterThan(0)
    })

    it("позволяет retry ошибочной bulk-задачи", async (): Promise<void> => {
        const user = userEvent.setup()
        const onScanStart = vi.fn()

        renderWithProviders(<OnboardingWizardPage onScanStart={onScanStart} />)
        await moveToRepositoryStep(user)

        await user.click(screen.getByRole("radio", { name: "Массовый onboarding (bulk)" }))
        await user.type(
            screen.getByRole("textbox", {
                name: "Список репозиториев (по одной ссылке на строку)",
            }),
            "https://github.com/org/first\nhttps://github.com/org/second",
        )
        await user.click(screen.getByRole("button", { name: "Далее" }))
        await user.click(screen.getByRole("button", { name: "Запустить сканирование" }))

        expect(screen.queryByRole("button", { name: "Retry" })).not.toBeNull()
        await user.click(screen.getByRole("button", { name: "Retry" }))

        expect(screen.queryByText("Сканирование прервано: ошибка доступа к репозиторию")).toBeNull()
    })

    it("позволяет отменить отдельную running bulk-задачу", async (): Promise<void> => {
        const user = userEvent.setup()
        const onScanStart = vi.fn()

        renderWithProviders(<OnboardingWizardPage onScanStart={onScanStart} />)
        await moveToRepositoryStep(user)

        await user.click(screen.getByRole("radio", { name: "Массовый onboarding (bulk)" }))
        await user.type(
            screen.getByRole("textbox", {
                name: "Список репозиториев (по одной ссылке на строку)",
            }),
            "https://github.com/org/first\nhttps://github.com/org/second\nhttps://github.com/org/third",
        )
        await user.click(screen.getByRole("button", { name: "Далее" }))
        await user.click(screen.getByRole("button", { name: "Запустить сканирование" }))

        const cancelButtons = screen.queryAllByRole("button", { name: "Отменить" })
        expect(cancelButtons.length).toBeGreaterThan(0)

        await user.click(cancelButtons[0] as HTMLElement)
        expect(screen.queryAllByText("Отменено").length).toBeGreaterThan(0)
    })

    it("не пускает в bulk-режиме без выбора ни одного репозитория", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<OnboardingWizardPage />)
        await moveToRepositoryStep(user)

        await user.click(screen.getByRole("radio", { name: "Массовый onboarding (bulk)" }))
        await user.type(
            screen.getByRole("textbox", {
                name: "Список репозиториев (по одной ссылке на строку)",
            }),
            "https://github.com/org/repo-a",
        )
        await user.click(screen.getByRole("button", { name: "Снять все" }))
        await user.click(screen.getByRole("button", { name: "Далее" }))

        expect(
            screen.queryByText("Выберите хотя бы один репозиторий для запуска."),
        ).not.toBeNull()
    })
})
