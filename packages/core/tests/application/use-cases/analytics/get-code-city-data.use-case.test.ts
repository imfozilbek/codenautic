import {describe, expect, test} from "bun:test"

import type {IIssueAggregationProvider} from "../../../../src/application/ports/outbound/review/issue-aggregation-provider"
import type {IFileMetricsProvider} from "../../../../src/application/ports/outbound/analysis/file-metrics-provider"
import type {IGraphRepository} from "../../../../src/application/ports/outbound/graph/code-graph-repository.port"
import {
    CODE_GRAPH_EDGE_TYPE,
    CODE_GRAPH_NODE_TYPE,
    type IGraphQueryFilter,
    type CodeGraphNodeType,
    type ICodeGraph,
    type ICodeGraphEdge,
    type ICodeGraphNode,
} from "../../../../src/application/ports/outbound/graph/code-graph.type"
import {NotFoundError} from "../../../../src/domain/errors/not-found.error"
import {ValidationError} from "../../../../src/domain/errors/validation.error"
import {GetCodeCityDataUseCase} from "../../../../src/application/use-cases/analytics/get-code-city-data.use-case"
import type {ICodeCityDataDTO} from "../../../../src/application/dto/analytics"
import type {DomainError} from "../../../../src/domain/errors/domain.error"
import type {Result} from "../../../../src/shared/result"
import type {IIssueHeatmapEntryDTO} from "../../../../src/application/dto/analytics"

interface ITrackedCalls {
    loadGraphArgs: Array<[string, string | undefined]>
    metricsArgs: Array<[string, readonly string[]]>
    heatmapArgs: string[]
}

describe("GetCodeCityDataUseCase", () => {
    test("builds deterministic code city payload for graph-driven files", async () => {
        const {useCase, trackedCalls} = createDeterministicUseCase()

        const result = await useCase.execute({
            repoId: "  gh:repo-1 ",
            branch: "  main ",
        })

        assertDeterministicPayload(result)
        assertTrackedCalls(trackedCalls)
    })

    test("returns expected merged payload and issue metrics for duplicate aggregation rows", async () => {
        const {useCase} = createDeterministicUseCase()
        const result = await useCase.execute({
            repoId: "  gh:repo-1 ",
            branch: "  main ",
        })

        expect(result.isOk).toBe(true)
        expect(result.value.heatmap[0]).toEqual({
            filePath: "src/utils.ts",
            totalIssues: 3,
            bySeverity: {high: 2, medium: 1},
            byCategory: {bug: 2, style: 1},
        })
        expect(result.value.hotspots[0]?.filePath).toBe("src/utils.ts")
        expect(result.value.hotspots[1]?.filePath).toBe("src/index.ts")
    })

    test("returns validation error for wrong repository identifier", async () => {
        const useCase = createUseCase()

        const result = await useCase.execute({
            repoId: "wrong-format",
        })

        expect(result.isFail).toBe(true)
        expect(result.error.code).toBe("VALIDATION_ERROR")
        expect((result.error as ValidationError).fields).toEqual([{
            field: "repoId",
            message: "RepositoryId must match format <platform>:<id>",
        }])
    })

    test("returns validation error for invalid branch value", async () => {
        const useCase = createUseCase()

        const result = await useCase.execute({
            repoId: "gh:repo-1",
            branch: "   ",
        })

        expect(result.isFail).toBe(true)
        expect(result.error.code).toBe("VALIDATION_ERROR")
        const error = result.error as ValidationError
        expect(error.fields).toEqual([{
            field: "branch",
            message: "must be a non-empty string when provided",
        }])
    })

    test("returns NotFoundError when graph is missing", async () => {
        const useCase = createUseCase({graph: null})
        const result = await useCase.execute({
            repoId: "gh:repo-1",
        })

        expect(result.isFail).toBe(true)
        expect(result.error).toBeInstanceOf(NotFoundError)
        expect(result.error.code).toBe("NOT_FOUND")
    })

    test("returns validation error when file metrics loading fails", async () => {
        const useCase = createUseCase({
            metricsProvider: {
                getMetrics: () => Promise.reject(new Error("metrics store unavailable")),
            },
            issueProvider: {
                aggregateByFile: () => Promise.resolve([]),
            },
        })
        const result = await useCase.execute({
            repoId: "gh:repo-1",
        })

        expect(result.isFail).toBe(true)
        expect(result.error.code).toBe("VALIDATION_ERROR")
        const error = result.error as ValidationError
        expect(error.fields[0]?.field).toBe("repositoryId")
        expect(error.fields[0]?.message).toContain("getMetrics failed for gh:repo-1")
    })

    test("returns validation error when issue aggregation fails", async () => {
        const useCase = createUseCase({
            metricsProvider: {
                getMetrics: () => Promise.resolve([]),
            },
            issueProvider: {
                aggregateByFile: () => Promise.reject(new Error("aggregation failed")),
            },
        })
        const result = await useCase.execute({
            repoId: "gh:repo-1",
        })

        expect(result.isFail).toBe(true)
        expect(result.error.code).toBe("VALIDATION_ERROR")
        const error = result.error as ValidationError
        expect(error.fields[0]?.message).toContain("aggregateByFile failed for gh:repo-1")
    })
})

    function createUseCase(
    overrides: {
        readonly graph?: ICodeGraph | null
        readonly metricsProvider?: Partial<IFileMetricsProvider>
        readonly issueProvider?: Partial<IIssueAggregationProvider>
        readonly trackedCalls?: ITrackedCalls
    } = {},
    now: Date = new Date("2026-03-03T00:00:00.000Z"),
): GetCodeCityDataUseCase {
    const graphRepository: IGraphRepository = {
        loadGraph: (repositoryId: string, branch: string | undefined) => {
            if (overrides.trackedCalls !== undefined) {
                overrides.trackedCalls.loadGraphArgs.push([repositoryId, branch])
            }

            if (overrides.graph === null) {
                return Promise.resolve(null)
            }

            return Promise.resolve(
                overrides.graph ?? createGraph([
                    createGraphNode("n-index", CODE_GRAPH_NODE_TYPE.FILE, "src/index.ts"),
                ]),
            )
        },
        saveGraph: (_repositoryId: string, _graph: ICodeGraph): Promise<void> => {
            return Promise.resolve()
        },
        queryNodes: (_filter: IGraphQueryFilter): Promise<readonly ICodeGraphNode[]> => {
            return Promise.resolve([])
        },
    }

    const fileMetricsProvider: IFileMetricsProvider = {
        getMetrics: (repositoryId, filePaths) => {
            if (overrides.trackedCalls !== undefined) {
                overrides.trackedCalls.metricsArgs.push([repositoryId, filePaths])
            }

            if (
                overrides.metricsProvider !== undefined
                && overrides.metricsProvider.getMetrics !== undefined
            ) {
                return overrides.metricsProvider.getMetrics(repositoryId, filePaths)
            }

            return Promise.resolve([
                {
                    filePath: "src/index.ts",
                    loc: 120,
                    complexity: 8,
                    churn: 2,
                    issueCount: 1,
                    coverage: 95,
                },
            ])
        },
    }

    const issueAggregationProvider: IIssueAggregationProvider = {
        aggregateByFile: (repositoryId) => {
            if (overrides.trackedCalls !== undefined) {
                overrides.trackedCalls.heatmapArgs.push(repositoryId)
            }

            if (
                overrides.issueProvider !== undefined
                && overrides.issueProvider.aggregateByFile !== undefined
            ) {
                return overrides.issueProvider.aggregateByFile(repositoryId)
            }

            return Promise.resolve([
                createIssueHeatmapEntry("src/index.ts", 1, {high: 1}, {bug: 1}),
            ])
        },
    }

    return new GetCodeCityDataUseCase({
        graphRepository,
        fileMetricsProvider,
        issueAggregationProvider,
        now: () => now,
    })
}

function createDeterministicUseCase(
    now: Date = new Date("2026-03-03T00:00:00.000Z"),
): {useCase: GetCodeCityDataUseCase; trackedCalls: ITrackedCalls} {
    const graph = createGraph([
        createGraphNode("n-index", CODE_GRAPH_NODE_TYPE.FILE, "src/index.ts"),
        createGraphNode("n-utils", CODE_GRAPH_NODE_TYPE.FILE, "src/utils.ts"),
    ])
    const trackedCalls: ITrackedCalls = {
        loadGraphArgs: [],
        metricsArgs: [],
        heatmapArgs: [],
    }

    const useCase = createUseCase({
        graph,
        trackedCalls,
        metricsProvider: {
            getMetrics: (_repositoryId, _filePaths) => {
                return Promise.resolve([
                    {
                        filePath: "src/utils.ts",
                        loc: 30,
                        complexity: 3,
                        churn: 1,
                        issueCount: 0,
                        coverage: 80,
                    },
                    {
                        filePath: "src/index.ts",
                        loc: 120,
                        complexity: 8,
                        churn: 2,
                        issueCount: 1,
                        coverage: 90,
                    },
                ])
            },
        },
        issueProvider: {
            aggregateByFile: () => {
                return Promise.resolve([
                        createIssueHeatmapEntry("src/index.ts", 2, {
                            high: 2,
                        }, {bug: 3}),
                        createIssueHeatmapEntry("src/utils.ts", 1, {
                            medium: 1,
                        }, {style: 1}),
                        createIssueHeatmapEntry("src/utils.ts", 2, {
                            high: 2,
                        }, {bug: 2}),
                    ])
                },
            },
        }, now)

    return {
        useCase,
        trackedCalls,
    }
}

function assertDeterministicPayload(result: Result<ICodeCityDataDTO, DomainError>): void {
    expect(result.isOk).toBe(true)
    if (result.isOk === false) {
        return
    }

    const payload = result.value
    assertRootNode(payload)
    assertHotspots(payload)
    assertIssueHeatmap(payload)
}

function assertRootNode(payload: ICodeCityDataDTO): void {
    expect(payload.rootNode.id).toBe("repository-root")
    expect(payload.rootNode.name).toBe("repository")
    expect(payload.rootNode.metrics.value).toBe(150)
    expect(payload.generatedAt).toBe("2026-03-03T00:00:00.000Z")
    expect(payload.repositoryId).toBe("gh:repo-1")
    expect(payload.rootNode.children).toHaveLength(1)

    const srcDirectory = payload.rootNode.children[0]
    if (srcDirectory === undefined) {
        return
    }

    expect(srcDirectory.name).toBe("src")
    expect(srcDirectory.children).toHaveLength(2)
    expect(srcDirectory.children[0]?.name).toBe("index.ts")
    expect(srcDirectory.children[1]?.name).toBe("utils.ts")
}

function assertHotspots(payload: ICodeCityDataDTO): void {
    expect(payload.hotspots).toHaveLength(2)

    const firstHotspot = payload.hotspots[0]
    const secondHotspot = payload.hotspots[1]
    if (firstHotspot === undefined || secondHotspot === undefined) {
        return
    }

    expect(typeof firstHotspot.score).toBe("number")
    expect(typeof secondHotspot.score).toBe("number")
    expect(firstHotspot.score).toBeGreaterThan(secondHotspot.score)
}

function assertIssueHeatmap(payload: ICodeCityDataDTO): void {
    expect(payload.heatmap).toEqual([
        {
            filePath: "src/utils.ts",
            totalIssues: 3,
            bySeverity: {high: 2, medium: 1},
            byCategory: {bug: 2, style: 1},
        },
        {
            filePath: "src/index.ts",
            totalIssues: 2,
            bySeverity: {high: 2},
            byCategory: {bug: 3},
        },
    ])
}

function assertTrackedCalls(trackedCalls: ITrackedCalls): void {
    expect(trackedCalls.loadGraphArgs).toEqual([["gh:repo-1", "main"]])
    expect(trackedCalls.metricsArgs).toHaveLength(1)
    expect(trackedCalls.metricsArgs[0]?.[1]).toEqual(["src/index.ts", "src/utils.ts"])
}

function createIssueHeatmapEntry(
    filePath: string,
    totalIssues: number,
    bySeverity: Record<string, number>,
    byCategory: Record<string, number>,
): IIssueHeatmapEntryDTO {
    return {
        filePath,
        totalIssues,
        bySeverity,
        byCategory,
    }
}

function createGraph(
    nodes: readonly ICodeGraphNode[],
    edges: readonly ICodeGraphEdge[] = [
        {
            source: "n-index",
            target: "n-utils",
            type: CODE_GRAPH_EDGE_TYPE.CALLS,
        },
        {
            source: "src/index.ts",
            target: "src/utils.ts",
            type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
        },
    ],
): ICodeGraph {
    return {
        nodes,
        edges,
    }
}

function createGraphNode(
    id: string,
    type: CodeGraphNodeType,
    filePath: string,
): ICodeGraphNode {
    const fileName = filePath.split("/").at(-1) ?? ""
    return {
        id,
        type,
        name: fileName,
        filePath,
        metadata: {},
    }
}
