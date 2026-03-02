import type {ISuggestionDTO} from "../../dto/review/suggestion.dto"
import type {IGitProvider} from "../../ports/outbound/git/git-provider.port"
import type {
    IPipelineStageUseCase,
    IStageCommand,
    IStageTransition,
} from "../../types/review/pipeline-stage.contract"
import {NotFoundError} from "../../../domain/errors/not-found.error"
import {StageError} from "../../../domain/errors/stage.error"
import {Result} from "../../../shared/result"
import {
    INITIAL_STAGE_ATTEMPT,
    isPipelineCollectionItem,
    mergeExternalContext,
    readStringField,
} from "./pipeline-stage-state.utils"

/**
 * Dependencies for create-ccr-level-comments stage use case.
 */
export interface ICreateCcrLevelCommentsStageDependencies {
    gitProvider: IGitProvider
}

interface ISuggestionIdentity {
    readonly id: string
    readonly filePath: string
    readonly category: string
    readonly severity: string
    readonly message: string
}

interface ISuggestionCoordinates {
    readonly lineStart: number
    readonly lineEnd: number
    readonly rankScore: number
    readonly committable: boolean
}

/**
 * Stage 12 use case. Posts grouped CCR-level suggestions as regular merge request comments.
 */
export class CreateCcrLevelCommentsStageUseCase implements IPipelineStageUseCase {
    public readonly stageId: string
    public readonly stageName: string

    private readonly gitProvider: IGitProvider

    /**
     * Creates create-ccr-level-comments stage use case.
     *
     * @param dependencies Stage dependencies.
     */
    public constructor(dependencies: ICreateCcrLevelCommentsStageDependencies) {
        this.stageId = "create-ccr-level-comments"
        this.stageName = "Create CCR Level Comments"
        this.gitProvider = dependencies.gitProvider
    }

    /**
     * Groups CCR suggestions by category and posts one comment per category.
     *
     * @param input Stage command payload.
     * @returns Updated stage transition or stage error.
     */
    public async execute(input: IStageCommand): Promise<Result<IStageTransition, StageError>> {
        const mergeRequestId = readStringField(input.state.mergeRequest, "id")
        if (mergeRequestId === undefined) {
            return Result.fail<IStageTransition, StageError>(
                this.createStageError(
                    input.state.runId,
                    input.state.definitionVersion,
                    "Missing merge request id for CCR comments creation",
                    false,
                    new NotFoundError("MergeRequest", "id"),
                ),
            )
        }

        const ccrSuggestions = this.resolveCcrSuggestions(input.state.externalContext)
        if (ccrSuggestions.length === 0) {
            return Result.ok<IStageTransition, StageError>({
                state: input.state,
                metadata: {
                    checkpointHint: "ccr-comments:skipped-empty",
                    notes: "No CCR suggestions to publish",
                },
            })
        }

        const groupedByCategory = this.groupByCategory(ccrSuggestions)
        const postedCommentIds: string[] = []

        try {
            for (const [category, suggestions] of groupedByCategory.entries()) {
                const commentBody = this.buildCategoryCommentBody(category, suggestions)
                const createdComment = await this.gitProvider.postComment(mergeRequestId, commentBody)
                postedCommentIds.push(createdComment.id)
            }
        } catch (error: unknown) {
            return Result.fail<IStageTransition, StageError>(
                this.createStageError(
                    input.state.runId,
                    input.state.definitionVersion,
                    "Failed to publish CCR-level comments",
                    true,
                    error instanceof Error ? error : undefined,
                ),
            )
        }

        return Result.ok<IStageTransition, StageError>({
            state: input.state.with({
                externalContext: mergeExternalContext(input.state.externalContext, {
                    ccrComments: {
                        count: postedCommentIds.length,
                        commentIds: postedCommentIds,
                    },
                }),
            }),
            metadata: {
                checkpointHint: "ccr-comments:published",
            },
        })
    }

    /**
     * Resolves CCR suggestions from external context payload.
     *
     * @param externalContext External context payload.
     * @returns CCR suggestions.
     */
    private resolveCcrSuggestions(
        externalContext: Readonly<Record<string, unknown>> | null,
    ): readonly ISuggestionDTO[] {
        if (externalContext === null) {
            return []
        }

        const rawSuggestions = externalContext["ccrSuggestions"]
        if (!Array.isArray(rawSuggestions)) {
            return []
        }

        const suggestions: ISuggestionDTO[] = []
        for (const rawSuggestion of rawSuggestions) {
            if (!isPipelineCollectionItem(rawSuggestion)) {
                continue
            }

            const mappedSuggestion = this.mapSuggestion(rawSuggestion)
            if (mappedSuggestion === null) {
                continue
            }

            suggestions.push(mappedSuggestion)
        }

        return suggestions
    }

    /**
     * Maps raw suggestion payload into typed suggestion dto.
     *
     * @param source Raw suggestion payload.
     * @returns Typed suggestion dto or null.
     */
    private mapSuggestion(source: Readonly<Record<string, unknown>>): ISuggestionDTO | null {
        const identity = this.readSuggestionIdentity(source)
        if (identity === null) {
            return null
        }

        const coordinates = this.readSuggestionCoordinates(source)
        if (coordinates === null) {
            return null
        }

        const codeBlock = this.readCodeBlock(source)

        return {
            id: identity.id,
            filePath: identity.filePath,
            lineStart: coordinates.lineStart,
            lineEnd: coordinates.lineEnd,
            severity: identity.severity,
            category: identity.category,
            message: identity.message,
            codeBlock,
            committable: coordinates.committable,
            rankScore: coordinates.rankScore,
        }
    }

    /**
     * Reads required string fields for suggestion.
     *
     * @param source Raw suggestion payload.
     * @returns Suggestion identity payload or null.
     */
    private readSuggestionIdentity(source: Readonly<Record<string, unknown>>): ISuggestionIdentity | null {
        const id = readStringField(source, "id")
        const filePath = readStringField(source, "filePath")
        const category = readStringField(source, "category")
        const severity = readStringField(source, "severity")
        const message = readStringField(source, "message")
        if (
            id === undefined ||
            filePath === undefined ||
            category === undefined ||
            severity === undefined ||
            message === undefined
        ) {
            return null
        }

        return {
            id,
            filePath,
            category,
            severity,
            message,
        }
    }

    /**
     * Reads numeric and boolean coordinates for suggestion.
     *
     * @param source Raw suggestion payload.
     * @returns Coordinates payload or null.
     */
    private readSuggestionCoordinates(
        source: Readonly<Record<string, unknown>>,
    ): ISuggestionCoordinates | null {
        const lineStart = source["lineStart"]
        const lineEnd = source["lineEnd"]
        const rankScore = source["rankScore"]
        const committable = source["committable"]
        if (
            typeof lineStart !== "number" ||
            typeof lineEnd !== "number" ||
            typeof rankScore !== "number" ||
            typeof committable !== "boolean"
        ) {
            return null
        }

        return {
            lineStart,
            lineEnd,
            rankScore,
            committable,
        }
    }

    /**
     * Reads optional code block from suggestion payload.
     *
     * @param source Raw suggestion payload.
     * @returns Trimmed code block when available.
     */
    private readCodeBlock(source: Readonly<Record<string, unknown>>): string | undefined {
        const rawCodeBlock = source["codeBlock"]
        if (typeof rawCodeBlock !== "string") {
            return undefined
        }

        const normalizedCodeBlock = rawCodeBlock.trim()
        if (normalizedCodeBlock.length === 0) {
            return undefined
        }

        return normalizedCodeBlock
    }

    /**
     * Groups suggestions by category.
     *
     * @param suggestions Source suggestions.
     * @returns Grouped suggestions map.
     */
    private groupByCategory(suggestions: readonly ISuggestionDTO[]): Map<string, ISuggestionDTO[]> {
        const grouped = new Map<string, ISuggestionDTO[]>()

        for (const suggestion of suggestions) {
            const bucket = grouped.get(suggestion.category)
            if (bucket === undefined) {
                grouped.set(suggestion.category, [suggestion])
            } else {
                bucket.push(suggestion)
            }
        }

        return grouped
    }

    /**
     * Builds markdown comment body for one CCR suggestion category.
     *
     * @param category Suggestion category.
     * @param suggestions Suggestions in category.
     * @returns Comment body.
     */
    private buildCategoryCommentBody(category: string, suggestions: readonly ISuggestionDTO[]): string {
        const lines = [`CCR review category: ${category}`, "", "Findings:"]
        for (const suggestion of suggestions) {
            lines.push(
                `- [${suggestion.severity}] ${suggestion.message} (${suggestion.filePath}:${suggestion.lineStart})`,
            )
        }

        return lines.join("\n")
    }

    /**
     * Creates normalized stage error payload.
     *
     * @param runId Pipeline run id.
     * @param definitionVersion Pinned definition version.
     * @param message Error message.
     * @param recoverable Recoverable flag.
     * @param originalError Optional wrapped error.
     * @returns Stage error.
     */
    private createStageError(
        runId: string,
        definitionVersion: string,
        message: string,
        recoverable: boolean,
        originalError?: Error,
    ): StageError {
        return new StageError({
            runId,
            definitionVersion,
            stageId: this.stageId,
            attempt: INITIAL_STAGE_ATTEMPT,
            recoverable,
            message,
            originalError,
        })
    }
}
