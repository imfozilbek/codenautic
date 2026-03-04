import { type ReactElement, useEffect, useMemo, useRef, useState } from "react"

import { Button, Card, CardBody, CardHeader, Input } from "@/components/ui"
import { XyFlowGraph } from "@/components/graphs/xyflow-graph"
import { exportGraphAsJson } from "@/components/graphs/graph-export"
import {
    calculateGraphLayout,
    type IGraphEdge,
    type IGraphNode,
} from "@/components/graphs/xyflow-graph-layout"

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

/** Нормализованные данные package graph. */
export interface IPackageDependencyGraphData {
    /** Узлы графа. */
    readonly nodes: ReadonlyArray<IGraphNode>
    /** Рёбра графа. */
    readonly edges: ReadonlyArray<IGraphEdge>
}

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
    /** Поисковый запрос по названию пакета. */
    readonly query: string
    /** Фильтры по типам зависимостей. */
    readonly selectedRelationTypes: ReadonlyArray<string>
    /** id выбранного узла. */
    readonly selectedNodeId?: string
    /** Включён ли highlight impact paths. */
    readonly showImpactPaths: boolean
    /** Флаг режима кластеризации. */
    readonly viewMode: "detailed" | "clustered"
    /** Режим уровня детализации (LOD). */
    readonly lodMode: "overview" | "details"
    /** Список раскрытых layer-кластеров. */
    readonly expandedLayerIds: ReadonlyArray<IPackageDependencyNode["layer"]>
    /** Показывать только focus path для выбранного узла. */
    readonly focusPathOnly: boolean
    /** Идёт ли отложенная подгрузка cluster-details. */
    readonly isClusterDetailLoading: boolean
    /** Явно показать граф даже в huge-graph fallback режиме. */
    readonly forceGraphRenderInHugeMode: boolean
}

interface IPackageRelationStats {
    readonly incoming: number
    readonly outgoing: number
}

interface IImpactPathHighlight {
    readonly edgeIds: ReadonlyArray<string>
    readonly nodeIds: ReadonlyArray<string>
}

const MAX_LABEL_LENGTH = 40
const LAYOUT_STATE_STORAGE_KEY = "ui.package-graph.layout.v1"
const CLUSTER_NODE_PREFIX = "cluster:layer:"
const CLUSTER_DETAILS_DELAY_MS = 160
const HUGE_GRAPH_NODE_THRESHOLD = 260
const HUGE_GRAPH_EDGE_THRESHOLD = 640
const MAX_FALLBACK_PATH_ROWS = 24
const MAX_FALLBACK_HUBS = 10

interface IGraphFallbackPathRow {
    readonly source: string
    readonly target: string
    readonly relationType: string
}

interface IGraphFallbackHubRow {
    readonly nodeId: string
    readonly label: string
    readonly totalDegree: number
    readonly incoming: number
    readonly outgoing: number
}

interface IHugeGraphFallbackData {
    readonly topHubs: ReadonlyArray<IGraphFallbackHubRow>
    readonly pathRows: ReadonlyArray<IGraphFallbackPathRow>
}

interface ILayerLayoutSnapshot {
    readonly viewMode: "detailed" | "clustered"
    readonly lodMode: "overview" | "details"
    readonly expandedLayerIds: ReadonlyArray<IPackageDependencyNode["layer"]>
}

function createClusterNodeId(layer: IPackageDependencyNode["layer"]): string {
    return `${CLUSTER_NODE_PREFIX}${layer}`
}

function isPackageLayer(value: string): value is IPackageDependencyNode["layer"] {
    return (
        value === "core" ||
        value === "api" ||
        value === "ui" ||
        value === "worker" ||
        value === "db" ||
        value === "infra"
    )
}

function parseClusterLayer(nodeId: string): IPackageDependencyNode["layer"] | undefined {
    if (nodeId.startsWith(CLUSTER_NODE_PREFIX) !== true) {
        return undefined
    }

    const layerId = nodeId.slice(CLUSTER_NODE_PREFIX.length)
    if (isPackageLayer(layerId)) {
        return layerId
    }

    return undefined
}

function canUseStorage(): boolean {
    return typeof globalThis.localStorage !== "undefined"
}

function readLayoutSnapshot(): ILayerLayoutSnapshot | undefined {
    if (canUseStorage() !== true) {
        return undefined
    }

    const rawSnapshot = globalThis.localStorage.getItem(LAYOUT_STATE_STORAGE_KEY)
    if (rawSnapshot === null) {
        return undefined
    }

    try {
        const parsed = JSON.parse(rawSnapshot) as Partial<ILayerLayoutSnapshot>
        if (
            (parsed.viewMode === "detailed" || parsed.viewMode === "clustered") &&
            (parsed.lodMode === "overview" || parsed.lodMode === "details") &&
            Array.isArray(parsed.expandedLayerIds)
        ) {
            return {
                viewMode: parsed.viewMode,
                lodMode: parsed.lodMode,
                expandedLayerIds: parsed.expandedLayerIds
                    .filter((item): item is string => typeof item === "string")
                    .map((item): string => item.trim())
                    .filter((item): item is IPackageDependencyNode["layer"] =>
                        item.length > 0 && isPackageLayer(item),
                    ),
            }
        }
    } catch {
        return undefined
    }

    return undefined
}

function writeLayoutSnapshot(snapshot: ILayerLayoutSnapshot): void {
    if (canUseStorage() !== true) {
        return
    }

    globalThis.localStorage.setItem(LAYOUT_STATE_STORAGE_KEY, JSON.stringify(snapshot))
}

function buildLayerClusterMap(
    nodes: ReadonlyArray<IPackageDependencyNode>,
): ReadonlyMap<IPackageDependencyNode["layer"], ReadonlyArray<IPackageDependencyNode>> {
    const nextMap = new Map<IPackageDependencyNode["layer"], IPackageDependencyNode[]>()
    for (const node of nodes) {
        const currentNodes = nextMap.get(node.layer) ?? []
        currentNodes.push(node)
        nextMap.set(node.layer, currentNodes)
    }

    return nextMap
}

function filterRelationsByType(
    relations: ReadonlyArray<IPackageDependencyRelation>,
    selectedRelationTypes: ReadonlyArray<string>,
): ReadonlyArray<IPackageDependencyRelation> {
    const normalizedTypes = selectedRelationTypes
        .map((item): string => item.trim())
        .filter((item): boolean => item.length > 0)
    if (normalizedTypes.length === 0) {
        return relations
    }

    const selectedTypeSet = new Set<string>(normalizedTypes)
    return relations.filter((relation): boolean => {
        const relationType = relation.relationType
        return relationType !== undefined && selectedTypeSet.has(relationType)
    })
}

function createClusterLabel(
    layer: IPackageDependencyNode["layer"],
    membersCount: number,
): string {
    return `${layer.toUpperCase()} cluster (${membersCount})`
}

function buildClusteredPackageGraphData(
    nodes: ReadonlyArray<IPackageDependencyNode>,
    relations: ReadonlyArray<IPackageDependencyRelation>,
    expandedLayerIds: ReadonlyArray<IPackageDependencyNode["layer"]>,
): IPackageDependencyGraphData {
    const nodesById = new Map<string, IPackageDependencyNode>()
    for (const node of nodes) {
        nodesById.set(node.id, node)
    }

    const expandedLayerIdSet = new Set<IPackageDependencyNode["layer"]>(expandedLayerIds)
    const layerClusterMap = buildLayerClusterMap(nodes)
    const graphNodes: IGraphNode[] = []

    const layerEntries = Array.from(layerClusterMap.entries()).sort((left, right): number =>
        left[0].localeCompare(right[0]),
    )
    for (const [layer, members] of layerEntries) {
        if (expandedLayerIdSet.has(layer) === true) {
            for (const member of members) {
                graphNodes.push({
                    id: member.id,
                    label: normalizeNodeLabel(member.name),
                    width: 220 + (member.size ?? 1) * 1.7,
                    height: 72,
                })
            }
            continue
        }

        graphNodes.push({
            id: createClusterNodeId(layer),
            label: createClusterLabel(layer, members.length),
            width: 280 + Math.min(members.length, 25) * 2,
            height: 78,
        })
    }

    const edgeCountByKey = new Map<string, number>()
    for (const relation of relations) {
        const sourceNode = nodesById.get(relation.source)
        const targetNode = nodesById.get(relation.target)
        if (sourceNode === undefined || targetNode === undefined) {
            continue
        }

        const sourceId =
            expandedLayerIdSet.has(sourceNode.layer) === true
                ? sourceNode.id
                : createClusterNodeId(sourceNode.layer)
        const targetId =
            expandedLayerIdSet.has(targetNode.layer) === true
                ? targetNode.id
                : createClusterNodeId(targetNode.layer)
        if (sourceId === targetId) {
            continue
        }

        const relationType = relation.relationType ?? "dependency"
        const edgeKey = `${sourceId}->${targetId}:${relationType}`
        edgeCountByKey.set(edgeKey, (edgeCountByKey.get(edgeKey) ?? 0) + 1)
    }

    const edges: IGraphEdge[] = []
    for (const [key, count] of edgeCountByKey.entries()) {
        const keySeparatorIndex = key.indexOf(":")
        if (keySeparatorIndex <= 0) {
            continue
        }

        const pair = key.slice(0, keySeparatorIndex)
        const relationType = key.slice(keySeparatorIndex + 1)
        const nodeSeparatorIndex = pair.indexOf("->")
        if (nodeSeparatorIndex <= 0) {
            continue
        }

        const source = pair.slice(0, nodeSeparatorIndex)
        const target = pair.slice(nodeSeparatorIndex + 2)
        if (source.length === 0 || target.length === 0) {
            continue
        }

        edges.push({
            id: key,
            source,
            target,
            label: count > 1 ? `${relationType} x${count}` : relationType,
        })
    }

    return { nodes: graphNodes, edges }
}

function applyFocusPathFilter(
    graphData: IPackageDependencyGraphData,
    selectedNodeId: string | undefined,
    focusPathOnly: boolean,
): IPackageDependencyGraphData {
    if (focusPathOnly !== true || selectedNodeId === undefined) {
        return graphData
    }

    const highlight = calculateImpactPathHighlight(graphData, selectedNodeId)
    if (highlight.nodeIds.length === 0) {
        return graphData
    }

    const visibleNodeIds = new Set<string>(highlight.nodeIds)
    const visibleEdgeIds = new Set<string>(highlight.edgeIds)
    return {
        nodes: graphData.nodes.filter((node): boolean => visibleNodeIds.has(node.id)),
        edges: graphData.edges.filter((edge): boolean => {
            const edgeId = edge.id ?? `${edge.source}-${edge.target}`
            return visibleEdgeIds.has(edgeId)
        }),
    }
}

function isHugeGraph(nodesCount: number, edgesCount: number): boolean {
    return nodesCount > HUGE_GRAPH_NODE_THRESHOLD || edgesCount > HUGE_GRAPH_EDGE_THRESHOLD
}

function buildHugeGraphFallbackData(
    nodes: ReadonlyArray<IPackageDependencyNode>,
    relations: ReadonlyArray<IPackageDependencyRelation>,
): IHugeGraphFallbackData {
    const nodesById = new Map<string, IPackageDependencyNode>()
    const statsByNodeId = new Map<string, { incoming: number; outgoing: number }>()

    for (const node of nodes) {
        nodesById.set(node.id, node)
        statsByNodeId.set(node.id, {
            incoming: 0,
            outgoing: 0,
        })
    }

    const pathRows: IGraphFallbackPathRow[] = []
    for (const relation of relations) {
        const sourceStats = statsByNodeId.get(relation.source)
        const targetStats = statsByNodeId.get(relation.target)
        if (sourceStats === undefined || targetStats === undefined) {
            continue
        }

        sourceStats.outgoing += 1
        targetStats.incoming += 1
        if (pathRows.length < MAX_FALLBACK_PATH_ROWS) {
            pathRows.push({
                source: relation.source,
                target: relation.target,
                relationType: relation.relationType ?? "dependency",
            })
        }
    }

    const topHubs: IGraphFallbackHubRow[] = Array.from(statsByNodeId.entries())
        .map(([nodeId, stats]): IGraphFallbackHubRow => {
            const node = nodesById.get(nodeId)
            return {
                nodeId,
                label: node?.name ?? nodeId,
                totalDegree: stats.incoming + stats.outgoing,
                incoming: stats.incoming,
                outgoing: stats.outgoing,
            }
        })
        .sort((left, right): number => right.totalDegree - left.totalDegree)
        .slice(0, MAX_FALLBACK_HUBS)

    return {
        topHubs,
        pathRows,
    }
}

/** Подготавливает label для отображения. */
function normalizeNodeLabel(label: string): string {
    if (label.length <= MAX_LABEL_LENGTH) {
        return label
    }

    return `…${label.slice(label.length - (MAX_LABEL_LENGTH - 1))}`
}

/** Формирует node/edge для рендеринга package dependency graph. */
export function buildPackageDependencyGraphData(
    nodes: ReadonlyArray<IPackageDependencyNode>,
    relations: ReadonlyArray<IPackageDependencyRelation>,
): IPackageDependencyGraphData {
    const packageIds = new Set<string>(nodes.map((node): string => node.id))
    const edgeKeys = new Set<string>()
    const edges: IGraphEdge[] = []

    for (const relation of relations) {
        if (packageIds.has(relation.source) !== true || packageIds.has(relation.target) !== true) {
            continue
        }

        const edgeKey = `${relation.source}->${relation.target}:${relation.relationType ?? ""}`
        if (edgeKeys.has(edgeKey) === true) {
            continue
        }

        edgeKeys.add(edgeKey)
        edges.push({
            id: edgeKey,
            source: relation.source,
            target: relation.target,
            label: relation.relationType,
        })
    }

    const graphNodes: IGraphNode[] = nodes.map((node): IGraphNode => {
        const label = normalizeNodeLabel(node.name)
        return {
            id: node.id,
            label: `${label} (${node.layer})`,
            width: 230 + (node.size ?? 1) * 1.8,
            height: 74,
        }
    })

    return { nodes: graphNodes, edges }
}

/** Применяет фильтр по названию пакета. */
function filterByPackageName(
    data: IPackageDependencyGraphData,
    nodes: ReadonlyArray<IPackageDependencyNode>,
    query: string,
): IPackageDependencyGraphData {
    const trimQuery = query.trim().toLowerCase()
    if (trimQuery.length === 0) {
        return data
    }

    const selectedNodes = new Set<string>()
    for (const node of nodes) {
        if (node.name.toLowerCase().includes(trimQuery) === true) {
            selectedNodes.add(node.id)
        }
    }

    const filteredNodes = data.nodes.filter((node): boolean => selectedNodes.has(node.id))
    const nodeIds = new Set<string>(filteredNodes.map((node): string => node.id))
    const filteredEdges = data.edges.filter(
        (edge): boolean => nodeIds.has(edge.source) && nodeIds.has(edge.target),
    )

    return {
        nodes: filteredNodes,
        edges: filteredEdges,
    }
}

/** Возвращает список relationType для фильтрации в детерминированном порядке. */
function collectRelationTypes(
    relations: ReadonlyArray<IPackageDependencyRelation>,
): ReadonlyArray<string> {
    const relationTypes = new Set<string>()
    for (const relation of relations) {
        if (relation.relationType !== undefined && relation.relationType.length > 0) {
            relationTypes.add(relation.relationType)
        }
    }

    return Array.from(relationTypes).sort()
}

/** Рекомендует next состояния для фильтра relationType по клику на кнопке. */
function toggleRelationFilter(
    selected: ReadonlyArray<string>,
    relationType: string,
): ReadonlyArray<string> {
    const current = selected.findIndex((entry): boolean => entry === relationType)
    if (current >= 0) {
        return selected.filter((entry): boolean => entry !== relationType)
    }

    return [...selected, relationType]
}

function toggleExpandedLayer(
    selected: ReadonlyArray<IPackageDependencyNode["layer"]>,
    layer: IPackageDependencyNode["layer"],
): ReadonlyArray<IPackageDependencyNode["layer"]> {
    if (selected.includes(layer) === true) {
        return selected.filter((item): boolean => item !== layer)
    }

    return [...selected, layer]
}

/** Формирует summary строку. */
function createSummaryText(nodesCount: number, edgesCount: number): string {
    return `Nodes: ${nodesCount}, edges: ${edgesCount}`
}

/** Подсчитывает входящие/исходящие связи для выбранного пакета. */
function calculatePackageRelationStats(
    relations: ReadonlyArray<IPackageDependencyRelation>,
    nodeId: string,
): IPackageRelationStats {
    let incoming = 0
    let outgoing = 0

    for (const relation of relations) {
        if (relation.source === nodeId) {
            outgoing += 1
        }
        if (relation.target === nodeId) {
            incoming += 1
        }
    }

    return { incoming, outgoing }
}

/** Формирует highlight-данные impact path для выбранного package node. */
function calculateImpactPathHighlight(
    graphData: IPackageDependencyGraphData,
    nodeId: string,
): IImpactPathHighlight {
    const knownNodeIds = new Set<string>(graphData.nodes.map((node): string => node.id))
    if (knownNodeIds.has(nodeId) !== true) {
        return { edgeIds: [], nodeIds: [] }
    }

    const queue: string[] = [nodeId]
    const visitedNodeIds = new Set<string>([nodeId])
    const visitedEdgeIds = new Set<string>()

    while (queue.length > 0) {
        const currentNodeId = queue.shift()
        if (currentNodeId === undefined) {
            continue
        }

        for (const edge of graphData.edges) {
            const edgeId = edge.id ?? `${edge.source}-${edge.target}`
            if (edge.source !== currentNodeId && edge.target !== currentNodeId) {
                continue
            }

            visitedEdgeIds.add(edgeId)
            if (visitedNodeIds.has(edge.source) !== true) {
                visitedNodeIds.add(edge.source)
                queue.push(edge.source)
            }
            if (visitedNodeIds.has(edge.target) !== true) {
                visitedNodeIds.add(edge.target)
                queue.push(edge.target)
            }
        }
    }

    return {
        edgeIds: Array.from(visitedEdgeIds),
        nodeIds: Array.from(visitedNodeIds),
    }
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
        expandedLayerIds:
            (initialLayoutSnapshot?.expandedLayerIds ?? [])
                .filter((item): item is IPackageDependencyNode["layer"] => isPackageLayer(item)),
        focusPathOnly: false,
        isClusterDetailLoading: false,
        forceGraphRenderInHugeMode: false,
    })
    const clusterDetailTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(
        undefined,
    )
    const title = props.title ?? "Package dependency graph"
    const emptyStateLabel = props.emptyStateLabel ?? "No package dependencies yet."
    const packageNodesById = useMemo((): ReadonlyMap<string, IPackageDependencyNode> => {
        const nextMap = new Map<string, IPackageDependencyNode>()
        for (const node of props.nodes) {
            nextMap.set(node.id, node)
        }
        return nextMap
    }, [props.nodes])
    const layerClusterMap = useMemo(() => buildLayerClusterMap(props.nodes), [props.nodes])
    const allLayerIds = useMemo(
        (): ReadonlyArray<IPackageDependencyNode["layer"]> => {
            return Array.from(layerClusterMap.keys()).sort((left, right): number =>
                left.localeCompare(right),
            )
        },
        [layerClusterMap],
    )
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
    const effectiveExpandedLayerIds = useMemo(
        (): ReadonlyArray<IPackageDependencyNode["layer"]> => {
            if (state.lodMode === "details") {
                return allLayerIds
            }

            return state.expandedLayerIds.filter((item): boolean => allLayerIds.includes(item))
        },
        [allLayerIds, state.expandedLayerIds, state.lodMode],
    )
    const clusteredGraphData = useMemo(
        (): IPackageDependencyGraphData =>
            buildClusteredPackageGraphData(props.nodes, filteredRelations, effectiveExpandedLayerIds),
        [effectiveExpandedLayerIds, filteredRelations, props.nodes],
    )
    const graphViewMode: "detailed" | "clustered" =
        state.query.trim().length > 0 ? "detailed" : state.viewMode
    const graphDataByViewMode = graphViewMode === "clustered" ? clusteredGraphData : detailedGraphData
    const visibleGraphData = useMemo(
        (): IPackageDependencyGraphData =>
            applyFocusPathFilter(graphDataByViewMode, state.selectedNodeId, state.focusPathOnly),
        [graphDataByViewMode, state.focusPathOnly, state.selectedNodeId],
    )
    const layoutedNodes = useMemo(
        (): ReadonlyArray<IGraphNode> => {
            if (shouldRenderGraph !== true) {
                return []
            }

            return calculateGraphLayout(visibleGraphData.nodes, visibleGraphData.edges, {
                direction: "LR",
                nodeSpacingX: 120,
                nodeSpacingY: 90,
                margin: 20,
            })
        },
        [shouldRenderGraph, visibleGraphData],
    )

    const summaryText = createSummaryText(visibleGraphData.nodes.length, visibleGraphData.edges.length)
    const selectedClusterLayer = useMemo(
        (): IPackageDependencyNode["layer"] | undefined => {
            if (state.selectedNodeId === undefined) {
                return undefined
            }

            return parseClusterLayer(state.selectedNodeId)
        },
        [state.selectedNodeId],
    )
    const selectedClusterMembers = useMemo((): ReadonlyArray<IPackageDependencyNode> | undefined => {
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
                <CardBody>
                    <p>{emptyStateLabel}</p>
                </CardBody>
            </Card>
        )
    }

    return (
        <Card aria-label={title}>
            <CardHeader className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <p className="text-sm text-foreground-500">{summaryText}</p>
                </div>
                <div className="flex min-w-0 gap-2">
                    <Input
                        aria-label="Filter packages"
                        placeholder="Filter packages by name"
                        value={state.query}
                        onValueChange={(nextQuery): void => {
                            setState((previous): IPackageDependencyGraphState => ({
                                ...previous,
                                query: nextQuery,
                            }))
                        }}
                    />
                    {relationTypes.length > 0 ? (
                        <Button
                            color="default"
                            onPress={(): void => {
                                setState((previous): IPackageDependencyGraphState => ({
                                    ...previous,
                                    selectedRelationTypes: [],
                                }))
                            }}
                            variant="flat"
                        >
                            Clear relation filters
                        </Button>
                    ) : null}
                    {state.query.length > 0 ? (
                        <Button
                            color="default"
                            onPress={(): void => {
                                setState((previous): IPackageDependencyGraphState => ({
                                    ...previous,
                                    query: "",
                                }))
                            }}
                            variant="flat"
                        >
                            Reset
                        </Button>
                    ) : null}
                    <Button
                        color={state.showImpactPaths ? "success" : "default"}
                        isDisabled={state.selectedNodeId === undefined}
                        onPress={(): void => {
                            setState((previousState): IPackageDependencyGraphState => ({
                                ...previousState,
                                showImpactPaths: !previousState.showImpactPaths,
                            }))
                        }}
                        variant={state.showImpactPaths ? "flat" : "bordered"}
                    >
                        Highlight impact paths
                    </Button>
                    <Button
                        color="default"
                        onPress={(): void => {
                            setState((previousState): IPackageDependencyGraphState => ({
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
                            }))
                        }}
                        variant="flat"
                    >
                        {state.viewMode === "clustered"
                            ? "Switch to detailed view"
                            : "Switch to clustered view"}
                    </Button>
                    <Button
                        color={state.focusPathOnly ? "primary" : "default"}
                        isDisabled={state.selectedNodeId === undefined}
                        onPress={(): void => {
                            setState((previousState): IPackageDependencyGraphState => ({
                                ...previousState,
                                focusPathOnly: !previousState.focusPathOnly,
                            }))
                        }}
                        variant={state.focusPathOnly ? "flat" : "bordered"}
                    >
                        Focus path
                    </Button>
                    <Button
                        color="default"
                        isDisabled={state.viewMode !== "clustered" || state.isClusterDetailLoading}
                        onPress={(): void => {
                            if (state.viewMode !== "clustered") {
                                return
                            }

                            if (clusterDetailTimerRef.current !== undefined) {
                                globalThis.clearTimeout(clusterDetailTimerRef.current)
                            }

                            if (state.lodMode === "details") {
                                setState((previousState): IPackageDependencyGraphState => ({
                                    ...previousState,
                                    lodMode: "overview",
                                    expandedLayerIds: [],
                                    isClusterDetailLoading: false,
                                }))
                                return
                            }

                            setState((previousState): IPackageDependencyGraphState => ({
                                ...previousState,
                                isClusterDetailLoading: true,
                            }))
                            clusterDetailTimerRef.current = globalThis.setTimeout((): void => {
                                setState((previousState): IPackageDependencyGraphState => ({
                                    ...previousState,
                                    lodMode: "details",
                                    expandedLayerIds: allLayerIds,
                                    isClusterDetailLoading: false,
                                }))
                            }, CLUSTER_DETAILS_DELAY_MS)
                        }}
                        variant="flat"
                    >
                        {state.lodMode === "details" ? "LOD: details" : "LOD: overview"}
                    </Button>
                    {hugeGraphFallbackMode ? (
                        <Button
                            color={state.forceGraphRenderInHugeMode ? "warning" : "default"}
                            onPress={(): void => {
                                setState((previousState): IPackageDependencyGraphState => ({
                                    ...previousState,
                                    forceGraphRenderInHugeMode: !previousState.forceGraphRenderInHugeMode,
                                }))
                            }}
                            variant="flat"
                        >
                            {state.forceGraphRenderInHugeMode
                                ? "Use huge-graph fallback"
                                : "Render budgeted graph"}
                        </Button>
                    ) : null}
                    {state.viewMode === "clustered" && selectedClusterLayer !== undefined ? (
                        <Button
                            color="default"
                            onPress={(): void => {
                                setState((previousState): IPackageDependencyGraphState => ({
                                    ...previousState,
                                    expandedLayerIds: toggleExpandedLayer(
                                        previousState.expandedLayerIds,
                                        selectedClusterLayer,
                                    ),
                                }))
                            }}
                            variant="light"
                        >
                            {state.expandedLayerIds.includes(selectedClusterLayer)
                                ? `Collapse ${selectedClusterLayer}`
                                : `Expand ${selectedClusterLayer}`}
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
                                    color="default"
                                    size="sm"
                                    variant={isActive ? "flat" : "light"}
                                    onPress={(): void => {
                                        const selectedRelationTypes = toggleRelationFilter(
                                            state.selectedRelationTypes,
                                            relationType,
                                        )
                                        setState((previous): IPackageDependencyGraphState => ({
                                            ...previous,
                                            selectedRelationTypes,
                                        }))
                                    }}
                                >
                                    {relationType}
                                </Button>
                            )
                        })}
                    </div>
                ) : null}
            </CardHeader>
            <CardBody className="gap-4">
                {state.viewMode === "clustered" ? (
                    <p className="text-xs text-foreground-500">
                        Cluster mode groups packages by layer and allows on-demand expansion with
                        LOD controls.
                    </p>
                ) : null}
                {state.isClusterDetailLoading ? (
                    <p aria-live="polite" className="text-xs text-foreground-500">
                        Loading cluster details...
                    </p>
                ) : null}
                {hugeGraphFallbackMode && state.forceGraphRenderInHugeMode !== true ? (
                    <section
                        aria-live="polite"
                        className="space-y-3 rounded-xl border border-warning-300 bg-warning-50 p-4"
                    >
                        <p className="text-sm text-warning-800">
                            {`Graph is too large for full render (${props.nodes.length} nodes, ${filteredRelations.length} relations). Using fallback view with sampled paths and top hubs.`}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                color="warning"
                                onPress={(): void => {
                                    exportGraphAsJson(`${title} fallback`, {
                                        relationCount: filteredRelations.length,
                                        sampledPaths: hugeGraphFallbackData.pathRows,
                                        topHubs: hugeGraphFallbackData.topHubs,
                                        totalNodes: props.nodes.length,
                                    })
                                }}
                                size="sm"
                                variant="flat"
                            >
                                Export fallback JSON
                            </Button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <section className="rounded-lg border border-default-200 bg-content1 p-3">
                                <h5 className="text-sm font-semibold text-foreground">Top hubs</h5>
                                <ul className="mt-2 space-y-1 text-xs text-foreground-700">
                                    {hugeGraphFallbackData.topHubs.map((hub): ReactElement => (
                                        <li key={hub.nodeId}>
                                            {`${hub.label}: degree ${hub.totalDegree} (in ${hub.incoming}, out ${hub.outgoing})`}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                            <section className="rounded-lg border border-default-200 bg-content1 p-3">
                                <h5 className="text-sm font-semibold text-foreground">
                                    Sampled paths
                                </h5>
                                <ul className="mt-2 space-y-1 text-xs text-foreground-700">
                                    {hugeGraphFallbackData.pathRows.map((row, index): ReactElement => (
                                        <li key={`${row.source}-${row.target}-${index}`}>
                                            {`${row.source} -> ${row.target} (${row.relationType})`}
                                        </li>
                                    ))}
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
                            setState((previousState): IPackageDependencyGraphState => ({
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
                                    previousState.selectedNodeId === nodeId ? undefined : nodeId,
                            }))
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
                    <h4 className="text-sm font-semibold text-foreground">Node details</h4>
                    {selectedNode !== undefined && selectedRelationStats !== undefined ? (
                        <div className="mt-2 space-y-1 text-sm text-foreground-700">
                            <p>{`Name: ${selectedNode.name}`}</p>
                            <p>{`Layer: ${selectedNode.layer}`}</p>
                            <p>{`Size: ${selectedNode.size ?? "n/a"}`}</p>
                            <p>{`Incoming relations: ${selectedRelationStats.incoming}`}</p>
                            <p>{`Outgoing relations: ${selectedRelationStats.outgoing}`}</p>
                            <p>{`Impact path nodes: ${impactPathHighlight.nodeIds.length}`}</p>
                            <p>{`Impact path edges: ${impactPathHighlight.edgeIds.length}`}</p>
                        </div>
                    ) : selectedClusterLayer !== undefined && selectedClusterMembers !== undefined ? (
                        <div className="mt-2 space-y-1 text-sm text-foreground-700">
                            <p>{`Cluster layer: ${selectedClusterLayer}`}</p>
                            <p>{`Packages in cluster: ${selectedClusterMembers.length}`}</p>
                            <p>{`Expanded: ${state.expandedLayerIds.includes(selectedClusterLayer) ? "yes" : "no"}`}</p>
                            <p>{`LOD mode: ${state.lodMode}`}</p>
                            <p>{`Focus path only: ${state.focusPathOnly ? "yes" : "no"}`}</p>
                        </div>
                    ) : (
                        <p className="mt-2 text-sm text-foreground-500">
                            Select a node to inspect package relationships.
                        </p>
                    )}
                </section>
            </CardBody>
        </Card>
    )
}
