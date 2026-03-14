import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import {
    AlertConfigDialog,
    type IAlertConfigDialogValue,
} from "@/components/graphs/alert-config-dialog"
import { CityPredictionOverlay } from "@/components/graphs/city-prediction-overlay"
import { PredictionAccuracyWidget } from "@/components/graphs/prediction-accuracy-widget"
import { PredictionDashboard } from "@/components/graphs/prediction-dashboard"
import { PredictionExplainPanel } from "@/components/graphs/prediction-explain-panel"
import { TrendForecastChart } from "@/components/graphs/trend-forecast-chart"
import { Card, CardContent, CardHeader } from "@heroui/react"

import type { ICodeCityDashboardState } from "../use-code-city-dashboard-state"

/**
 * Параметры секции предсказаний.
 */
export interface IPredictionSectionProps {
    /** Состояние дашборда. */
    readonly state: ICodeCityDashboardState
}

/**
 * Секция предсказаний: Overlay, Dashboard, Explain, Forecast, Accuracy, AlertConfig.
 *
 * @param props Конфигурация.
 * @returns Секция предсказаний.
 */
export function PredictionSection({ state }: IPredictionSectionProps): ReactElement {
    const { t } = useTranslation(["code-city"])

    return (
        <>
            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:prediction.predictionOverlay")}
                    </p>
                </CardHeader>
                <CardContent>
                    <CityPredictionOverlay
                        activeFileId={state.activePredictionFileId}
                        entries={state.predictionOverlayEntries}
                        onSelectEntry={(entry): void => {
                            state.setActivePredictionFileId(entry.fileId)
                            state.setActivePredictionHotspotId(undefined)
                            state.setHighlightedFileId(entry.fileId)
                            state.setExploreNavigationFocus({
                                activeFileId: entry.fileId,
                                chainFileIds: [entry.fileId],
                                title: `Prediction overlay: ${entry.label}`,
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
                        {t("code-city:prediction.predictionDashboard")}
                    </p>
                </CardHeader>
                <CardContent>
                    <PredictionDashboard
                        activeHotspotId={state.activePredictionHotspotId}
                        bugProneFiles={state.predictionBugProneFiles}
                        hotspots={state.predictionDashboardHotspots}
                        onSelectHotspot={(entry): void => {
                            state.setActivePredictionHotspotId(entry.id)
                            state.setActivePredictionFileId(entry.fileId)
                            state.setHighlightedFileId(entry.fileId)
                            state.setExploreNavigationFocus({
                                activeFileId: entry.fileId,
                                chainFileIds: [entry.fileId],
                                title: `Prediction dashboard: ${entry.label}`,
                            })
                            state.markAreaExplored("controls")
                            state.markAreaExplored("city-3d")
                        }}
                        qualityTrendPoints={state.predictionQualityTrendPoints}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:prediction.predictionExplainPanel")}
                    </p>
                </CardHeader>
                <CardContent>
                    <PredictionExplainPanel
                        activeFileId={state.activePredictionFileId}
                        entries={state.predictionExplainEntries}
                        onSelectEntry={(entry): void => {
                            state.setActivePredictionHotspotId(undefined)
                            state.setActivePredictionFileId(entry.fileId)
                            state.setHighlightedFileId(entry.fileId)
                            state.setExploreNavigationFocus({
                                activeFileId: entry.fileId,
                                chainFileIds: [entry.fileId],
                                title: `Prediction explanation: ${entry.label}`,
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
                        {t("code-city:prediction.trendForecastChart")}
                    </p>
                </CardHeader>
                <CardContent>
                    <TrendForecastChart
                        activePointId={state.activeTrendForecastPointId}
                        onSelectPoint={(point): void => {
                            state.setActiveTrendForecastPointId(point.id)
                            state.setActivePredictionHotspotId(undefined)
                            state.setActivePredictionFileId(point.fileId)
                            if (point.fileId !== undefined) {
                                state.setHighlightedFileId(point.fileId)
                            }
                            state.setExploreNavigationFocus({
                                activeFileId: point.fileId,
                                chainFileIds: point.fileId === undefined ? [] : [point.fileId],
                                title: `Trend forecast: ${point.timestamp}`,
                            })
                            state.markAreaExplored("controls")
                            state.markAreaExplored("city-3d")
                        }}
                        points={state.trendForecastPoints}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:prediction.predictionAccuracyWidget")}
                    </p>
                </CardHeader>
                <CardContent>
                    <PredictionAccuracyWidget
                        activeCaseId={state.activePredictionAccuracyCaseId}
                        cases={state.predictionAccuracyCases}
                        matrix={state.predictionConfusionMatrix}
                        onSelectCase={(entry): void => {
                            state.setActivePredictionAccuracyCaseId(entry.id)
                            state.setActivePredictionHotspotId(undefined)
                            state.setActivePredictionFileId(entry.fileId)
                            state.setHighlightedFileId(entry.fileId)
                            state.setExploreNavigationFocus({
                                activeFileId: entry.fileId,
                                chainFileIds: [entry.fileId],
                                title: `Prediction accuracy: ${entry.label}`,
                            })
                            state.markAreaExplored("controls")
                            state.markAreaExplored("city-3d")
                        }}
                        points={state.predictionAccuracyPoints}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:prediction.alertConfigDialog")}
                    </p>
                </CardHeader>
                <CardContent>
                    <AlertConfigDialog
                        key={`prediction-alert-${state.currentProfile.id}`}
                        modules={state.predictionAlertModules}
                        onSave={(value: IAlertConfigDialogValue): void => {
                            const focusFileId = state.resolvePredictionAlertFocusFileId(
                                value.moduleIds,
                            )
                            state.setActivePredictionHotspotId(undefined)
                            state.setActivePredictionFileId(focusFileId)
                            if (focusFileId !== undefined) {
                                state.setHighlightedFileId(focusFileId)
                            }
                            state.setExploreNavigationFocus({
                                activeFileId: focusFileId,
                                chainFileIds: focusFileId === undefined ? [] : [focusFileId],
                                title: `Alert config: ${value.frequency}`,
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
