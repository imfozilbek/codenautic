import { type ReactElement, Suspense, lazy } from "react"

import type { IGraphEdge, IGraphLayoutOptions, IGraphNode } from "./xyflow-graph-layout"

const LazyXYFlowGraphRenderer = lazy(() => {
    return import("./xyflow-graph-renderer")
})

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
    /** aria-label для контейнера графа. */
    readonly ariaLabel?: string
    /** Обработчик выбора узла по клику. */
    readonly onNodeSelect?: (nodeId: string) => void
    /** id выбранного узла для визуального выделения. */
    readonly selectedNodeId?: string
}

const DEFAULT_GRAPH_HEIGHT = "420px"

/**
 * Обёртка для XYFlow графа с динамической загрузкой рендерера.
 *
 * @param props Конфигурация графа.
 */
export function XyFlowGraph(props: IXYFlowGraphProps): ReactElement {
    const graphHeight = props.height ?? DEFAULT_GRAPH_HEIGHT
    const loadingLabel = props.loadingLabel ?? "Loading graph"

    return (
        <Suspense fallback={<div aria-live="polite">{loadingLabel}</div>}>
            <LazyXYFlowGraphRenderer
                ariaLabel={props.ariaLabel}
                edges={props.edges}
                fitView={props.fitView}
                height={graphHeight}
                layoutOptions={props.layoutOptions}
                nodes={props.nodes}
                nodesDraggable={props.nodesDraggable}
                onNodeSelect={props.onNodeSelect}
                selectedNodeId={props.selectedNodeId}
                showControls={props.showControls}
                showMiniMap={props.showMiniMap}
            />
        </Suspense>
    )
}
