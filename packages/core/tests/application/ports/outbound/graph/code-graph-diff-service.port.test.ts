import {describe, expect, test} from "bun:test"

import {
    CODE_GRAPH_EDGE_TYPE,
    CODE_GRAPH_NODE_TYPE,
    type ICodeGraph,
    type ICodeGraphDiffInput,
    type ICodeGraphDiffResult,
    type ICodeGraphDiffService,
} from "../../../../../src"

class InMemoryCodeGraphDiffService implements ICodeGraphDiffService {
    public calculateDiff(input: ICodeGraphDiffInput): Promise<ICodeGraphDiffResult> {
        const filter = input.filePaths === undefined ? undefined : new Set(input.filePaths)
        const baseNodes = input.baseGraph.nodes.filter((node) => {
            return filter === undefined || filter.has(node.filePath)
        })
        const targetNodes = input.targetGraph.nodes.filter((node) => {
            return filter === undefined || filter.has(node.filePath)
        })
        const baseNodeMap = new Map(baseNodes.map((node) => [node.id, node]))
        const targetNodeMap = new Map(targetNodes.map((node) => [node.id, node]))

        const addedNodes = targetNodes
            .filter((node) => baseNodeMap.has(node.id) === false)
            .sort((left, right) => left.id.localeCompare(right.id))
        const removedNodes = baseNodes
            .filter((node) => targetNodeMap.has(node.id) === false)
            .sort((left, right) => left.id.localeCompare(right.id))
        const changedNodes = targetNodes
            .filter((node) => baseNodeMap.has(node.id))
            .map((node) => {
                const before = baseNodeMap.get(node.id)
                if (before === undefined || before.name === node.name) {
                    return undefined
                }

                return {
                    before,
                    after: node,
                }
            })
            .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
            .sort((left, right) => left.after.id.localeCompare(right.after.id))

        const baseAllowedNodeIds = new Set(baseNodes.map((node) => node.id))
        const targetAllowedNodeIds = new Set(targetNodes.map((node) => node.id))
        const baseEdges = input.baseGraph.edges.filter((edge) => {
            return baseAllowedNodeIds.has(edge.source) && baseAllowedNodeIds.has(edge.target)
        })
        const targetEdges = input.targetGraph.edges.filter((edge) => {
            return targetAllowedNodeIds.has(edge.source) && targetAllowedNodeIds.has(edge.target)
        })
        const baseEdgeKeys = new Set(baseEdges.map((edge) => edgeKey(edge)))
        const targetEdgeKeys = new Set(targetEdges.map((edge) => edgeKey(edge)))

        const addedEdges = targetEdges
            .filter((edge) => baseEdgeKeys.has(edgeKey(edge)) === false)
            .sort(compareEdge)
        const removedEdges = baseEdges
            .filter((edge) => targetEdgeKeys.has(edgeKey(edge)) === false)
            .sort(compareEdge)

        return Promise.resolve({
            addedNodes,
            removedNodes,
            changedNodes,
            addedEdges,
            removedEdges,
        })
    }
}

describe("ICodeGraphDiffService contract", () => {
    test("returns deterministic added removed and changed graph entities", async () => {
        const service = new InMemoryCodeGraphDiffService()
        const diff = await service.calculateDiff({
            baseGraph: createBaseGraph(),
            targetGraph: createTargetGraph(),
        })

        expect(diff.addedNodes.map((node) => node.id)).toEqual(["file:src/added.ts"])
        expect(diff.removedNodes.map((node) => node.id)).toEqual(["file:src/legacy.ts"])
        expect(diff.changedNodes.map((node) => node.after.id)).toEqual(["file:src/main.ts"])
        expect(diff.addedEdges).toEqual([
            {
                source: "file:src/main.ts",
                target: "file:src/added.ts",
                type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
            },
        ])
        expect(diff.removedEdges).toEqual([
            {
                source: "file:src/legacy.ts",
                target: "file:src/main.ts",
                type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
            },
        ])
    })

    test("supports optional file subset filter", async () => {
        const service = new InMemoryCodeGraphDiffService()
        const diff = await service.calculateDiff({
            baseGraph: createBaseGraph(),
            targetGraph: createTargetGraph(),
            filePaths: ["src/main.ts"],
        })

        expect(diff.addedNodes).toHaveLength(0)
        expect(diff.removedNodes).toHaveLength(0)
        expect(diff.changedNodes.map((node) => node.after.id)).toEqual(["file:src/main.ts"])
    })
})

/**
 * Creates deterministic baseline graph fixture.
 *
 * @returns Baseline graph.
 */
function createBaseGraph(): ICodeGraph {
    return {
        nodes: [
            {
                id: "file:src/main.ts",
                type: CODE_GRAPH_NODE_TYPE.FILE,
                name: "main.ts",
                filePath: "src/main.ts",
            },
            {
                id: "file:src/legacy.ts",
                type: CODE_GRAPH_NODE_TYPE.FILE,
                name: "legacy.ts",
                filePath: "src/legacy.ts",
            },
        ],
        edges: [
            {
                source: "file:src/legacy.ts",
                target: "file:src/main.ts",
                type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
            },
        ],
    }
}

/**
 * Creates deterministic target graph fixture.
 *
 * @returns Target graph.
 */
function createTargetGraph(): ICodeGraph {
    return {
        nodes: [
            {
                id: "file:src/main.ts",
                type: CODE_GRAPH_NODE_TYPE.FILE,
                name: "app-main.ts",
                filePath: "src/main.ts",
            },
            {
                id: "file:src/added.ts",
                type: CODE_GRAPH_NODE_TYPE.FILE,
                name: "added.ts",
                filePath: "src/added.ts",
            },
        ],
        edges: [
            {
                source: "file:src/main.ts",
                target: "file:src/added.ts",
                type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
            },
        ],
    }
}

/**
 * Creates deterministic edge key.
 *
 * @param edge Graph edge payload.
 * @returns Deterministic edge key.
 */
function edgeKey(edge: ICodeGraph["edges"][number]): string {
    return `${edge.source}|${edge.target}|${edge.type}`
}

/**
 * Sort comparator for graph edges.
 *
 * @param left Left edge.
 * @param right Right edge.
 * @returns Ordering comparator result.
 */
function compareEdge(
    left: ICodeGraph["edges"][number],
    right: ICodeGraph["edges"][number],
): number {
    const leftKey = edgeKey(left)
    const rightKey = edgeKey(right)

    return leftKey.localeCompare(rightKey)
}
