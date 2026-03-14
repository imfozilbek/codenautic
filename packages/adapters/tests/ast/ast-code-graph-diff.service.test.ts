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
    AST_CODE_GRAPH_DIFF_ERROR_CODE,
    AstCodeGraphDiffError,
    AstCodeGraphDiffService,
} from "../../src/ast"

/**
 * Creates deterministic graph node fixture.
 *
 * @param id Stable graph node identifier.
 * @param filePath Repository-relative file path.
 * @param name Optional display name.
 * @returns Graph node fixture.
 */
function createGraphNode(id: string, filePath: string, name?: string): ICodeGraphNode {
    return {
        id,
        type: CODE_GRAPH_NODE_TYPE.FILE,
        name: name ?? id.split(":").at(-1) ?? id,
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
    type: CodeGraphEdgeType = CODE_GRAPH_EDGE_TYPE.IMPORTS,
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
 * Creates baseline graph for diff scenarios.
 *
 * @returns Baseline graph.
 */
function createBaseGraph(): ICodeGraph {
    return createGraph(
        [
            createGraphNode("file:src/a.ts", "src/a.ts", "a.ts"),
            createGraphNode("file:src/b.ts", "src/b.ts", "b.old.ts"),
            createGraphNode("file:src/c.ts", "src/c.ts", "c.ts"),
        ],
        [
            createGraphEdge("file:src/b.ts", "file:src/a.ts"),
            createGraphEdge("file:src/c.ts", "file:src/a.ts"),
        ],
    )
}

/**
 * Creates target graph for diff scenarios.
 *
 * @returns Target graph.
 */
function createTargetGraph(): ICodeGraph {
    return createGraph(
        [
            createGraphNode("file:src/a.ts", "src/a.ts", "a.ts"),
            createGraphNode("file:src/b.ts", "src/b.ts", "b.new.ts"),
            createGraphNode("file:src/d.ts", "src/d.ts", "d.ts"),
        ],
        [
            createGraphEdge("file:src/b.ts", "file:src/a.ts"),
            createGraphEdge("file:src/a.ts", "file:src/d.ts"),
        ],
    )
}

/**
 * Asserts typed graph diff error shape.
 *
 * @param callback Action expected to throw.
 * @param code Expected typed error code.
 */
function expectAstCodeGraphDiffError(
    callback: () => unknown,
    code: (typeof AST_CODE_GRAPH_DIFF_ERROR_CODE)[keyof typeof AST_CODE_GRAPH_DIFF_ERROR_CODE],
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstCodeGraphDiffError)

        if (error instanceof AstCodeGraphDiffError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstCodeGraphDiffError to be thrown")
}

describe("AstCodeGraphDiffService", () => {
    test("detects deterministic added removed changed nodes and edges", async () => {
        const service = new AstCodeGraphDiffService()

        const diff = await service.calculateDiff({
            baseGraph: createBaseGraph(),
            targetGraph: createTargetGraph(),
        })

        expect(diff.addedNodes.map((node) => node.id)).toEqual(["file:src/d.ts"])
        expect(diff.removedNodes.map((node) => node.id)).toEqual(["file:src/c.ts"])
        expect(diff.changedNodes.map((node) => node.after.id)).toEqual(["file:src/b.ts"])
        expect(diff.addedEdges).toEqual([
            {
                source: "file:src/a.ts",
                target: "file:src/d.ts",
                type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
            },
        ])
        expect(diff.removedEdges).toEqual([
            {
                source: "file:src/c.ts",
                target: "file:src/a.ts",
                type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
            },
        ])
    })

    test("supports requested file subset and excludes unrelated nodes", async () => {
        const service = new AstCodeGraphDiffService()

        const diff = await service.calculateDiff({
            baseGraph: createBaseGraph(),
            targetGraph: createTargetGraph(),
            filePaths: [
                "src/a.ts",
                "src/b.ts",
            ],
        })

        expect(diff.addedNodes).toHaveLength(0)
        expect(diff.removedNodes).toHaveLength(0)
        expect(diff.changedNodes.map((node) => node.after.id)).toEqual(["file:src/b.ts"])
        expect(diff.addedEdges).toHaveLength(0)
        expect(diff.removedEdges).toHaveLength(0)
    })

    test("throws typed error for invalid file path filter", () => {
        const service = new AstCodeGraphDiffService()

        expectAstCodeGraphDiffError(
            () => {
                void service.calculateDiff({
                    baseGraph: createBaseGraph(),
                    targetGraph: createTargetGraph(),
                    filePaths: ["   "],
                })
            },
            AST_CODE_GRAPH_DIFF_ERROR_CODE.INVALID_FILE_PATH,
        )
    })
})
