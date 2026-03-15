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
] as const

describe("repositories list page", (): void => {
    it("находит репозитории по поиску и фильтрует по статусу", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<RepositoriesListPage repositories={repositories} />)

        await user.type(screen.getByLabelText("Search repository"), "api")
        expect(
            await screen.findByRole("link", {
                name: "Open repository overview platform-team/api-gateway",
            }),
        ).not.toBeNull()
        expect(
            screen.queryByRole("link", {
                name: "Open repository overview frontend-team/ui-dashboard",
            }),
        ).toBeNull()

        await user.selectOptions(screen.getByLabelText("Filter by status"), "error")
        expect(screen.queryByRole("link", { name: /platform-team\/api-gateway/u })).toBeNull()
    })

    it("меняет порядок сортировки", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<RepositoriesListPage repositories={repositories} />)
        await user.selectOptions(screen.getByLabelText("Sort"), "lastScanAt")

        expect(
            await screen.findByRole("link", {
                name: "Open repository overview backend-core/payment-worker",
            }),
        ).not.toBeNull()
    })

    it("показывает empty state и CTA для пустого onboarding", (): void => {
        renderWithProviders(<RepositoriesListPage repositories={[]} />)

        expect(screen.getByText("No connected repositories")).not.toBeNull()
        expect(screen.getByRole("link", { name: "Start onboarding" })).not.toBeNull()
        expect(screen.getByRole("link", { name: "Start onboarding" })).toHaveAttribute(
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

        expect(screen.queryAllByText("Scan error").length).toBeGreaterThan(0)
        expect(await screen.findByText("Files analyzed before error: 41 of 112")).not.toBeNull()

        const detailsTrigger = await screen.findByText("Error details")
        await user.click(detailsTrigger)

        expect(
            await screen.findByText("Ошибка на этапе индексации: недоступен пакет react-markdown"),
        ).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Retry scan" }))
        expect(onRetryScan).toHaveBeenCalledWith("backend-core/payment-worker")
    })
})
