import { type ReactElement, useMemo, useState } from "react"

import { Button, Card, CardBody, CardHeader, Input } from "@/components/ui"
import { XyFlowGraph } from "@/components/graphs/xyflow-graph"
import {
    calculateGraphLayout,
    type IGraphEdge,
    type IGraphNode,
} from "@/components/graphs/xyflow-graph-layout"

/** Описание файла для графа зависимостей. */
export interface IFileDependencyNode {
    /** Уникальный id файла (path-based). */
    readonly id: string
    /** Путь к файлу. */
    readonly path: string
    /** Размер/сложность файла для визуального веса. */
    readonly complexity?: number
    /** Уровень изменения файла. */
    readonly churn?: number
}

/** Ребро зависимости между файлами. */
export interface IFileDependencyRelation {
    /** Источник зависимости. */
    readonly source: string
    /** Целевая зависимость. */
    readonly target: string
    /** Тип зависимости для подписи ребра. */
    readonly relationType?: string
}

/** Данные для построения file dependency графа. */
export interface IFileDependencyGraphData {
    /** Узлы графа. */
    readonly nodes: ReadonlyArray<IGraphNode>
    /** Рёбра графа. */
    readonly edges: ReadonlyArray<IGraphEdge>
}

/** Конфигурация визуализации file-level dependency графа. */
export interface IFileDependencyGraphProps {
    /** Файлы репозитория. */
    readonly files: ReadonlyArray<IFileDependencyNode>
    /** Связи зависимости между файлами. */
    readonly dependencies: ReadonlyArray<IFileDependencyRelation>
    /** Фиксированная высота графа. */
    readonly height?: string
    /** Заголовок блока. */
    readonly title?: string
    /** Отображать мини-карту. */
    readonly showMiniMap?: boolean
    /** Включать панель управления. */
    readonly showControls?: boolean
    /** Опциональный текст для пустого состояния. */
    readonly emptyStateLabel?: string
}

interface IFileDependencyGraphState {
    readonly query: string
    readonly selectedNodeId?: string
    readonly showImpactPaths: boolean
}

interface INodeDependencyStats {
    readonly incoming: number
    readonly outgoing: number
}

interface IImpactPathHighlight {
    readonly edgeIds: ReadonlyArray<string>
    readonly nodeIds: ReadonlyArray<string>
}

/** Лимитируем длину label, чтобы избежать расширения верстки. */
const MAX_LABEL_LENGTH = 42

/** Нормализует имя label с учетом лимита. */
function normalizeNodeLabel(path: string): string {
    if (path.length <= MAX_LABEL_LENGTH) {
        return path
    }

    return `…${path.slice(path.length - (MAX_LABEL_LENGTH - 1))}`
}

/** Формирует данные для визуализации графа из domain-модели файла/зависимостей. */
export function buildFileDependencyGraphData(
    files: ReadonlyArray<IFileDependencyNode>,
    dependencies: ReadonlyArray<IFileDependencyRelation>,
): IFileDependencyGraphData {
    const fileIds = new Set<string>(files.map((file): string => file.id))
    const edgeKeys = new Set<string>()
    const edges: IGraphEdge[] = []

    for (const relation of dependencies) {
        if (fileIds.has(relation.source) !== true || fileIds.has(relation.target) !== true) {
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

    const nodes: IGraphNode[] = files.map((file): IGraphNode => {
        const label = normalizeNodeLabel(file.path)
        return {
            id: file.id,
            label,
            width: 220 + ((file.complexity ?? 1) > 0 ? Math.min(file.complexity ?? 1, 30) * 2 : 0),
            height: 72,
        }
    })

    return { edges, nodes }
}

/** Фильтрует узлы/рёбра по поиску по path. */
function filterFileDependencyData(
    data: IFileDependencyGraphData,
    files: ReadonlyArray<IFileDependencyNode>,
    query: string,
): IFileDependencyGraphData {
    const trimQuery = query.trim().toLowerCase()
    if (trimQuery.length === 0) {
        return data
    }

    const fileById = new Map<string, IFileDependencyNode>()
    for (const file of files) {
        fileById.set(file.id, file)
    }

    const selectedIds = new Set<string>()
    for (const file of files) {
        if (file.path.toLowerCase().includes(trimQuery) === true) {
            selectedIds.add(file.id)
        }
    }

    const filteredNodes = data.nodes.filter((node): boolean => selectedIds.has(node.id))
    const filteredNodeIds = new Set<string>(filteredNodes.map((node): string => node.id))

    const filteredEdges = data.edges.filter((edge): boolean => {
        return filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
    })

    return {
        nodes: filteredNodes,
        edges: filteredEdges,
    }
}

/** Формирует заголовок метрики из узлов и рёбер. */
function createSummaryText(nodesCount: number, edgesCount: number): string {
    return `Nodes: ${nodesCount}, edges: ${edgesCount}`
}

/** Возвращает входящие/исходящие связи для выбранного узла. */
function calculateDependencyStats(
    dependencies: ReadonlyArray<IFileDependencyRelation>,
    nodeId: string,
): INodeDependencyStats {
    let incoming = 0
    let outgoing = 0

    for (const relation of dependencies) {
        if (relation.source === nodeId) {
            outgoing += 1
        }
        if (relation.target === nodeId) {
            incoming += 1
        }
    }

    return { incoming, outgoing }
}

/** Строит highlight данные impact path для выбранного узла. */
function calculateImpactPathHighlight(
    graphData: IFileDependencyGraphData,
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
 * Рендерит file-level dependency graph для одного репозитория.
 *
 * @param props Пропсы графа.
 */
export function FileDependencyGraph(props: IFileDependencyGraphProps): ReactElement {
    const [state, setState] = useState<IFileDependencyGraphState>({
        query: "",
        selectedNodeId: undefined,
        showImpactPaths: false,
    })
    const title = props.title ?? "File dependency graph"
    const emptyStateLabel = props.emptyStateLabel ?? "No file dependencies yet."
    const graphData = useMemo(
        (): IFileDependencyGraphData =>
            buildFileDependencyGraphData(props.files, props.dependencies),
        [props.dependencies, props.files],
    )

    const layoutedNodes = useMemo(() => {
        return calculateGraphLayout(graphData.nodes, graphData.edges, {
            direction: "LR",
            nodeSpacingX: 110,
            nodeSpacingY: 100,
            margin: 18,
        })
    }, [graphData])

    const visibleGraphData = useMemo(
        (): IFileDependencyGraphData => filterFileDependencyData(graphData, props.files, state.query),
        [graphData, props.files, state.query],
    )

    const isEmptyState = visibleGraphData.nodes.length === 0
    const summaryText = createSummaryText(visibleGraphData.nodes.length, visibleGraphData.edges.length)
    const filesById = useMemo((): ReadonlyMap<string, IFileDependencyNode> => {
        const nextMap = new Map<string, IFileDependencyNode>()
        for (const file of props.files) {
            nextMap.set(file.id, file)
        }
        return nextMap
    }, [props.files])
    const selectedFile = useMemo((): IFileDependencyNode | undefined => {
        if (state.selectedNodeId === undefined) {
            return undefined
        }
        return filesById.get(state.selectedNodeId)
    }, [filesById, state.selectedNodeId])
    const selectedDependencyStats = useMemo((): INodeDependencyStats | undefined => {
        if (state.selectedNodeId === undefined) {
            return undefined
        }
        return calculateDependencyStats(props.dependencies, state.selectedNodeId)
    }, [props.dependencies, state.selectedNodeId])
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
                        aria-label="Filter files"
                        placeholder="Filter files by path"
                        value={state.query}
                        onValueChange={(nextQuery): void => {
                            setState((previousState) => ({
                                ...previousState,
                                query: nextQuery,
                            }))
                        }}
                    />
                    {state.query.length > 0 ? (
                        <Button
                            variant="flat"
                            color="default"
                            onPress={(): void => {
                                setState((previousState) => ({
                                    ...previousState,
                                    query: "",
                                }))
                            }}
                        >
                            Reset
                        </Button>
                    ) : null}
                    <Button
                        color={state.showImpactPaths ? "success" : "default"}
                        isDisabled={state.selectedNodeId === undefined}
                        variant={state.showImpactPaths ? "flat" : "bordered"}
                        onPress={(): void => {
                            setState((previousState) => ({
                                ...previousState,
                                showImpactPaths: !previousState.showImpactPaths,
                            }))
                        }}
                    >
                        Highlight impact paths
                    </Button>
                </div>
            </CardHeader>
            <CardBody className="gap-4">
                {isEmptyState ? (
                    <p>{emptyStateLabel}</p>
                ) : (
                    <XyFlowGraph
                        ariaLabel="File dependencies graph"
                        nodes={state.query.length > 0 ? visibleGraphData.nodes : layoutedNodes}
                        edges={visibleGraphData.edges}
                        height={props.height}
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
                        fitView
                        layoutOptions={{
                            direction: "LR",
                            margin: 18,
                            nodeSpacingX: 110,
                            nodeSpacingY: 100,
                        }}
                    />
                )}
                <section
                    aria-live="polite"
                    className="rounded-xl border border-default-200 bg-content2 p-4"
                >
                    <h4 className="text-sm font-semibold text-foreground">Node details</h4>
                    {selectedFile === undefined || selectedDependencyStats === undefined ? (
                        <p className="mt-2 text-sm text-foreground-500">
                            Select a node to inspect dependencies.
                        </p>
                    ) : (
                        <div className="mt-2 space-y-1 text-sm text-foreground-700">
                            <p>{`Path: ${selectedFile.path}`}</p>
                            <p>{`Node id: ${selectedFile.id}`}</p>
                            <p>{`Complexity: ${selectedFile.complexity ?? "n/a"}`}</p>
                            <p>{`Churn: ${selectedFile.churn ?? "n/a"}`}</p>
                            <p>{`Incoming deps: ${selectedDependencyStats.incoming}`}</p>
                            <p>{`Outgoing deps: ${selectedDependencyStats.outgoing}`}</p>
                            <p>{`Impact path nodes: ${impactPathHighlight.nodeIds.length}`}</p>
                            <p>{`Impact path edges: ${impactPathHighlight.edgeIds.length}`}</p>
                        </div>
                    )}
                </section>
            </CardBody>
        </Card>
    )
}
