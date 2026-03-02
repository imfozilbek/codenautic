import type {IDiscardedSuggestionDTO} from "../../dto/review/discarded-suggestion.dto"
import type {ISuggestionDTO} from "../../dto/review/suggestion.dto"
import type {ISafeGuardFilter} from "../../types/review/safeguard-filter.contract"
import type {
    IPipelineStageUseCase,
    IStageCommand,
    IStageTransition,
} from "../../types/review/pipeline-stage.contract"
import {StageError} from "../../../domain/errors/stage.error"
import {Result} from "../../../shared/result"
import {
    INITIAL_STAGE_ATTEMPT,
    isPipelineCollectionItem,
} from "./pipeline-stage-state.utils"

/**
 * Dependencies for validate-suggestions stage use case.
 */
export interface IValidateSuggestionsStageDependencies {
    filters: readonly ISafeGuardFilter[]
}

type SuggestionSource = Readonly<Record<string, unknown>> | ISuggestionDTO

interface ISuggestionStringFields {
    readonly id: string
    readonly filePath: string
    readonly severity: string
    readonly category: string
    readonly message: string
}

interface ISuggestionNumericFields {
    readonly lineStart: number
    readonly lineEnd: number
    readonly committable: boolean
    readonly rankScore: number
}

/**
 * Stage 13 use case. Applies sequential SafeGuard filters and keeps discarded suggestions trace.
 */
export class ValidateSuggestionsStageUseCase implements IPipelineStageUseCase {
    public readonly stageId: string
    public readonly stageName: string

    private readonly filters: readonly ISafeGuardFilter[]

    /**
     * Creates validate-suggestions stage use case.
     *
     * @param dependencies Stage dependencies.
     */
    public constructor(dependencies: IValidateSuggestionsStageDependencies) {
        this.stageId = "validate-suggestions"
        this.stageName = "Validate Suggestions"
        this.filters = dependencies.filters
    }

    /**
     * Applies SafeGuard filter chain and writes accepted/discarded suggestions to state.
     *
     * @param input Stage command payload.
     * @returns Updated stage transition or stage error.
     */
    public async execute(input: IStageCommand): Promise<Result<IStageTransition, StageError>> {
        let currentSuggestions = this.normalizeSuggestions(input.state.suggestions)
        const discardedSuggestions: IDiscardedSuggestionDTO[] = []
        const falsePositiveBudget = this.resolveFalsePositiveBudget(input.state.config)
        let remainingDiscardBudget = falsePositiveBudget

        try {
            for (const filter of this.filters) {
                const filterResult = await filter.filter(currentSuggestions, input.state)
                const normalizedPassed = this.normalizeSuggestions(filterResult.passed)
                const normalizedDiscarded = this.normalizeDiscardedSuggestions(
                    filterResult.discarded,
                    filter.name,
                )

                const allowedDiscarded = normalizedDiscarded.slice(0, remainingDiscardBudget)
                const overflowDiscarded = normalizedDiscarded.slice(remainingDiscardBudget)
                remainingDiscardBudget -= allowedDiscarded.length

                discardedSuggestions.push(...allowedDiscarded)
                currentSuggestions = [
                    ...normalizedPassed,
                    ...overflowDiscarded.map((discardedSuggestion): ISuggestionDTO => {
                        return this.discardedToSuggestion(discardedSuggestion)
                    }),
                ]
            }
        } catch (error: unknown) {
            return Result.fail<IStageTransition, StageError>(
                this.createStageError(
                    input.state.runId,
                    input.state.definitionVersion,
                    "SafeGuard filter chain failed while validating suggestions",
                    true,
                    error instanceof Error ? error : undefined,
                ),
            )
        }

        const normalizedDiscardedState = [
            ...input.state.discardedSuggestions,
            ...discardedSuggestions.map((suggestion) => {
                return {
                    ...suggestion,
                }
            }),
        ]

        return Result.ok<IStageTransition, StageError>({
            state: input.state.with({
                suggestions: currentSuggestions.map((suggestion) => {
                    return {
                        ...suggestion,
                    }
                }),
                discardedSuggestions: normalizedDiscardedState,
            }),
            metadata: {
                checkpointHint: "suggestions:validated",
                notes:
                    remainingDiscardBudget === 0 && discardedSuggestions.length > 0
                        ? "False-positive discard budget reached"
                        : undefined,
            },
        })
    }

    /**
     * Resolves configurable false-positive discard budget.
     *
     * @param config Config payload.
     * @returns Discard budget.
     */
    private resolveFalsePositiveBudget(config: Readonly<Record<string, unknown>>): number {
        const rawBudget = config["falsePositiveBudget"]
        if (typeof rawBudget !== "number" || Number.isInteger(rawBudget) === false || rawBudget < 0) {
            return Number.MAX_SAFE_INTEGER
        }

        return rawBudget
    }

    /**
     * Normalizes suggestion collection into DTO list.
     *
     * @param source Source suggestion collection.
     * @returns Typed suggestion list.
     */
    private normalizeSuggestions(source: readonly unknown[]): ISuggestionDTO[] {
        const normalizedSuggestions: ISuggestionDTO[] = []

        for (const item of source) {
            if (!isPipelineCollectionItem(item)) {
                continue
            }

            const suggestion = this.mapSuggestion(item)
            if (suggestion === null) {
                continue
            }

            normalizedSuggestions.push(suggestion)
        }

        return normalizedSuggestions
    }

    /**
     * Normalizes discarded suggestion collection.
     *
     * @param source Source discarded suggestions.
     * @param fallbackFilterName Fallback filter name.
     * @returns Typed discarded list.
     */
    private normalizeDiscardedSuggestions(
        source: readonly IDiscardedSuggestionDTO[],
        fallbackFilterName: string,
    ): IDiscardedSuggestionDTO[] {
        const normalizedSuggestions: IDiscardedSuggestionDTO[] = []

        for (const item of source) {
            const mappedSuggestion = this.mapSuggestion(item)
            if (mappedSuggestion === null) {
                continue
            }

            const discardReason =
                typeof item.discardReason === "string" && item.discardReason.trim().length > 0
                    ? item.discardReason.trim()
                    : "unknown"
            const filterName =
                typeof item.filterName === "string" && item.filterName.trim().length > 0
                    ? item.filterName.trim()
                    : fallbackFilterName

            normalizedSuggestions.push({
                ...mappedSuggestion,
                discardReason,
                filterName,
            })
        }

        return normalizedSuggestions
    }

    /**
     * Maps raw suggestion payload into typed suggestion dto.
     *
     * @param source Raw payload.
     * @returns Suggestion dto or null.
     */
    private mapSuggestion(source: SuggestionSource): ISuggestionDTO | null {
        const stringFields = this.readSuggestionStringFields(source)
        if (stringFields === null) {
            return null
        }

        const numericFields = this.readSuggestionNumericFields(source)
        if (numericFields === null) {
            return null
        }

        const codeBlock = this.readCodeBlock(source)

        return {
            id: stringFields.id,
            filePath: stringFields.filePath,
            lineStart: numericFields.lineStart,
            lineEnd: numericFields.lineEnd,
            severity: stringFields.severity,
            category: stringFields.category,
            message: stringFields.message,
            codeBlock,
            committable: numericFields.committable,
            rankScore: numericFields.rankScore,
        }
    }

    /**
     * Reads required string fields from suggestion payload.
     *
     * @param source Raw suggestion payload.
     * @returns Normalized string fields or null.
     */
    private readSuggestionStringFields(source: SuggestionSource): ISuggestionStringFields | null {
        const id = this.readNonEmptyString(source["id"])
        const filePath = this.readNonEmptyString(source["filePath"])
        const severity = this.readNonEmptyString(source["severity"])
        const category = this.readNonEmptyString(source["category"])
        const message = this.readNonEmptyString(source["message"])
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
     * Reads required numeric fields from suggestion payload.
     *
     * @param source Raw suggestion payload.
     * @returns Numeric fields or null.
     */
    private readSuggestionNumericFields(source: SuggestionSource): ISuggestionNumericFields | null {
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
     * Reads optional code block from suggestion payload.
     *
     * @param source Raw suggestion payload.
     * @returns Trimmed code block when present.
     */
    private readCodeBlock(source: SuggestionSource): string | undefined {
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
     * Reads non-empty trimmed string value.
     *
     * @param value Raw value.
     * @returns Trimmed string or undefined.
     */
    private readNonEmptyString(value: unknown): string | undefined {
        if (typeof value !== "string") {
            return undefined
        }

        const normalized = value.trim()
        if (normalized.length === 0) {
            return undefined
        }

        return normalized
    }

    /**
     * Converts discarded suggestion back to suggestion shape.
     *
     * @param discardedSuggestion Discarded suggestion.
     * @returns Suggestion payload.
     */
    private discardedToSuggestion(discardedSuggestion: IDiscardedSuggestionDTO): ISuggestionDTO {
        return {
            id: discardedSuggestion.id,
            filePath: discardedSuggestion.filePath,
            lineStart: discardedSuggestion.lineStart,
            lineEnd: discardedSuggestion.lineEnd,
            severity: discardedSuggestion.severity,
            category: discardedSuggestion.category,
            message: discardedSuggestion.message,
            codeBlock: discardedSuggestion.codeBlock,
            committable: discardedSuggestion.committable,
            rankScore: discardedSuggestion.rankScore,
        }
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
