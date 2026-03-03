import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

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
})

