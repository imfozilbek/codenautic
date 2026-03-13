import {describe, expect, test} from "bun:test"

import {NotFoundError} from "../../../../src/domain/errors/not-found.error"
import {ValidationError} from "../../../../src/domain/errors/validation.error"
import {GetTemporalDiffUseCase} from "../../../../src/application/use-cases/analytics/get-temporal-diff.use-case"
import type {IGraphRepository} from "../../../../src/application/ports/outbound/graph/code-graph-repository.port"
import {
    CODE_GRAPH_NODE_TYPE,
    type CodeGraphNodeType,
    type ICodeGraph,
    type ICodeGraphEdge,
    type ICodeGraphNode,
    type IGraphEdgeQueryFilter,
    type IGraphPathQuery,
    type IGraphPathResult,
} from "../../../../src/application/ports/outbound/graph/code-graph.type"
import type {ITemporalDiffResult} from "../../../../src/application/dto/analytics/temporal-diff.dto"

const node = (
    id: string,
    filePath: string,
    metadata: Record<string, number> = {},
): ICodeGraphNode => {
    return {
        id,
        type: CODE_GRAPH_NODE_TYPE.FILE,
        name: filePath,
        filePath,
        metadata,
    }
}

const createGraph = (nodes: ICodeGraphNode[]): ICodeGraph => {
    const edges: ICodeGraphEdge[] = []
    return {
        nodes,
        edges,
    }
}

class InMemoryGraphRepository implements IGraphRepository {
    private readonly snapshots: Map<string, ICodeGraph | null>
    private readonly nodes: ICodeGraphNode[] = []

    public constructor(snapshots: Record<string, ICodeGraph | null>) {
        this.snapshots = new Map(Object.entries(snapshots))
    }

    public loadGraph(
        repositoryId: string,
        commitRef?: string,
    ): Promise<ICodeGraph | null> {
        const key = `${repositoryId}@${commitRef}`
        return Promise.resolve(this.snapshots.get(key) ?? null)
    }

    public saveGraph(
        _repositoryId: string,
        _graph: ICodeGraph,
    ): Promise<void> {
        return Promise.resolve()
    }

    public queryNodes(filter: {
        readonly type?: CodeGraphNodeType
        readonly filePath?: string
    }): Promise<readonly ICodeGraphNode[]> {
        const fileType = filter.type
        if (filter.filePath !== undefined) {
            return Promise.resolve(this.nodes.filter((node) => {
                if (node.filePath !== filter.filePath) {
                    return false
                }

                if (fileType !== undefined) {
                    return node.type === fileType
                }

                return true
            }))
        }

        if (fileType !== undefined) {
            return Promise.resolve(this.nodes.filter((node) => node.type === fileType))
        }

        return Promise.resolve(this.nodes)
    }

    public queryEdges(_filter: IGraphEdgeQueryFilter): Promise<readonly ICodeGraphEdge[]> {
        return Promise.resolve([])
    }

    public queryPaths(_query: IGraphPathQuery): Promise<readonly IGraphPathResult[]> {
        return Promise.resolve([])
    }
}

describe("GetTemporalDiffUseCase", () => {
    test("возвращает детерминированный added/removed/changed", async () => {
        const repository = new InMemoryGraphRepository({
            "gh:repo@main": createGraph([
                node("n-a", "src/a.ts", {loc: 10, complexity: 1, churn: 1}),
                node("n-b", "src/b.ts", {loc: 20, issueCount: 2}),
                node("n-d.ts", "src/z.ts", {loc: 40}),
            ]),
            "gh:repo@feature": createGraph([
                node("n-b", "src/b.ts", {loc: 25, issueCount: 4, churn: 3}),
                node("n-c", "src/c.ts", {loc: 5, complexity: 2, coverage: 87}),
            ]),
        })

        const useCase = new GetTemporalDiffUseCase({
            graphRepository: repository,
        })
        const result = await useCase.execute({
            repoId: "gh:repo",
            fromCommit: "main",
            toCommit: "feature",
        })

        expect(result.isOk).toBe(true)
        const value: ITemporalDiffResult = result.value

        expect(value.added.map((item) => item.id)).toEqual(["src/c.ts"])
        expect(value.removed.map((item) => item.id)).toEqual(["src/a.ts", "src/z.ts"])
        expect(value.changed.map((item) => item.node.id)).toEqual(["src/b.ts"])

        expect(value.added[0]?.metrics.value).toBe(5)
        expect(value.added[0]?.metrics.extras).toEqual({
            complexity: 2,
            coverage: 87,
        })
        expect(value.changed[0]?.metricsDelta.loc).toBe(5)
        expect(value.changed[0]?.metricsDelta.issueCount).toBe(2)
        expect(value.changed[0]?.metricsDelta.churn).toBe(3)
        expect(value.changed[0]?.metricsDelta.complexity).toBeUndefined()
    })

    test("собирает все поля валидации сразу", async () => {
        const useCase = new GetTemporalDiffUseCase({
            graphRepository: new InMemoryGraphRepository({}),
        })

        const result = await useCase.execute({
            repoId: " ",
            fromCommit: "",
            toCommit: "",
        })

        expect(result.isFail).toBe(true)
        expect(result.error).toBeInstanceOf(ValidationError)
        const validationError = result.error as ValidationError
        expect(validationError.fields).toEqual([
            {
                field: "repoId",
                message: "must be a non-empty string",
            },
            {
                field: "fromCommit",
                message: "must be a non-empty string",
            },
            {
                field: "toCommit",
                message: "must be a non-empty string",
            },
        ])
    })

    test("валидирует формат repoId отдельной ошибкой", async () => {
        const useCase = new GetTemporalDiffUseCase({
            graphRepository: new InMemoryGraphRepository({}),
        })
        const result = await useCase.execute({
            repoId: "repo",
            fromCommit: "main",
            toCommit: "feature",
        })

        expect(result.isFail).toBe(true)
        expect(result.error).toBeInstanceOf(ValidationError)
        const validationError = result.error as ValidationError
        expect(validationError.fields).toEqual([{
            field: "repoId",
            message: "RepositoryId must match format <platform>:<id>",
        }])
    })

    test("возвращает NotFoundError, если граф для коммита отсутствует", async () => {
        const repository = new InMemoryGraphRepository({
            "gh:repo@main": createGraph([]),
            "gh:repo@feature": createGraph([]),
        })

        const useCase = new GetTemporalDiffUseCase({
            graphRepository: repository,
        })
        const missingFrom = await useCase.execute({
            repoId: "gh:repo",
            fromCommit: "missing-main",
            toCommit: "feature",
        })

        expect(missingFrom.isFail).toBe(true)
        expect(missingFrom.error).toBeInstanceOf(NotFoundError)
        expect((missingFrom.error as NotFoundError).entityId).toBe("gh:repo@missing-main")

        const missingTo = await useCase.execute({
            repoId: "gh:repo",
            fromCommit: "main",
            toCommit: "missing-feature",
        })

        expect(missingTo.isFail).toBe(true)
        expect(missingTo.error).toBeInstanceOf(NotFoundError)
        expect((missingTo.error as NotFoundError).entityId).toBe("gh:repo@missing-feature")
    })

    test("sorts multiple added and changed nodes deterministically", async () => {
        const repository = new InMemoryGraphRepository({
            "gh:repo@main": createGraph([
                node("n-a", "src/a.ts", {loc: 5}),
                node("n-b", "src/b.ts", {loc: 10}),
                node("n-c", "src/c.ts", {loc: 20}),
            ]),
            "gh:repo@feature": createGraph([
                node("n-b", "src/b.ts", {loc: 12}),
                node("n-c", "src/c.ts", {loc: 30}),
                node("n-d", "src/d.ts", {loc: 1}),
                node("n-e", "src/e.ts", {loc: 2}),
            ]),
        })

        const useCase = new GetTemporalDiffUseCase({
            graphRepository: repository,
        })
        const result = await useCase.execute({
            repoId: "gh:repo",
            fromCommit: "main",
            toCommit: "feature",
        })

        expect(result.isOk).toBe(true)
        expect(result.value.added.map((item) => item.id)).toEqual(["src/d.ts", "src/e.ts"])
        expect(result.value.changed.map((item) => item.node.id)).toEqual(["src/b.ts", "src/c.ts"])
    })
})
