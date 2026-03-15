import dagre from "@dagrejs/dagre"

/** Направление автолэйаута графа. */
export type TGraphLayoutDirection = "LR" | "TB"

/** Базовый узел графа для визуализации. */
export interface IGraphNode {
    /** Уникальный идентификатор узла. */
    readonly id: string
    /** Читаемая метка узла. */
    readonly label: string
    /** Ширина узла для расчёта лэйаута. */
    readonly width?: number
    /** Высота узла для расчёта лэйаута. */
    readonly height?: number
    /** Произвольные данные ноды для интеграции с рендерером. */
    readonly [key: string]: unknown
}

/** Базовое ребро графа для визуализации. */
export interface IGraphEdge {
    /** Уникальный идентификатор ребра. */
    readonly id?: string
    /** Идентификатор источника. */
    readonly source: string
    /** Идентификатор цели. */
    readonly target: string
    /** Опциональная метка ребра. */
    readonly label?: string
    /** Произвольные данные ребра для интеграции с рендерером. */
    readonly [key: string]: unknown
}

/** Узел после автолэйаута с координатами в React Flow пространстве. */
export interface IGraphLayoutNode extends IGraphNode {
    /** Вычисленная позиция (левый верхний угол). */
    readonly position: {
        /** X в px. */
        readonly x: number
        /** Y в px. */
        readonly y: number
    }
    /** Привязанный размер после нормализации. */
    readonly width: number
    /** Привязанный размер после нормализации. */
    readonly height: number
}

/** Параметры автолэйаута и отрисовки. */
export interface IGraphLayoutOptions {
    /** Направление: слева направо / сверху вниз. */
    readonly direction?: TGraphLayoutDirection
    /** Горизонтальный отступ между нодами. */
    readonly nodeSpacingX?: number
    /** Вертикальный отступ между нодами. */
    readonly nodeSpacingY?: number
    /** Отступ от краёв холста. */
    readonly margin?: number
}

/** Значения по умолчанию для размеров узла и отступов. */
const DEFAULT_NODE_WIDTH = 220
const DEFAULT_NODE_HEIGHT = 70
const DEFAULT_NODE_SPACING_X = 120
const DEFAULT_NODE_SPACING_Y = 80
const DEFAULT_LAYOUT_MARGIN = 16

interface IDagreNodeMetadata {
    readonly x?: number
    readonly y?: number
}

/** Вычисляет детерминированный графовый лэйаут через Dagre для React Flow. */
export function calculateGraphLayout(
    nodes: ReadonlyArray<IGraphNode>,
    edges: ReadonlyArray<IGraphEdge>,
    options: IGraphLayoutOptions = {},
): ReadonlyArray<IGraphLayoutNode> {
    const layoutGraph = new dagre.graphlib.Graph()
    const nodeSet = new Set<string>(nodes.map((node): string => node.id))
    const direction = options.direction ?? "LR"
    const nodeSpacingX = options.nodeSpacingX ?? DEFAULT_NODE_SPACING_X
    const nodeSpacingY = options.nodeSpacingY ?? DEFAULT_NODE_SPACING_Y
    const margin = options.margin ?? DEFAULT_LAYOUT_MARGIN

    layoutGraph.setGraph({
        rankdir: direction,
        nodesep: nodeSpacingX,
        ranksep: nodeSpacingY,
        marginx: margin,
        marginy: margin,
    })
    layoutGraph.setDefaultEdgeLabel((): Record<string, never> => ({}))

    for (const node of nodes) {
        const width = node.width ?? DEFAULT_NODE_WIDTH
        const height = node.height ?? DEFAULT_NODE_HEIGHT
        layoutGraph.setNode(node.id, { width, height })
    }

    for (const edge of edges) {
        if (nodeSet.has(edge.source) !== true || nodeSet.has(edge.target) !== true) {
            continue
        }
        layoutGraph.setEdge(edge.source, edge.target)
    }

    dagre.layout(layoutGraph)

    return nodes.map((node) => {
        const nodeMetadata = layoutGraph.node(node.id) as IDagreNodeMetadata | undefined
        const width = node.width ?? DEFAULT_NODE_WIDTH
        const height = node.height ?? DEFAULT_NODE_HEIGHT
        const nodeX = nodeMetadata?.x
        const nodeY = nodeMetadata?.y

        return {
            ...node,
            width,
            height,
            position: {
                x: (nodeX ?? 0) - width / 2,
                y: (nodeY ?? 0) - height / 2,
            },
        }
    })
}
