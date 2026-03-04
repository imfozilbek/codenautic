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
import type {
    IVectorRepository,
    IVectorSearchResultDTO,
} from "../../ports/outbound/vector/vector-repository.port"
import type {IReviewAugmentContextDefaults} from "../../dto/config/system-defaults.dto"

interface IRelatedContext {
    readonly path: string
    readonly score: number
    readonly sourceId: string
}

interface IAugmentContextPatch {
    readonly augmentContext: {
        readonly stageId: string
        readonly definitionVersion: string
        readonly status: "resolved" | "missing-context" | "unavailable"
        readonly relatedCount: number
        readonly relatedFiles: readonly IRelatedContext[]
        readonly limit?: number
    }
}

const AUGMENT_CONTEXT_STAGE_ID = "augment-context"
const AUGMENT_CONTEXT_STAGE_NAME = "Augment Context"

/**
 * Dependencies for augment-context stage use case.
 */
export interface IAugmentContextDependencies {
    readonly vectorRepository: IVectorRepository
    readonly defaults: IReviewAugmentContextDefaults
}

/**
 * Use case that enriches external context with semantically related files.
 */
export class AugmentContextUseCase
    implements IPipelineStageUseCase
{
    public readonly stageId: string
    public readonly stageName: string

    private readonly vectorRepository: IVectorRepository
    private readonly defaults: IReviewAugmentContextDefaults

    /**
     * Creates augment-context stage use case.
     *
     * @param dependencies Stage dependencies.
     */
    public constructor(dependencies: IAugmentContextDependencies) {
        this.vectorRepository = dependencies.vectorRepository
        this.defaults = dependencies.defaults
        this.stageId = AUGMENT_CONTEXT_STAGE_ID
        this.stageName = AUGMENT_CONTEXT_STAGE_NAME
    }

    /**
     * Enriches state.externalContext with related files information.
     *
     * @param input Stage input.
     * @returns Updated stage transition or fail.
     */
    public async execute(input: IStageCommand): Promise<Result<IStageTransition, StageError>> {
        const embedding = this.resolveEmbedding(input.state)
        if (embedding.length === 0) {
            return Result.ok<IStageTransition, StageError>({
                state: this.applyAugmentContext(input.state, {
                    augmentContext: {
                        stageId: this.stageId,
                        definitionVersion: input.state.definitionVersion,
                        status: "missing-context",
                        relatedCount: 0,
                        relatedFiles: [],
                        limit: this.resolveLimit(input.state),
                    },
                }),
                metadata: {
                    checkpointHint: "augment-context:skipped-no-query",
                    notes: "Context embedding is missing",
                },
            })
        }

        const filters = this.resolveSearchFilters(input.state)
        const limit = this.resolveLimit(input.state)

        try {
            const results = await this.vectorRepository.search(embedding, filters, limit)
            const relatedFiles = this.collectRelatedFiles(results)

            return Result.ok<IStageTransition, StageError>({
                state: this.applyAugmentContext(input.state, {
                    augmentContext: {
                        stageId: this.stageId,
                        definitionVersion: input.state.definitionVersion,
                        status: "resolved",
                        relatedCount: relatedFiles.length,
                        relatedFiles,
                    },
                }),
                metadata: {
                    checkpointHint: "augment-context:loaded",
                },
            })
        } catch {
            return Result.ok<IStageTransition, StageError>({
                state: this.applyAugmentContext(input.state, {
                    augmentContext: {
                        stageId: this.stageId,
                        definitionVersion: input.state.definitionVersion,
                        status: "unavailable",
                        relatedCount: 0,
                        relatedFiles: [],
                        limit,
                    },
                }),
                metadata: {
                    checkpointHint: "augment-context:skipped-unavailable",
                    notes: "Vector repository is unavailable",
                },
            })
        }
    }

    /**
     * Resolves related files search limit.
     *
     * @param state Pipeline state.
     * @returns Safe positive integer limit.
     */
    private resolveLimit(state: IStageCommand["state"]): number {
        const rawExternalContext = readObjectField(state.mergeRequest, "externalContext")
        const rawLimit = rawExternalContext?.["limit"]
        if (typeof rawLimit !== "number" || Number.isInteger(rawLimit) === false || rawLimit < 1) {
            return this.defaults.relatedFilesLimit
        }

        return rawLimit
    }

    /**
     * Builds search filters from merge request identifiers.
     *
     * @param state Pipeline state.
     * @returns Search filters or undefined.
     */
    private resolveSearchFilters(
        state: IStageCommand["state"],
    ): Readonly<Record<string, unknown>> | undefined {
        const repository = readObjectField(state.mergeRequest, "repository")
        const repositoryId = this.readOptionalString(repository?.["id"])
        if (repositoryId !== undefined) {
            return {
                repositoryId,
            }
        }

        const repositoryReference = readObjectField(state.mergeRequest, "repositoryRef")
        const repositoryReferenceId = this.readOptionalString(repositoryReference?.["id"])
        if (repositoryReferenceId !== undefined) {
            return {
                repositoryId: repositoryReferenceId,
            }
        }

        const legacyRepositoryId = this.readOptionalString(state.mergeRequest["repositoryId"])
        if (legacyRepositoryId !== undefined) {
            return {
                repositoryId: legacyRepositoryId,
            }
        }

        const projectId = this.readOptionalString(state.mergeRequest["projectId"])
        if (projectId !== undefined) {
            return {
                repositoryId: projectId,
            }
        }

        return undefined
    }

    /**
     * Resolves query embedding from merge request payload.
     *
     * @param state Pipeline state.
     * @returns Numeric embedding vector.
     */
    private resolveEmbedding(state: IStageCommand["state"]): readonly number[] {
        const contextObject = readObjectField(state.mergeRequest, "context")
        const rawNestedEmbedding = contextObject?.["contextEmbedding"]
        const rawTopLevelEmbedding = state.mergeRequest["contextEmbedding"]
        const rawEmbedding =
            Array.isArray(rawNestedEmbedding) === true
                ? rawNestedEmbedding
                : Array.isArray(rawTopLevelEmbedding) === true
                    ? rawTopLevelEmbedding
                    : null

        if (rawEmbedding === null) {
            return []
        }
        const embeddingSource = Array.isArray(rawEmbedding) ? rawEmbedding : []
        if (embeddingSource.length === 0) {
            return []
        }

        const embedding: number[] = []
        for (const value of embeddingSource) {
            if (typeof value !== "number" || Number.isFinite(value) === false) {
                return []
            }
            embedding.push(value)
        }

        return embedding
    }

    /**
     * Collects unique normalized related files by score.
     *
     * @param results Vector search results.
     * @returns Sorted related files.
     */
    private collectRelatedFiles(
        results: readonly IVectorSearchResultDTO[],
    ): readonly IRelatedContext[] {
        const collected: IRelatedContext[] = []
        const seenPaths = new Set<string>()

        for (const result of results) {
        const rawPath = readStringField(result.metadata, "filePath") ??
            readStringField(result.metadata, "path")
            if (rawPath === undefined) {
                continue
            }
            if (typeof rawPath !== "string" || rawPath.trim().length === 0) {
                continue
            }
            if (typeof result.score !== "number" || Number.isFinite(result.score) === false) {
                continue
            }

            const normalizedPath = rawPath.trim()
            if (seenPaths.has(normalizedPath)) {
                continue
            }
            seenPaths.add(normalizedPath)

            collected.push({
                path: normalizedPath,
                score: result.score,
                sourceId: result.id,
            })
        }

        return collected.sort((left, right): number => {
            if (left.score !== right.score) {
                return right.score - left.score
            }

            return left.path.localeCompare(right.path)
        })
    }

    /**
     * Applies external context patch into immutable state.
     *
     * @param state Current state.
     * @param patch Patch payload.
     * @returns Updated state.
     */
    private applyAugmentContext(
        state: IStageCommand["state"],
        patch: IAugmentContextPatch,
    ): IStageCommand["state"] {
        const patchPayload: Readonly<Record<string, unknown>> = {
            augmentContext: patch.augmentContext,
        }

        return state.with({
            externalContext: mergeExternalContext(state.externalContext, patchPayload),
        })
    }

    /**
     * Returns normalized non-empty string from value or undefined.
     *
     * @param raw Raw value.
     * @returns Normalized value.
     */
    private readOptionalString(raw: unknown): string | undefined {
        if (typeof raw !== "string") {
            return undefined
        }

        const normalized = raw.trim()
        if (normalized.length === 0) {
            return undefined
        }

        return normalized
    }
}
