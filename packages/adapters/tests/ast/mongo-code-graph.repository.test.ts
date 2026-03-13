import {describe, expect, test} from "bun:test"

import {
    CODE_GRAPH_EDGE_TYPE,
    CODE_GRAPH_NODE_TYPE,
    type CodeGraph,
    type CodeGraphEdgeType,
    type CodeGraphNodeType,
    type ICodeGraphEdge,
    type ICodeGraphNode,
} from "@codenautic/core"

import {
    AST_CODE_GRAPH_REPOSITORY_ERROR_CODE,
    AstCodeGraphRepositoryError,
    MongoCodeGraphRepository,
    type IMongoCodeGraphCollection,
    type IMongoCodeGraphDocument,
} from "../../src/ast"

/**
 * In-memory Mongo-like collection used for graph repository tests.
 */
class InMemoryMongoCodeGraphCollection
    implements IMongoCodeGraphCollection<IMongoCodeGraphDocument>
{
    public readonly documents: IMongoCodeGraphDocument[] = []

    public findOne(
        filter: Readonly<Record<string, unknown>>,
    ): Promise<IMongoCodeGraphDocument | null> {
        const scopeKey = typeof filter.scopeKey === "string" ? filter.scopeKey : undefined
        const document = this.documents.find((candidate) => {
            return scopeKey !== undefined && candidate.scopeKey === scopeKey
        })

        return Promise.resolve(document === undefined ? null : structuredClone(document))
    }

    public find(
        filter: Readonly<Record<string, unknown>>,
    ): Promise<readonly IMongoCodeGraphDocument[]> {
        const repositoryId = typeof filter.repositoryId === "string"
            ? filter.repositoryId
            : undefined
        const branch = typeof filter.branch === "string" ? filter.branch : undefined

        return Promise.resolve(
            this.documents
                .filter((candidate) => {
                    if (
                        repositoryId !== undefined
                        && candidate.repositoryId !== repositoryId
                    ) {
                        return false
                    }

                    if (branch !== undefined && candidate.branch !== branch) {
                        return false
                    }

                    return true
                })
                .map((document) => structuredClone(document)),
        )
    }

    public replaceOne(
        filter: Readonly<Record<string, unknown>>,
        replacement: IMongoCodeGraphDocument,
        _options: Readonly<{upsert: boolean}>,
    ): Promise<void> {
        const scopeKey = typeof filter.scopeKey === "string" ? filter.scopeKey : undefined
        const nextDocument = structuredClone(replacement)
        const currentIndex = this.documents.findIndex((candidate) => {
            return scopeKey !== undefined && candidate.scopeKey === scopeKey
        })

        if (currentIndex === -1) {
            this.documents.push(nextDocument)
            return Promise.resolve()
        }

        this.documents[currentIndex] = nextDocument
        return Promise.resolve()
    }
}

/**
 * Creates deterministic graph node fixture.
 *
 * @param id Stable node id.
 * @param type Graph node type.
 * @param filePath Repository-relative file path.
 * @returns Graph node fixture.
 */
function createGraphNode(
    id: string,
    type: CodeGraphNodeType,
    filePath: string,
): ICodeGraphNode {
    return {
        id,
        type,
        name: id,
        filePath,
        metadata: {
            loc: filePath.length,
        },
    }
}

/**
 * Creates deterministic graph edge fixture.
 *
 * @param source Source node id.
 * @param target Target node id.
 * @param type Semantic edge type.
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
 * Creates code graph fixture.
 *
 * @param id Graph id.
 * @param nodes Graph nodes.
 * @param edges Graph edges.
 * @returns Code graph fixture.
 */
function createGraph(
    id: string,
    nodes: readonly ICodeGraphNode[],
    edges: readonly ICodeGraphEdge[],
): CodeGraph {
    return {
        id,
        generatedAt: new Date("2026-03-14T09:00:00.000Z"),
        nodes,
        edges,
    }
}

/**
 * Resolves rejected async error for repository assertions.
 *
 * @param callback Async callback expected to fail.
 * @returns Rejected error.
 */
async function captureRejectedError(callback: () => Promise<unknown>): Promise<Error> {
    try {
        await callback()
    } catch (error) {
        return error instanceof Error ? error : new Error(String(error))
    }

    throw new Error("Expected callback to reject")
}

describe("MongoCodeGraphRepository", () => {
    test("round-trips graph snapshot and replaces existing repo branch atomically", async () => {
        const collection = new InMemoryMongoCodeGraphCollection()
        const repository = new MongoCodeGraphRepository({
            graphs: collection,
        })
        const initialGraph = createGraph(
            "gh:repo-1@main",
            [
                createGraphNode("file:src/a.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/a.ts"),
                createGraphNode("file:src/b.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/b.ts"),
            ],
            [
                createGraphEdge(
                    "file:src/a.ts",
                    "file:src/b.ts",
                    CODE_GRAPH_EDGE_TYPE.IMPORTS,
                ),
            ],
        )
        const replacementGraph = createGraph(
            "gh:repo-1@main",
            [
                createGraphNode("file:src/c.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/c.ts"),
            ],
            [],
        )

        await repository.saveGraph("gh:repo-1", initialGraph, "main")
        await repository.saveGraph("gh:repo-1", replacementGraph, "main")

        const loadedGraph = await repository.loadGraph("gh:repo-1", "main")
        const queriedNodes = await repository.queryNodes({
            type: CODE_GRAPH_NODE_TYPE.FILE,
        })

        expect(loadedGraph).toEqual(replacementGraph)
        expect(collection.documents).toHaveLength(1)
        expect(queriedNodes.map((node) => node.filePath)).toEqual(["src/c.ts"])
    })

    test("isolates graph snapshots by branch and preserves graph metadata", async () => {
        const collection = new InMemoryMongoCodeGraphCollection()
        const repository = new MongoCodeGraphRepository({
            graphs: collection,
        })
        const mainGraph = createGraph(
            "gh:repo-1@main",
            [
                createGraphNode("file:src/main.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/main.ts"),
            ],
            [],
        )
        const featureGraph = createGraph(
            "gh:repo-1@feature/code-city",
            [
                createGraphNode(
                    "file:src/feature.ts",
                    CODE_GRAPH_NODE_TYPE.FILE,
                    "src/feature.ts",
                ),
            ],
            [],
        )

        await repository.saveGraph("gh:repo-1", mainGraph, "main")
        await repository.saveGraph("gh:repo-1", featureGraph, "feature/code-city")

        const loadedMain = await repository.loadGraph("gh:repo-1", "main")
        const loadedFeature = await repository.loadGraph(
            "gh:repo-1",
            "feature/code-city",
        )

        expect(loadedMain).toEqual(mainGraph)
        expect(loadedFeature).toEqual(featureGraph)
        expect(collection.documents).toHaveLength(2)
    })

    test("filters queried nodes deterministically across stored graph snapshots", async () => {
        const collection = new InMemoryMongoCodeGraphCollection()
        const repository = new MongoCodeGraphRepository({
            graphs: collection,
        })

        await repository.saveGraph(
            "gh:repo-1",
            createGraph(
                "gh:repo-1@main",
                [
                    createGraphNode(
                        "function:src/b.ts:run",
                        CODE_GRAPH_NODE_TYPE.FUNCTION,
                        "src/b.ts",
                    ),
                    createGraphNode("file:src/b.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/b.ts"),
                ],
                [],
            ),
            "main",
        )
        await repository.saveGraph(
            "gh:repo-2",
            createGraph(
                "gh:repo-2@main",
                [
                    createGraphNode("file:src/a.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/a.ts"),
                    createGraphNode("file:src/z.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/z.ts"),
                ],
                [],
            ),
            "main",
        )

        const fileNodes = await repository.queryNodes({
            type: CODE_GRAPH_NODE_TYPE.FILE,
        })
        const exactFileNodes = await repository.queryNodes({
            filePath: "src/b.ts",
        })

        expect(fileNodes.map((node) => node.filePath)).toEqual([
            "src/a.ts",
            "src/b.ts",
            "src/z.ts",
        ])
        expect(exactFileNodes.map((node) => node.id)).toEqual([
            "file:src/b.ts",
            "function:src/b.ts:run",
        ])
    })

    test("filters queried edges by repository, branch, edge type, endpoint node, and file path", async () => {
        const collection = new InMemoryMongoCodeGraphCollection()
        const repository = new MongoCodeGraphRepository({
            graphs: collection,
        })

        await repository.saveGraph(
            "gh:repo-1",
            createGraph(
                "gh:repo-1@main",
                [
                    createGraphNode("file:src/a.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/a.ts"),
                    createGraphNode("file:src/b.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/b.ts"),
                    createGraphNode("file:src/c.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/c.ts"),
                    createGraphNode(
                        "function:src/b.ts:run",
                        CODE_GRAPH_NODE_TYPE.FUNCTION,
                        "src/b.ts",
                    ),
                ],
                [
                    createGraphEdge(
                        "file:src/a.ts",
                        "file:src/b.ts",
                        CODE_GRAPH_EDGE_TYPE.IMPORTS,
                    ),
                    createGraphEdge(
                        "file:src/b.ts",
                        "file:src/c.ts",
                        CODE_GRAPH_EDGE_TYPE.IMPORTS,
                    ),
                    createGraphEdge(
                        "file:src/b.ts",
                        "function:src/b.ts:run",
                        CODE_GRAPH_EDGE_TYPE.HAS_METHOD,
                    ),
                ],
            ),
            "main",
        )
        await repository.saveGraph(
            "gh:repo-1",
            createGraph(
                "gh:repo-1@feature",
                [
                    createGraphNode("file:src/a.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/a.ts"),
                    createGraphNode("file:src/d.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/d.ts"),
                ],
                [
                    createGraphEdge(
                        "file:src/a.ts",
                        "file:src/d.ts",
                        CODE_GRAPH_EDGE_TYPE.IMPORTS,
                    ),
                ],
            ),
            "feature",
        )

        const mainImports = await repository.queryEdges({
            repositoryId: "gh:repo-1",
            branch: "main",
            type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
        })
        const nodeScopedEdges = await repository.queryEdges({
            repositoryId: "gh:repo-1",
            branch: "main",
            nodeId: "file:src/b.ts",
            filePath: "src/b.ts",
        })

        expect(mainImports).toEqual([
            {
                source: "file:src/a.ts",
                target: "file:src/b.ts",
                type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
            },
            {
                source: "file:src/b.ts",
                target: "file:src/c.ts",
                type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
            },
        ])
        expect(nodeScopedEdges).toEqual([
            {
                source: "file:src/a.ts",
                target: "file:src/b.ts",
                type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
            },
            {
                source: "file:src/b.ts",
                target: "file:src/c.ts",
                type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
            },
            {
                source: "file:src/b.ts",
                target: "function:src/b.ts:run",
                type: CODE_GRAPH_EDGE_TYPE.HAS_METHOD,
            },
        ])
    })

    test("queries deterministic bounded paths within one repository snapshot", async () => {
        const collection = new InMemoryMongoCodeGraphCollection()
        const repository = new MongoCodeGraphRepository({
            graphs: collection,
        })

        await repository.saveGraph(
            "gh:repo-1",
            createGraph(
                "gh:repo-1@main",
                [
                    createGraphNode("file:src/a.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/a.ts"),
                    createGraphNode("file:src/b.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/b.ts"),
                    createGraphNode("file:src/c.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/c.ts"),
                    createGraphNode("file:src/d.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/d.ts"),
                ],
                [
                    createGraphEdge(
                        "file:src/a.ts",
                        "file:src/b.ts",
                        CODE_GRAPH_EDGE_TYPE.IMPORTS,
                    ),
                    createGraphEdge(
                        "file:src/b.ts",
                        "file:src/c.ts",
                        CODE_GRAPH_EDGE_TYPE.IMPORTS,
                    ),
                    createGraphEdge(
                        "file:src/a.ts",
                        "file:src/c.ts",
                        CODE_GRAPH_EDGE_TYPE.IMPORTS,
                    ),
                    createGraphEdge(
                        "file:src/a.ts",
                        "file:src/d.ts",
                        CODE_GRAPH_EDGE_TYPE.IMPORTS,
                    ),
                    createGraphEdge(
                        "file:src/d.ts",
                        "file:src/c.ts",
                        CODE_GRAPH_EDGE_TYPE.IMPORTS,
                    ),
                ],
            ),
            "main",
        )

        const paths = await repository.queryPaths({
            repositoryId: "gh:repo-1",
            branch: "main",
            sourceNodeId: "file:src/a.ts",
            targetNodeId: "file:src/c.ts",
            edgeTypes: [CODE_GRAPH_EDGE_TYPE.IMPORTS],
            maxDepth: 2,
            maxPaths: 2,
        })

        expect(paths).toHaveLength(2)
        expect(paths[0]?.nodes.map((node) => node.id)).toEqual([
            "file:src/a.ts",
            "file:src/c.ts",
        ])
        expect(paths[1]?.nodes.map((node) => node.id)).toEqual([
            "file:src/a.ts",
            "file:src/b.ts",
            "file:src/c.ts",
        ])
        expect(paths[0]?.edges.map((edge) => edge.type)).toEqual([
            CODE_GRAPH_EDGE_TYPE.IMPORTS,
        ])
    })

    test("returns empty paths for missing snapshot or disconnected nodes and validates query input", async () => {
        const collection = new InMemoryMongoCodeGraphCollection()
        const repository = new MongoCodeGraphRepository({
            graphs: collection,
        })

        await repository.saveGraph(
            "gh:repo-1",
            createGraph(
                "gh:repo-1@main",
                [
                    createGraphNode("file:src/a.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/a.ts"),
                    createGraphNode("file:src/b.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/b.ts"),
                ],
                [],
            ),
            "main",
        )

        const missingSnapshotPaths = await repository.queryPaths({
            repositoryId: "gh:repo-1",
            branch: "feature",
            sourceNodeId: "file:src/a.ts",
            targetNodeId: "file:src/b.ts",
        })
        const disconnectedPaths = await repository.queryPaths({
            repositoryId: "gh:repo-1",
            branch: "main",
            sourceNodeId: "file:src/a.ts",
            targetNodeId: "file:src/b.ts",
        })
        const invalidDepthError = await captureRejectedError(() =>
            repository.queryPaths({
                repositoryId: "gh:repo-1",
                sourceNodeId: "file:src/a.ts",
                targetNodeId: "file:src/b.ts",
                maxDepth: 0,
            }),
        )

        expect(missingSnapshotPaths).toEqual([])
        expect(disconnectedPaths).toEqual([])
        expect(invalidDepthError).toBeInstanceOf(AstCodeGraphRepositoryError)
        if (invalidDepthError instanceof AstCodeGraphRepositoryError) {
            expect(invalidDepthError.code).toBe(
                AST_CODE_GRAPH_REPOSITORY_ERROR_CODE.INVALID_MAX_DEPTH,
            )
        }
    })

    test("rejects graph snapshots with orphan edges before persistence", async () => {
        const collection = new InMemoryMongoCodeGraphCollection()
        const repository = new MongoCodeGraphRepository({
            graphs: collection,
        })

        const error = await captureRejectedError(() =>
            repository.saveGraph(
                "gh:repo-1",
                createGraph(
                    "gh:repo-1@main",
                    [
                        createGraphNode(
                            "file:src/index.ts",
                            CODE_GRAPH_NODE_TYPE.FILE,
                            "src/index.ts",
                        ),
                    ],
                    [
                        createGraphEdge(
                            "file:src/index.ts",
                            "file:src/missing.ts",
                            CODE_GRAPH_EDGE_TYPE.IMPORTS,
                        ),
                    ],
                ),
                "main",
            ),
        )

        expect(error).toBeInstanceOf(AstCodeGraphRepositoryError)
        if (error instanceof AstCodeGraphRepositoryError) {
            expect(error.code).toBe(
                AST_CODE_GRAPH_REPOSITORY_ERROR_CODE.EDGE_REFERENTIAL_INTEGRITY_VIOLATION,
            )
            expect(error.targetNodeId).toBe("file:src/missing.ts")
        }
        expect(collection.documents).toHaveLength(0)
    })

    test("rejects duplicate node ids and invalid query filters with typed errors", async () => {
        const collection = new InMemoryMongoCodeGraphCollection()
        const repository = new MongoCodeGraphRepository({
            graphs: collection,
        })

        const duplicateNodeError = await captureRejectedError(() =>
            repository.saveGraph(
                "gh:repo-1",
                createGraph(
                    "gh:repo-1@main",
                    [
                        createGraphNode(
                            "file:src/index.ts",
                            CODE_GRAPH_NODE_TYPE.FILE,
                            "src/index.ts",
                        ),
                        createGraphNode(
                            "file:src/index.ts",
                            CODE_GRAPH_NODE_TYPE.FILE,
                            "src/index.ts",
                        ),
                    ],
                    [],
                ),
                "main",
            ),
        )
        const invalidFilterError = await captureRejectedError(() =>
            repository.queryNodes({
                filePath: "   ",
            }),
        )

        expect(duplicateNodeError).toBeInstanceOf(AstCodeGraphRepositoryError)
        if (duplicateNodeError instanceof AstCodeGraphRepositoryError) {
            expect(duplicateNodeError.code).toBe(
                AST_CODE_GRAPH_REPOSITORY_ERROR_CODE.DUPLICATE_NODE_ID,
            )
        }

        expect(invalidFilterError).toBeInstanceOf(AstCodeGraphRepositoryError)
        if (invalidFilterError instanceof AstCodeGraphRepositoryError) {
            expect(invalidFilterError.code).toBe(
                AST_CODE_GRAPH_REPOSITORY_ERROR_CODE.INVALID_FILE_PATH,
            )
        }
    })
})
