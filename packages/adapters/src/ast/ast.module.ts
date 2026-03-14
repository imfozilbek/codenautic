import {
    Container,
    TOKENS,
    type ICodeChunkEmbeddingGenerator,
    type ICodeGraphClusteringService,
    type ICodeGraphPageRankService,
    type IGraphRepository,
    type ISourceCodeParser,
} from "@codenautic/core"

import {bindConstantSingleton} from "../shared/bind-constant-singleton"
import {AST_TOKENS} from "./ast.tokens"

/**
 * Registration options for AST adapter module.
 */
export interface IRegisterAstModuleOptions {
    /**
     * Main source-code parser used by scanning pipeline.
     */
    readonly sourceCodeParser: ISourceCodeParser

    /**
     * Optional code-graph storage adapter.
     */
    readonly graphRepository?: IGraphRepository

    /**
     * Optional code-chunk embedding generator.
     */
    readonly codeChunkEmbeddingGenerator?: ICodeChunkEmbeddingGenerator

    /**
     * Optional graph hotspot ranking service.
     */
    readonly pageRankService?: ICodeGraphPageRankService

    /**
     * Optional graph community detection service.
     */
    readonly clusteringService?: ICodeGraphClusteringService
}

/**
 * Registers AST adapters in DI container.
 *
 * @param container Target container.
 * @param options Module options.
 */
export function registerAstModule(container: Container, options: IRegisterAstModuleOptions): void {
    bindConstantSingleton(container, AST_TOKENS.SourceCodeParser, options.sourceCodeParser)
    bindConstantSingleton(container, TOKENS.Scanning.SourceCodeParser, options.sourceCodeParser)

    if (options.graphRepository !== undefined) {
        bindConstantSingleton(container, AST_TOKENS.GraphRepository, options.graphRepository)
        bindConstantSingleton(container, TOKENS.Analysis.GraphRepository, options.graphRepository)
    }

    if (options.codeChunkEmbeddingGenerator !== undefined) {
        bindConstantSingleton(
            container,
            AST_TOKENS.CodeChunkEmbeddingGenerator,
            options.codeChunkEmbeddingGenerator,
        )
        bindConstantSingleton(
            container,
            TOKENS.Vector.CodeChunkEmbeddingGenerator,
            options.codeChunkEmbeddingGenerator,
        )
    }

    if (options.pageRankService !== undefined) {
        bindConstantSingleton(container, AST_TOKENS.PageRankService, options.pageRankService)
        bindConstantSingleton(
            container,
            TOKENS.Analysis.CodeGraphPageRankService,
            options.pageRankService,
        )
    }

    if (options.clusteringService !== undefined) {
        bindConstantSingleton(
            container,
            AST_TOKENS.CodeGraphClusteringService,
            options.clusteringService,
        )
        bindConstantSingleton(
            container,
            TOKENS.Analysis.CodeGraphClusteringService,
            options.clusteringService,
        )
    }
}
