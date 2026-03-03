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
            // Доп.данные сохраняем в data, но типы для render оставляем базовыми.
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

/** Формирует summary строку. */
function createSummaryText(nodesCount: number, edgesCount: number): string {
    return `Nodes: ${nodesCount}, edges: ${edgesCount}`
}

/**
 * Рендерит module/package dependency graph.
 *
 * @param props Пропсы компонента.
 */
export function PackageDependencyGraph(props: IPackageDependencyGraphProps): ReactElement {
    const [state, setState] = useState<IPackageDependencyGraphState>({ query: "" })
    const title = props.title ?? "Package dependency graph"
    const emptyStateLabel = props.emptyStateLabel ?? "No package dependencies yet."
    const graphData = useMemo(
        (): IPackageDependencyGraphData =>
            buildPackageDependencyGraphData(props.nodes, props.relations),
        [props.nodes, props.relations],
    )
    const visibleGraphData = useMemo(
        (): IPackageDependencyGraphData =>
            filterByPackageName(graphData, props.nodes, state.query),
        [graphData, props.nodes, state.query],
    )
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

