import type {
    CodeNode,
    CodeGraph,
    IGraphQueryFilter,
} from "./code-graph.type"

/**
 * Outbound contract for persisted code graph.
 */
export interface IGraphRepository {
    /**
     * Loads graph payload for repository and optional branch.
     *
     * @param repositoryId Repository identifier in `<platform>:<id>` format.
     * @param branch Optional branch reference.
     * @returns Graph for repository/branch.
     */
    loadGraph(repositoryId: string, branch?: string): Promise<CodeGraph | null>

    /**
     * Persists graph payload for repository and optional branch.
     *
     * @param repositoryId Repository identifier in `<platform>:<id>` format.
     * @param graph Graph payload to persist.
     * @param branch Optional branch reference.
     */
    saveGraph(
        repositoryId: string,
        graph: CodeGraph,
        branch?: string,
    ): Promise<void>

    /**
     * Возвращает узлы, удовлетворяющие фильтру.
     *
     * @param filter Filter options.
     * @returns Matching graph nodes.
     */
    queryNodes(filter: IGraphQueryFilter): Promise<readonly CodeNode[]>
}
