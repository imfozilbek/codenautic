import { useMemo, useState, type ReactElement } from "react"

/**
 * Узел impact graph.
 */
export interface IImpactGraphNode {
    /** Уникальный id узла. */
    readonly id: string
    /** Подпись узла. */
    readonly label: string
    /** Вложенность узла для визуального отступа. */
    readonly depth: number
    /** Степень impact для узла. */
    readonly impactScore: number
}

/**
 * Ребро impact graph.
 */
export interface IImpactGraphEdge {
    /** Уникальный id ребра. */
    readonly id: string
    /** Source узел. */
    readonly sourceId: string
    /** Target узел. */
    readonly targetId: string
}

/**
 * Пропсы impact graph view.
 */
export interface IImpactGraphViewProps {
    /** Набор узлов графа. */
    readonly nodes: ReadonlyArray<IImpactGraphNode>
    /** Набор ребер графа. */
    readonly edges: ReadonlyArray<IImpactGraphEdge>
    /** Callback фокуса по узлу. */
    readonly onFocusNode?: (node: IImpactGraphNode) => void
}

/**
 * Строит map children для source -> targets.
 *
 * @param edges Ребра графа.
 * @returns Map дочерних связей.
 */
function buildChildrenMap(
    edges: ReadonlyArray<IImpactGraphEdge>,
): ReadonlyMap<string, ReadonlyArray<string>> {
    const childrenMap = new Map<string, Array<string>>()
    edges.forEach((edge): void => {
        const current = childrenMap.get(edge.sourceId) ?? []
        current.push(edge.targetId)
        childrenMap.set(edge.sourceId, current)
    })
    return childrenMap
}

/**
 * Возвращает список видимых узлов с учетом collapsed parents.
 *
 * @param nodes Все узлы.
 * @param edges Все ребра.
 * @param collapsedNodeIds Список свернутых узлов.
 * @returns Видимые узлы.
 */
function resolveVisibleNodes(
    nodes: ReadonlyArray<IImpactGraphNode>,
    edges: ReadonlyArray<IImpactGraphEdge>,
    collapsedNodeIds: ReadonlyArray<string>,
): ReadonlyArray<IImpactGraphNode> {
    if (nodes.length === 0) {
        return []
    }

    const nodeMap = new Map<string, IImpactGraphNode>()
    nodes.forEach((node): void => {
        nodeMap.set(node.id, node)
    })

    const incomingTargets = new Set<string>()
    edges.forEach((edge): void => {
        incomingTargets.add(edge.targetId)
    })
    const rootNodes = nodes.filter((node): boolean => incomingTargets.has(node.id) === false)
    const childrenMap = buildChildrenMap(edges)
    const collapsedSet = new Set<string>(collapsedNodeIds)
    const visited = new Set<string>()
    const visibleNodes: Array<IImpactGraphNode> = []

    const visitNode = (nodeId: string): void => {
        if (visited.has(nodeId)) {
            return
        }
        const node = nodeMap.get(nodeId)
        if (node === undefined) {
            return
        }
        visited.add(nodeId)
        visibleNodes.push(node)

        if (collapsedSet.has(nodeId)) {
            return
        }

        const children = childrenMap.get(nodeId) ?? []
        children.forEach((childId): void => {
            visitNode(childId)
        })
    }

    rootNodes.forEach((rootNode): void => {
        visitNode(rootNode.id)
    })

    return visibleNodes
}

/**
 * Визуализация impact propagation graph с animated edges и collapse controls.
 *
 * @param props Узлы, ребра и callback фокуса.
 * @returns React-компонент impact graph.
 */
export function ImpactGraphView(props: IImpactGraphViewProps): ReactElement {
    const [collapsedNodeIds, setCollapsedNodeIds] = useState<ReadonlyArray<string>>([])

    const visibleNodes = useMemo((): ReadonlyArray<IImpactGraphNode> => {
        return resolveVisibleNodes(props.nodes, props.edges, collapsedNodeIds)
    }, [collapsedNodeIds, props.edges, props.nodes])

    const visibleNodeIds = useMemo((): ReadonlySet<string> => {
        return new Set<string>(visibleNodes.map((node): string => node.id))
    }, [visibleNodes])
    const visibleEdges = useMemo((): ReadonlyArray<IImpactGraphEdge> => {
        return props.edges.filter((edge): boolean => {
            return visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId)
        })
    }, [props.edges, visibleNodeIds])

    const toggleCollapse = (nodeId: string): void => {
        setCollapsedNodeIds((currentIds): ReadonlyArray<string> => {
            if (currentIds.includes(nodeId)) {
                return currentIds.filter((id): boolean => id !== nodeId)
            }
            return [...currentIds, nodeId]
        })
    }

    return (
        <section className="rounded-lg border border-border bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Impact graph view</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Dependency graph for impact propagation with animated edges and collapsible nodes.
            </p>

            <ul className="mt-3 space-y-1 rounded border border-border bg-surface p-2">
                {visibleEdges.map(
                    (edge): ReactElement => (
                        <li
                            className="text-[11px] text-muted-foreground animate-pulse"
                            key={edge.id}
                        >
                            {edge.sourceId} → {edge.targetId}
                        </li>
                    ),
                )}
            </ul>

            <ul className="mt-3 space-y-2">
                {visibleNodes.map((node): ReactElement => {
                    const isCollapsed = collapsedNodeIds.includes(node.id)
                    return (
                        <li
                            className="rounded border border-border bg-surface p-2"
                            key={node.id}
                            style={{
                                marginLeft: `${String(node.depth * 12)}px`,
                            }}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        {node.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Impact score {String(node.impactScore)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        aria-label={`Toggle impact node ${node.label}`}
                                        className="rounded border border-border px-2 py-1 text-xs font-semibold text-foreground"
                                        onClick={(): void => {
                                            toggleCollapse(node.id)
                                        }}
                                        type="button"
                                    >
                                        {isCollapsed ? "Expand" : "Collapse"}
                                    </button>
                                    <button
                                        aria-label={`Inspect impact node ${node.label}`}
                                        className="rounded border border-cyan-300 bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-800"
                                        onClick={(): void => {
                                            props.onFocusNode?.(node)
                                        }}
                                        type="button"
                                    >
                                        Focus
                                    </button>
                                </div>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
