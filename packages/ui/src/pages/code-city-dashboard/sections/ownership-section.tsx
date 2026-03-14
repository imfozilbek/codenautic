import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { BusFactorTrendChart } from "@/components/graphs/bus-factor-trend-chart"
import { CityBusFactorOverlay } from "@/components/graphs/city-bus-factor-overlay"
import { CityOwnershipOverlay } from "@/components/graphs/city-ownership-overlay"
import { ContributorCollaborationGraph } from "@/components/graphs/contributor-collaboration-graph"
import { KnowledgeMapExportWidget } from "@/components/graphs/knowledge-map-export-widget"
import { KnowledgeSiloPanel } from "@/components/graphs/knowledge-silo-panel"
import { OwnershipTransitionWidget } from "@/components/graphs/ownership-transition-widget"
import { Card, CardContent, CardHeader } from "@heroui/react"

import type { ICodeCityDashboardState } from "../use-code-city-dashboard-state"

/**
 * Параметры секции ownership.
 */
export interface IOwnershipSectionProps {
    /** Состояние дашборда. */
    readonly state: ICodeCityDashboardState
}

/**
 * Секция ownership: Overlay, BusFactor, Knowledge, Contributor, Transition.
 *
 * @param props Конфигурация.
 * @returns Секция ownership.
 */
export function OwnershipSection({ state }: IOwnershipSectionProps): ReactElement {
    const { t } = useTranslation(["code-city"])

    return (
        <>
            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:ownership.ownershipOverlay")}
                    </p>
                </CardHeader>
                <CardContent>
                    <CityOwnershipOverlay
                        activeOwnerId={state.activeOwnershipOwnerId}
                        isEnabled={state.isOwnershipOverlayEnabled}
                        onSelectOwner={(owner): void => {
                            state.setOwnershipOverlayEnabled(true)
                            state.setActiveOwnershipOwnerId(owner.ownerId)
                            state.setHighlightedFileId(owner.primaryFileId)
                            state.setExploreNavigationFocus({
                                activeFileId: owner.primaryFileId,
                                chainFileIds: owner.fileIds,
                                title: `Ownership: ${owner.ownerName}`,
                            })
                            state.markAreaExplored("controls")
                            state.markAreaExplored("city-3d")
                        }}
                        onToggleEnabled={(nextEnabled): void => {
                            state.setOwnershipOverlayEnabled(nextEnabled)
                            if (nextEnabled === false) {
                                state.setActiveOwnershipOwnerId(undefined)
                            }
                            state.markAreaExplored("controls")
                        }}
                        owners={state.ownershipOverlayEntries}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:ownership.busFactorOverlay")}
                    </p>
                </CardHeader>
                <CardContent>
                    <CityBusFactorOverlay
                        activeDistrictId={state.activeBusFactorDistrictId}
                        entries={state.busFactorOverlayEntries}
                        onSelectEntry={(entry): void => {
                            state.setActiveBusFactorDistrictId(entry.districtId)
                            state.setHighlightedFileId(entry.primaryFileId)
                            state.setExploreNavigationFocus({
                                activeFileId: entry.primaryFileId,
                                chainFileIds: entry.fileIds,
                                title: `Bus factor: ${entry.districtLabel}`,
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
                        {t("code-city:ownership.busFactorTrendChart")}
                    </p>
                </CardHeader>
                <CardContent>
                    <BusFactorTrendChart
                        activeModuleId={state.activeBusFactorTrendModuleId}
                        onSelectSeries={(series): void => {
                            state.setActiveBusFactorTrendModuleId(series.moduleId)
                            state.setActiveBusFactorDistrictId(series.moduleId)
                            state.setHighlightedFileId(series.primaryFileId)
                            state.setExploreNavigationFocus({
                                activeFileId: series.primaryFileId,
                                chainFileIds: [series.primaryFileId],
                                title: `Bus factor trend: ${series.moduleLabel}`,
                            })
                            state.markAreaExplored("controls")
                            state.markAreaExplored("city-3d")
                        }}
                        series={state.busFactorTrendSeries}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:ownership.knowledgeSiloPanel")}
                    </p>
                </CardHeader>
                <CardContent>
                    <KnowledgeSiloPanel
                        activeSiloId={state.activeKnowledgeSiloId}
                        entries={state.knowledgeSiloEntries}
                        onSelectEntry={(entry): void => {
                            state.setActiveKnowledgeSiloId(entry.siloId)
                            state.setHighlightedFileId(entry.primaryFileId)
                            state.setExploreNavigationFocus({
                                activeFileId: entry.primaryFileId,
                                chainFileIds: entry.fileIds,
                                title: `Knowledge silo: ${entry.siloLabel}`,
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
                        {t("code-city:ownership.knowledgeMapExport")}
                    </p>
                </CardHeader>
                <CardContent>
                    <KnowledgeMapExportWidget
                        model={state.knowledgeMapExportModel}
                        onExport={(format): void => {
                            const primarySiloEntry = state.knowledgeSiloEntries[0]
                            const activeFileId = primarySiloEntry?.primaryFileId
                            if (activeFileId !== undefined) {
                                state.setHighlightedFileId(activeFileId)
                            }
                            state.setExploreNavigationFocus({
                                activeFileId,
                                chainFileIds: primarySiloEntry?.fileIds ?? [],
                                title: `Knowledge map export: ${format.toUpperCase()}`,
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
                        {t("code-city:ownership.contributorCollaborationGraph")}
                    </p>
                </CardHeader>
                <CardContent>
                    <ContributorCollaborationGraph
                        activeContributorId={state.activeContributorId}
                        collaborations={state.contributorGraphEdges}
                        contributors={state.contributorGraphNodes}
                        onSelectContributor={(contributorId): void => {
                            const ownerOverlayEntry = state.ownershipOverlayEntries.find(
                                (entry): boolean => entry.ownerId === contributorId,
                            )
                            const activeFileId = ownerOverlayEntry?.primaryFileId

                            state.setActiveContributorId(contributorId)
                            state.setActiveOwnershipOwnerId(contributorId)
                            state.setOwnershipOverlayEnabled(true)
                            if (activeFileId !== undefined) {
                                state.setHighlightedFileId(activeFileId)
                            }
                            state.setExploreNavigationFocus({
                                activeFileId,
                                chainFileIds: ownerOverlayEntry?.fileIds ?? [],
                                title: `Contributor graph: ${ownerOverlayEntry?.ownerName ?? contributorId}`,
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
                        {t("code-city:ownership.ownershipTransitionWidget")}
                    </p>
                </CardHeader>
                <CardContent>
                    <OwnershipTransitionWidget
                        activeEventId={state.activeOwnershipTransitionId}
                        events={state.ownershipTransitionEvents}
                        onSelectEvent={(event): void => {
                            state.setActiveOwnershipTransitionId(event.id)
                            state.setActiveContributorId(event.toOwnerId)
                            state.setActiveOwnershipOwnerId(event.toOwnerId)
                            state.setOwnershipOverlayEnabled(true)
                            state.setHighlightedFileId(event.fileId)
                            state.setExploreNavigationFocus({
                                activeFileId: event.fileId,
                                chainFileIds: [event.fileId],
                                title: `Ownership transition: ${event.scopeLabel}`,
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
