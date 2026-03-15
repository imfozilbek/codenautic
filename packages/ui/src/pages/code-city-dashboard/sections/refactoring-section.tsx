import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { CityImpactOverlay } from "@/components/codecity/overlays/city-impact-overlay"
import { CityRefactoringOverlay } from "@/components/codecity/overlays/city-refactoring-overlay"
import { ImpactAnalysisPanel } from "@/components/predictions/impact-analysis-panel"
import { RefactoringDashboard } from "@/components/refactoring/refactoring-dashboard"
import { RefactoringExportDialog } from "@/components/refactoring/refactoring-export-dialog"
import { RefactoringTimeline } from "@/components/refactoring/refactoring-timeline"
import { ROICalculatorWidget } from "@/components/refactoring/roi-calculator-widget"
import { SimulationPanel } from "@/components/predictions/simulation-panel"
import { Card, CardContent, CardHeader } from "@heroui/react"

import type { ICodeCityDashboardState } from "../use-code-city-dashboard-state"

/**
 * Параметры секции рефакторинга.
 */
export interface IRefactoringSectionProps {
    /** Состояние дашборда. */
    readonly state: ICodeCityDashboardState
}

/**
 * Секция рефакторинга: Dashboard, ROI, CityOverlay, Simulation, Timeline, Export, Impact.
 *
 * @param props Конфигурация.
 * @returns Секция рефакторинга.
 */
export function RefactoringSection({ state }: IRefactoringSectionProps): ReactElement {
    const { t } = useTranslation(["code-city"])

    return (
        <>
            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:refactoring.refactoringDashboard")}
                    </p>
                </CardHeader>
                <CardContent>
                    <RefactoringDashboard
                        onSelectTarget={(target): void => {
                            state.setHighlightedFileId(target.fileId)
                            state.setExploreNavigationFocus({
                                activeFileId: target.fileId,
                                chainFileIds: [target.fileId],
                                title: `Refactor target: ${target.title}`,
                            })
                            state.markAreaExplored("city-3d")
                        }}
                        targets={state.refactoringTargets}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:refactoring.roiCalculatorWidget")}
                    </p>
                </CardHeader>
                <CardContent>
                    <ROICalculatorWidget
                        onApplyScenario={(fileIds): void => {
                            const primaryFileId = fileIds[0]
                            if (primaryFileId !== undefined) {
                                state.setHighlightedFileId(primaryFileId)
                            }
                            state.setExploreNavigationFocus({
                                activeFileId: primaryFileId,
                                chainFileIds: fileIds,
                                title: t("code-city:refactoring.roiScenario"),
                            })
                            state.markAreaExplored("city-3d")
                        }}
                        targets={state.refactoringTargets}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:refactoring.cityRefactoringOverlay")}
                    </p>
                </CardHeader>
                <CardContent>
                    <CityRefactoringOverlay
                        entries={state.cityRefactoringOverlayEntries}
                        onSelectEntry={(entry): void => {
                            state.setHighlightedFileId(entry.fileId)
                            state.setExploreNavigationFocus({
                                activeFileId: entry.fileId,
                                chainFileIds: [entry.fileId],
                                title: `Refactor overlay: ${entry.label}`,
                            })
                            state.markAreaExplored("city-3d")
                        }}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:refactoring.simulationPanel")}
                    </p>
                </CardHeader>
                <CardContent>
                    <SimulationPanel
                        onPreviewScenario={(scenario): void => {
                            const primaryFileId = scenario.fileIds[0]
                            if (primaryFileId !== undefined) {
                                state.setHighlightedFileId(primaryFileId)
                            }
                            state.setExploreNavigationFocus({
                                activeFileId: primaryFileId,
                                chainFileIds: scenario.fileIds,
                                title:
                                    scenario.mode === "after"
                                        ? t("code-city:refactoring.simulationAfterRefactoring")
                                        : t("code-city:refactoring.simulationBaseline"),
                            })
                            state.markAreaExplored("city-3d")
                        }}
                        targets={state.refactoringTargets}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:refactoring.refactoringTimeline")}
                    </p>
                </CardHeader>
                <CardContent>
                    <RefactoringTimeline
                        onSelectTask={(task): void => {
                            state.setHighlightedFileId(task.fileId)
                            state.setExploreNavigationFocus({
                                activeFileId: task.fileId,
                                chainFileIds: [task.fileId],
                                title: `Refactoring timeline: ${task.title}`,
                            })
                            state.markAreaExplored("city-3d")
                        }}
                        tasks={state.refactoringTimelineTasks}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:refactoring.refactoringExportDialog")}
                    </p>
                </CardHeader>
                <CardContent>
                    <RefactoringExportDialog
                        onExport={(payload): void => {
                            const primaryFileId = payload.fileIds[0]
                            if (primaryFileId !== undefined) {
                                state.setHighlightedFileId(primaryFileId)
                            }
                            state.setExploreNavigationFocus({
                                activeFileId: primaryFileId,
                                chainFileIds: payload.fileIds,
                                title: `Export plan: ${payload.destination}`,
                            })
                            state.markAreaExplored("city-3d")
                        }}
                        targets={state.refactoringTargets}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:refactoring.impactAnalysisPanel")}
                    </p>
                </CardHeader>
                <CardContent>
                    <ImpactAnalysisPanel
                        onApplyImpact={(selection): void => {
                            state.setHighlightedFileId(selection.fileId)
                            state.setExploreNavigationFocus({
                                activeFileId: selection.fileId,
                                chainFileIds: [
                                    selection.fileId,
                                    ...selection.affectedFiles.filter((fileId): boolean => {
                                        return fileId !== selection.fileId
                                    }),
                                ],
                                title: `Impact analysis: ${selection.label}`,
                            })
                            state.markAreaExplored("city-3d")
                        }}
                        seeds={state.impactAnalysisSeeds}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:refactoring.cityImpactOverlay")}
                    </p>
                </CardHeader>
                <CardContent>
                    <CityImpactOverlay
                        entries={state.cityImpactOverlayEntries}
                        onSelectEntry={(entry): void => {
                            state.setHighlightedFileId(entry.fileId)
                            state.setExploreNavigationFocus({
                                activeFileId: entry.fileId,
                                chainFileIds: [entry.fileId],
                                title: `Impact overlay: ${entry.label}`,
                            })
                            state.markAreaExplored("city-3d")
                        }}
                    />
                </CardContent>
            </Card>
        </>
    )
}
