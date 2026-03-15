import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { DistrictTrendIndicators } from "@/components/codecity/district-trend-indicators"
import { PredictionComparisonView } from "@/components/predictions/prediction-comparison-view"
import { SprintComparisonView } from "@/components/team-analytics/sprint-comparison-view"
import { Card, CardContent, CardHeader } from "@heroui/react"

import type { ICodeCityDashboardState } from "../use-code-city-dashboard-state"

/**
 * Параметры секции сравнений.
 */
export interface IComparisonSectionProps {
    /** Состояние дашборда. */
    readonly state: ICodeCityDashboardState
}

/**
 * Секция сравнений: PredictionComparison, SprintComparison, DistrictTrend.
 *
 * @param props Конфигурация.
 * @returns Секция сравнений.
 */
export function ComparisonSection({ state }: IComparisonSectionProps): ReactElement {
    const { t } = useTranslation(["code-city"])

    return (
        <>
            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:comparison.predictionComparisonView")}
                    </p>
                </CardHeader>
                <CardContent>
                    <PredictionComparisonView
                        activeSnapshotId={state.activePredictionComparisonSnapshotId}
                        onSelectSnapshot={(snapshot): void => {
                            state.setActivePredictionComparisonSnapshotId(snapshot.id)
                            state.setActivePredictionHotspotId(undefined)
                            state.setActivePredictionFileId(snapshot.fileId)
                            if (snapshot.fileId !== undefined) {
                                state.setHighlightedFileId(snapshot.fileId)
                            }
                            state.setExploreNavigationFocus({
                                activeFileId: snapshot.fileId,
                                chainFileIds:
                                    snapshot.fileId === undefined ? [] : [snapshot.fileId],
                                title: `Prediction comparison: ${snapshot.periodLabel}`,
                            })
                            state.markAreaExplored("controls")
                            state.markAreaExplored("city-3d")
                        }}
                        snapshots={state.predictionComparisonSnapshots}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:comparison.sprintComparisonView")}
                    </p>
                </CardHeader>
                <CardContent>
                    <SprintComparisonView
                        activeSnapshotId={state.activeSprintComparisonSnapshotId}
                        onSelectSnapshot={(snapshot): void => {
                            state.setActiveSprintComparisonSnapshotId(snapshot.id)
                            state.setActivePredictionHotspotId(undefined)
                            state.setActivePredictionFileId(snapshot.fileId)
                            if (snapshot.fileId !== undefined) {
                                state.setHighlightedFileId(snapshot.fileId)
                            }
                            state.setExploreNavigationFocus({
                                activeFileId: snapshot.fileId,
                                chainFileIds:
                                    snapshot.fileId === undefined ? [] : [snapshot.fileId],
                                title: `Sprint comparison: ${snapshot.title}`,
                            })
                            state.markAreaExplored("controls")
                            state.markAreaExplored("city-3d")
                        }}
                        snapshots={state.sprintComparisonSnapshots}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:comparison.districtTrendIndicators")}
                    </p>
                </CardHeader>
                <CardContent>
                    <DistrictTrendIndicators
                        activeDistrictId={state.activeDistrictTrendId}
                        entries={state.districtTrendIndicators}
                        onSelectEntry={(entry): void => {
                            state.setActiveDistrictTrendId(entry.districtId)
                            state.setActivePredictionHotspotId(undefined)
                            state.setActivePredictionFileId(entry.primaryFileId)
                            state.setHighlightedFileId(entry.primaryFileId)
                            state.setExploreNavigationFocus({
                                activeFileId: entry.primaryFileId,
                                chainFileIds: entry.affectedFileIds,
                                title: `District trend: ${entry.districtLabel}`,
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
