import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { ChurnComplexityScatter } from "@/components/codecity/churn-complexity-scatter"
import { CodeCity3DScene } from "@/components/codecity/codecity-3d-scene"
import { CodeCityTreemap } from "@/components/codecity/codecity-treemap"
import { HealthTrendChart } from "@/components/codecity/health-trend-chart"
import { PackageDependencyGraph } from "@/components/dependency-graphs/package-dependency-graph"
import { RootCauseChainViewer } from "@/components/codecity/root-cause-chain-viewer"
import { Card, CardContent, CardHeader } from "@heroui/react"

import {
    CODE_CITY_DASHBOARD_REPOSITORY_NODES,
    CODE_CITY_DASHBOARD_REPOSITORY_RELATIONS,
} from "../code-city-dashboard-mock-data"
import type { ICodeCityDashboardState } from "../use-code-city-dashboard-state"

/**
 * Параметры секции визуализации.
 */
export interface IVisualizationSectionProps {
    /** Состояние дашборда. */
    readonly state: ICodeCityDashboardState
}

/**
 * Секция визуализации: PackageDependency, 3D, Scatter, HealthTrend, RootCause, Treemap.
 *
 * @param props Конфигурация.
 * @returns Секция визуализации.
 */
export function VisualizationSection({ state }: IVisualizationSectionProps): ReactElement {
    const { t } = useTranslation(["code-city"])

    return (
        <>
            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:visualization.crossRepositoryDependencies")}
                    </p>
                </CardHeader>
                <CardContent>
                    <PackageDependencyGraph
                        height="360px"
                        nodes={CODE_CITY_DASHBOARD_REPOSITORY_NODES}
                        relations={CODE_CITY_DASHBOARD_REPOSITORY_RELATIONS}
                        showControls={true}
                        showMiniMap={true}
                        title={t("code-city:visualization.crossRepositoryPackageDependencies")}
                    />
                </CardContent>
            </Card>

            <Card className={state.resolveTourCardClassName("city-3d")}>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:visualization.codeCityPreview")}
                    </p>
                </CardHeader>
                <CardContent>
                    <CodeCity3DScene
                        causalCouplings={state.overlayCausalCouplings}
                        files={state.currentProfile.files}
                        navigationActiveFileId={
                            state.overlayMode === "root-cause"
                                ? state.rootCauseChainFocus.activeFileId
                                : state.exploreNavigationFocus.activeFileId
                        }
                        navigationChainFileIds={
                            state.overlayMode === "root-cause"
                                ? state.rootCauseChainFocus.chainFileIds
                                : state.exploreNavigationFocus.chainFileIds
                        }
                        navigationLabel={
                            state.overlayMode === "root-cause"
                                ? state.rootCauseChainFocus.issueTitle
                                : state.exploreNavigationFocus.title
                        }
                        impactedFiles={state.overlayImpactedFiles}
                        title={`${state.currentProfile.label} 3D scene`}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:visualization.churnVsComplexitySidePanel")}
                    </p>
                </CardHeader>
                <CardContent>
                    <ChurnComplexityScatter
                        files={state.currentProfile.files}
                        onFileSelect={state.setHighlightedFileId}
                        selectedFileId={state.highlightedFileId}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:visualization.healthTrendTimeline")}
                    </p>
                </CardHeader>
                <CardContent>
                    <HealthTrendChart points={state.currentProfile.healthTrend} />
                </CardContent>
            </Card>

            <Card className={state.resolveTourCardClassName("root-cause")}>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:visualization.rootCauseChainViewer")}
                    </p>
                </CardHeader>
                <CardContent>
                    <RootCauseChainViewer
                        issues={state.overlayRootCauseIssues}
                        onChainFocusChange={state.handleRootCauseChainFocusChange}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <CodeCityTreemap
                        key={`${state.currentProfile.id}-${state.metric}`}
                        comparisonLabel={`${state.currentProfile.id}-baseline`}
                        compareFiles={state.currentProfile.compareFiles}
                        defaultMetric={state.metric}
                        fileLink={state.fileLink}
                        files={state.currentProfile.files}
                        highlightedFileId={state.highlightedFileId}
                        impactedFiles={state.overlayImpactedFiles}
                        fileColorById={state.ownershipFileColorById}
                        predictedRiskByFileId={state.predictedRiskByFileId}
                        packageColorByName={state.busFactorPackageColorByName}
                        temporalCouplings={state.overlayTemporalCouplings}
                        title={`${state.currentProfile.label} treemap`}
                    />
                </CardContent>
            </Card>
        </>
    )
}
