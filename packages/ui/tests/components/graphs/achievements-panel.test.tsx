import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    AchievementsPanel,
    type IAchievementPanelEntry,
} from "@/components/graphs/achievements-panel"
import { renderWithProviders } from "../../utils/render"

const MOCK_ACHIEVEMENTS: ReadonlyArray<IAchievementPanelEntry> = [
    {
        id: "ach-1",
        title: "API module cleanup",
        summary: "Removed dead endpoints and reduced complexity",
        improvementPercent: 32,
        badge: "gold",
        fileId: "src/api/routes.ts",
        relatedFileIds: ["src/api/routes.ts", "src/api/middleware.ts"],
    },
    {
        id: "ach-2",
        title: "Cache layer stabilization",
        summary: "Fixed invalidation race conditions",
        improvementPercent: 18,
        badge: "silver",
        fileId: "src/cache/store.ts",
        relatedFileIds: ["src/cache/store.ts"],
    },
    {
        id: "ach-3",
        title: "Logger refactor",
        summary: "Extracted logger to shared module",
        improvementPercent: 10,
        badge: "bronze",
        fileId: "src/logger/index.ts",
        relatedFileIds: ["src/logger/index.ts"],
    },
]

describe("AchievementsPanel", (): void => {
    it("when rendered with achievements, then displays titles and summaries", (): void => {
        renderWithProviders(<AchievementsPanel achievements={MOCK_ACHIEVEMENTS} />)

        expect(screen.getByText("API module cleanup")).not.toBeNull()
        expect(screen.getByText("Cache layer stabilization")).not.toBeNull()
        expect(screen.getByText("Logger refactor")).not.toBeNull()
    })

    it("when achievement has gold badge, then shows Gold badge label", (): void => {
        renderWithProviders(<AchievementsPanel achievements={MOCK_ACHIEVEMENTS} />)

        expect(screen.getByText("Gold badge")).not.toBeNull()
    })

    it("when onSelectAchievement provided and item clicked, then calls callback", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelect = vi.fn()

        renderWithProviders(
            <AchievementsPanel achievements={MOCK_ACHIEVEMENTS} onSelectAchievement={onSelect} />,
        )

        const button = screen.getByRole("button", {
            name: /Inspect sprint achievement API module cleanup/,
        })
        await user.click(button)

        expect(onSelect).toHaveBeenCalledTimes(1)
        expect(onSelect).toHaveBeenCalledWith(MOCK_ACHIEVEMENTS[0])
    })

    it("when activeAchievementId matches, then highlights the active entry", (): void => {
        const { container } = renderWithProviders(
            <AchievementsPanel achievements={MOCK_ACHIEVEMENTS} activeAchievementId="ach-2" />,
        )

        const buttons = container.querySelectorAll("button")
        const secondButton = buttons[1]
        expect(secondButton?.className).toContain("border-primary")
    })

    it("when achievements list is empty, then renders section without items", (): void => {
        renderWithProviders(<AchievementsPanel achievements={[]} />)

        expect(screen.getByText("Achievements panel")).not.toBeNull()
    })

    it("when improvement percent is provided, then displays improvement text", (): void => {
        renderWithProviders(<AchievementsPanel achievements={MOCK_ACHIEVEMENTS} />)

        expect(screen.getByText(/Improvement 32%/)).not.toBeNull()
    })
})
