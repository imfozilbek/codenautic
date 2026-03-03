import type {ICodeGraph} from "./code-graph.type"

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
    loadGraph(repositoryId: string, branch?: string): Promise<ICodeGraph | null>
}
