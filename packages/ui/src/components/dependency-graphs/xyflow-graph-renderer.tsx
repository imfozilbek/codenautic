import { type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
    Background,
    Controls,
    MiniMap,
    Panel,
    Position,
    type Edge,
    ReactFlow,
    type Node,
    useReactFlow,
} from "@xyflow/react"

import "@xyflow/react/dist/style.css"

import {
    calculateGraphLayout,
    type IGraphEdge,
    type IGraphLayoutNode,
    type IGraphLayoutOptions,
    type IGraphNode,
} from "./xyflow-graph-layout"
import { exportGraphAsPng, exportGraphAsSvg } from "./graph-export"

/** Параметры визуального рендера XYFlow. */
interface IXYFlowGraphRendererProps {
    /** Входные ноды для графа. */
    readonly nodes: ReadonlyArray<IGraphNode>
    /** Входные рёбра для графа. */
    readonly edges: ReadonlyArray<IGraphEdge>
    /** Аргументы автолэйаута. */
    readonly layoutOptions?: IGraphLayoutOptions
    /** Показывать ли миникарту. */
    readonly showMiniMap?: boolean
    /** Показывать ли панель управления. */
    readonly showControls?: boolean
    /** Разрешить перетаскивание узлов. */
    readonly nodesDraggable?: boolean
    /** Автоматически подогнать масштаб под содержимое. */
    readonly fitView?: boolean
    /** aria-label для контейнера графа. */
    readonly ariaLabel?: string
    /** Высота графа. */
    readonly height: string
    /** Обработчик выбора узла по клику. */
    readonly onNodeSelect?: (nodeId: string) => void
    /** id выбранного узла для визуального выделения. */
    readonly selectedNodeId?: string
    /** Массив id узлов, которые входят в impact path. */
    readonly highlightedNodeIds?: ReadonlyArray<string>
    /** Массив id рёбер, которые входят в impact path. */
    readonly highlightedEdgeIds?: ReadonlyArray<string>
    /** Название графа для экспорта. */
    readonly graphTitle?: string
}

const VIEWPORT_PAN_STEP = 160

/** Панель ручных контролов для управления видом графа. */
function XYFlowViewportControls(): ReactElement {
    const { t } = useTranslation(["code-city"])
    const flowInstance = useReactFlow()

    const moveViewport = (deltaX: number, deltaY: number): void => {
        const viewport = flowInstance.getViewport()
        void flowInstance.setViewport(
            {
                x: viewport.x + deltaX,
                y: viewport.y + deltaY,
                zoom: viewport.zoom,
            },
            { duration: 220 },
        )
    }

    return (
        <Panel
            className="flex flex-col gap-2 rounded border bg-surface/95 p-2"
            position="top-right"
        >
            <div className="flex gap-1">
                <button
                    aria-label={t("code-city:xyflowRenderer.ariaZoomIn")}
                    className="rounded border border-border px-2 py-1 text-sm"
                    onClick={(): void => {
                        void flowInstance.zoomIn({ duration: 180 })
                    }}
                    type="button"
                >
                    +
                </button>
                <button
                    aria-label={t("code-city:xyflowRenderer.ariaZoomOut")}
                    className="rounded border border-border px-2 py-1 text-sm"
                    onClick={(): void => {
                        void flowInstance.zoomOut({ duration: 180 })
                    }}
                    type="button"
                >
                    -
                </button>
                <button
                    aria-label={t("code-city:xyflowRenderer.ariaResetZoom")}
                    className="rounded border border-border px-2 py-1 text-xs"
                    onClick={(): void => {
                        void flowInstance.fitView({ padding: 0.15, duration: 220 })
                    }}
                    type="button"
                >
                    {t("code-city:xyflowRenderer.fit")}
                </button>
            </div>
            <div className="grid grid-cols-3 gap-1">
                <span />
                <button
                    aria-label={t("code-city:xyflowRenderer.ariaPanUp")}
                    className="rounded border border-border px-2 py-1 text-sm"
                    onClick={(): void => {
                        moveViewport(0, VIEWPORT_PAN_STEP)
                    }}
                    type="button"
                >
                    ↑
                </button>
                <span />
                <button
                    aria-label={t("code-city:xyflowRenderer.ariaPanLeft")}
                    className="rounded border border-border px-2 py-1 text-sm"
                    onClick={(): void => {
                        moveViewport(VIEWPORT_PAN_STEP, 0)
                    }}
                    type="button"
                >
                    ←
                </button>
                <span />
                <button
                    aria-label={t("code-city:xyflowRenderer.ariaPanRight")}
                    className="rounded border border-border px-2 py-1 text-sm"
                    onClick={(): void => {
                        moveViewport(-VIEWPORT_PAN_STEP, 0)
                    }}
                    type="button"
                >
                    →
                </button>
                <span />
                <button
                    aria-label={t("code-city:xyflowRenderer.ariaPanDown")}
                    className="rounded border border-border px-2 py-1 text-sm"
                    onClick={(): void => {
                        moveViewport(0, -VIEWPORT_PAN_STEP)
                    }}
                    type="button"
                >
                    ↓
                </button>
                <span />
            </div>
        </Panel>
    )
}

/** Панель экспорта графа как SVG/PNG. */
function XYFlowExportControls(props: {
    readonly graphTitle: string
    readonly nodes: ReadonlyArray<IGraphLayoutNode>
    readonly edges: ReadonlyArray<IGraphEdge>
}): ReactElement {
    const { t } = useTranslation(["code-city"])
    const [isExportingPng, setIsExportingPng] = useState<boolean>(false)
    const canExport = props.nodes.length > 0
    const exportTitle = props.graphTitle.trim().length > 0 ? props.graphTitle : "graph"

    return (
        <Panel
            className="flex flex-col gap-2 rounded border bg-surface/95 p-2"
            position="top-right"
        >
            <button
                aria-label={t("code-city:xyflowRenderer.ariaExportSvg")}
                className="rounded border border-border px-2 py-1 text-xs"
                disabled={canExport !== true}
                onClick={(): void => {
                    if (canExport !== true) {
                        return
                    }
                    exportGraphAsSvg(exportTitle, props.nodes, props.edges)
                }}
                type="button"
            >
                {t("code-city:xyflowRenderer.exportSvg")}
            </button>
            <button
                aria-label={t("code-city:xyflowRenderer.ariaExportPng")}
                className="rounded border border-border px-2 py-1 text-xs disabled:opacity-50"
                disabled={canExport !== true || isExportingPng === true}
                onClick={(): void => {
                    if (canExport !== true || isExportingPng === true) {
                        return
                    }
                    setIsExportingPng(true)
                    void exportGraphAsPng(exportTitle, props.nodes, props.edges).finally(() => {
                        setIsExportingPng(false)
                    })
                }}
                type="button"
            >
                {isExportingPng === true
                    ? t("code-city:xyflowRenderer.exportingPng")
                    : t("code-city:xyflowRenderer.exportPng")}
            </button>
        </Panel>
    )
}

/** Реальный рендерер графа на базе `@xyflow/react`. */
export function XYFlowGraphRenderer(props: IXYFlowGraphRendererProps): ReactElement {
    const {
        fitView = true,
        nodesDraggable = false,
        showControls = true,
        showMiniMap = false,
    } = props

    const layoutedNodes = useMemo(
        () => calculateGraphLayout(props.nodes, props.edges, props.layoutOptions),
        [props.edges, props.layoutOptions, props.nodes],
    )
    const normalizedExportTitle = (props.graphTitle ?? "").trim()
    const exportTitle = normalizedExportTitle.length === 0 ? "Graph" : normalizedExportTitle

    const reactFlowNodes = useMemo((): Array<Node<IGraphNode>> => {
        const highlightedNodeIds = new Set<string>(props.highlightedNodeIds ?? [])
        return layoutedNodes.map((node): Node<IGraphNode> => {
            const isSelected = props.selectedNodeId === node.id
            const isHighlighted = highlightedNodeIds.has(node.id)
            return {
                id: node.id,
                data: node,
                position: node.position,
                draggable: nodesDraggable,
                style: {
                    width: `${node.width}px`,
                    height: `${node.height}px`,
                    padding: 8,
                    borderRadius: 12,
                    border: isSelected
                        ? "2px solid hsl(var(--nextui-colors-primary))"
                        : isHighlighted
                          ? "2px solid hsl(var(--nextui-colors-success))"
                          : "1px solid hsl(var(--nextui-colors-defaultBorder))",
                    backgroundColor: isHighlighted
                        ? "color-mix(in srgb, hsl(var(--nextui-colors-success)) 8%, hsl(var(--nextui-colors-content1)))"
                        : "hsl(var(--nextui-colors-content1))",
                    color: "hsl(var(--nextui-colors-foreground))",
                    boxShadow: isSelected
                        ? "0 0 0 3px color-mix(in srgb, hsl(var(--nextui-colors-primary)) 20%, transparent)"
                        : isHighlighted
                          ? "0 0 0 2px color-mix(in srgb, hsl(var(--nextui-colors-success)) 16%, transparent)"
                          : undefined,
                },
                type: "default",
                sourcePosition: Position.Right,
                targetPosition: Position.Left,
            }
        })
    }, [layoutedNodes, nodesDraggable, props.highlightedNodeIds, props.selectedNodeId])

    const reactFlowEdges = useMemo((): Array<Edge<IGraphEdge>> => {
        const highlightedEdgeIds = new Set<string>(props.highlightedEdgeIds ?? [])
        return props.edges.map((edge): Edge<IGraphEdge> => {
            const id = edge.id ?? `${edge.source}-${edge.target}`
            const isHighlighted = highlightedEdgeIds.has(id)
            return {
                id,
                source: edge.source,
                target: edge.target,
                label: edge.label,
                type: "smoothstep",
                animated: isHighlighted,
                data: edge,
                style: {
                    strokeWidth: isHighlighted ? 3 : 2,
                    stroke: isHighlighted
                        ? "hsl(var(--nextui-colors-success))"
                        : "hsl(var(--nextui-colors-primary))",
                },
            }
        })
    }, [props.edges, props.highlightedEdgeIds])

    return (
        <section aria-label={props.ariaLabel} style={{ width: "100%", height: props.height }}>
            <ReactFlow
                nodes={reactFlowNodes}
                edges={reactFlowEdges}
                fitView={fitView}
                fitViewOptions={{ padding: 0.15, minZoom: 0.15 }}
                minZoom={0.2}
                maxZoom={2}
                panOnDrag
                panOnScroll
                zoomOnScroll
                zoomOnPinch
                nodesDraggable={nodesDraggable}
                nodesConnectable={false}
                elementsSelectable={false}
                onNodeClick={(_event, node): void => {
                    if (props.onNodeSelect !== undefined) {
                        props.onNodeSelect(node.id)
                    }
                }}
            >
                <Background color="hsl(var(--nextui-colors-defaultBorder))" gap={16} />
                {showControls === true ? (
                    <>
                        <Controls />
                        <XYFlowViewportControls />
                        <XYFlowExportControls
                            edges={props.edges}
                            graphTitle={exportTitle}
                            nodes={layoutedNodes}
                        />
                    </>
                ) : null}
                {showMiniMap === true ? <MiniMap pannable /> : null}
            </ReactFlow>
        </section>
    )
}

export default XYFlowGraphRenderer
