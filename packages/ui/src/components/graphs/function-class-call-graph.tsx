import { type ReactElement, useMemo, useState } from "react"

import { Button, Card, CardBody, CardHeader, Input } from "@/components/ui"
import { XyFlowGraph } from "@/components/graphs/xyflow-graph"
import {
    calculateGraphLayout,
    type IGraphEdge,
    type IGraphNode,
} from "@/components/graphs/xyflow-graph-layout"

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
            width: 220 + ((node.complexity ?? 1) > 0 ? Math.min(node.complexity ?? 1, 25) * 1.5 : 0),
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

    const filteredNodes = data.nodes.filter(
        (node): boolean => selectedNodeIds.has(node.id),
    )
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

/**
 * Рендерит function/class call graph для одного репозитория.
 *
 * @param props Пропсы графа.
 */
export function FunctionClassCallGraph(props: IFunctionCallGraphProps): ReactElement {
    const [state, setState] = useState<IFunctionCallGraphState>({ query: "" })
    const title = props.title ?? "Function/Class call graph"
    const emptyStateLabel = props.emptyStateLabel ?? "No function or class call relationships yet."
    const graphData = useMemo(
        (): IFunctionCallGraphData =>
            buildFunctionCallGraphData(props.nodes, props.callRelations),
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
    const summaryText = createSummaryText(visibleGraphData.nodes.length, visibleGraphData.edges.length)

    if (layoutedNodes.length === 0 || isEmptyState === true) {
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
                        aria-label="Filter function/class nodes"
                        placeholder="Filter by function or class"
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
                </div>
            </CardHeader>
            <CardBody>
                <XyFlowGraph
                    ariaLabel={`${title} canvas`}
                    edges={visibleGraphData.edges}
                    height={props.height}
                    nodes={layoutedNodes}
                    showControls={props.showControls}
                    showMiniMap={props.showMiniMap}
                />
            </CardBody>
        </Card>
    )
}
