import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { ExploreModeSidebar } from "@/components/codecity/explore-mode-sidebar"
import { HotAreaHighlights } from "@/components/codecity/hot-area-highlights"
import { OnboardingProgressTracker } from "@/components/codecity/onboarding-progress-tracker"
import { ProjectOverviewPanel } from "@/components/codecity/project-overview-panel"
import { Card, CardContent, CardHeader } from "@heroui/react"

import type { ICodeCityDashboardState } from "../use-code-city-dashboard-state"

/**
 * Параметры секции обзора.
 */
export interface IOverviewSectionProps {
    /** Состояние дашборда. */
    readonly state: ICodeCityDashboardState
}

/**
 * Секция обзора: ProjectOverview, ExploreModeSidebar, HotAreaHighlights, OnboardingTracker.
 *
 * @param props Конфигурация.
 * @returns Секция обзора.
 */
export function OverviewSection({ state }: IOverviewSectionProps): ReactElement {
    const { t } = useTranslation(["code-city"])

    return (
        <>
            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:overview.projectOverviewPanel")}
                    </p>
                </CardHeader>
                <CardContent>
                    <ProjectOverviewPanel
                        files={state.currentProfile.files}
                        repositoryId={state.currentProfile.id}
                        repositoryLabel={state.currentProfile.label}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:overview.exploreModeSidebar")}
                    </p>
                </CardHeader>
                <CardContent>
                    <ExploreModeSidebar
                        onNavigatePath={(path): void => {
                            state.markAreaExplored("explore")
                            state.markAreaExplored("city-3d")
                            state.setExploreNavigationFocus({
                                activeFileId: path.fileChainIds.at(0),
                                chainFileIds: path.fileChainIds,
                                title: path.title,
                            })
                        }}
                        paths={state.exploreModePaths}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:overview.hotAreaHighlights")}
                    </p>
                </CardHeader>
                <CardContent>
                    <HotAreaHighlights
                        highlights={state.hotAreaHighlights}
                        onFocusHotArea={(highlight): void => {
                            state.markAreaExplored("hot-areas")
                            state.markAreaExplored("city-3d")
                            state.setHighlightedFileId(highlight.fileId)
                            state.setExploreNavigationFocus({
                                activeFileId: highlight.fileId,
                                chainFileIds: [highlight.fileId],
                                title: `Hot area: ${highlight.label}`,
                            })
                        }}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:overview.onboardingProgressTracker")}
                    </p>
                </CardHeader>
                <CardContent>
                    <OnboardingProgressTracker modules={state.onboardingProgressModules} />
                </CardContent>
            </Card>
        </>
    )
}
