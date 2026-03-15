import { type ChangeEvent, type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button, Card, CardContent, CardHeader, Input } from "@heroui/react"
import { XyFlowGraph } from "@/components/dependency-graphs/xyflow-graph"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import {
    calculateGraphLayout,
    type IGraphEdge,
    type IGraphNode,
} from "@/components/dependency-graphs/xyflow-graph-layout"

/** Описание функции или класса для call graph. */
export interface IFunctionCallNode {
    /** Уникальный id сущности. */
    readonly id: string
    /** Название функции/метода/класса. */
    readonly name: string
    /** Тип сущности. */
    readonly kind: "function" | "method" | "class"
    /** Время жизни для визуального веса (оценочное). */
    readonly complexity?: number
    /** Имя файла-источника (опционально). */
    readonly file?: string
}

/** Описание вызова между функциями или классами. */
export interface IFunctionCallRelation {
    /** Источник вызова. */
    readonly source: string
    /** Цель вызова. */
    readonly target: string
    /** Тип вызова/взаимодействия. */
    readonly relationType?: string
}

/** Нормализованные данные для рендера графа вызовов. */
export interface IFunctionCallGraphData {
    /** Узлы графа. */
    readonly nodes: ReadonlyArray<IGraphNode>
    /** Рёбра графа. */
    readonly edges: ReadonlyArray<IGraphEdge>
}

/** Пропсы визуализации function/class call graph. */
export interface IFunctionCallGraphProps {
    /** Сущности (функции/классы). */
    readonly nodes: ReadonlyArray<IFunctionCallNode>
    /** Связи вызовов. */
    readonly callRelations: ReadonlyArray<IFunctionCallRelation>
    /** Фиксированная высота блока. */
    readonly height?: string
    /** Заголовок блока. */
    readonly title?: string
    /** Отображать миникарту. */
    readonly showMiniMap?: boolean
    /** Отображать панель управления. */
    readonly showControls?: boolean
    /** Текст для пустого состояния. */
    readonly emptyStateLabel?: string
}

interface IFunctionCallGraphState {
    /** Значение поискового поля. */
    readonly query: string
    /** id выбранного узла. */
    readonly selectedNodeId?: string
    /** Включён ли highlight impact paths. */
    readonly showImpactPaths: boolean
}

interface ICallRelationStats {
    readonly incoming: number
    readonly outgoing: number
}

interface IImpactPathHighlight {
    readonly edgeIds: ReadonlyArray<string>
    readonly nodeIds: ReadonlyArray<string>
}

/** Лимит длины label, чтобы не ломать layout. */
const MAX_LABEL_LENGTH = 38

/** Преобразует сложное имя в компактный label. */
function normalizeNodeLabel(name: string): string {
    if (name.length <= MAX_LABEL_LENGTH) {
        return name
    }

    return `…${name.slice(name.length - (MAX_LABEL_LENGTH - 1))}`
}

/** Формирует узлы/рёбра call graph для рендера. */
export function buildFunctionCallGraphData(
    nodes: ReadonlyArray<IFunctionCallNode>,
    relations: ReadonlyArray<IFunctionCallRelation>,
): IFunctionCallGraphData {
    const nodeIds = new Set<string>(nodes.map((node): string => node.id))
    const edgeKeys = new Set<string>()
    const edges: IGraphEdge[] = []

    for (const relation of relations) {
        if (nodeIds.has(relation.source) !== true || nodeIds.has(relation.target) !== true) {
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
            label,
            width:
                220 + ((node.complexity ?? 1) > 0 ? Math.min(node.complexity ?? 1, 25) * 1.5 : 0),
            height: 76,
        }
    })

    return { nodes: graphNodes, edges }
}

/** Фильтрует узлы/рёбра по поиску по имени сущности. */
function filterGraphDataByQuery(
    data: IFunctionCallGraphData,
    nodes: ReadonlyArray<IFunctionCallNode>,
    query: string,
): IFunctionCallGraphData {
    const trimQuery = query.trim().toLowerCase()
    if (trimQuery.length === 0) {
        return data
    }

    const selectedNodeIds = new Set<string>()
    for (const node of nodes) {
        if (node.name.toLowerCase().includes(trimQuery) === true) {
            selectedNodeIds.add(node.id)
        }
    }

    const filteredNodes = data.nodes.filter((node): boolean => selectedNodeIds.has(node.id))
    const visibleNodeIds = new Set<string>(filteredNodes.map((node): string => node.id))
    const filteredEdges = data.edges.filter(
        (edge): boolean =>
            visibleNodeIds.has(edge.source) === true && visibleNodeIds.has(edge.target) === true,
    )

    return {
        nodes: filteredNodes,
        edges: filteredEdges,
    }
}

/** Формирует summary-плашку. */
function createSummaryText(nodesCount: number, edgesCount: number): string {
    return `Nodes: ${nodesCount}, edges: ${edgesCount}`
}

/** Подсчитывает входящие/исходящие вызовы для выбранной функции/класса. */
function calculateCallStats(
    relations: ReadonlyArray<IFunctionCallRelation>,
    nodeId: string,
): ICallRelationStats {
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

/** Строит highlight для impact path по выбранному node id. */
function calculateImpactPathHighlight(
    graphData: IFunctionCallGraphData,
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
 * Рендерит function/class call graph для одного репозитория.
 *
 * @param props Пропсы графа.
 */
export function FunctionClassCallGraph(props: IFunctionCallGraphProps): ReactElement {
    const { t } = useTranslation(["code-city"])
    const [state, setState] = useState<IFunctionCallGraphState>({
        query: "",
        selectedNodeId: undefined,
        showImpactPaths: false,
    })
    const title = props.title ?? t("code-city:functionCallGraph.defaultTitle")
    const emptyStateLabel =
        props.emptyStateLabel ?? t("code-city:functionCallGraph.defaultEmptyState")
    const graphData = useMemo(
        (): IFunctionCallGraphData => buildFunctionCallGraphData(props.nodes, props.callRelations),
        [props.callRelations, props.nodes],
    )

    const visibleGraphData = useMemo(
        (): IFunctionCallGraphData => filterGraphDataByQuery(graphData, props.nodes, state.query),
        [graphData, props.nodes, state.query],
    )

    const layoutedNodes = useMemo(
        () =>
            calculateGraphLayout(visibleGraphData.nodes, visibleGraphData.edges, {
                direction: "LR",
                nodeSpacingX: 95,
                nodeSpacingY: 90,
                margin: 18,
            }),
        [visibleGraphData],
    )

    const isEmptyState = visibleGraphData.nodes.length === 0
    const summaryText = createSummaryText(
        visibleGraphData.nodes.length,
        visibleGraphData.edges.length,
    )
    const nodesById = useMemo((): ReadonlyMap<string, IFunctionCallNode> => {
        const nextMap = new Map<string, IFunctionCallNode>()
        for (const node of props.nodes) {
            nextMap.set(node.id, node)
        }
        return nextMap
    }, [props.nodes])
    const selectedNode = useMemo((): IFunctionCallNode | undefined => {
        if (state.selectedNodeId === undefined) {
            return undefined
        }
        return nodesById.get(state.selectedNodeId)
    }, [nodesById, state.selectedNodeId])
    const selectedCallStats = useMemo((): ICallRelationStats | undefined => {
        if (state.selectedNodeId === undefined) {
            return undefined
        }
        return calculateCallStats(props.callRelations, state.selectedNodeId)
    }, [props.callRelations, state.selectedNodeId])
    const impactPathHighlight = useMemo((): IImpactPathHighlight => {
        if (state.showImpactPaths !== true || state.selectedNodeId === undefined) {
            return { edgeIds: [], nodeIds: [] }
        }
        return calculateImpactPathHighlight(visibleGraphData, state.selectedNodeId)
    }, [state.selectedNodeId, state.showImpactPaths, visibleGraphData])

    if (layoutedNodes.length === 0 || isEmptyState === true) {
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
                        aria-label={t("code-city:functionCallGraph.ariaLabelFilter")}
                        placeholder={t("code-city:functionCallGraph.placeholderFilter")}
                        value={state.query}
                        onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                            setState((previousState) => ({
                                ...previousState,
                                query: event.target.value,
                            }))
                        }}
                    />
                    {state.query.length > 0 ? (
                        <Button
                            variant="secondary"
                            onPress={(): void => {
                                setState((previousState) => ({
                                    ...previousState,
                                    query: "",
                                }))
                            }}
                        >
                            {t("code-city:functionCallGraph.reset")}
                        </Button>
                    ) : null}
                    <Button
                        isDisabled={state.selectedNodeId === undefined}
                        variant={state.showImpactPaths ? "secondary" : "outline"}
                        onPress={(): void => {
                            setState((previousState) => ({
                                ...previousState,
                                showImpactPaths: !previousState.showImpactPaths,
                            }))
                        }}
                    >
                        {t("code-city:functionCallGraph.highlightImpactPaths")}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="gap-4">
                <XyFlowGraph
                    graphTitle={title}
                    ariaLabel={`${title} canvas`}
                    edges={visibleGraphData.edges}
                    height={props.height}
                    nodes={layoutedNodes}
                    onNodeSelect={(nodeId): void => {
                        setState((previousState) => ({
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
                    <h4 className={TYPOGRAPHY.cardTitle}>
                        {t("code-city:functionCallGraph.nodeDetails")}
                    </h4>
                    {selectedNode === undefined || selectedCallStats === undefined ? (
                        <p className="mt-2 text-sm text-foreground-500">
                            {t("code-city:functionCallGraph.selectNodePrompt")}
                        </p>
                    ) : (
                        <div className="mt-2 space-y-1 text-sm text-foreground-700">
                            <p>
                                {t("code-city:functionCallGraph.name", {
                                    value: selectedNode.name,
                                })}
                            </p>
                            <p>
                                {t("code-city:functionCallGraph.kind", {
                                    value: selectedNode.kind,
                                })}
                            </p>
                            <p>
                                {t("code-city:functionCallGraph.sourceFile", {
                                    value: selectedNode.file ?? "n/a",
                                })}
                            </p>
                            <p>
                                {t("code-city:functionCallGraph.complexity", {
                                    value: selectedNode.complexity ?? "n/a",
                                })}
                            </p>
                            <p>
                                {t("code-city:functionCallGraph.incomingCalls", {
                                    value: selectedCallStats.incoming,
                                })}
                            </p>
                            <p>
                                {t("code-city:functionCallGraph.outgoingCalls", {
                                    value: selectedCallStats.outgoing,
                                })}
                            </p>
                            <p>
                                {t("code-city:functionCallGraph.impactPathNodes", {
                                    value: impactPathHighlight.nodeIds.length,
                                })}
                            </p>
                            <p>
                                {t("code-city:functionCallGraph.impactPathEdges", {
                                    value: impactPathHighlight.edgeIds.length,
                                })}
                            </p>
                        </div>
                    )}
                </section>
            </CardContent>
        </Card>
    )
}
