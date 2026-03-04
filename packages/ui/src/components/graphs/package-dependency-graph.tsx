import { type ReactElement, useMemo, useState } from "react"

import { Button, Card, CardBody, CardHeader, Input } from "@/components/ui"
import { XyFlowGraph } from "@/components/graphs/xyflow-graph"
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

/** Фильтрует рёбра по выбранным типам зависимостей. */
function filterByRelationTypes(
    data: IPackageDependencyGraphData,
    selectedRelationTypes: ReadonlyArray<string>,
): IPackageDependencyGraphData {
    const trimSelected = selectedRelationTypes
        .map((relationType): string => relationType.trim())
        .filter((relationType): boolean => relationType.length > 0)
    if (trimSelected.length === 0) {
        return data
    }

    const selectedSet = new Set<string>(trimSelected)
    const edges = data.edges.filter((edge): boolean =>
        edge.label !== undefined && selectedSet.has(edge.label),
    )
    const edgeNodeIds = new Set<string>(
        edges.flatMap(
            (edge): ReadonlyArray<string> => [edge.source, edge.target],
        ),
    )
    const nodes = data.nodes.filter((node): boolean => edgeNodeIds.has(node.id))

    return { edges, nodes }
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
    const [state, setState] = useState<IPackageDependencyGraphState>({
        query: "",
        selectedRelationTypes: [],
        selectedNodeId: undefined,
        showImpactPaths: false,
    })
    const title = props.title ?? "Package dependency graph"
    const emptyStateLabel = props.emptyStateLabel ?? "No package dependencies yet."
    const graphData = useMemo(
        (): IPackageDependencyGraphData =>
            buildPackageDependencyGraphData(props.nodes, props.relations),
        [props.nodes, props.relations],
    )
    const relationTypes = useMemo((): ReadonlyArray<string> => {
        return collectRelationTypes(props.relations)
    }, [props.relations])
    const visibleGraphData = useMemo((): IPackageDependencyGraphData => {
        const dataByName = filterByPackageName(graphData, props.nodes, state.query)
        return filterByRelationTypes(dataByName, state.selectedRelationTypes)
    }, [graphData, props.nodes, state.query, state.selectedRelationTypes])
    const layoutedNodes = useMemo(
        () =>
            calculateGraphLayout(visibleGraphData.nodes, visibleGraphData.edges, {
                direction: "LR",
                nodeSpacingX: 120,
                nodeSpacingY: 90,
                margin: 20,
            }),
        [visibleGraphData],
    )

    const summaryText = createSummaryText(visibleGraphData.nodes.length, visibleGraphData.edges.length)
    const packageNodesById = useMemo((): ReadonlyMap<string, IPackageDependencyNode> => {
        const nextMap = new Map<string, IPackageDependencyNode>()
        for (const node of props.nodes) {
            nextMap.set(node.id, node)
        }
        return nextMap
    }, [props.nodes])
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
        return calculatePackageRelationStats(props.relations, state.selectedNodeId)
    }, [props.relations, state.selectedNodeId])
    const impactPathHighlight = useMemo((): IImpactPathHighlight => {
        if (state.showImpactPaths !== true || state.selectedNodeId === undefined) {
            return { edgeIds: [], nodeIds: [] }
        }
        return calculateImpactPathHighlight(visibleGraphData, state.selectedNodeId)
    }, [state.selectedNodeId, state.showImpactPaths, visibleGraphData])

    if (layoutedNodes.length === 0) {
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
                <section
                    aria-live="polite"
                    className="rounded-xl border border-default-200 bg-content2 p-4"
                >
                    <h4 className="text-sm font-semibold text-foreground">Node details</h4>
                    {selectedNode === undefined || selectedRelationStats === undefined ? (
                        <p className="mt-2 text-sm text-foreground-500">
                            Select a node to inspect package relationships.
                        </p>
                    ) : (
                        <div className="mt-2 space-y-1 text-sm text-foreground-700">
                            <p>{`Name: ${selectedNode.name}`}</p>
                            <p>{`Layer: ${selectedNode.layer}`}</p>
                            <p>{`Size: ${selectedNode.size ?? "n/a"}`}</p>
                            <p>{`Incoming relations: ${selectedRelationStats.incoming}`}</p>
                            <p>{`Outgoing relations: ${selectedRelationStats.outgoing}`}</p>
                            <p>{`Impact path nodes: ${impactPathHighlight.nodeIds.length}`}</p>
                            <p>{`Impact path edges: ${impactPathHighlight.edgeIds.length}`}</p>
                        </div>
                    )}
                </section>
            </CardBody>
        </Card>
    )
}
