import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    SprintSummaryCard,
    type ISprintSummaryCardModel,
} from "@/components/graphs/sprint-summary-card"
import { renderWithProviders } from "../utils/render"

const TEST_MODEL: ISprintSummaryCardModel = {
    achievementsCount: 4,
    metrics: [
        {
            deltaPercent: 12,
            focusFileId: "src/api/auth.ts",
            focusFileIds: ["src/api/auth.ts", "src/api/login.ts"],
            id: "complexity",
            label: "Complexity",
            value: "Avg complexity 13.4",
        },
        {
            deltaPercent: 8,
            focusFileId: "src/worker/retry.ts",
            focusFileIds: ["src/worker/retry.ts"],
            id: "churn",
            label: "Churn",
            value: "Churn incidents 17",
        },
    ],
    overallImprovementScore: 79,
    sprintLabel: "Sprint 12 summary",
}

describe("SprintSummaryCard", (): void => {
    it("рендерит key metrics, achievements count и overall score", (): void => {
        renderWithProviders(<SprintSummaryCard model={TEST_MODEL} />)

        expect(screen.getByText("Sprint summary card")).not.toBeNull()
        expect(screen.getByText("Sprint 12 summary")).not.toBeNull()
        expect(screen.getByText("Achievements")).not.toBeNull()
        expect(screen.getByText("4")).not.toBeNull()
        expect(screen.getByText("Overall score")).not.toBeNull()
        expect(screen.getByText("79")).not.toBeNull()
        expect(screen.getByLabelText("Sprint summary metrics")).not.toBeNull()
        expect(screen.getByText("+12%")).not.toBeNull()
    })

    it("вызывает onSelectMetric при выборе метрики", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelectMetric = vi.fn()
        renderWithProviders(
            <SprintSummaryCard model={TEST_MODEL} onSelectMetric={onSelectMetric} />,
        )

        await user.click(
            screen.getByRole("button", { name: "Inspect sprint summary metric Complexity" }),
        )

        expect(onSelectMetric).toHaveBeenCalledTimes(1)
        expect(onSelectMetric).toHaveBeenCalledWith(
            expect.objectContaining({
                focusFileId: "src/api/auth.ts",
                id: "complexity",
            }),
        )
    })

    it("when metric has negative delta, then renders without plus prefix", (): void => {
        const negModel: ISprintSummaryCardModel = {
            ...TEST_MODEL,
            metrics: [
                {
                    deltaPercent: -5,
                    focusFileIds: [],
                    id: "bugs",
                    label: "Bugs",
                    value: "Bug count 3",
                },
            ],
        }

        renderWithProviders(<SprintSummaryCard model={negModel} />)

        expect(screen.getByText("-5%")).toBeDefined()
    })

    it("when metric has zero delta, then renders 0%", (): void => {
        const zeroModel: ISprintSummaryCardModel = {
            ...TEST_MODEL,
            metrics: [
                {
                    deltaPercent: 0,
                    focusFileIds: [],
                    id: "stable",
                    label: "Stable",
                    value: "No change",
                },
            ],
        }

        renderWithProviders(<SprintSummaryCard model={zeroModel} />)

        expect(screen.getByText("0%")).toBeDefined()
    })

    it("when activeMetricId matches, then applies active style", (): void => {
        renderWithProviders(<SprintSummaryCard activeMetricId="complexity" model={TEST_MODEL} />)

        const button = screen.getByRole("button", {
            name: "Inspect sprint summary metric Complexity",
        })
        expect(button.className).toContain("border-primary")
    })
})
