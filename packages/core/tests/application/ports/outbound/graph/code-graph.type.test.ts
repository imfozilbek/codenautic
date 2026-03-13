import {describe, expect, test} from "bun:test"

import {
    CODE_GRAPH_EDGE_TYPE,
    CODE_GRAPH_NODE_TYPE,
    type CodeGraphEdgeType,
    type CodeGraphNodeMetadataValue,
    type ICodeGraphEdge,
    type ICodeGraphNode,
    type IGraphEdgeQueryFilter,
    type IGraphPathQuery,
    type IGraphPathResult,
} from "../../../../../src"

describe("Code graph public exports", () => {
    test("exports CodeGraphNodeMetadataValue from package root for graph metadata typing", () => {
        const metadataValue: CodeGraphNodeMetadataValue = "typescript"
        const node: ICodeGraphNode = {
            id: "file:src/index.ts",
            type: CODE_GRAPH_NODE_TYPE.FILE,
            name: "index.ts",
            filePath: "src/index.ts",
            metadata: {
                language: metadataValue,
                functionCount: 4,
                hasSyntaxErrors: false,
                score: null,
            },
        }

        expect(node.metadata?.language).toBe("typescript")
        expect(node.metadata?.functionCount).toBe(4)
        expect(node.type).toBe(CODE_GRAPH_NODE_TYPE.FILE)
    })

    test("exports HAS_METHOD edge type from package root for enriched graph relations", () => {
        const edgeType: CodeGraphEdgeType = CODE_GRAPH_EDGE_TYPE.HAS_METHOD
        const edge: ICodeGraphEdge = {
            source: "class:src/index.ts:ReviewService:10",
            target: "function:src/index.ts:ReviewService:run:14",
            type: edgeType,
        }

        expect(edge.type).toBe("HAS_METHOD")
    })

    test("exports edge and path query graph types from package root", () => {
        const edgeFilter: IGraphEdgeQueryFilter = {
            repositoryId: "gh:repo-1",
            branch: "main",
            type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
            nodeId: "file:src/index.ts",
            filePath: "src/index.ts",
        }
        const pathQuery: IGraphPathQuery = {
            repositoryId: "gh:repo-1",
            branch: "main",
            sourceNodeId: "file:src/index.ts",
            targetNodeId: "file:src/utils.ts",
            edgeTypes: [CODE_GRAPH_EDGE_TYPE.IMPORTS],
            maxDepth: 3,
            maxPaths: 2,
        }
        const pathResult: IGraphPathResult = {
            nodes: [
                {
                    id: "file:src/index.ts",
                    type: CODE_GRAPH_NODE_TYPE.FILE,
                    name: "index.ts",
                    filePath: "src/index.ts",
                },
                {
                    id: "file:src/utils.ts",
                    type: CODE_GRAPH_NODE_TYPE.FILE,
                    name: "utils.ts",
                    filePath: "src/utils.ts",
                },
            ],
            edges: [
                {
                    source: "file:src/index.ts",
                    target: "file:src/utils.ts",
                    type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
                },
            ],
        }

        expect(edgeFilter.type).toBe(CODE_GRAPH_EDGE_TYPE.IMPORTS)
        expect(pathQuery.maxDepth).toBe(3)
        expect(pathResult.nodes[1]?.id).toBe("file:src/utils.ts")
        expect(pathResult.edges[0]?.type).toBe(CODE_GRAPH_EDGE_TYPE.IMPORTS)
    })
})
