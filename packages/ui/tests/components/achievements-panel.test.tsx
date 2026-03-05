import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    AchievementsPanel,
    type IAchievementPanelEntry,
} from "@/components/graphs/achievements-panel"
import { renderWithProviders } from "../utils/render"

const TEST_ACHIEVEMENTS: ReadonlyArray<IAchievementPanelEntry> = [
    {
        badge: "gold",
        fileId: "src/api/auth.ts",
        id: "ach-1",
        improvementPercent: 20,
        relatedFileIds: ["src/api/auth.ts", "src/api/login.ts"],
        summary: "Reduced complexity in module src/api by 20%.",
        title: "Complexity reduction in src/api",
    },
    {
        badge: "silver",
        fileId: "src/worker/retry.ts",
        id: "ach-2",
        improvementPercent: 13,
        relatedFileIds: ["src/worker/retry.ts"],
        summary: "Lowered change churn in retry flow by 13%.",
        title: "Churn stabilization in src/worker",
    },
]

describe("AchievementsPanel", (): void => {
    it("рендерит sprint achievements с badge icons", (): void => {
        renderWithProviders(<AchievementsPanel achievements={TEST_ACHIEVEMENTS} />)

        expect(screen.getByText("Achievements panel")).not.toBeNull()
        expect(screen.getByLabelText("Sprint achievements")).not.toBeNull()
        expect(screen.getByText("Gold badge")).not.toBeNull()
        expect(screen.getByText("Silver badge")).not.toBeNull()
        expect(screen.getByText("Improvement 20%")).not.toBeNull()
    })

    it("вызывает onSelectAchievement при выборе достижения", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelectAchievement = vi.fn()
        renderWithProviders(
            <AchievementsPanel
                achievements={TEST_ACHIEVEMENTS}
                onSelectAchievement={onSelectAchievement}
            />,
        )

        await user.click(
            screen.getByRole("button", {
                name: "Inspect sprint achievement Complexity reduction in src/api",
            }),
        )

        expect(onSelectAchievement).toHaveBeenCalledTimes(1)
        expect(onSelectAchievement).toHaveBeenCalledWith(
            expect.objectContaining({
                badge: "gold",
                fileId: "src/api/auth.ts",
                improvementPercent: 20,
            }),
        )
    })
})
