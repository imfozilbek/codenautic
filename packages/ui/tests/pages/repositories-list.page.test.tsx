import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { RepositoriesListPage } from "@/pages/repositories-list.page"
import { renderWithProviders } from "../utils/render"

const repositories = [
    {
        branch: "main",
        issueCount: 2,
        lastScanAt: "2026-01-01T10:40:00Z",
        name: "api-gateway",
        owner: "platform-team",
        status: "ready",
    },
    {
        branch: "main",
        issueCount: 0,
        lastScanAt: "2026-01-01T09:10:00Z",
        name: "ui-dashboard",
        owner: "frontend-team",
        status: "scanning",
    },
    {
        branch: "release",
        issueCount: 3,
        lastScanAt: "2026-01-01T07:50:00Z",
        name: "payment-worker",
        owner: "backend-core",
        status: "error",
    },
]

describe("repositories list page", (): void => {
    it("находит репозитории по поиску и фильтрует по статусу", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<RepositoriesListPage repositories={repositories} />)

        await user.type(screen.getByLabelText("Поиск репозитория"), "api")
        expect(screen.getByText("api-gateway")).not.toBeNull()
        expect(screen.queryByText("ui-dashboard")).toBeNull()

        await user.selectOptions(screen.getByLabelText("Фильтр по статусу"), "error")
        expect(screen.queryByText("api-gateway")).toBeNull()
        expect(screen.getByText("payment-worker")).not.toBeNull()
    })

    it("меняет порядок сортировки", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<RepositoriesListPage repositories={repositories} />)
        await user.selectOptions(screen.getByLabelText("Сортировка"), "lastScanAt")

        expect(screen.getAllByText("payment-worker").length).toBe(1)
    })

    it("показывает empty state и CTA для пустого onboarding", (): void => {
        renderWithProviders(<RepositoriesListPage repositories={[]} />)

        expect(screen.getByText("Нет подключенных репозиториев")).not.toBeNull()
        expect(screen.getByRole("link", { name: "Начать onboarding" })).not.toBeNull()
        expect(screen.getByRole("link", { name: "Начать onboarding" })).toHaveAttribute(
            "href",
            "/onboarding",
        )
    })

    it("показывает детали ошибки сканирования и вызывает retry", async (): Promise<void> => {
        const user = userEvent.setup()
        const onRetryScan = vi.fn()
        renderWithProviders(
            <RepositoriesListPage
                onRetryScan={onRetryScan}
                repositories={[
                    {
                        branch: "release",
                        id: "backend-core/payment-worker",
                        issueCount: 1,
                        lastScanAt: "2026-01-01T07:50:00Z",
                        name: "payment-worker",
                        owner: "backend-core",
                        scanError: {
                            details: [
                                "Ошибка на этапе индексации: недоступен пакет react-markdown",
                                "Попробуйте обновить lockfile и повторить сканирование",
                            ],
                            message: "Сканирование прервалось во время построения AST",
                            partialFilesScanned: 41,
                            totalFiles: 112,
                        },
                        status: "error",
                    },
                ]}
            />,
        )

        expect(screen.getByText("Ошибка сканирования")).not.toBeNull()
        expect(screen.getByText("Проанализировано файлов до ошибки: 41 из 112")).not.toBeNull()

        const detailsTrigger = screen.getByRole("button", {
            name: "Подробнее об ошибке",
        })
        await user.click(detailsTrigger)

        expect(
            screen.getByText("Ошибка на этапе индексации: недоступен пакет react-markdown"),
        ).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Повторить сканирование" }))
        expect(onRetryScan).toHaveBeenCalledWith("backend-core/payment-worker")
    })
})
