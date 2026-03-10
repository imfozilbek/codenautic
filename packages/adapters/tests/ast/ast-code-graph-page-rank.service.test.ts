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
    AST_CODE_GRAPH_PAGE_RANK_ERROR_CODE,
    AstCodeGraphPageRankError,
    AstCodeGraphPageRankService,
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
 * Asserts typed PageRank error shape.
 *
 * @param callback Action expected to throw.
 * @param code Expected typed error code.
 */
function expectAstCodeGraphPageRankError(
    callback: () => unknown,
    code: (typeof AST_CODE_GRAPH_PAGE_RANK_ERROR_CODE)[keyof typeof AST_CODE_GRAPH_PAGE_RANK_ERROR_CODE],
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstCodeGraphPageRankError)

        if (error instanceof AstCodeGraphPageRankError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstCodeGraphPageRankError to be thrown")
}

describe("AstCodeGraphPageRankService", () => {
    test("ranks cross-file dependencies and ignores self-loop ownership edges", async () => {
        const graph = createGraph(
            [
                createGraphNode("file:src/index.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/index.ts"),
                createGraphNode("file:src/utils.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/utils.ts"),
                createGraphNode("class:ReviewService", CODE_GRAPH_NODE_TYPE.CLASS, "src/index.ts"),
                createGraphNode("function:run", CODE_GRAPH_NODE_TYPE.FUNCTION, "src/index.ts"),
                createGraphNode("function:format", CODE_GRAPH_NODE_TYPE.FUNCTION, "src/utils.ts"),
            ],
            [
                createGraphEdge("file:src/index.ts", "file:src/utils.ts", CODE_GRAPH_EDGE_TYPE.IMPORTS),
                createGraphEdge("function:run", "function:format", CODE_GRAPH_EDGE_TYPE.CALLS),
                createGraphEdge("class:ReviewService", "function:run", CODE_GRAPH_EDGE_TYPE.HAS_METHOD),
                createGraphEdge("function:run", "function:run", CODE_GRAPH_EDGE_TYPE.CALLS),
            ],
        )
        const service = new AstCodeGraphPageRankService()

        const hotspots = await service.calculateHotspots({graph})

        expect(hotspots).toHaveLength(2)
        expect(hotspots[0]?.filePath).toBe("src/utils.ts")
        expect(hotspots[1]?.filePath).toBe("src/index.ts")
        expect(hotspots[0]?.score ?? 0).toBeGreaterThan(hotspots[1]?.score ?? 0)
    })

    test("returns deterministic tie order when graph has no cross-file edges", async () => {
        const graph = createGraph(
            [
                createGraphNode("file:src/utils.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/utils.ts"),
                createGraphNode("file:src/index.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/index.ts"),
            ],
            [],
        )
        const service = new AstCodeGraphPageRankService()

        const hotspots = await service.calculateHotspots({graph})

        expect(hotspots).toEqual([
            {
                filePath: "src/index.ts",
                score: 0.5,
            },
            {
                filePath: "src/utils.ts",
                score: 0.5,
            },
        ])
    })

    test("supports configurable damping factor for hotspot scoring", async () => {
        const graph = createGraph(
            [
                createGraphNode("file:src/index.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/index.ts"),
                createGraphNode("file:src/utils.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/utils.ts"),
            ],
            [
                createGraphEdge("file:src/index.ts", "file:src/utils.ts", CODE_GRAPH_EDGE_TYPE.IMPORTS),
            ],
        )
        const service = new AstCodeGraphPageRankService()

        const lowerDamping = await service.calculateHotspots({
            graph,
            dampingFactor: 0.5,
        })
        const higherDamping = await service.calculateHotspots({
            graph,
            dampingFactor: 0.95,
        })

        expect(lowerDamping[0]?.filePath).toBe("src/utils.ts")
        expect(higherDamping[0]?.filePath).toBe("src/utils.ts")
        expect((higherDamping[0]?.score ?? 0) > (lowerDamping[0]?.score ?? 0)).toBe(true)
    })

    test("supports requested file subset and excludes other graph files", async () => {
        const graph = createGraph(
            [
                createGraphNode("file:src/index.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/index.ts"),
                createGraphNode("file:src/utils.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/utils.ts"),
                createGraphNode("file:src/extra.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/extra.ts"),
            ],
            [
                createGraphEdge("file:src/index.ts", "file:src/utils.ts", CODE_GRAPH_EDGE_TYPE.IMPORTS),
                createGraphEdge("file:src/extra.ts", "file:src/utils.ts", CODE_GRAPH_EDGE_TYPE.IMPORTS),
            ],
        )
        const service = new AstCodeGraphPageRankService()

        const hotspots = await service.calculateHotspots({
            graph,
            filePaths: ["src/index.ts", "src/utils.ts"],
        })

        expect(hotspots).toHaveLength(2)
        expect(hotspots.some((entry) => entry.filePath === "src/extra.ts")).toBe(false)
    })

    test("throws typed error for invalid defaults", () => {
        expectAstCodeGraphPageRankError(
            () => new AstCodeGraphPageRankService({defaultDampingFactor: 1}),
            AST_CODE_GRAPH_PAGE_RANK_ERROR_CODE.INVALID_DAMPING_FACTOR,
        )
    })

    test("throws typed error for invalid file path subset", () => {
        const service = new AstCodeGraphPageRankService()

        expectAstCodeGraphPageRankError(
            () => {
                void service.calculateHotspots({
                    graph: createGraph([], []),
                    filePaths: ["   "],
                })
            },
            AST_CODE_GRAPH_PAGE_RANK_ERROR_CODE.INVALID_FILE_PATH,
        )
    })

    test("throws typed error for invalid iteration count", () => {
        const service = new AstCodeGraphPageRankService()

        expectAstCodeGraphPageRankError(
            () => {
                void service.calculateHotspots({
                    graph: createGraph([], []),
                    iterations: 0,
                })
            },
            AST_CODE_GRAPH_PAGE_RANK_ERROR_CODE.INVALID_ITERATIONS,
        )
    })
})
