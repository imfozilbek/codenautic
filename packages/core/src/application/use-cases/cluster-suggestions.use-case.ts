import {Embedding} from "../../domain/value-objects/embedding.value-object"
import type {IValidationErrorField} from "../../domain/errors/validation.error"
import {ValidationError} from "../../domain/errors/validation.error"
import type {IUseCase} from "../ports/inbound/use-case.port"
import type {ISuggestionClusterDTO} from "../dto/review/suggestion-cluster.dto"
import {Result} from "../../shared/result"
import type {SuggestionClusteringMode} from "../dto/analytics/suggestion-clustering.dto"
import type {IClusteringDefaults} from "../dto/config/system-defaults.dto"

/**
 * Embedding contract for clustering.
 */
export interface ISuggestionEmbeddingDTO {
    /**
     * Embedding vector.
     */
    readonly vector: readonly number[]

    /**
     * Vector dimensionality.
     */
    readonly dimensions?: number

    /**
     * Source model identifier.
     */
    readonly model?: string
}

/**
 * Suggestion with optional semantic embedding.
 */
export interface ISuggestionForClustering {
    /**
     * Suggestion identifier.
     */
    readonly suggestionId: string

    /**
     * Problem description.
     */
    readonly problemDescription: string

    /**
     * Recommended action statement.
     */
    readonly actionStatement: string

    /**
     * Optional embedding vector payload.
     */
    readonly embedding?: ISuggestionEmbeddingDTO
}

/**
 * Input payload for clustering.
 */
export interface IClusterSuggestionsInput {
    /**
     * Suggestions to cluster.
     */
    readonly suggestions: readonly ISuggestionForClustering[]

    /**
     * Clustering mode.
     */
    readonly mode?: SuggestionClusteringMode

    /**
     * Optional cosine similarity threshold for SMART/FULL.
     */
    readonly similarityThreshold?: unknown
}

/**
 * Clustering use case output.
 */
export type IClusterSuggestionsOutput = readonly ISuggestionClusterDTO[]

/**
 * Dependencies for clustering use case.
 */
export interface IClusterSuggestionsDependencies {
    readonly defaults: IClusteringDefaults
}

/**
 * Internal normalized suggestion item for processing.
 */
interface INormalizedSuggestion {
    readonly suggestionId: string
    readonly problemDescription: string
    readonly actionStatement: string
    readonly originalIndex: number
    readonly embedding?: Embedding
}

/**
 * Internal execution context assembled before running mode-specific algorithm.
 */
interface IClusterExecutionContext {
    /**
     * Clustering mode for execution.
     */
    readonly mode: SuggestionClusteringMode

    /**
     * Similarity threshold for SMART/FULL clustering.
     */
    readonly similarityThreshold: number

    /**
     * Validated suggestions prepared for clustering.
     */
    readonly normalizedSuggestions: readonly INormalizedSuggestion[]
}

/**
 * Base execution parameters shared across all modes.
 */
interface IClusterExecutionBase {
    /**
     * Clustering mode for execution.
     */
    readonly mode: SuggestionClusteringMode

    /**
     * Similarity threshold for SMART/FULL.
     */
    readonly similarityThreshold: number
}

/**
 * Clusters and sorts semantically close suggestions.
 */
export class ClusterSuggestionsUseCase
    implements IUseCase<IClusterSuggestionsInput, IClusterSuggestionsOutput, ValidationError>
{
    private static readonly MIN_SIMILARITY_THRESHOLD = 0
    private static readonly MAX_SIMILARITY_THRESHOLD = 1
    private readonly defaults: IClusteringDefaults

    /**
     * Creates clustering use case.
     *
     * @param dependencies Defaults resolved from config-service.
     */
    public constructor(dependencies: IClusterSuggestionsDependencies) {
        this.defaults = dependencies.defaults
    }

    /**
     * Clusters input suggestions according to selected mode.
     *
     * @param input Input payload.
     * @returns Clustered suggestions.
     */
    public execute(input: IClusterSuggestionsInput): Promise<Result<IClusterSuggestionsOutput, ValidationError>> {
        const context = this.resolveExecutionContext(input)
        if (context.result.isFail || context.value === undefined) {
            if (context.result.isFail) {
                return Promise.resolve(Result.fail<IClusterSuggestionsOutput, ValidationError>(context.result.error))
            }

            return Promise.resolve(
                Result.fail<IClusterSuggestionsOutput, ValidationError>(
                    new ValidationError("Cluster suggestions validation failed", [
                        {
                            field: "internal",
                            message: "Execution context is missing",
                        },
                    ]),
                ),
            )
        }

        if (context.value.mode === "MINIMAL") {
            return this.executeMinimalMode(context.value.normalizedSuggestions)
        }

        return this.executeSimilarityMode(context.value)
    }

    /**
     * Creates execution context and validates input before mode-specific flow.
     *
     * @param input Input payload.
     * @returns Execution context or validation failure.
     */
    private resolveExecutionContext(
        input: IClusterSuggestionsInput,
    ): {
        readonly result: Result<IClusterExecutionContext, ValidationError>
        readonly value?: IClusterExecutionContext
    } {
        const base = this.resolveExecutionBaseParameters(input)
        if (base.result.isFail) {
            return {
                result: Result.fail<IClusterExecutionContext, ValidationError>(base.result.error),
            }
        }
        if (base.value === undefined) {
            return {
                result: Result.fail<IClusterExecutionContext, ValidationError>(
                    new ValidationError("Cluster suggestions validation failed", [
                        {
                            field: "internal",
                            message: "Execution base context is missing",
                        },
                    ]),
                ),
            }
        }

        return this.resolveExecutionContextByMode(input.suggestions, base.value)
    }

    /**
     * Resolves base execution parameters from input without mode-specific normalization.
     *
     * @param input Raw input.
     * @returns Base mode/threshold.
     */
    private resolveExecutionBaseParameters(
        input: IClusterSuggestionsInput,
    ): {
        readonly result: Result<IClusterExecutionBase, ValidationError>
        readonly value?: IClusterExecutionBase
    } {
        if (this.isInvalidInputShape(input)) {
            return {
                result: Result.fail<IClusterExecutionBase, ValidationError>(
                    new ValidationError("Cluster suggestions validation failed", [
                        {
                            field: "input",
                            message: "must be an object",
                        },
                    ]),
                ),
            }
        }

        if (Array.isArray(input.suggestions) === false) {
            return {
                result: Result.fail<IClusterExecutionBase, ValidationError>(
                    new ValidationError("Cluster suggestions validation failed", [
                        {
                            field: "suggestions",
                            message: "suggestions must be an array",
                        },
                    ]),
                ),
            }
        }

        const mode = this.resolveMode(input.mode)
        if (mode.result.isFail) {
            return {
                result: Result.fail<IClusterExecutionBase, ValidationError>(mode.result.error),
            }
        }

        const threshold = this.resolveThreshold(input.similarityThreshold)
        if (threshold.result.isFail) {
            return {
                result: Result.fail<IClusterExecutionBase, ValidationError>(threshold.result.error),
            }
        }

        const resolvedMode = mode.value ?? this.defaults.mode
        const resolvedThreshold = threshold.value ?? this.defaults.similarityThreshold

        return {
            result: Result.ok<IClusterExecutionBase, ValidationError>({
                mode: resolvedMode,
                similarityThreshold: resolvedThreshold,
            }),
            value: {
                mode: resolvedMode,
                similarityThreshold: resolvedThreshold,
            },
        }
    }

    /**
     * Builds final context for selected mode.
     *
     * @param suggestions Input suggestions.
     * @param base Base execution parameters.
     * @returns Full execution context.
     */
    private resolveExecutionContextByMode(
        suggestions: readonly ISuggestionForClustering[],
        base: IClusterExecutionBase,
    ): {
        readonly result: Result<IClusterExecutionContext, ValidationError>
        readonly value?: IClusterExecutionContext
    } {
        if (suggestions.length === 0) {
            const context: IClusterExecutionContext = {
                mode: base.mode,
                similarityThreshold: base.similarityThreshold,
                normalizedSuggestions: [],
            }

            return {
                result: Result.ok<IClusterExecutionContext, ValidationError>(context),
                value: context,
            }
        }

        if (base.mode === "MINIMAL") {
            const baseSuggestions = this.normalizeSuggestions(suggestions)
            const context: IClusterExecutionContext = {
                mode: base.mode,
                similarityThreshold: base.similarityThreshold,
                normalizedSuggestions: baseSuggestions,
            }

            return {
                result: Result.ok<IClusterExecutionContext, ValidationError>(context),
                value: context,
            }
        }

        const normalizedSuggestions = this.normalizeSuggestionsWithEmbeddings(suggestions, base.mode)
        if (normalizedSuggestions.result.isFail) {
            return {
                result: Result.fail<IClusterExecutionContext, ValidationError>(normalizedSuggestions.result.error),
            }
        }
        if (normalizedSuggestions.value === undefined) {
            return {
                result: Result.fail<IClusterExecutionContext, ValidationError>(
                    new ValidationError("Cluster suggestions validation failed", [
                        {
                            field: "internal",
                            message: "Internal normalization failed",
                        },
                    ]),
                ),
            }
        }

        return {
            result: Result.ok<IClusterExecutionContext, ValidationError>({
                mode: base.mode,
                similarityThreshold: base.similarityThreshold,
                normalizedSuggestions: normalizedSuggestions.value,
            }),
            value: {
                mode: base.mode,
                similarityThreshold: base.similarityThreshold,
                normalizedSuggestions: normalizedSuggestions.value,
            },
        }
    }

    /**
     * Executes minimal mode and wraps DTO result.
     *
     * @param normalizedSuggestions Normalized suggestions to convert to clusters.
     * @returns Minimal execution result.
     */
    private executeMinimalMode(
        normalizedSuggestions: readonly INormalizedSuggestion[],
    ): Promise<Result<IClusterSuggestionsOutput, ValidationError>> {
        return Promise.resolve(
            Result.ok<IClusterSuggestionsOutput, ValidationError>(this.createMinimalClusters(normalizedSuggestions)),
        )
    }

    /**
     * Executes SMART/FULL similarity modes.
     *
     * @param context Resolved execution context.
     * @returns Similarity mode execution result.
     */
    private executeSimilarityMode(
        context: IClusterExecutionContext,
    ): Promise<Result<IClusterSuggestionsOutput, ValidationError>> {
        const clusters = this.createSimilarityClusters(context.normalizedSuggestions, context.similarityThreshold)
        if (context.mode === "FULL") {
            return Promise.resolve(
                Result.ok<IClusterSuggestionsOutput, ValidationError>(this.createFullModeClusters(clusters)),
            )
        }

        return Promise.resolve(
            Result.ok<IClusterSuggestionsOutput, ValidationError>(this.createSmartModeClusters(clusters)),
        )
    }

    /**
     * Resolves mode value with default.
     *
     * @param mode Raw mode.
     * @returns Mode validation result.
     */
    private resolveMode(mode: SuggestionClusteringMode | undefined): {
        readonly result: Result<SuggestionClusteringMode, ValidationError>
        readonly value?: SuggestionClusteringMode
    } {
        const normalizedMode = mode ?? this.defaults.mode
        const fields: IValidationErrorField[] = []

        if (
            normalizedMode !== "MINIMAL" &&
            normalizedMode !== "SMART" &&
            normalizedMode !== "FULL"
        ) {
            fields.push({
                field: "mode",
                message: "mode must be one of MINIMAL, SMART, FULL",
            })
            return {
                result: Result.fail<SuggestionClusteringMode, ValidationError>(
                    new ValidationError("Cluster suggestions validation failed", fields),
                ),
            }
        }

        return {
            result: Result.ok<SuggestionClusteringMode, ValidationError>(normalizedMode),
            value: normalizedMode,
        }
    }

    /**
     * Resolves similarity threshold with defaults and constraints.
     *
     * @param rawThreshold Raw threshold value.
     * @returns Threshold result.
     */
    private resolveThreshold(
        rawThreshold: unknown,
    ): {
        readonly result: Result<number, ValidationError>
        readonly value?: number
    } {
        const fields: IValidationErrorField[] = []
        if (rawThreshold === undefined) {
            return {
                result: Result.ok<number, ValidationError>(this.defaults.similarityThreshold),
                value: this.defaults.similarityThreshold,
            }
        }

        if (
            typeof rawThreshold !== "number" ||
            Number.isFinite(rawThreshold) === false ||
            rawThreshold < ClusterSuggestionsUseCase.MIN_SIMILARITY_THRESHOLD ||
            rawThreshold > ClusterSuggestionsUseCase.MAX_SIMILARITY_THRESHOLD
        ) {
            fields.push({
                field: "similarityThreshold",
                message: "similarityThreshold must be a finite number from 0 to 1",
            })
            return {
                result: Result.fail<number, ValidationError>(
                    new ValidationError("Cluster suggestions validation failed", fields),
                ),
            }
        }

        return {
            result: Result.ok<number, ValidationError>(rawThreshold),
            value: rawThreshold,
        }
    }

    /**
     * Checks plain-object input shape.
     *
     * @param input Input.
     * @returns Whether input is invalid object payload.
     */
    private isInvalidInputShape(input: IClusterSuggestionsInput): boolean {
        return (
            typeof input !== "object" ||
            input === null ||
            Array.isArray(input)
        )
    }

    /**
     * Normalizes suggestions without embedding (MINIMAL mode).
     *
     * @param suggestions Raw suggestions.
     * @returns Minimal clusters.
     */
    private createMinimalClusters(suggestions: readonly ISuggestionForClustering[]): IClusterSuggestionsOutput {
        const normalized = this.normalizeSuggestions(suggestions)

        return normalized.map((suggestion): ISuggestionClusterDTO => {
            return {
                type: "parent",
                relatedSuggestionIds: [suggestion.suggestionId],
                problemDescription: suggestion.problemDescription,
                actionStatement: suggestion.actionStatement,
            }
        })
    }

    /**
     * Normalizes base suggestions and validates required text fields.
     *
     * @param suggestions Raw suggestions.
     * @returns Normalized suggestions.
     */
    private normalizeSuggestions(
        suggestions: readonly ISuggestionForClustering[],
    ): INormalizedSuggestion[] {
        const normalized: INormalizedSuggestion[] = []
        for (let index = 0; index < suggestions.length; index += 1) {
            const suggestion = suggestions[index]
            const suggestionId = this.readNonEmptyString(suggestion?.suggestionId)
            const problemDescription = this.readNonEmptyString(suggestion?.problemDescription)
            const actionStatement = this.readNonEmptyString(suggestion?.actionStatement)
            if (
                suggestionId === undefined ||
                problemDescription === undefined ||
                actionStatement === undefined
            ) {
                continue
            }

            normalized.push({
                suggestionId,
                problemDescription,
                actionStatement,
                originalIndex: index,
            })
        }

        return normalized
    }

    /**
     * Normalizes and validates suggestions for SMART/FULL mode.
     *
     * @param suggestions Raw suggestions.
     * @param modeMode Current mode.
     * @returns Normalized suggestions with embeddings.
     */
    private normalizeSuggestionsWithEmbeddings(
        suggestions: readonly ISuggestionForClustering[],
        modeMode: SuggestionClusteringMode,
    ): {
        readonly result: Result<readonly INormalizedSuggestion[], ValidationError>
        readonly value?: readonly INormalizedSuggestion[]
    } {
        const fields: IValidationErrorField[] = []
        const base = this.normalizeSuggestions(suggestions)
        if (base.length !== suggestions.length) {
            fields.push({
                field: "suggestions",
                message: "all suggestions must include suggestionId, problemDescription, actionStatement",
            })
            return {
                result: Result.fail<readonly INormalizedSuggestion[], ValidationError>(
                    new ValidationError("Cluster suggestions validation failed", fields),
                ),
            }
        }

        if (modeMode === "MINIMAL") {
            return {
                result: Result.ok<readonly INormalizedSuggestion[], ValidationError>(base),
                value: base,
            }
        }

        const normalized: INormalizedSuggestion[] = []
        for (const current of base) {
            const source = suggestions[current.originalIndex]
            if (source === undefined || source.embedding === undefined) {
                fields.push({
                    field: `suggestions.${current.originalIndex}.embedding`,
                    message: "embedding is required for SMART and FULL modes",
                })
                continue
            }

            const normalizedEmbedding = this.normalizeEmbedding(source.embedding, current.originalIndex, fields)
            if (normalizedEmbedding === undefined) {
                continue
            }

            try {
                const embedding = Embedding.create({
                    vector: normalizedEmbedding.vector,
                    dimensions: normalizedEmbedding.dimensions,
                    model: normalizedEmbedding.model,
                })
                normalized.push({
                    ...current,
                    embedding,
                })
            } catch (error: unknown) {
                fields.push({
                    field: `suggestions.${current.originalIndex}.embedding`,
                    message: this.resolveEmbeddingErrorMessage(error),
                })
            }
        }

        if (fields.length > 0) {
            return {
                result: Result.fail<readonly INormalizedSuggestion[], ValidationError>(
                    new ValidationError("Cluster suggestions validation failed", fields),
                ),
            }
        }

        return {
            result: Result.ok<readonly INormalizedSuggestion[], ValidationError>(normalized),
            value: normalized,
        }
    }

    /**
     * Builds SMART clusters as parent nodes with grouped related ids.
     *
     * @param groups Grouped suggestions.
     * @returns Parent clusters.
     */
    private createSmartModeClusters(groups: readonly INormalizedSuggestion[][]): IClusterSuggestionsOutput {
        const clusters: ISuggestionClusterDTO[] = []
        for (const group of groups) {
            if (group.length === 0) {
                continue
            }

            const parent = group.at(0)
            if (parent === undefined) {
                continue
            }

            clusters.push({
                type: "parent",
                relatedSuggestionIds: group.map((item): string => item.suggestionId),
                problemDescription: parent.problemDescription,
                actionStatement: parent.actionStatement,
            })
        }

        return clusters
    }

    /**
     * Builds FULL clusters as parent + related nodes.
     *
     * @param groups Grouped suggestions.
     * @returns Parent and child clusters.
     */
    private createFullModeClusters(groups: readonly INormalizedSuggestion[][]): IClusterSuggestionsOutput {
        const clusters: ISuggestionClusterDTO[] = []
        for (const group of groups) {
            if (group.length === 0) {
                continue
            }

            const [parentSuggestion, ...relatedSuggestions] = group
            if (parentSuggestion === undefined) {
                continue
            }

            clusters.push({
                type: "parent",
                relatedSuggestionIds: group.map((item): string => item.suggestionId),
                problemDescription: parentSuggestion.problemDescription,
                actionStatement: parentSuggestion.actionStatement,
            })

            for (const related of relatedSuggestions) {
                clusters.push({
                    type: "related",
                    relatedSuggestionIds: [related.suggestionId],
                    parentSuggestionId: parentSuggestion.suggestionId,
                    problemDescription: related.problemDescription,
                    actionStatement: related.actionStatement,
                })
            }
        }

        return clusters
    }

    /**
     * Clusters by cosine similarity threshold.
     *
     * @param suggestions Normalized suggestions.
     * @param threshold Similarity threshold.
     * @returns Groups by transitive similarity closure.
     */
    private createSimilarityClusters(
        suggestions: readonly INormalizedSuggestion[],
        threshold: number,
    ): readonly INormalizedSuggestion[][] {
        if (suggestions.length === 0) {
            return []
        }

        const sorted = this.sortSuggestionsBySourceIndex(suggestions)
        const used = new Set<number>()
        const groups: INormalizedSuggestion[][] = []

        for (let start = 0; start < sorted.length; start += 1) {
            if (this.shouldSkipClusterStart(sorted, used, start) === true) {
                continue
            }

            const group = this.collectSimilarityCluster(sorted, used, start, threshold)
            groups.push(group)
        }

        return groups
    }

    /**
     * Sorts normalized suggestions by source input index.
     *
     * @param suggestions Normalized suggestions.
     * @returns Sorted copy.
     */
    private sortSuggestionsBySourceIndex(
        suggestions: readonly INormalizedSuggestion[],
    ): INormalizedSuggestion[] {
        return [...suggestions].sort((first, second): number => {
            return first.originalIndex - second.originalIndex
        })
    }

    /**
     * Checks if cluster build should start at provided index.
     *
     * @param sorted Sorted suggestions.
     * @param used Used index set.
     * @param start Start index.
     * @returns Whether to skip.
     */
    private shouldSkipClusterStart(
        sorted: readonly INormalizedSuggestion[],
        used: Set<number>,
        start: number,
    ): boolean {
        const startSuggestion = sorted[start]
        if (startSuggestion === undefined) {
            return true
        }

        return used.has(start)
    }

    /**
     * Collects one similarity-connected component.
     *
     * @param sorted Sorted suggestions.
     * @param used Used index set.
     * @param start Start index.
     * @param threshold Similarity threshold.
     * @returns Group suggestions.
     */
    private collectSimilarityCluster(
        sorted: readonly INormalizedSuggestion[],
        used: Set<number>,
        start: number,
        threshold: number,
    ): INormalizedSuggestion[] {
        const startSuggestion = sorted[start]
        if (startSuggestion === undefined) {
            return []
        }

        const group: INormalizedSuggestion[] = []
        const queue: INormalizedSuggestion[] = [startSuggestion]
        used.add(start)

        while (queue.length > 0) {
            const current = queue.shift()
            if (current === undefined || current.embedding === undefined) {
                continue
            }

            group.push(current)
            this.extendClusterBySimilarity(sorted, used, queue, current, threshold)
        }

        return group
    }

    /**
     * Adds similar candidates to BFS queue.
     *
     * @param sorted Suggestions.
     * @param used Used index set.
     * @param queue BFS queue.
     * @param current Current suggestion.
     * @param threshold Similarity threshold.
     */
    private extendClusterBySimilarity(
        sorted: readonly INormalizedSuggestion[],
        used: Set<number>,
        queue: INormalizedSuggestion[],
        current: INormalizedSuggestion,
        threshold: number,
    ): void {
        for (let nextIndex = 0; nextIndex < sorted.length; nextIndex += 1) {
            if (used.has(nextIndex)) {
                continue
            }

            const candidate = sorted[nextIndex]
            if (
                candidate === undefined ||
                candidate.embedding === undefined ||
                current.embedding === undefined
            ) {
                continue
            }

            if (current.embedding.similarity(candidate.embedding) < threshold) {
                continue
            }

            used.add(nextIndex)
            queue.push(candidate)
        }
    }

    /**
     * Reads non-empty string.
     *
     * @param value Source value.
     * @returns Trimmed string.
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
     * Normalizes embedding dto and fills defaults.
     *
     * @param embedding Embedding payload.
     * @param suggestionIndex Source index.
     * @param fields Validation errors collector.
     * @returns Normalized embedding for VO.
     */
    private normalizeEmbedding(
        embedding: ISuggestionEmbeddingDTO,
        suggestionIndex: number,
        fields: IValidationErrorField[],
    ): {readonly vector: readonly number[]; readonly dimensions: number; readonly model: string} | undefined {
        const vector = this.resolveEmbeddingVector(embedding.vector, suggestionIndex, fields)
        if (vector === undefined) {
            return undefined
        }

        const dimensionsRaw = embedding.dimensions === undefined ? vector.length : embedding.dimensions
        const modelRaw = this.readNonEmptyString(embedding.model) ?? this.defaults.embeddingModel
        return {
            vector,
            dimensions: dimensionsRaw,
            model: modelRaw,
        }
    }

    /**
     * Validates embedding vector.
     *
     * @param vector Raw vector.
     * @param suggestionIndex Source index.
     * @param fields Validation errors collector.
     * @returns Normalized vector.
     */
    private resolveEmbeddingVector(
        vector: readonly number[],
        suggestionIndex: number,
        fields: IValidationErrorField[],
    ): readonly number[] | undefined {
        if (!Array.isArray(vector) || vector.length === 0) {
            fields.push({
                field: `suggestions.${suggestionIndex}.embedding.vector`,
                message: "embedding vector must be a non-empty number[]",
            })
            return undefined
        }

        const normalizedVector: number[] = []
        for (const [index, value] of vector.entries()) {
            if (value === undefined) {
                fields.push({
                    field: `suggestions.${suggestionIndex}.embedding.vector.${index}`,
                    message: "embedding vector item must be a finite number",
                })
                return undefined
            }
            if (typeof value !== "number" || Number.isFinite(value) === false) {
                fields.push({
                    field: `suggestions.${suggestionIndex}.embedding.vector.${index}`,
                    message: "embedding vector item must be a finite number",
                })
                return undefined
            }
            const normalizedValue = value

            normalizedVector.push(normalizedValue)
        }

        return normalizedVector
    }

    /**
     * Converts raw exception into validation message.
     *
     * @param error Unknown source error.
     * @returns Message for validation field.
     */
    private resolveEmbeddingErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message
        }

        return "invalid embedding payload"
    }
}
