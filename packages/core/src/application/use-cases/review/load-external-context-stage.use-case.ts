import type {IVectorRepository} from "../../ports/outbound/vector/vector-repository.port"
import type {
    IPipelineStageUseCase,
    IStageCommand,
    IStageTransition,
} from "../../types/review/pipeline-stage.contract"
import {StageError} from "../../../domain/errors/stage.error"
import {Result} from "../../../shared/result"
import {
    mergeExternalContext,
    readObjectField,
    readStringField,
} from "./pipeline-stage-state.utils"
import type {IExternalContextDefaults} from "../../dto/config/system-defaults.dto"

/**
 * Dependencies for load-external-context stage use case.
 */
export interface ILoadExternalContextStageDependencies {
    vectorRepository: IVectorRepository
    defaults: IExternalContextDefaults
}

/**
 * Stage 7 use case. Loads contextual vector snippets and enriches external context.
 */
export class LoadExternalContextStageUseCase implements IPipelineStageUseCase {
    public readonly stageId: string
    public readonly stageName: string

    private readonly vectorRepository: IVectorRepository
    private readonly defaults: IExternalContextDefaults

    /**
     * Creates load-external-context stage use case.
     *
     * @param dependencies Stage dependencies.
     */
    public constructor(dependencies: ILoadExternalContextStageDependencies) {
        this.stageId = "load-external-context"
        this.stageName = "Load External Context"
        this.vectorRepository = dependencies.vectorRepository
        this.defaults = dependencies.defaults
    }

    /**
     * Loads contextual snippets from vector search. Returns skip transition when query is missing
     * or vector storage is unavailable.
     *
     * @param input Stage command payload.
     * @returns Updated stage transition.
     */
    public async execute(input: IStageCommand): Promise<Result<IStageTransition, StageError>> {
        const embedding = this.resolveEmbedding(input.state.mergeRequest)
        if (embedding.length === 0) {
            return Result.ok<IStageTransition, StageError>({
                state: input.state,
                metadata: {
                    checkpointHint: "external-context:skipped-no-query",
                    notes: "Context embedding is missing",
                },
            })
        }

        const repositoryId =
            readStringField(input.state.mergeRequest, "repositoryId") ??
            readStringField(input.state.mergeRequest, "projectId")
        const filters =
            repositoryId === undefined
                ? undefined
                : {
                      repositoryId,
                  }
        const limit = this.resolveContextLimit(input.state.mergeRequest)

        try {
            const vectorMatches = await this.vectorRepository.search(embedding, filters, limit)

            return Result.ok<IStageTransition, StageError>({
                state: input.state.with({
                    externalContext: mergeExternalContext(input.state.externalContext, {
                        vectorContext: vectorMatches.map((item) => {
                            return {
                                id: item.id,
                                score: item.score,
                                metadata: item.metadata,
                            }
                        }),
                        vectorContextStatus: "loaded",
                    }),
                }),
                metadata: {
                    checkpointHint: "external-context:loaded",
                },
            })
        } catch {
            return Result.ok<IStageTransition, StageError>({
                state: input.state.with({
                    externalContext: mergeExternalContext(input.state.externalContext, {
                        vectorContext: [],
                        vectorContextStatus: "unavailable",
                    }),
                }),
                metadata: {
                    checkpointHint: "external-context:skipped-unavailable",
                    notes: "Vector repository is unavailable",
                },
            })
        }
    }

    /**
     * Resolves query embedding from merge request payload.
     *
     * @param mergeRequest Merge request payload.
     * @returns Numeric embedding vector.
     */
    private resolveEmbedding(mergeRequest: Readonly<Record<string, unknown>>): readonly number[] {
        const rawEmbedding = mergeRequest["contextEmbedding"]
        if (!Array.isArray(rawEmbedding)) {
            return []
        }

        const embedding: number[] = []
        for (const rawValue of rawEmbedding) {
            if (typeof rawValue !== "number" || Number.isFinite(rawValue) === false) {
                return []
            }

            embedding.push(rawValue)
        }

        return embedding
    }

    /**
     * Resolves vector search limit from merge request payload.
     *
     * @param mergeRequest Merge request payload.
     * @returns Context search limit.
     */
    private resolveContextLimit(mergeRequest: Readonly<Record<string, unknown>>): number {
        const externalContext = readObjectField(mergeRequest, "externalContext")
        if (externalContext === undefined) {
            return this.defaults.limit
        }

        const rawLimit = externalContext["limit"]
        if (typeof rawLimit !== "number" || !Number.isInteger(rawLimit) || rawLimit < 1) {
            return this.defaults.limit
        }

        return rawLimit
    }
}
