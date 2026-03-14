import {describe, expect, test} from "bun:test"

import {
    CODE_GRAPH_EDGE_TYPE,
    CODE_GRAPH_NODE_TYPE,
    type CodeGraphEdgeType,
    type ICodeGraph,
    type ICodeGraphEdge,
    type ICodeGraphNode,
} from "@codenautic/core"

import {
    AST_CODE_GRAPH_CLUSTERING_ERROR_CODE,
    AstCodeGraphClusteringError,
    AstCodeGraphClusteringService,
} from "../../src/ast"

/**
 * Creates deterministic code graph node fixture.
 *
 * @param id Stable graph node identifier.
 * @param type Graph node type.
 * @param filePath Repository-relative file path.
 * @returns Graph node fixture.
 */
function createGraphNode(
    id: string,
    type: ICodeGraphNode["type"],
    filePath: string,
): ICodeGraphNode {
    const name = id.split(":").at(-1) ?? id

    return {
        id,
        type,
        name,
        filePath,
        metadata: {},
    }
}

/**
 * Creates deterministic graph edge fixture.
 *
 * @param source Edge source identifier.
 * @param target Edge target identifier.
 * @param type Edge semantic type.
 * @returns Graph edge fixture.
 */
function createGraphEdge(
    source: string,
    target: string,
    type: CodeGraphEdgeType,
): ICodeGraphEdge {
    return {
        source,
        target,
        type,
    }
}

/**
 * Creates graph fixture from nodes and edges.
 *
 * @param nodes Graph nodes.
 * @param edges Graph edges.
 * @returns Graph fixture.
 */
function createGraph(
    nodes: readonly ICodeGraphNode[],
    edges: readonly ICodeGraphEdge[],
): ICodeGraph {
    return {
        id: "gh:repo-1@main",
        nodes,
        edges,
    }
}

/**
 * Creates reusable graph with two dense communities and one weak bridge edge.
 *
 * @returns Graph fixture for clustering scenarios.
 */
function createClusterGraph(): ICodeGraph {
    return createGraph(
        [
            createGraphNode("file:src/a.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/a.ts"),
            createGraphNode("file:src/b.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/b.ts"),
            createGraphNode("file:src/c.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/c.ts"),
            createGraphNode("file:src/d.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/d.ts"),
            createGraphNode("function:src/a.ts:alpha", CODE_GRAPH_NODE_TYPE.FUNCTION, "src/a.ts"),
            createGraphNode("function:src/b.ts:beta", CODE_GRAPH_NODE_TYPE.FUNCTION, "src/b.ts"),
            createGraphNode("function:src/c.ts:gamma", CODE_GRAPH_NODE_TYPE.FUNCTION, "src/c.ts"),
            createGraphNode("function:src/d.ts:delta", CODE_GRAPH_NODE_TYPE.FUNCTION, "src/d.ts"),
        ],
        [
            createGraphEdge("file:src/a.ts", "file:src/b.ts", CODE_GRAPH_EDGE_TYPE.IMPORTS),
            createGraphEdge("file:src/b.ts", "file:src/a.ts", CODE_GRAPH_EDGE_TYPE.IMPORTS),
            createGraphEdge("function:src/a.ts:alpha", "function:src/b.ts:beta", CODE_GRAPH_EDGE_TYPE.CALLS),
            createGraphEdge("file:src/c.ts", "file:src/d.ts", CODE_GRAPH_EDGE_TYPE.IMPORTS),
            createGraphEdge("file:src/d.ts", "file:src/c.ts", CODE_GRAPH_EDGE_TYPE.IMPORTS),
            createGraphEdge("function:src/c.ts:gamma", "function:src/d.ts:delta", CODE_GRAPH_EDGE_TYPE.CALLS),
            createGraphEdge("file:src/b.ts", "file:src/c.ts", CODE_GRAPH_EDGE_TYPE.IMPORTS),
        ],
    )
}

/**
 * Asserts typed clustering error shape.
 *
 * @param callback Action expected to throw.
 * @param code Expected typed error code.
 */
function expectAstCodeGraphClusteringError(
    callback: () => unknown,
    code: (typeof AST_CODE_GRAPH_CLUSTERING_ERROR_CODE)[keyof typeof AST_CODE_GRAPH_CLUSTERING_ERROR_CODE],
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstCodeGraphClusteringError)

        if (error instanceof AstCodeGraphClusteringError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstCodeGraphClusteringError to be thrown")
}

describe("AstCodeGraphClusteringService", () => {
    test("detects deterministic Louvain communities for file-level code graph", async () => {
        const service = new AstCodeGraphClusteringService()

        const result = await service.detectCommunities({
            graph: createClusterGraph(),
        })

        expect(result.communities).toEqual([
            {
                id: "community-001",
                filePaths: [
                    "src/a.ts",
                    "src/b.ts",
                ],
                intraCommunityEdgeWeight: 3,
                totalIncidentEdgeWeight: 7,
            },
            {
                id: "community-002",
                filePaths: [
                    "src/c.ts",
                    "src/d.ts",
                ],
                intraCommunityEdgeWeight: 3,
                totalIncidentEdgeWeight: 7,
            },
        ])
        expect(result.modularity).toBeGreaterThan(0)
    })

    test("supports requested file subset and excludes other graph files", async () => {
        const service = new AstCodeGraphClusteringService()

        const result = await service.detectCommunities({
            graph: createClusterGraph(),
            filePaths: [
                "src/a.ts",
                "src/b.ts",
                "src/c.ts",
            ],
        })

        const clusteredFilePaths = result.communities
            .flatMap((community) => community.filePaths)
            .sort()
        expect(clusteredFilePaths).toEqual([
            "src/a.ts",
            "src/b.ts",
            "src/c.ts",
        ])
        expect(clusteredFilePaths.includes("src/d.ts")).toBe(false)
    })

    test("returns singleton communities when graph has no cross-file edges", async () => {
        const graph = createGraph(
            [
                createGraphNode("file:src/first.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/first.ts"),
                createGraphNode("file:src/second.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/second.ts"),
            ],
            [],
        )
        const service = new AstCodeGraphClusteringService()

        const result = await service.detectCommunities({graph})

        expect(result.communities).toEqual([
            {
                id: "community-001",
                filePaths: ["src/first.ts"],
                intraCommunityEdgeWeight: 0,
                totalIncidentEdgeWeight: 0,
            },
            {
                id: "community-002",
                filePaths: ["src/second.ts"],
                intraCommunityEdgeWeight: 0,
                totalIncidentEdgeWeight: 0,
            },
        ])
        expect(result.modularity).toBe(0)
    })

    test("throws typed error for invalid default resolution", () => {
        expectAstCodeGraphClusteringError(
            () => new AstCodeGraphClusteringService({defaultResolution: 0}),
            AST_CODE_GRAPH_CLUSTERING_ERROR_CODE.INVALID_RESOLUTION,
        )
    })

    test("throws typed error for invalid file path subset", () => {
        const service = new AstCodeGraphClusteringService()

        expectAstCodeGraphClusteringError(
            () => {
                void service.detectCommunities({
                    graph: createClusterGraph(),
                    filePaths: ["   "],
                })
            },
            AST_CODE_GRAPH_CLUSTERING_ERROR_CODE.INVALID_FILE_PATH,
        )
    })

    test("throws typed error for invalid iteration count", () => {
        const service = new AstCodeGraphClusteringService()

        expectAstCodeGraphClusteringError(
            () => {
                void service.detectCommunities({
                    graph: createClusterGraph(),
                    iterations: 0,
                })
            },
            AST_CODE_GRAPH_CLUSTERING_ERROR_CODE.INVALID_ITERATIONS,
        )
    })
})
