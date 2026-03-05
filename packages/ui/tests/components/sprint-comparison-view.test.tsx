import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    SprintComparisonView,
    type ISprintComparisonSnapshot,
} from "@/components/graphs/sprint-comparison-view"
import { renderWithProviders } from "../utils/render"

const TEST_SNAPSHOTS: ReadonlyArray<ISprintComparisonSnapshot> = [
    {
        fileId: "src/api/auth.ts",
        id: "sprint-12",
        improvementScore: 18,
        metrics: [
            {
                afterValue: 28,
                beforeValue: 34,
                label: "Complexity",
            },
            {
                afterValue: 71,
                beforeValue: 63,
                label: "Coverage",
            },
        ],
        title: "Sprint 12 vs 11",
    },
    {
        fileId: "src/worker/retry.ts",
        id: "sprint-11",
        improvementScore: 9,
        metrics: [
            {
                afterValue: 32,
                beforeValue: 35,
                label: "Complexity",
            },
        ],
        title: "Sprint 11 vs 10",
    },
]

describe("SprintComparisonView", (): void => {
    it("рендерит snapshots и before/after метрики", (): void => {
        renderWithProviders(<SprintComparisonView snapshots={TEST_SNAPSHOTS} />)

        expect(screen.getByText("Sprint comparison view")).not.toBeNull()
        expect(screen.getByLabelText("Sprint comparison snapshots")).not.toBeNull()
        expect(screen.getByText("Sprint 12 vs 11 · improvement 18%")).not.toBeNull()
        expect(screen.getByLabelText("Sprint comparison metrics")).not.toBeNull()
        expect(screen.getByText("before 34 to after 28")).not.toBeNull()
    })

    it("вызывает onSelectSnapshot при выборе snapshot", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelectSnapshot = vi.fn()
        renderWithProviders(
            <SprintComparisonView onSelectSnapshot={onSelectSnapshot} snapshots={TEST_SNAPSHOTS} />,
        )

        await user.click(
            screen.getByRole("button", {
                name: "Inspect sprint comparison Sprint 11 vs 10",
            }),
        )

        expect(onSelectSnapshot).toHaveBeenCalledTimes(1)
        expect(onSelectSnapshot).toHaveBeenCalledWith(
            expect.objectContaining({
                fileId: "src/worker/retry.ts",
                id: "sprint-11",
            }),
        )
    })
})
