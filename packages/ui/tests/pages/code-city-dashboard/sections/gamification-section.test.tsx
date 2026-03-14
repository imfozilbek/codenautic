import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { GamificationSection } from "@/pages/code-city-dashboard/sections/gamification-section"
import { renderWithProviders } from "../../../utils/render"
import { createMockCodeCityState } from "./mock-code-city-state"

const { mockAchievementsPanel } = vi.hoisted(() => ({
    mockAchievementsPanel: vi.fn(
        (props: {
            readonly achievements: ReadonlyArray<unknown>
            readonly activeAchievementId?: string
        }): React.JSX.Element => (
            <div>
                <p>achievements:{props.achievements.length}</p>
                <p>active-achievement:{props.activeAchievementId ?? "none"}</p>
            </div>
        ),
    ),
}))
const { mockTeamLeaderboard } = vi.hoisted(() => ({
    mockTeamLeaderboard: vi.fn(
        (props: {
            readonly entries: ReadonlyArray<unknown>
            readonly activeOwnerId?: string
        }): React.JSX.Element => (
            <div>
                <p>leaderboard-entries:{props.entries.length}</p>
                <p>leaderboard-active:{props.activeOwnerId ?? "none"}</p>
            </div>
        ),
    ),
}))
const { mockSprintSummaryCard } = vi.hoisted(() => ({
    mockSprintSummaryCard: vi.fn(
        (props: {
            readonly model: { readonly sprintLabel: string }
            readonly activeMetricId?: string
        }): React.JSX.Element => (
            <div>
                <p>sprint-label:{props.model.sprintLabel}</p>
                <p>sprint-metric:{props.activeMetricId ?? "none"}</p>
            </div>
        ),
    ),
}))
const { mockTrendTimelineWidget } = vi.hoisted(() => ({
    mockTrendTimelineWidget: vi.fn(
        (props: {
            readonly entries: ReadonlyArray<unknown>
            readonly activeEntryId?: string
        }): React.JSX.Element => (
            <div>
                <p>timeline-entries:{props.entries.length}</p>
                <p>timeline-active:{props.activeEntryId ?? "none"}</p>
            </div>
        ),
    ),
}))

vi.mock("@/components/graphs/achievements-panel", () => ({
    AchievementsPanel: mockAchievementsPanel,
}))
vi.mock("@/components/graphs/team-leaderboard", () => ({
    TeamLeaderboard: mockTeamLeaderboard,
}))
vi.mock("@/components/graphs/sprint-summary-card", () => ({
    SprintSummaryCard: mockSprintSummaryCard,
}))
vi.mock("@/components/graphs/trend-timeline-widget", () => ({
    TrendTimelineWidget: mockTrendTimelineWidget,
}))

describe("GamificationSection", (): void => {
    it("when rendered, then shows achievements panel with entries", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<GamificationSection state={state} />)

        expect(screen.getByText("achievements:1")).not.toBeNull()
        expect(screen.getByText("active-achievement:none")).not.toBeNull()
    })

    it("when rendered, then shows team leaderboard and sprint summary", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<GamificationSection state={state} />)

        expect(screen.getByText("leaderboard-entries:1")).not.toBeNull()
        expect(screen.getByText("sprint-label:Sprint 1")).not.toBeNull()
    })

    it("when rendered, then shows trend timeline widget with entries", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<GamificationSection state={state} />)

        expect(screen.getByText("timeline-entries:1")).not.toBeNull()
        expect(screen.getByText("timeline-active:none")).not.toBeNull()
    })
})
