import type {ISuggestionDTO} from "../../dto/review/suggestion.dto"
import type {IGitProvider} from "../../ports/outbound/git/git-provider.port"
import type {
    IPipelineStageUseCase,
    IStageCommand,
    IStageTransition,
} from "../../types/review/pipeline-stage.contract"
import {INLINE_COMMENT_SIDE} from "../../dto/git/comment.dto"
import {NotFoundError} from "../../../domain/errors/not-found.error"
import {StageError} from "../../../domain/errors/stage.error"
import {hash} from "../../../shared/utils/hash"
import {Result} from "../../../shared/result"
import {
    INITIAL_STAGE_ATTEMPT,
    isPipelineCollectionItem,
    mergeExternalContext,
    readStringField,
} from "./pipeline-stage-state.utils"

/**
 * Dependencies for create-file-comments stage use case.
 */
export interface ICreateFileCommentsStageDependencies {
    gitProvider: IGitProvider
    now?: () => Date
}

interface ISuggestionTextFields {
    readonly id: string
    readonly filePath: string
    readonly severity: string
    readonly category: string
    readonly message: string
}

interface ISuggestionMetaFields {
    readonly lineStart: number
    readonly lineEnd: number
    readonly committable: boolean
    readonly rankScore: number
}

/**
 * Stage 14 use case. Posts inline comments for validated suggestions.
 */
export class CreateFileCommentsStageUseCase implements IPipelineStageUseCase {
    public readonly stageId: string
    public readonly stageName: string

    private readonly gitProvider: IGitProvider
    private readonly nowProvider: () => Date

    /**
     * Creates create-file-comments stage use case.
     *
     * @param dependencies Stage dependencies.
     */
    public constructor(dependencies: ICreateFileCommentsStageDependencies) {
        this.stageId = "create-file-comments"
        this.stageName = "Create File Comments"
        this.gitProvider = dependencies.gitProvider
        this.nowProvider = dependencies.now ?? (() => new Date())
    }

    /**
     * Posts inline comments for each validated suggestion.
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
                    "Missing merge request id for inline comments creation",
                    false,
                    new NotFoundError("MergeRequest", "id"),
                ),
            )
        }

        const suggestions = this.normalizeSuggestions(input.state.suggestions)
        if (suggestions.length === 0) {
            return Result.ok<IStageTransition, StageError>({
                state: input.state,
                metadata: {
                    checkpointHint: "file-comments:skipped-empty",
                    notes: "No suggestions available for inline comments",
                },
            })
        }

        const postedCommentIds: string[] = []

        try {
            for (const suggestion of suggestions) {
                const commentBody = this.buildCommentBody(suggestion)
                const createdAt = this.nowProvider().toISOString()
                const commentId = `inline-${hash(`${suggestion.id}|${createdAt}`)}`
                const postedComment = await this.gitProvider.postInlineComment(mergeRequestId, {
                    id: commentId,
                    body: commentBody,
                    author: "codenautic-bot",
                    createdAt,
                    filePath: suggestion.filePath,
                    line: suggestion.lineStart,
                    side: INLINE_COMMENT_SIDE.RIGHT,
                })

                postedCommentIds.push(postedComment.id)
            }
        } catch (error: unknown) {
            return Result.fail<IStageTransition, StageError>(
                this.createStageError(
                    input.state.runId,
                    input.state.definitionVersion,
                    "Failed to publish file-level inline comments",
                    true,
                    error instanceof Error ? error : undefined,
                ),
            )
        }

        return Result.ok<IStageTransition, StageError>({
            state: input.state.with({
                externalContext: mergeExternalContext(input.state.externalContext, {
                    inlineComments: {
                        count: postedCommentIds.length,
                        commentIds: postedCommentIds,
                    },
                }),
            }),
            metadata: {
                checkpointHint: "file-comments:published",
            },
        })
    }

    /**
     * Normalizes raw suggestions into typed suggestion list.
     *
     * @param source Source suggestion collection.
     * @returns Typed suggestion list.
     */
    private normalizeSuggestions(source: readonly unknown[]): ISuggestionDTO[] {
        const suggestions: ISuggestionDTO[] = []

        for (const item of source) {
            if (!isPipelineCollectionItem(item)) {
                continue
            }

            const suggestion = this.mapSuggestion(item)
            if (suggestion === null) {
                continue
            }

            suggestions.push(suggestion)
        }

        return suggestions
    }

    /**
     * Maps one raw suggestion payload into typed suggestion DTO.
     *
     * @param source Raw suggestion payload.
     * @returns Typed suggestion DTO or null.
     */
    private mapSuggestion(source: Readonly<Record<string, unknown>>): ISuggestionDTO | null {
        const textFields = this.readSuggestionTextFields(source)
        if (textFields === null) {
            return null
        }

        const metaFields = this.readSuggestionMetaFields(source)
        if (metaFields === null) {
            return null
        }

        return {
            id: textFields.id,
            filePath: textFields.filePath,
            lineStart: metaFields.lineStart,
            lineEnd: metaFields.lineEnd,
            severity: textFields.severity,
            category: textFields.category,
            message: textFields.message,
            codeBlock: this.readCodeBlock(source),
            committable: metaFields.committable,
            rankScore: metaFields.rankScore,
        }
    }

    /**
     * Reads required string fields from raw suggestion payload.
     *
     * @param source Raw suggestion payload.
     * @returns String fields payload or null.
     */
    private readSuggestionTextFields(
        source: Readonly<Record<string, unknown>>,
    ): ISuggestionTextFields | null {
        const id = readStringField(source, "id")
        const filePath = readStringField(source, "filePath")
        const severity = readStringField(source, "severity")
        const category = readStringField(source, "category")
        const message = readStringField(source, "message")
        if (
            id === undefined ||
            filePath === undefined ||
            severity === undefined ||
            category === undefined ||
            message === undefined
        ) {
            return null
        }

        return {
            id,
            filePath,
            severity,
            category,
            message,
        }
    }

    /**
     * Reads required numeric and boolean fields from raw suggestion payload.
     *
     * @param source Raw suggestion payload.
     * @returns Metadata fields payload or null.
     */
    private readSuggestionMetaFields(
        source: Readonly<Record<string, unknown>>,
    ): ISuggestionMetaFields | null {
        const lineStart = source["lineStart"]
        const lineEnd = source["lineEnd"]
        const committable = source["committable"]
        const rankScore = source["rankScore"]
        if (
            typeof lineStart !== "number" ||
            typeof lineEnd !== "number" ||
            typeof committable !== "boolean" ||
            typeof rankScore !== "number"
        ) {
            return null
        }

        return {
            lineStart,
            lineEnd,
            committable,
            rankScore,
        }
    }

    /**
     * Reads optional code block from raw suggestion payload.
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
     * Builds inline comment body from suggestion payload.
     *
     * @param suggestion Suggestion payload.
     * @returns Comment body.
     */
    private buildCommentBody(suggestion: ISuggestionDTO): string {
        const lines = [
            `[${suggestion.severity}] ${suggestion.category}`,
            suggestion.message,
        ]

        if (suggestion.codeBlock !== undefined) {
            lines.push("", "Suggested code:", "```", suggestion.codeBlock, "```")
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
