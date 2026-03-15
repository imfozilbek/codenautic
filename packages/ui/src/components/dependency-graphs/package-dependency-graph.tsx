import { type ChangeEvent, type ReactElement, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button, Card, CardContent, CardHeader, Input } from "@heroui/react"
import { XyFlowGraph } from "@/components/dependency-graphs/xyflow-graph"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { exportGraphAsJson } from "@/components/dependency-graphs/graph-export"
import { calculateGraphLayout, type IGraphNode } from "@/components/dependency-graphs/xyflow-graph-layout"

import { CLUSTER_DETAILS_DELAY_MS } from "./package-dependency-graph.constants"
import {
    type IHugeGraphFallbackData,
    type IImpactPathHighlight,
    type IPackageDependencyGraphData,
    type IPackageRelationStats,
    applyFocusPathFilter,
    buildClusteredPackageGraphData,
    buildHugeGraphFallbackData,
    buildLayerClusterMap,
    buildPackageDependencyGraphData,
    calculateImpactPathHighlight,
    calculatePackageRelationStats,
    collectRelationTypes,
    createSummaryText,
    filterByPackageName,
    filterRelationsByType,
    isHugeGraph,
    isPackageLayer,
    parseClusterLayer,
    readLayoutSnapshot,
    toggleExpandedLayer,
    toggleRelationFilter,
    writeLayoutSnapshot,
} from "./package-dependency-graph.utils"

/** Описание пакета/модуля для package graph. */
export interface IPackageDependencyNode {
    /** Уникальный id узла. */
    readonly id: string
    /** Отображаемое имя пакета. */
    readonly name: string
    /** Уровень слоя/группы. */
    readonly layer: "core" | "api" | "ui" | "worker" | "db" | "infra"
    /** Количество файлов/модулей в пакете (визуальный вес). */
    readonly size?: number
}

/** Связь между пакетами. */
export interface IPackageDependencyRelation {
    /** Источник зависимости. */
    readonly source: string
    /** Цель зависимости. */
    readonly target: string
    /** Тип зависимости (runtime/build/peer). */
    readonly relationType?: string
}

export type { IPackageDependencyGraphData } from "./package-dependency-graph.utils"
export { buildPackageDependencyGraphData } from "./package-dependency-graph.utils"

/** Пропсы package graph-компонента. */
export interface IPackageDependencyGraphProps {
    /** Пакеты для визуализации. */
    readonly nodes: ReadonlyArray<IPackageDependencyNode>
    /** Реляции пакетов. */
    readonly relations: ReadonlyArray<IPackageDependencyRelation>
    /** Фиксированная высота блока. */
    readonly height?: string
    /** Заголовок блока. */
    readonly title?: string
    /** Показывать миникарту. */
    readonly showMiniMap?: boolean
    /** Показывать контролы. */
    readonly showControls?: boolean
    /** Текст пустого состояния. */
    readonly emptyStateLabel?: string
}

interface IPackageDependencyGraphState {
    readonly query: string
    readonly selectedRelationTypes: ReadonlyArray<string>
    readonly selectedNodeId?: string
    readonly showImpactPaths: boolean
    readonly viewMode: "detailed" | "clustered"
    readonly lodMode: "overview" | "details"
    readonly expandedLayerIds: ReadonlyArray<IPackageDependencyNode["layer"]>
    readonly focusPathOnly: boolean
    readonly isClusterDetailLoading: boolean
    readonly forceGraphRenderInHugeMode: boolean
}

/**
 * Рендерит module/package dependency graph.
 *
 * @param props Пропсы компонента.
 */
export function PackageDependencyGraph(props: IPackageDependencyGraphProps): ReactElement {
    const initialLayoutSnapshot = readLayoutSnapshot()
    const [state, setState] = useState<IPackageDependencyGraphState>({
        query: "",
        selectedRelationTypes: [],
        selectedNodeId: undefined,
        showImpactPaths: false,
        viewMode: initialLayoutSnapshot?.viewMode ?? "detailed",
        lodMode: initialLayoutSnapshot?.lodMode ?? "overview",
        expandedLayerIds: (initialLayoutSnapshot?.expandedLayerIds ?? []).filter(
            (item): item is IPackageDependencyNode["layer"] => isPackageLayer(item),
        ),
        focusPathOnly: false,
        isClusterDetailLoading: false,
        forceGraphRenderInHugeMode: false,
    })
    const clusterDetailTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(
        undefined,
    )
    const { t } = useTranslation(["code-city"])
    const title = props.title ?? t("code-city:packageDependency.defaultTitle")
    const emptyStateLabel =
        props.emptyStateLabel ?? t("code-city:packageDependency.defaultEmptyState")
    const packageNodesById = useMemo((): ReadonlyMap<string, IPackageDependencyNode> => {
        const nextMap = new Map<string, IPackageDependencyNode>()
        for (const node of props.nodes) {
            nextMap.set(node.id, node)
        }
        return nextMap
    }, [props.nodes])
    const layerClusterMap = useMemo(() => buildLayerClusterMap(props.nodes), [props.nodes])
    const allLayerIds = useMemo((): ReadonlyArray<IPackageDependencyNode["layer"]> => {
        return Array.from(layerClusterMap.keys()).sort((left, right): number =>
            left.localeCompare(right),
        )
    }, [layerClusterMap])
    const relationTypes = useMemo((): ReadonlyArray<string> => {
        return collectRelationTypes(props.relations)
    }, [props.relations])
    const filteredRelations = useMemo(
        (): ReadonlyArray<IPackageDependencyRelation> =>
            filterRelationsByType(props.relations, state.selectedRelationTypes),
        [props.relations, state.selectedRelationTypes],
    )
    const hugeGraphFallbackMode = isHugeGraph(props.nodes.length, filteredRelations.length)
    const hugeGraphFallbackData = useMemo(
        (): IHugeGraphFallbackData => buildHugeGraphFallbackData(props.nodes, filteredRelations),
        [filteredRelations, props.nodes],
    )
    const shouldRenderGraph = hugeGraphFallbackMode !== true || state.forceGraphRenderInHugeMode
    const detailedGraphData = useMemo(
        (): IPackageDependencyGraphData =>
            filterByPackageName(
                buildPackageDependencyGraphData(props.nodes, filteredRelations),
                props.nodes,
                state.query,
            ),
        [filteredRelations, props.nodes, state.query],
    )
    const effectiveExpandedLayerIds = useMemo((): ReadonlyArray<
        IPackageDependencyNode["layer"]
    > => {
        if (state.lodMode === "details") {
            return allLayerIds
        }

        return state.expandedLayerIds.filter((item): boolean => allLayerIds.includes(item))
    }, [allLayerIds, state.expandedLayerIds, state.lodMode])
    const clusteredGraphData = useMemo(
        (): IPackageDependencyGraphData =>
            buildClusteredPackageGraphData(
                props.nodes,
                filteredRelations,
                effectiveExpandedLayerIds,
            ),
        [effectiveExpandedLayerIds, filteredRelations, props.nodes],
    )
    const graphViewMode: "detailed" | "clustered" =
        state.query.trim().length > 0 ? "detailed" : state.viewMode
    const graphDataByViewMode =
        graphViewMode === "clustered" ? clusteredGraphData : detailedGraphData
    const visibleGraphData = useMemo(
        (): IPackageDependencyGraphData =>
            applyFocusPathFilter(graphDataByViewMode, state.selectedNodeId, state.focusPathOnly),
        [graphDataByViewMode, state.focusPathOnly, state.selectedNodeId],
    )
    const layoutedNodes = useMemo((): ReadonlyArray<IGraphNode> => {
        if (shouldRenderGraph !== true) {
            return []
        }

        return calculateGraphLayout(visibleGraphData.nodes, visibleGraphData.edges, {
            direction: "LR",
            nodeSpacingX: 120,
            nodeSpacingY: 90,
            margin: 20,
        })
    }, [shouldRenderGraph, visibleGraphData])

    const summaryText = createSummaryText(
        visibleGraphData.nodes.length,
        visibleGraphData.edges.length,
    )
    const selectedClusterLayer = useMemo((): IPackageDependencyNode["layer"] | undefined => {
        if (state.selectedNodeId === undefined) {
            return undefined
        }

        return parseClusterLayer(state.selectedNodeId)
    }, [state.selectedNodeId])
    const selectedClusterMembers = useMemo(():
        | ReadonlyArray<IPackageDependencyNode>
        | undefined => {
        if (selectedClusterLayer === undefined) {
            return undefined
        }
        return layerClusterMap.get(selectedClusterLayer)
    }, [layerClusterMap, selectedClusterLayer])
    const selectedNode = useMemo((): IPackageDependencyNode | undefined => {
        if (state.selectedNodeId === undefined) {
            return undefined
        }
        return packageNodesById.get(state.selectedNodeId)
    }, [packageNodesById, state.selectedNodeId])
    const selectedRelationStats = useMemo((): IPackageRelationStats | undefined => {
        if (state.selectedNodeId === undefined) {
            return undefined
        }
        return calculatePackageRelationStats(filteredRelations, state.selectedNodeId)
    }, [filteredRelations, state.selectedNodeId])
    const impactPathHighlight = useMemo((): IImpactPathHighlight => {
        if (state.showImpactPaths !== true || state.selectedNodeId === undefined) {
            return { edgeIds: [], nodeIds: [] }
        }
        return calculateImpactPathHighlight(visibleGraphData, state.selectedNodeId)
    }, [state.selectedNodeId, state.showImpactPaths, visibleGraphData])

    useEffect((): (() => void) => {
        return (): void => {
            if (clusterDetailTimerRef.current !== undefined) {
                globalThis.clearTimeout(clusterDetailTimerRef.current)
            }
        }
    }, [])

    useEffect((): void => {
        writeLayoutSnapshot({
            viewMode: state.viewMode,
            lodMode: state.lodMode,
            expandedLayerIds: state.expandedLayerIds,
        })
    }, [state.expandedLayerIds, state.lodMode, state.viewMode])

    if (shouldRenderGraph === true && layoutedNodes.length === 0) {
        return (
            <Card aria-label={title}>
                <CardHeader>{title}</CardHeader>
                <CardContent>
                    <p>{emptyStateLabel}</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card aria-label={title}>
            <CardHeader className="flex items-start justify-between gap-3">
                <div>
                    <h3 className={TYPOGRAPHY.subsectionTitle}>{title}</h3>
                    <p className="text-sm text-foreground-500">{summaryText}</p>
                </div>
                <div className="flex min-w-0 gap-2">
                    <Input
                        aria-label={t("code-city:packageDependency.ariaLabelFilter")}
                        placeholder={t("code-city:packageDependency.placeholderFilter")}
                        value={state.query}
                        onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                            setState(
                                (previous): IPackageDependencyGraphState => ({
                                    ...previous,
                                    query: event.target.value,
                                }),
                            )
                        }}
                    />
                    {relationTypes.length > 0 ? (
                        <Button
                            onPress={(): void => {
                                setState(
                                    (previous): IPackageDependencyGraphState => ({
                                        ...previous,
                                        selectedRelationTypes: [],
                                    }),
                                )
                            }}
                            variant="secondary"
                        >
                            {t("code-city:packageDependency.clearRelationFilters")}
                        </Button>
                    ) : null}
                    {state.query.length > 0 ? (
                        <Button
                            onPress={(): void => {
                                setState(
                                    (previous): IPackageDependencyGraphState => ({
                                        ...previous,
                                        query: "",
                                    }),
                                )
                            }}
                            variant="secondary"
                        >
                            {t("code-city:packageDependency.reset")}
                        </Button>
                    ) : null}
                    <Button
                        isDisabled={state.selectedNodeId === undefined}
                        onPress={(): void => {
                            setState(
                                (previousState): IPackageDependencyGraphState => ({
                                    ...previousState,
                                    showImpactPaths: !previousState.showImpactPaths,
                                }),
                            )
                        }}
                        variant={state.showImpactPaths ? "secondary" : "outline"}
                    >
                        {t("code-city:packageDependency.highlightImpactPaths")}
                    </Button>
                    <Button
                        onPress={(): void => {
                            setState(
                                (previousState): IPackageDependencyGraphState => ({
                                    ...previousState,
                                    viewMode:
                                        previousState.viewMode === "clustered"
                                            ? "detailed"
                                            : "clustered",
                                    lodMode:
                                        previousState.viewMode === "clustered"
                                            ? "overview"
                                            : previousState.lodMode,
                                    expandedLayerIds:
                                        previousState.viewMode === "clustered"
                                            ? []
                                            : previousState.expandedLayerIds,
                                    selectedNodeId: undefined,
                                    focusPathOnly: false,
                                }),
                            )
                        }}
                        variant="secondary"
                    >
                        {state.viewMode === "clustered"
                            ? t("code-city:packageDependency.switchToDetailed")
                            : t("code-city:packageDependency.switchToClustered")}
                    </Button>
                    <Button
                        isDisabled={state.selectedNodeId === undefined}
                        onPress={(): void => {
                            setState(
                                (previousState): IPackageDependencyGraphState => ({
                                    ...previousState,
                                    focusPathOnly: !previousState.focusPathOnly,
                                }),
                            )
                        }}
                        variant={state.focusPathOnly ? "primary" : "outline"}
                    >
                        {t("code-city:packageDependency.focusPath")}
                    </Button>
                    <Button
                        isDisabled={state.viewMode !== "clustered" || state.isClusterDetailLoading}
                        onPress={(): void => {
                            if (state.viewMode !== "clustered") {
                                return
                            }

                            if (clusterDetailTimerRef.current !== undefined) {
                                globalThis.clearTimeout(clusterDetailTimerRef.current)
                            }

                            if (state.lodMode === "details") {
                                setState(
                                    (previousState): IPackageDependencyGraphState => ({
                                        ...previousState,
                                        lodMode: "overview",
                                        expandedLayerIds: [],
                                        isClusterDetailLoading: false,
                                    }),
                                )
                                return
                            }

                            setState(
                                (previousState): IPackageDependencyGraphState => ({
                                    ...previousState,
                                    isClusterDetailLoading: true,
                                }),
                            )
                            clusterDetailTimerRef.current = globalThis.setTimeout((): void => {
                                setState(
                                    (previousState): IPackageDependencyGraphState => ({
                                        ...previousState,
                                        lodMode: "details",
                                        expandedLayerIds: allLayerIds,
                                        isClusterDetailLoading: false,
                                    }),
                                )
                            }, CLUSTER_DETAILS_DELAY_MS)
                        }}
                        variant="secondary"
                    >
                        {state.lodMode === "details"
                            ? t("code-city:packageDependency.lodDetails")
                            : t("code-city:packageDependency.lodOverview")}
                    </Button>
                    {hugeGraphFallbackMode ? (
                        <Button
                            onPress={(): void => {
                                setState(
                                    (previousState): IPackageDependencyGraphState => ({
                                        ...previousState,
                                        forceGraphRenderInHugeMode:
                                            !previousState.forceGraphRenderInHugeMode,
                                    }),
                                )
                            }}
                            variant="secondary"
                        >
                            {state.forceGraphRenderInHugeMode
                                ? t("code-city:packageDependency.useHugeGraphFallback")
                                : t("code-city:packageDependency.renderBudgetedGraph")}
                        </Button>
                    ) : null}
                    {state.viewMode === "clustered" && selectedClusterLayer !== undefined ? (
                        <Button
                            onPress={(): void => {
                                setState(
                                    (previousState): IPackageDependencyGraphState => ({
                                        ...previousState,
                                        expandedLayerIds: toggleExpandedLayer(
                                            previousState.expandedLayerIds,
                                            selectedClusterLayer,
                                        ),
                                    }),
                                )
                            }}
                            variant="ghost"
                        >
                            {state.expandedLayerIds.includes(selectedClusterLayer)
                                ? t("code-city:packageDependency.collapse", {
                                      layer: selectedClusterLayer,
                                  })
                                : t("code-city:packageDependency.expand", {
                                      layer: selectedClusterLayer,
                                  })}
                        </Button>
                    ) : null}
                </div>
                {relationTypes.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {relationTypes.map((relationType): ReactElement => {
                            const isActive = state.selectedRelationTypes.includes(relationType)
                            return (
                                <Button
                                    key={relationType}
                                    size="sm"
                                    variant={isActive ? "secondary" : "ghost"}
                                    onPress={(): void => {
                                        const selectedRelationTypes = toggleRelationFilter(
                                            state.selectedRelationTypes,
                                            relationType,
                                        )
                                        setState(
                                            (previous): IPackageDependencyGraphState => ({
                                                ...previous,
                                                selectedRelationTypes,
                                            }),
                                        )
                                    }}
                                >
                                    {relationType}
                                </Button>
                            )
                        })}
                    </div>
                ) : null}
            </CardHeader>
            <CardContent className="gap-4">
                {state.viewMode === "clustered" ? (
                    <p className="text-xs text-foreground-500">
                        {t("code-city:packageDependency.clusterMode")}
                    </p>
                ) : null}
                {state.isClusterDetailLoading ? (
                    <p aria-live="polite" className="text-xs text-foreground-500">
                        {t("code-city:packageDependency.loadingClusterDetails")}
                    </p>
                ) : null}
                {hugeGraphFallbackMode && state.forceGraphRenderInHugeMode !== true ? (
                    <section
                        aria-live="polite"
                        className="space-y-3 rounded-xl border border-warning-300 bg-warning-50 p-4"
                    >
                        <p className="text-sm text-warning-800">
                            {t("code-city:packageDependency.hugeGraphWarning", {
                                nodes: String(props.nodes.length),
                                relations: String(filteredRelations.length),
                            })}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                onPress={(): void => {
                                    exportGraphAsJson(`${title} fallback`, {
                                        relationCount: filteredRelations.length,
                                        sampledPaths: hugeGraphFallbackData.pathRows,
                                        topHubs: hugeGraphFallbackData.topHubs,
                                        totalNodes: props.nodes.length,
                                    })
                                }}
                                size="sm"
                                variant="secondary"
                            >
                                {t("code-city:packageDependency.exportFallbackJson")}
                            </Button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <section className="rounded-lg border border-default-200 bg-content1 p-3">
                                <h5 className={TYPOGRAPHY.cardTitle}>
                                    {t("code-city:packageDependency.topHubs")}
                                </h5>
                                <ul className="mt-2 space-y-1 text-xs text-foreground-700">
                                    {hugeGraphFallbackData.topHubs.map(
                                        (hub): ReactElement => (
                                            <li key={hub.nodeId}>
                                                {`${hub.label}: degree ${hub.totalDegree} (in ${hub.incoming}, out ${hub.outgoing})`}
                                            </li>
                                        ),
                                    )}
                                </ul>
                            </section>
                            <section className="rounded-lg border border-default-200 bg-content1 p-3">
                                <h5 className={TYPOGRAPHY.cardTitle}>
                                    {t("code-city:packageDependency.sampledPaths")}
                                </h5>
                                <ul className="mt-2 space-y-1 text-xs text-foreground-700">
                                    {hugeGraphFallbackData.pathRows.map(
                                        (row, index): ReactElement => (
                                            <li key={`${row.source}-${row.target}-${index}`}>
                                                {`${row.source} -> ${row.target} (${row.relationType})`}
                                            </li>
                                        ),
                                    )}
                                </ul>
                            </section>
                        </div>
                    </section>
                ) : (
                    <XyFlowGraph
                        graphTitle={title}
                        ariaLabel={`${title} canvas`}
                        edges={visibleGraphData.edges}
                        height={props.height}
                        nodes={layoutedNodes}
                        onNodeSelect={(nodeId): void => {
                            setState(
                                (previousState): IPackageDependencyGraphState => ({
                                    ...previousState,
                                    showImpactPaths:
                                        previousState.selectedNodeId === nodeId
                                            ? false
                                            : previousState.showImpactPaths,
                                    focusPathOnly:
                                        previousState.selectedNodeId === nodeId
                                            ? false
                                            : previousState.focusPathOnly,
                                    selectedNodeId:
                                        previousState.selectedNodeId === nodeId
                                            ? undefined
                                            : nodeId,
                                }),
                            )
                        }}
                        highlightedEdgeIds={impactPathHighlight.edgeIds}
                        highlightedNodeIds={impactPathHighlight.nodeIds}
                        selectedNodeId={state.selectedNodeId}
                        showControls={props.showControls}
                        showMiniMap={props.showMiniMap}
                    />
                )}
                <section
                    aria-live="polite"
                    className="rounded-xl border border-default-200 bg-content2 p-4"
                >
                    <h4 className={TYPOGRAPHY.cardTitle}>
                        {t("code-city:packageDependency.nodeDetails")}
                    </h4>
                    {selectedNode !== undefined && selectedRelationStats !== undefined ? (
                        <div className="mt-2 space-y-1 text-sm text-foreground-700">
                            <p>
                                {t("code-city:packageDependency.name", {
                                    value: selectedNode.name,
                                })}
                            </p>
                            <p>
                                {t("code-city:packageDependency.layer", {
                                    value: selectedNode.layer,
                                })}
                            </p>
                            <p>
                                {t("code-city:packageDependency.size", {
                                    value: selectedNode.size ?? "n/a",
                                })}
                            </p>
                            <p>
                                {t("code-city:packageDependency.incomingRelations", {
                                    value: selectedRelationStats.incoming,
                                })}
                            </p>
                            <p>
                                {t("code-city:packageDependency.outgoingRelations", {
                                    value: selectedRelationStats.outgoing,
                                })}
                            </p>
                            <p>
                                {t("code-city:packageDependency.impactPathNodes", {
                                    value: impactPathHighlight.nodeIds.length,
                                })}
                            </p>
                            <p>
                                {t("code-city:packageDependency.impactPathEdges", {
                                    value: impactPathHighlight.edgeIds.length,
                                })}
                            </p>
                        </div>
                    ) : selectedClusterLayer !== undefined &&
                      selectedClusterMembers !== undefined ? (
                        <div className="mt-2 space-y-1 text-sm text-foreground-700">
                            <p>
                                {t("code-city:packageDependency.clusterLayer", {
                                    value: selectedClusterLayer,
                                })}
                            </p>
                            <p>
                                {t("code-city:packageDependency.packagesInCluster", {
                                    value: selectedClusterMembers.length,
                                })}
                            </p>
                            <p>
                                {t("code-city:packageDependency.expanded", {
                                    value: state.expandedLayerIds.includes(selectedClusterLayer)
                                        ? t("code-city:packageDependency.yes")
                                        : t("code-city:packageDependency.no"),
                                })}
                            </p>
                            <p>
                                {t("code-city:packageDependency.lodMode", { value: state.lodMode })}
                            </p>
                            <p>
                                {t("code-city:packageDependency.focusPathOnly", {
                                    value: state.focusPathOnly
                                        ? t("code-city:packageDependency.yes")
                                        : t("code-city:packageDependency.no"),
                                })}
                            </p>
                        </div>
                    ) : (
                        <p className="mt-2 text-sm text-foreground-500">
                            {t("code-city:packageDependency.selectNodePrompt")}
                        </p>
                    )}
                </section>
            </CardContent>
        </Card>
    )
}
