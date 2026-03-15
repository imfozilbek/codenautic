import { type ReactElement, Suspense, lazy, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import type { IGraphEdge, IGraphLayoutOptions, IGraphNode } from "./xyflow-graph-layout"

const LazyXYFlowGraphRenderer = lazy(() => {
    return import("./xyflow-graph-renderer")
})

/** Настройки budget-политики рендера графов. */
export interface IGraphScaleBudgetOptions {
    /** Максимум узлов, которые можно отрисовать в полном виде. */
    readonly maxNodes?: number
    /** Максимум рёбер, которые можно отрисовать в полном виде. */
    readonly maxEdges?: number
    /** Порог узлов, после которого включается progressive render. */
    readonly progressiveThresholdNodes?: number
    /** Порог рёбер, после которого включается progressive render. */
    readonly progressiveThresholdEdges?: number
    /** Максимальная глубина обхода при budget-срезе. */
    readonly maxTraversalDepth?: number
}

interface IResolvedGraphScaleBudget {
    readonly maxNodes: number
    readonly maxEdges: number
    readonly progressiveThresholdNodes: number
    readonly progressiveThresholdEdges: number
    readonly maxTraversalDepth: number
}

interface IGraphBudgetSliceResult {
    readonly nodes: ReadonlyArray<IGraphNode>
    readonly edges: ReadonlyArray<IGraphEdge>
    readonly droppedNodes: number
    readonly droppedEdges: number
    readonly isOverBudget: boolean
}

interface ITraversalQueueItem {
    readonly id: string
    readonly depth: number
}

/** Props для графа на основе XYFlow. */
export interface IXYFlowGraphProps {
    /** Входные ноды графа. */
    readonly nodes: ReadonlyArray<IGraphNode>
    /** Входные рёбра графа. */
    readonly edges: ReadonlyArray<IGraphEdge>
    /** Опции layout engine. */
    readonly layoutOptions?: IGraphLayoutOptions
    /** Показывать панель управления (zoom/pan). */
    readonly showControls?: boolean
    /** Показывать миникарту. */
    readonly showMiniMap?: boolean
    /** Разрешить перетаскивание узлов в UI. */
    readonly nodesDraggable?: boolean
    /** Автоматически сделать fitView после инициализации. */
    readonly fitView?: boolean
    /** Высота графа. */
    readonly height?: string
    /** Текстовые fallback-лейблы при lazy загрузке. */
    readonly loadingLabel?: string
    /** Название графа для экспорта файлов. */
    readonly graphTitle?: string
    /** aria-label для контейнера графа. */
    readonly ariaLabel?: string
    /** Обработчик выбора узла по клику. */
    readonly onNodeSelect?: (nodeId: string) => void
    /** id выбранного узла для визуального выделения. */
    readonly selectedNodeId?: string
    /** Массив id узлов, которые входят в impact path. */
    readonly highlightedNodeIds?: ReadonlyArray<string>
    /** Массив id рёбер, которые входят в impact path. */
    readonly highlightedEdgeIds?: ReadonlyArray<string>
    /** Политика scale budget для больших графов. */
    readonly scaleBudget?: IGraphScaleBudgetOptions
}

const DEFAULT_GRAPH_HEIGHT = "420px"
const DEFAULT_MAX_NODES = 220
const DEFAULT_MAX_EDGES = 520
const DEFAULT_PROGRESSIVE_THRESHOLD_NODES = 90
const DEFAULT_PROGRESSIVE_THRESHOLD_EDGES = 180
const DEFAULT_MAX_TRAVERSAL_DEPTH = 4
const PROGRESSIVE_RENDER_DELAY_MS = 140

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
    if (value === undefined || Number.isFinite(value) !== true || value < 1) {
        return fallback
    }

    return Math.floor(value)
}

function resolveScaleBudget(options?: IGraphScaleBudgetOptions): IResolvedGraphScaleBudget {
    return {
        maxNodes: normalizePositiveInteger(options?.maxNodes, DEFAULT_MAX_NODES),
        maxEdges: normalizePositiveInteger(options?.maxEdges, DEFAULT_MAX_EDGES),
        progressiveThresholdNodes: normalizePositiveInteger(
            options?.progressiveThresholdNodes,
            DEFAULT_PROGRESSIVE_THRESHOLD_NODES,
        ),
        progressiveThresholdEdges: normalizePositiveInteger(
            options?.progressiveThresholdEdges,
            DEFAULT_PROGRESSIVE_THRESHOLD_EDGES,
        ),
        maxTraversalDepth: normalizePositiveInteger(
            options?.maxTraversalDepth,
            DEFAULT_MAX_TRAVERSAL_DEPTH,
        ),
    }
}

function buildAdjacencyMap(
    nodes: ReadonlyArray<IGraphNode>,
    edges: ReadonlyArray<IGraphEdge>,
): ReadonlyMap<string, ReadonlySet<string>> {
    const nodeIds = new Set<string>(nodes.map((node): string => node.id))
    const adjacency = new Map<string, Set<string>>()

    for (const node of nodes) {
        adjacency.set(node.id, new Set<string>())
    }

    for (const edge of edges) {
        if (nodeIds.has(edge.source) !== true || nodeIds.has(edge.target) !== true) {
            continue
        }

        adjacency.get(edge.source)?.add(edge.target)
        adjacency.get(edge.target)?.add(edge.source)
    }

    return adjacency
}

function buildBudgetedNodeIds(
    nodeIds: ReadonlyArray<string>,
    adjacency: ReadonlyMap<string, ReadonlySet<string>>,
    maxNodes: number,
    maxTraversalDepth: number,
): ReadonlySet<string> {
    const selectedNodeIds = new Set<string>()
    const visitedNodeIds = new Set<string>()
    const sortedNodeIds = [...nodeIds].sort((left, right): number => left.localeCompare(right))

    for (const seedId of sortedNodeIds) {
        if (selectedNodeIds.size >= maxNodes) {
            break
        }

        const queue: ITraversalQueueItem[] = [{ id: seedId, depth: 0 }]
        while (queue.length > 0) {
            if (selectedNodeIds.size >= maxNodes) {
                break
            }

            const queueItem = queue.shift()
            if (queueItem === undefined || visitedNodeIds.has(queueItem.id) === true) {
                continue
            }

            visitedNodeIds.add(queueItem.id)
            selectedNodeIds.add(queueItem.id)

            if (queueItem.depth >= maxTraversalDepth) {
                continue
            }

            const neighbors = adjacency.get(queueItem.id)
            if (neighbors === undefined) {
                continue
            }

            const sortedNeighbors = [...neighbors].sort((left, right): number =>
                left.localeCompare(right),
            )
            for (const neighborId of sortedNeighbors) {
                if (visitedNodeIds.has(neighborId) !== true) {
                    queue.push({
                        id: neighborId,
                        depth: queueItem.depth + 1,
                    })
                }
            }
        }
    }

    return selectedNodeIds
}

function buildBudgetedGraphSlice(
    nodes: ReadonlyArray<IGraphNode>,
    edges: ReadonlyArray<IGraphEdge>,
    budget: IResolvedGraphScaleBudget,
): IGraphBudgetSliceResult {
    if (nodes.length <= budget.maxNodes && edges.length <= budget.maxEdges) {
        return {
            nodes,
            edges,
            droppedNodes: 0,
            droppedEdges: 0,
            isOverBudget: false,
        }
    }

    const adjacency = buildAdjacencyMap(nodes, edges)
    const selectedNodeIds = buildBudgetedNodeIds(
        nodes.map((node): string => node.id),
        adjacency,
        budget.maxNodes,
        budget.maxTraversalDepth,
    )

    const budgetedNodes = nodes.filter((node): boolean => selectedNodeIds.has(node.id))
    const budgetedEdges = edges
        .filter(
            (edge): boolean => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target),
        )
        .slice(0, budget.maxEdges)

    const droppedNodes = Math.max(nodes.length - budgetedNodes.length, 0)
    const droppedEdges = Math.max(edges.length - budgetedEdges.length, 0)

    return {
        nodes: budgetedNodes,
        edges: budgetedEdges,
        droppedNodes,
        droppedEdges,
        isOverBudget: droppedNodes > 0 || droppedEdges > 0,
    }
}

function shouldUseProgressiveRender(
    nodesCount: number,
    edgesCount: number,
    budget: IResolvedGraphScaleBudget,
): boolean {
    return (
        nodesCount > budget.progressiveThresholdNodes ||
        edgesCount > budget.progressiveThresholdEdges
    )
}

/**
 * Обёртка для XYFlow графа с динамической загрузкой рендерера.
 *
 * @param props Конфигурация графа.
 */
export function XyFlowGraph(props: IXYFlowGraphProps): ReactElement {
    const { t } = useTranslation(["code-city"])
    const graphHeight = props.height ?? DEFAULT_GRAPH_HEIGHT
    const loadingLabel = props.loadingLabel ?? t("code-city:xyflowGraph.loadingGraph")
    const scaleBudget = useMemo(
        (): IResolvedGraphScaleBudget => resolveScaleBudget(props.scaleBudget),
        [props.scaleBudget],
    )
    const budgetedGraphSlice = useMemo(
        (): IGraphBudgetSliceResult =>
            buildBudgetedGraphSlice(props.nodes, props.edges, scaleBudget),
        [props.edges, props.nodes, scaleBudget],
    )
    const progressiveRenderEnabled = shouldUseProgressiveRender(
        props.nodes.length,
        props.edges.length,
        scaleBudget,
    )
    const [isProgressiveRenderReady, setIsProgressiveRenderReady] = useState<boolean>(
        progressiveRenderEnabled !== true,
    )

    useEffect((): (() => void) | void => {
        if (progressiveRenderEnabled !== true) {
            setIsProgressiveRenderReady(true)
            return
        }

        setIsProgressiveRenderReady(false)
        const timerId = globalThis.setTimeout((): void => {
            setIsProgressiveRenderReady(true)
        }, PROGRESSIVE_RENDER_DELAY_MS)

        return (): void => {
            globalThis.clearTimeout(timerId)
        }
    }, [progressiveRenderEnabled, budgetedGraphSlice.nodes.length, budgetedGraphSlice.edges.length])

    return (
        <section className="space-y-2" style={{ width: "100%" }}>
            {budgetedGraphSlice.isOverBudget === true ? (
                <div
                    aria-live="polite"
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground"
                >
                    {t("code-city:xyflowGraph.overBudgetMessage", {
                        shownNodes: budgetedGraphSlice.nodes.length,
                        totalNodes: props.nodes.length,
                        shownEdges: budgetedGraphSlice.edges.length,
                        totalEdges: props.edges.length,
                        droppedNodes: budgetedGraphSlice.droppedNodes,
                        droppedEdges: budgetedGraphSlice.droppedEdges,
                    })}
                </div>
            ) : null}
            {progressiveRenderEnabled === true && isProgressiveRenderReady !== true ? (
                <div
                    aria-live="polite"
                    className="flex items-center rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                    style={{ height: graphHeight }}
                >
                    {t("code-city:xyflowGraph.renderingWithBudget")}
                </div>
            ) : (
                <Suspense fallback={<div aria-live="polite">{loadingLabel}</div>}>
                    <LazyXYFlowGraphRenderer
                        ariaLabel={props.ariaLabel}
                        edges={budgetedGraphSlice.edges}
                        fitView={props.fitView}
                        height={graphHeight}
                        layoutOptions={props.layoutOptions}
                        nodes={budgetedGraphSlice.nodes}
                        graphTitle={props.graphTitle}
                        nodesDraggable={props.nodesDraggable}
                        onNodeSelect={props.onNodeSelect}
                        selectedNodeId={props.selectedNodeId}
                        highlightedNodeIds={props.highlightedNodeIds}
                        highlightedEdgeIds={props.highlightedEdgeIds}
                        showControls={props.showControls}
                        showMiniMap={props.showMiniMap}
                    />
                </Suspense>
            )}
        </section>
    )
}
