import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { ChangeRiskGauge } from "@/components/graphs/change-risk-gauge"
import { ImpactGraphView } from "@/components/graphs/impact-graph-view"
import { WhatIfPanel } from "@/components/graphs/what-if-panel"
import { Card, CardContent, CardHeader } from "@heroui/react"

import type { ICodeCityDashboardState } from "../use-code-city-dashboard-state"

/**
 * Параметры секции анализа.
 */
export interface IAnalysisSectionProps {
    /** Состояние дашборда. */
    readonly state: ICodeCityDashboardState
}

/**
 * Секция анализа: ChangeRiskGauge, ImpactGraphView, WhatIfPanel.
 *
 * @param props Конфигурация.
 * @returns Секция анализа.
 */
export function AnalysisSection({ state }: IAnalysisSectionProps): ReactElement {
    const { t } = useTranslation(["code-city"])

    return (
        <>
            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:analysis.changeRiskGauge")}
                    </p>
                </CardHeader>
                <CardContent>
                    <ChangeRiskGauge
                        currentScore={state.changeRiskGaugeModel.currentScore}
                        historicalPoints={state.changeRiskGaugeModel.historicalPoints}
                        onSelectHistoricalPoint={(point): void => {
                            const primaryImpactSeed = state.impactAnalysisSeeds[0]
                            const activeFileId =
                                primaryImpactSeed === undefined
                                    ? undefined
                                    : primaryImpactSeed.fileId
                            if (activeFileId !== undefined) {
                                state.setHighlightedFileId(activeFileId)
                            }
                            state.setExploreNavigationFocus({
                                activeFileId,
                                chainFileIds: activeFileId === undefined ? [] : [activeFileId],
                                title: `Risk gauge: ${point.label}`,
                            })
                            state.markAreaExplored("city-3d")
                        }}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:analysis.impactGraphView")}
                    </p>
                </CardHeader>
                <CardContent>
                    <ImpactGraphView
                        edges={state.impactGraphModel.edges}
                        nodes={state.impactGraphModel.nodes}
                        onFocusNode={(node): void => {
                            state.setHighlightedFileId(node.id)
                            state.setExploreNavigationFocus({
                                activeFileId: node.id,
                                chainFileIds: [node.id],
                                title: `Impact graph: ${node.label}`,
                            })
                            state.markAreaExplored("city-3d")
                        }}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:analysis.whatIfPanel")}
                    </p>
                </CardHeader>
                <CardContent>
                    <WhatIfPanel
                        onRunScenario={(selection): void => {
                            const primaryFileId = selection.fileIds[0]
                            if (primaryFileId !== undefined) {
                                state.setHighlightedFileId(primaryFileId)
                            }
                            state.setExploreNavigationFocus({
                                activeFileId: primaryFileId,
                                chainFileIds: selection.fileIds,
                                title: `What-if: ${String(selection.fileIds.length)} files`,
                            })
                            state.markAreaExplored("city-3d")
                        }}
                        options={state.whatIfOptions}
                    />
                </CardContent>
            </Card>
        </>
    )
}
