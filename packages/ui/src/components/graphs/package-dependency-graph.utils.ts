/**
 * Утилиты для package dependency graph: фильтрация, кластеризация,
 * impact path highlight, huge graph fallback.
 */

import type { IGraphEdge, IGraphNode } from "@/components/graphs/xyflow-graph-layout"

import type { IPackageDependencyNode, IPackageDependencyRelation } from "./package-dependency-graph"
import {
    CLUSTER_NODE_PREFIX,
    HUGE_GRAPH_EDGE_THRESHOLD,
    HUGE_GRAPH_NODE_THRESHOLD,
    MAX_FALLBACK_HUBS,
    MAX_FALLBACK_PATH_ROWS,
    MAX_LABEL_LENGTH,
} from "./package-dependency-graph.constants"

/**
 * Нормализованные данные package graph.
 */
export interface IPackageDependencyGraphData {
    /**
     * Узлы графа.
     */
    readonly nodes: ReadonlyArray<IGraphNode>
    /**
     * Рёбра графа.
     */
    readonly edges: ReadonlyArray<IGraphEdge>
}

/**
 * Статистика входящих/исходящих связей пакета.
 */
export interface IPackageRelationStats {
    /**
     * Количество входящих связей.
     */
    readonly incoming: number
    /**
     * Количество исходящих связей.
     */
    readonly outgoing: number
}

/**
 * Данные impact path highlight.
 */
export interface IImpactPathHighlight {
    /**
     * ID подсвеченных рёбер.
     */
    readonly edgeIds: ReadonlyArray<string>
    /**
     * ID подсвеченных узлов.
     */
    readonly nodeIds: ReadonlyArray<string>
}

/**
 * Строка fallback-таблицы path для huge graph.
 */
export interface IGraphFallbackPathRow {
    /**
     * Источник зависимости.
     */
    readonly source: string
    /**
     * Цель зависимости.
     */
    readonly target: string
    /**
     * Тип зависимости.
     */
    readonly relationType: string
}

/**
 * Строка fallback-таблицы hub для huge graph.
 */
export interface IGraphFallbackHubRow {
    /**
     * ID узла.
     */
    readonly nodeId: string
    /**
     * Отображаемое имя.
     */
    readonly label: string
    /**
     * Суммарная степень (incoming + outgoing).
     */
    readonly totalDegree: number
    /**
     * Количество входящих связей.
     */
    readonly incoming: number
    /**
     * Количество исходящих связей.
     */
    readonly outgoing: number
}

/**
 * Данные для fallback-режима huge graph.
 */
export interface IHugeGraphFallbackData {
    /**
     * Top-hub узлы по степени.
     */
    readonly topHubs: ReadonlyArray<IGraphFallbackHubRow>
    /**
     * Первые N path-строк.
     */
    readonly pathRows: ReadonlyArray<IGraphFallbackPathRow>
}

/**
 * Snapshot layout состояния для localStorage persistence.
 */
export interface ILayerLayoutSnapshot {
    /**
     * Режим отображения.
     */
    readonly viewMode: "detailed" | "clustered"
    /**
     * Уровень детализации.
     */
    readonly lodMode: "overview" | "details"
    /**
     * Развёрнутые layer-кластеры.
     */
    readonly expandedLayerIds: ReadonlyArray<IPackageDependencyNode["layer"]>
}

/**
 * Создаёт ID cluster-узла из layer.
 *
 * @param layer - Уровень слоя.
 * @returns ID вида `cluster:layer:<layer>`.
 */
export function createClusterNodeId(layer: IPackageDependencyNode["layer"]): string {
    return `${CLUSTER_NODE_PREFIX}${layer}`
}

/**
 * Type guard: проверяет является ли строка валидным package layer.
 *
 * @param value - Строка для проверки.
 * @returns True если значение — валидный layer.
 */
export function isPackageLayer(value: string): value is IPackageDependencyNode["layer"] {
    return (
        value === "core" ||
        value === "api" ||
        value === "ui" ||
        value === "worker" ||
        value === "db" ||
        value === "infra"
    )
}

/**
 * Извлекает layer из cluster node ID.
 *
 * @param nodeId - ID узла.
 * @returns Layer или undefined если ID не является cluster.
 */
export function parseClusterLayer(nodeId: string): IPackageDependencyNode["layer"] | undefined {
    if (nodeId.startsWith(CLUSTER_NODE_PREFIX) !== true) {
        return undefined
    }

    const layerId = nodeId.slice(CLUSTER_NODE_PREFIX.length)
    if (isPackageLayer(layerId)) {
        return layerId
    }

    return undefined
}

/**
 * Читает layout snapshot из localStorage.
 *
 * @returns Snapshot или undefined если данных нет или они повреждены.
 */
export function readLayoutSnapshot(): ILayerLayoutSnapshot | undefined {
    if (typeof globalThis.localStorage === "undefined") {
        return undefined
    }

    const rawSnapshot = globalThis.localStorage.getItem(
        "ui.package-graph.layout.v1",
    )
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
                    .filter(
                        (item): item is IPackageDependencyNode["layer"] =>
                            item.length > 0 && isPackageLayer(item),
                    ),
            }
        }
    } catch {
        return undefined
    }

    return undefined
}

/**
 * Сохраняет layout snapshot в localStorage.
 *
 * @param snapshot - Snapshot для сохранения.
 */
export function writeLayoutSnapshot(snapshot: ILayerLayoutSnapshot): void {
    if (typeof globalThis.localStorage === "undefined") {
        return
    }

    globalThis.localStorage.setItem(
        "ui.package-graph.layout.v1",
        JSON.stringify(snapshot),
    )
}

/**
 * Группирует узлы по layer в Map.
 *
 * @param nodes - Массив узлов пакетов.
 * @returns Map layer → массив узлов.
 */
export function buildLayerClusterMap(
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

/**
 * Фильтрует связи по выбранным типам.
 *
 * @param relations - Все связи.
 * @param selectedRelationTypes - Выбранные типы (пустой = все).
 * @returns Отфильтрованные связи.
 */
export function filterRelationsByType(
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

/**
 * Подготавливает label для отображения, обрезая длинные строки.
 *
 * @param label - Исходный label.
 * @returns Label ≤ MAX_LABEL_LENGTH символов.
 */
export function normalizeNodeLabel(label: string): string {
    if (label.length <= MAX_LABEL_LENGTH) {
        return label
    }

    return `…${label.slice(label.length - (MAX_LABEL_LENGTH - 1))}`
}

/**
 * Создаёт label для cluster-узла.
 *
 * @param layer - Уровень слоя.
 * @param membersCount - Количество участников кластера.
 * @returns Label вида "LAYER cluster (N)".
 */
export function createClusterLabel(
    layer: IPackageDependencyNode["layer"],
    membersCount: number,
): string {
    return `${layer.toUpperCase()} cluster (${membersCount})`
}

/**
 * Формирует graph data в кластеризованном режиме.
 *
 * @param nodes - Исходные пакетные узлы.
 * @param relations - Связи между пакетами.
 * @param expandedLayerIds - Раскрытые слои.
 * @returns Нормализованные nodes/edges для XYFlow.
 */
export function buildClusteredPackageGraphData(
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

/**
 * Формирует node/edge для рендеринга package dependency graph (detailed mode).
 *
 * @param nodes - Пакетные узлы.
 * @param relations - Связи.
 * @returns Нормализованные nodes/edges для XYFlow.
 */
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

/**
 * Фильтрует graph data по названию пакета.
 *
 * @param data - Текущие nodes/edges.
 * @param nodes - Оригинальные пакетные узлы (для поиска по name).
 * @param query - Поисковый запрос.
 * @returns Отфильтрованные nodes/edges.
 */
export function filterByPackageName(
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

/**
 * Собирает уникальные типы зависимостей в отсортированном порядке.
 *
 * @param relations - Связи пакетов.
 * @returns Отсортированный массив уникальных relationType.
 */
export function collectRelationTypes(
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

/**
 * Переключает relationType в фильтре.
 *
 * @param selected - Текущие выбранные типы.
 * @param relationType - Тип для toggle.
 * @returns Обновлённый массив выбранных типов.
 */
export function toggleRelationFilter(
    selected: ReadonlyArray<string>,
    relationType: string,
): ReadonlyArray<string> {
    const current = selected.findIndex((entry): boolean => entry === relationType)
    if (current >= 0) {
        return selected.filter((entry): boolean => entry !== relationType)
    }

    return [...selected, relationType]
}

/**
 * Переключает layer в списке развёрнутых кластеров.
 *
 * @param selected - Текущие развёрнутые слои.
 * @param layer - Слой для toggle.
 * @returns Обновлённый массив развёрнутых слоёв.
 */
export function toggleExpandedLayer(
    selected: ReadonlyArray<IPackageDependencyNode["layer"]>,
    layer: IPackageDependencyNode["layer"],
): ReadonlyArray<IPackageDependencyNode["layer"]> {
    if (selected.includes(layer) === true) {
        return selected.filter((item): boolean => item !== layer)
    }

    return [...selected, layer]
}

/**
 * Формирует summary строку для графа.
 *
 * @param nodesCount - Количество узлов.
 * @param edgesCount - Количество рёбер.
 * @returns Summary вида "Nodes: N, edges: M".
 */
export function createSummaryText(nodesCount: number, edgesCount: number): string {
    return `Nodes: ${nodesCount}, edges: ${edgesCount}`
}

/**
 * Подсчитывает входящие/исходящие связи для пакета.
 *
 * @param relations - Все связи.
 * @param nodeId - ID узла для подсчёта.
 * @returns Статистика incoming/outgoing.
 */
export function calculatePackageRelationStats(
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

/**
 * BFS по графу для highlight impact path выбранного узла.
 *
 * @param graphData - Nodes/edges графа.
 * @param nodeId - ID узла для impact analysis.
 * @returns Подсвеченные node/edge ID.
 */
export function calculateImpactPathHighlight(
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
 * Применяет focus path filter — оставляет только узлы/рёбра связанные с выбранным.
 *
 * @param graphData - Полные nodes/edges.
 * @param selectedNodeId - ID выбранного узла.
 * @param focusPathOnly - Включён ли режим focus path.
 * @returns Отфильтрованные nodes/edges.
 */
export function applyFocusPathFilter(
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

/**
 * Проверяет превышает ли граф порог huge graph.
 *
 * @param nodesCount - Количество узлов.
 * @param edgesCount - Количество рёбер.
 * @returns True если граф слишком большой для прямого рендеринга.
 */
export function isHugeGraph(nodesCount: number, edgesCount: number): boolean {
    return nodesCount > HUGE_GRAPH_NODE_THRESHOLD || edgesCount > HUGE_GRAPH_EDGE_THRESHOLD
}

/**
 * Формирует fallback-данные для huge graph (top hubs + path rows).
 *
 * @param nodes - Пакетные узлы.
 * @param relations - Связи.
 * @returns Top-hub узлы и первые N path-строк.
 */
export function buildHugeGraphFallbackData(
    nodes: ReadonlyArray<IPackageDependencyNode>,
    relations: ReadonlyArray<IPackageDependencyRelation>,
): IHugeGraphFallbackData {
    const nodesById = new Map<string, IPackageDependencyNode>()
    const statsByNodeId = new Map<string, { incoming: number; outgoing: number }>()

    for (const node of nodes) {
        nodesById.set(node.id, node)
        statsByNodeId.set(node.id, { incoming: 0, outgoing: 0 })
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

    return { topHubs, pathRows }
}
