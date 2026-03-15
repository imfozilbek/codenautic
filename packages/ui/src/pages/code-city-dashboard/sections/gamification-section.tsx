import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { AchievementsPanel } from "@/components/team-analytics/achievements-panel"
import { SprintSummaryCard } from "@/components/team-analytics/sprint-summary-card"
import { TeamLeaderboard } from "@/components/team-analytics/team-leaderboard"
import { TrendTimelineWidget } from "@/components/predictions/trend-timeline-widget"
import { Card, CardContent, CardHeader } from "@heroui/react"

import type { ICodeCityDashboardState } from "../use-code-city-dashboard-state"

/**
 * Параметры секции геймификации.
 */
export interface IGamificationSectionProps {
    /** Состояние дашборда. */
    readonly state: ICodeCityDashboardState
}

/**
 * Секция геймификации: Achievements, TeamLeaderboard, SprintSummary, TrendTimeline.
 *
 * @param props Конфигурация.
 * @returns Секция геймификации.
 */
export function GamificationSection({ state }: IGamificationSectionProps): ReactElement {
    const { t } = useTranslation(["code-city"])

    return (
        <>
            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:gamification.achievementsPanel")}
                    </p>
                </CardHeader>
                <CardContent>
                    <AchievementsPanel
                        achievements={state.sprintAchievements}
                        activeAchievementId={state.activeAchievementId}
                        onSelectAchievement={(achievement): void => {
                            state.setActiveAchievementId(achievement.id)
                            state.setActivePredictionHotspotId(undefined)
                            state.setActivePredictionFileId(achievement.fileId)
                            state.setHighlightedFileId(achievement.fileId)
                            state.setExploreNavigationFocus({
                                activeFileId: achievement.fileId,
                                chainFileIds: achievement.relatedFileIds,
                                title: `Achievement: ${achievement.title}`,
                            })
                            state.markAreaExplored("controls")
                            state.markAreaExplored("city-3d")
                        }}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:gamification.teamLeaderboard")}
                    </p>
                </CardHeader>
                <CardContent>
                    <TeamLeaderboard
                        activeOwnerId={state.activeTeamLeaderboardOwnerId}
                        entries={state.teamLeaderboardEntries}
                        onSelectEntry={(entry): void => {
                            state.setActiveTeamLeaderboardOwnerId(entry.ownerId)
                            state.setActivePredictionHotspotId(undefined)
                            state.setActivePredictionFileId(entry.primaryFileId)
                            state.setHighlightedFileId(entry.primaryFileId)
                            state.setExploreNavigationFocus({
                                activeFileId: entry.primaryFileId,
                                chainFileIds: entry.fileIds,
                                title: `Leaderboard: ${entry.ownerName}`,
                            })
                            state.markAreaExplored("controls")
                            state.markAreaExplored("city-3d")
                        }}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:gamification.sprintSummaryCard")}
                    </p>
                </CardHeader>
                <CardContent>
                    <SprintSummaryCard
                        activeMetricId={state.activeSprintSummaryMetricId}
                        model={state.sprintSummaryModel}
                        onSelectMetric={(sprintMetric): void => {
                            state.setActiveSprintSummaryMetricId(sprintMetric.id)
                            state.setActivePredictionHotspotId(undefined)
                            state.setActivePredictionFileId(sprintMetric.focusFileId)
                            if (sprintMetric.focusFileId !== undefined) {
                                state.setHighlightedFileId(sprintMetric.focusFileId)
                            }
                            state.setExploreNavigationFocus({
                                activeFileId: sprintMetric.focusFileId,
                                chainFileIds: sprintMetric.focusFileIds,
                                title: `Sprint summary: ${sprintMetric.label}`,
                            })
                            state.markAreaExplored("controls")
                            state.markAreaExplored("city-3d")
                        }}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:gamification.trendTimelineWidget")}
                    </p>
                </CardHeader>
                <CardContent>
                    <TrendTimelineWidget
                        activeEntryId={state.activeTrendTimelineEntryId}
                        entries={state.trendTimelineEntries}
                        onSelectEntry={(entry): void => {
                            state.setActiveTrendTimelineEntryId(entry.id)
                            state.setActivePredictionHotspotId(undefined)
                            state.setActivePredictionFileId(entry.focusFileId)
                            if (entry.focusFileId !== undefined) {
                                state.setHighlightedFileId(entry.focusFileId)
                            }
                            state.setExploreNavigationFocus({
                                activeFileId: entry.focusFileId,
                                chainFileIds: entry.focusFileIds,
                                title: `Trend timeline: ${entry.sprintLabel}`,
                            })
                            state.markAreaExplored("controls")
                            state.markAreaExplored("city-3d")
                        }}
                    />
                </CardContent>
            </Card>
        </>
    )
}
