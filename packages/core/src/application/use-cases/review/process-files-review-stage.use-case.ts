import type {IChatRequestDTO} from "../../dto/llm/chat.dto"
import type {IToolCallDTO} from "../../dto/llm/message.dto"
import type {ISuggestionDTO} from "../../dto/review/suggestion.dto"
import {
    REVIEW_DEPTH_MODE,
    ReviewDepthModeResolver,
    type ReviewDepthMode,
} from "../../../domain/value-objects/review-depth-mode.value-object"
import {
    DIFF_FILE_STATUS,
    DiffFile,
    type DiffFileStatus,
} from "../../../domain/value-objects/diff-file.value-object"
import {FilePath} from "../../../domain/value-objects/file-path.value-object"
import {
    REVIEW_DEPTH_STRATEGY,
    type ReviewDepthStrategy,
} from "../../dto/review/review-config.dto"
import type {IDirectoryConfig} from "../../dto/config/directory-config.dto"
import type {IReviewConfigDTO} from "../../dto/review/review-config.dto"
import type {IGeneratePromptInput} from "../generate-prompt.use-case"
import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {ILLMProvider} from "../../ports/outbound/llm/llm-provider.port"
import type {ILibraryRuleRepository} from "../../ports/outbound/rule/library-rule-repository.port"
import type {
    IGetEnabledRulesInput,
    IGetEnabledRulesOutput,
} from "../../dto/rules/get-enabled-rules.dto"
import type {
    PipelineCollectionItem,
    ReviewPipelineState,
} from "../../types/review/review-pipeline-state"
import type {
    IPipelineStageUseCase,
    IStageCommand,
    IStageTransition,
} from "../../types/review/pipeline-stage.contract"
import type {ValidationError} from "../../../domain/errors/validation.error"
import {StageError} from "../../../domain/errors/stage.error"
import {deduplicate} from "../../../shared/utils/deduplicate"
import {hash} from "../../../shared/utils/hash"
import {Result} from "../../../shared/result"
import {enrichSuggestions} from "../../shared/suggestion-enrichment"
import {SUGGESTION_TOOL} from "../../shared/suggestion-tool"
import {
    appendRuleContext,
    resolveRuleContext,
    resolveSystemPrompt,
} from "../../shared/prompt-resolution"
import {
    extractJsonArray,
    parseSuggestions,
    type ParsedJsonPayload,
} from "../../shared/suggestion-parsing"
import {
    INITIAL_STAGE_ATTEMPT,
    mergeExternalContext,
    readObjectField,
    readStringField,
} from "./pipeline-stage-state.utils"
import type {IReviewFileDefaults} from "../../dto/config/system-defaults.dto"
import {RuleContextFormatterService} from "../../../domain/services/rule-context-formatter.service"

const FILE_CONTENT_LIMIT = 5000

/**
 * Dependencies for process-files-review stage use case.
 */
export interface IProcessFilesReviewStageDependencies {
    llmProvider: ILLMProvider
    generatePromptUseCase: IUseCase<IGeneratePromptInput, string, ValidationError>
    getEnabledRulesUseCase: IUseCase<IGetEnabledRulesInput, IGetEnabledRulesOutput, ValidationError>
    libraryRuleRepository: ILibraryRuleRepository
    ruleContextFormatterService: RuleContextFormatterService
    defaults: IReviewFileDefaults
}

/**
 * One file analysis result payload.
 */
interface IFileAnalysisResult {
    readonly filePath: string
    readonly suggestions: readonly ISuggestionDTO[]
    readonly timedOut: boolean
    readonly failed: boolean
    readonly requestedMode: ReviewDepthMode
    readonly effectiveMode: ReviewDepthMode
    readonly reviewDepthStrategy: ReviewDepthStrategy
    readonly fallbackToLight: boolean
    readonly hasFileContent: boolean
}

interface IFileReviewModeLog {
    readonly filePath: string
    readonly strategy: ReviewDepthStrategy
    readonly requestedMode: ReviewDepthMode
    readonly effectiveMode: ReviewDepthMode
    readonly fallbackToLight: boolean
    readonly hasFileContent: boolean
    readonly stageId: string
    readonly runId: string
    readonly definitionVersion: string
}

interface IFileChatRequestInput {
    readonly filePath: string
    readonly patch: string
    readonly mode: ReviewDepthMode
    readonly fullFileContent: string | undefined
    readonly templateSystemPrompt: string
}

/**
 * Stage 11 use case. Runs per-file LLM analysis using context batches with timeout isolation.
 */
export class ProcessFilesReviewStageUseCase implements IPipelineStageUseCase {
    public readonly stageId: string
    public readonly stageName: string

    private readonly llmProvider: ILLMProvider
    private readonly generatePromptUseCase: IUseCase<IGeneratePromptInput, string, ValidationError>
    private readonly getEnabledRulesUseCase: IUseCase<IGetEnabledRulesInput, IGetEnabledRulesOutput, ValidationError>
    private readonly libraryRuleRepository: ILibraryRuleRepository
    private readonly ruleContextFormatterService: RuleContextFormatterService
    private readonly model: string
    private readonly defaults: IReviewFileDefaults

    /**
     * Creates process-files-review stage use case.
     *
     * @param dependencies Stage dependencies.
     */
    public constructor(dependencies: IProcessFilesReviewStageDependencies) {
        this.stageId = "process-files-review"
        this.stageName = "Process Files Review"
        this.llmProvider = dependencies.llmProvider
        this.generatePromptUseCase = dependencies.generatePromptUseCase
        this.getEnabledRulesUseCase = dependencies.getEnabledRulesUseCase
        this.libraryRuleRepository = dependencies.libraryRuleRepository
        this.ruleContextFormatterService = dependencies.ruleContextFormatterService
        this.defaults = dependencies.defaults
        this.model = dependencies.defaults.model
    }

    /**
     * Executes per-file analysis and stores deduplicated suggestions in pipeline state.
     *
     * @param input Stage command payload.
     * @returns Updated stage transition or stage error.
     */
    public async execute(input: IStageCommand): Promise<Result<IStageTransition, StageError>> {
        const timeoutMs = this.resolveTimeoutMs(input.state.config)
        const reviewDepthStrategy = this.resolveReviewDepthStrategy(input.state.config)
        const batches = this.resolveBatches(input.state)
        const templateSystemPromptResult = await this.resolveTemplateSystemPrompt(
            input.state.runId,
            input.state.definitionVersion,
            input.state.mergeRequest,
            input.state.config,
        )
        if (templateSystemPromptResult.isFail) {
            return Result.fail<IStageTransition, StageError>(templateSystemPromptResult.error)
        }
        const templateSystemPrompt = templateSystemPromptResult.value

        try {
            const analysisResults = await this.analyzeFiles(
                batches,
                input.state.config,
                timeoutMs,
                reviewDepthStrategy,
                templateSystemPrompt,
            )
            const fileReviewModeLogs = this.buildFileReviewModeLogs(
                analysisResults,
                input.state.runId,
                input.state.definitionVersion,
            )
            const stats = this.buildFileReviewStats(analysisResults)
            const aggregatedSuggestions = this.collectSuggestions(analysisResults)
            const deduplicatedSuggestions = deduplicate(
                aggregatedSuggestions,
                (suggestion): string => {
                    return `${suggestion.filePath}|${suggestion.lineStart}|${suggestion.lineEnd}|${suggestion.message}`
                },
            )

            const metadata = this.buildSuccessMetadata(stats.timedOutFiles)
            const deduplicatedSuggestionsCount = deduplicatedSuggestions.length
            const externalContext = mergeExternalContext(
                input.state.externalContext,
                this.buildFileReviewExternalContext(
                    {
                        runId: input.state.runId,
                        definitionVersion: input.state.definitionVersion,
                        reviewDepthStrategy,
                        batchCount: batches.length,
                        fileCount: batches.flat().length,
                        deduplicatedSuggestions: deduplicatedSuggestionsCount,
                        fileReviewModeLogs,
                        stats,
                    },
                ),
            )

            return Result.ok<IStageTransition, StageError>({
                state: input.state.with({
                    suggestions: deduplicatedSuggestions.map((suggestion) => {
                        return {
                            ...suggestion,
                        }
                    }),
                    externalContext,
                }),
                metadata,
            })
        } catch (error: unknown) {
            return Result.fail<IStageTransition, StageError>(
                this.createStageError(
                    input.state.runId,
                    input.state.definitionVersion,
                    "Failed to process file-level review stage",
                    true,
                    error instanceof Error ? error : undefined,
                ),
            )
        }
    }

    /**
     * Analyzes files per batch and aggregates raw results.
     *
     * @param batches File batches.
     * @param config Review config.
     * @param timeoutMs Timeout in milliseconds.
     * @param reviewDepthStrategy Depth strategy.
     * @param templateSystemPrompt Template system prompt for review.
     * @returns File analysis results.
     */
    private async analyzeFiles(
        batches: readonly (readonly PipelineCollectionItem[])[],
        config: Readonly<Record<string, unknown>>,
        timeoutMs: number,
        reviewDepthStrategy: ReviewDepthStrategy,
        templateSystemPrompt: string,
    ): Promise<readonly IFileAnalysisResult[]> {
        const results: IFileAnalysisResult[] = []

        for (const batch of batches) {
            const batchResults = await Promise.all(
                batch.map(async (file): Promise<IFileAnalysisResult> => {
                    return this.analyzeSingleFile(
                        file,
                        config,
                        timeoutMs,
                        reviewDepthStrategy,
                        templateSystemPrompt,
                    )
                }),
            )
            results.push(...batchResults)
        }

        return results
    }

    /**
     * Aggregates file review mode metadata.
     *
     * @param analysisResults File analysis result list.
     * @param runId Pipeline run id.
     * @param definitionVersion Pipeline definition version.
     * @returns File-level logs.
     */
    private buildFileReviewModeLogs(
        analysisResults: readonly IFileAnalysisResult[],
        runId: string,
        definitionVersion: string,
    ): readonly IFileReviewModeLog[] {
        return analysisResults.map((result) => {
            return {
                filePath: result.filePath,
                strategy: result.reviewDepthStrategy,
                requestedMode: result.requestedMode,
                effectiveMode: result.effectiveMode,
                fallbackToLight: result.fallbackToLight,
                hasFileContent: result.hasFileContent,
                stageId: this.stageId,
                runId,
                definitionVersion,
            }
        })
    }

    /**
     * Builds file-review counters and rollups.
     *
     * @param analysisResults Analysis results.
     * @returns Aggregated counters.
     */
    private buildFileReviewStats(analysisResults: readonly IFileAnalysisResult[]): {
        timedOutFiles: number
        failedFiles: number
        requestedLightCount: number
        requestedHeavyCount: number
        effectiveLightCount: number
        effectiveHeavyCount: number
        fallbackToLightCount: number
    } {
        let timedOutFiles = 0
        let failedFiles = 0
        let requestedHeavyCount = 0
        let requestedLightCount = 0
        let effectiveHeavyCount = 0
        let effectiveLightCount = 0
        let fallbackToLightCount = 0

        for (const result of analysisResults) {
            if (result.timedOut === true) {
                timedOutFiles += 1
            }
            if (result.failed === true) {
                failedFiles += 1
            }
            if (result.requestedMode === REVIEW_DEPTH_MODE.HEAVY) {
                requestedHeavyCount += 1
            } else {
                requestedLightCount += 1
            }
            if (result.effectiveMode === REVIEW_DEPTH_MODE.HEAVY) {
                effectiveHeavyCount += 1
            } else {
                effectiveLightCount += 1
            }
            if (result.fallbackToLight === true) {
                fallbackToLightCount += 1
            }
        }

        return {
            timedOutFiles,
            failedFiles,
            requestedLightCount,
            requestedHeavyCount,
            effectiveLightCount,
            effectiveHeavyCount,
            fallbackToLightCount,
        }
    }

    /**
     * Aggregates file suggestions from all analysis results.
     *
     * @param analysisResults Per-file analysis results.
     * @returns Suggestions list.
     */
    private collectSuggestions(analysisResults: readonly IFileAnalysisResult[]): readonly ISuggestionDTO[] {
        const suggestions: ISuggestionDTO[] = []
        for (const result of analysisResults) {
            suggestions.push(...result.suggestions)
        }

        return suggestions
    }

    /**
     * Builds transition metadata for successful stage run.
     *
     * @param timedOutFiles Timed-out file count.
     * @returns Transition metadata.
     */
    private buildSuccessMetadata(timedOutFiles: number): {
        checkpointHint: "files-review:processed"
        notes: string | undefined
    } {
        return {
            checkpointHint: "files-review:processed",
            notes:
                timedOutFiles > 0
                    ? `${timedOutFiles} file analyses timed out`
                    : undefined,
        }
    }

    /**
     * Builds external context payload for successful file review execution.
     *
     * @param stats Aggregated file review stats.
     * @param fileReviewModeLogs Per-file mode logs.
     * @param batches Processing batches.
     * @param reviewDepthStrategy Effective default strategy.
     * @param state Current pipeline state.
     * @returns External context patch.
     */
    private buildFileReviewExternalContext(
        data: {
            stats: {
                timedOutFiles: number
                failedFiles: number
                requestedLightCount: number
                requestedHeavyCount: number
                effectiveLightCount: number
                effectiveHeavyCount: number
                fallbackToLightCount: number
            }
            fileReviewModeLogs: readonly IFileReviewModeLog[]
            deduplicatedSuggestions: number
            batchCount: number
            fileCount: number
            reviewDepthStrategy: ReviewDepthStrategy
            runId: string
            definitionVersion: string
        },
    ): Readonly<Record<string, unknown>> {
        const {
            stats,
            fileReviewModeLogs,
            deduplicatedSuggestions,
            batchCount,
            fileCount,
            reviewDepthStrategy,
            runId,
            definitionVersion,
        } = data

        return {
            fileReviewStats: {
                batchCount,
                fileCount,
                timedOutFiles: stats.timedOutFiles,
                failedFiles: stats.failedFiles,
                deduplicatedSuggestions,
                reviewDepthStrategy,
                modeSummary: {
                    requested: {
                        light: stats.requestedLightCount,
                        heavy: stats.requestedHeavyCount,
                    },
                    effective: {
                        light: stats.effectiveLightCount,
                        heavy: stats.effectiveHeavyCount,
                    },
                    fallbackToLight: stats.fallbackToLightCount,
                },
                fileReviewModes: fileReviewModeLogs,
                runContext: {
                    stageId: this.stageId,
                    runId,
                    definitionVersion,
                },
            },
        }
    }

    /**
     * Resolves file analysis timeout from config payload.
     *
     * @param config Config payload.
     * @returns Timeout in milliseconds.
     */
    private resolveTimeoutMs(config: Readonly<Record<string, unknown>>): number {
        const rawTimeout = config["fileReviewTimeoutMs"]
        if (typeof rawTimeout !== "number" || Number.isInteger(rawTimeout) === false || rawTimeout < 1) {
            return this.defaults.timeoutMs
        }

        return rawTimeout
    }

    /**
     * Resolves review depth strategy from config with safe fallback to auto.
     *
     * @param config Config payload.
     * @returns Strategy normalized to known values.
     */
    private resolveReviewDepthStrategy(config: Readonly<Record<string, unknown>>): ReviewDepthStrategy {
        const rawStrategy = config["reviewDepthStrategy"]
        if (typeof rawStrategy !== "string") {
            return this.defaults.reviewDepthStrategy
        }

        const normalizedStrategy = rawStrategy.trim()
        if (
            Object.values(REVIEW_DEPTH_STRATEGY).includes(
                normalizedStrategy as ReviewDepthStrategy,
            )
        ) {
            return normalizedStrategy as ReviewDepthStrategy
        }

        return this.defaults.reviewDepthStrategy
    }

    /**
     * Resolves batch plan from state external context or fallback to one batch from files.
     *
     * @param state Current pipeline state.
     * @returns File batches.
     */
    private resolveBatches(state: ReviewPipelineState): readonly (readonly PipelineCollectionItem[])[] {
        if (state.files.length === 0) {
            return [[]]
        }

        const externalContext = state.externalContext
        if (externalContext === null) {
            return [state.files]
        }

        const batches = this.mapRawBatches(externalContext["batches"])
        if (batches.length === 0) {
            return [state.files]
        }

        return batches
    }

    /**
     * Maps external context raw batches payload to typed batches.
     *
     * @param rawBatches Raw batches payload.
     * @returns Typed batches.
     */
    private mapRawBatches(rawBatches: unknown): readonly (readonly PipelineCollectionItem[])[] {
        if (!Array.isArray(rawBatches)) {
            return []
        }

        const batches: Array<readonly PipelineCollectionItem[]> = []
        for (const rawBatch of rawBatches) {
            const mappedBatch = this.mapRawBatch(rawBatch)
            if (mappedBatch.length === 0) {
                continue
            }

            batches.push(mappedBatch)
        }

        return batches
    }

    /**
     * Maps one raw batch payload to typed file items.
     *
     * @param rawBatch Raw batch payload.
     * @returns Typed batch.
     */
    private mapRawBatch(rawBatch: unknown): readonly PipelineCollectionItem[] {
        if (!Array.isArray(rawBatch)) {
            return []
        }

        const batch: PipelineCollectionItem[] = []
        for (const rawFile of rawBatch) {
            if (rawFile === null || typeof rawFile !== "object" || Array.isArray(rawFile)) {
                continue
            }

            batch.push(rawFile as PipelineCollectionItem)
        }

        return batch
    }

    /**
     * Runs one file analysis with timeout isolation.
     *
     * @param file File payload.
     * @param config Config payload.
     * @param timeoutMs Timeout in milliseconds.
     * @param reviewDepthStrategy Review strategy override.
     * @param templateSystemPrompt Template system prompt for review.
     * @returns File analysis result.
     */
    private async analyzeSingleFile(
        file: PipelineCollectionItem,
        config: Readonly<Record<string, unknown>>,
        timeoutMs: number,
        reviewDepthStrategy: ReviewDepthStrategy,
        templateSystemPrompt: string,
    ): Promise<IFileAnalysisResult> {
        const filePathValue = this.resolveString(file["path"])
        if (filePathValue === undefined) {
            return this.createFailedAnalysisResult(
                "unknown",
                reviewDepthStrategy,
                REVIEW_DEPTH_MODE.LIGHT,
                REVIEW_DEPTH_MODE.LIGHT,
            )
        }

        const patch = this.resolveString(file["patch"]) ?? ""
        const fullFileContent = this.resolveFullFileContent(file)
        const hunks = this.resolveHunks(file["hunks"])
        const status = this.resolveDiffFileStatus(file["status"])
        const filePath = this.createFilePath(filePathValue)
        const fileReviewConfig = this.resolveFileConfig(config, filePath)
        const fileReviewDepthStrategy = this.resolveReviewDepthStrategy(fileReviewConfig)

        const diffFile = this.resolveDiffFile({
            filePath,
            status,
            hunks,
            patch,
            oldPathValue: this.resolveOldPath(file["oldPath"], status),
        })
        const requestedMode = this.resolveRequestedMode(fileReviewDepthStrategy, diffFile)
        const hasFileContent = fullFileContent !== undefined
        const fallbackToLight =
            requestedMode === REVIEW_DEPTH_MODE.HEAVY && hasFileContent === false
        const effectiveMode =
            fallbackToLight ? REVIEW_DEPTH_MODE.LIGHT : requestedMode

        const request = this.buildFileChatRequest({
            filePath: filePathValue,
            patch,
            mode: effectiveMode,
            fullFileContent,
            templateSystemPrompt,
        })

        try {
            const response = await this.runWithTimeout(this.llmProvider.chat(request), timeoutMs)
            const suggestions = this.parseFileSuggestions(
                filePathValue,
                response.content,
                response.toolCalls,
            )

            return {
                filePath: filePathValue,
                suggestions,
                timedOut: false,
                failed: false,
                requestedMode,
                effectiveMode,
                reviewDepthStrategy: fileReviewDepthStrategy,
                fallbackToLight,
                hasFileContent,
            }
        } catch (error: unknown) {
            const timeoutCode = this.readTimeoutCode(error)
            if (timeoutCode) {
                return {
                    filePath: filePathValue,
                    suggestions: [],
                    timedOut: true,
                    failed: false,
                    requestedMode,
                    effectiveMode,
                    reviewDepthStrategy: fileReviewDepthStrategy,
                    fallbackToLight,
                    hasFileContent,
                }
            }

            return {
                filePath: filePathValue,
                suggestions: [],
                timedOut: false,
                failed: true,
                requestedMode,
                effectiveMode,
                reviewDepthStrategy: fileReviewDepthStrategy,
                fallbackToLight,
                hasFileContent,
            }
        }
    }

    /**
     * Creates file review mode for one file.
     *
     * @param strategy Review depth strategy.
     * @param diffFile Parsed diff file when available.
     * @returns Requested mode before context fallback.
     */
    private resolveRequestedMode(
        strategy: ReviewDepthStrategy,
        diffFile: DiffFile | undefined,
    ): ReviewDepthMode {
        if (strategy === REVIEW_DEPTH_STRATEGY.ALWAYS_LIGHT) {
            return REVIEW_DEPTH_MODE.LIGHT
        }

        if (strategy === REVIEW_DEPTH_STRATEGY.ALWAYS_HEAVY) {
            return REVIEW_DEPTH_MODE.HEAVY
        }

        if (diffFile === undefined) {
            return REVIEW_DEPTH_MODE.LIGHT
        }

        return ReviewDepthModeResolver.fromFileChange(diffFile)
    }

    /**
     * Creates file-path object from raw value.
     *
     * @param rawPath Raw file path.
     * @returns File path instance.
     */
    private createFilePath(rawPath: string): FilePath {
        return FilePath.create(rawPath)
    }

    /**
     * Resolves effective config for a concrete file path.
     *
     * @param config Base pipeline config.
     * @param filePath File path.
     * @returns Config merged with most specific directory override.
     */
    private resolveFileConfig(
        config: Readonly<Record<string, unknown>>,
        filePath: FilePath,
    ): Readonly<Record<string, unknown>> {
        const directoryConfig = this.resolveMatchingDirectoryConfig(config, filePath)
        if (directoryConfig === undefined) {
            return config
        }

        const mergedConfig: Record<string, unknown> = {
            ...config,
        }
        delete mergedConfig.directories
        const override = directoryConfig.config

        for (const [key, value] of Object.entries(override)) {
            mergedConfig[key] = value
        }

        return mergedConfig
    }

    /**
     * Chooses the most specific matching directory override.
     *
     * @param config Pipeline config payload.
     * @param filePath File path.
     * @returns The selected directory override or undefined.
     */
    private resolveMatchingDirectoryConfig(
        config: Readonly<Record<string, unknown>>,
        filePath: FilePath,
    ): IDirectoryConfig | undefined {
        const directories = this.resolveDirectoryConfigs(config)
        let selectedDirectory: IDirectoryConfig | undefined
        let bestSpecificity = -1
        let bestIndex = -1

        for (let index = 0; index < directories.length; index += 1) {
            const directoryConfig = directories[index]
            if (directoryConfig === undefined) {
                continue
            }

            if (this.isDirectoryMatch(filePath, directoryConfig.path) === false) {
                continue
            }

            const specificity = this.calculateDirectorySpecificity(directoryConfig.path)
            if (
                specificity > bestSpecificity ||
                (specificity === bestSpecificity && index > bestIndex)
            ) {
                selectedDirectory = directoryConfig
                bestSpecificity = specificity
                bestIndex = index
            }
        }

        return selectedDirectory
    }

    /**
     * Resolves directory configs from base config.
     *
     * @param config Pipeline config.
     * @returns Directory configurations.
     */
    private resolveDirectoryConfigs(
        config: Readonly<Record<string, unknown>>,
    ): readonly IDirectoryConfig[] {
        const directories = config["directories"]
        if (Array.isArray(directories) === false) {
            return []
        }

        const parsedDirectories: IDirectoryConfig[] = []

        for (const rawDirectoryConfig of directories) {
            const directoryConfig = this.resolveDirectoryConfig(rawDirectoryConfig)
            if (directoryConfig !== undefined) {
                parsedDirectories.push(directoryConfig)
            }
        }

        return parsedDirectories
    }

    /**
     * Normalizes and validates one directory config entry.
     *
     * @param rawDirectoryConfig Raw directory config value.
     * @returns Parsed directory config or undefined.
     */
    private resolveDirectoryConfig(rawDirectoryConfig: unknown): IDirectoryConfig | undefined {
        if (rawDirectoryConfig === null || typeof rawDirectoryConfig !== "object" || Array.isArray(rawDirectoryConfig)) {
            return undefined
        }

        const record = rawDirectoryConfig as Readonly<Record<string, unknown>>
        const path = this.resolveString(record["path"])
        if (path === undefined) {
            return undefined
        }

        const config = readObjectField(record, "config")
        if (config === undefined) {
            return undefined
        }

        return {
            path,
            config: config as Partial<IReviewConfigDTO>,
        }
    }

    /**
     * Checks whether file path matches configured directory rule.
     *
     * @param filePath File path.
     * @param directoryPath Directory matcher.
     * @returns True when path matches directory rule.
     */
    private isDirectoryMatch(filePath: FilePath, directoryPath: string): boolean {
        const normalizedPath = this.normalizeDirectoryPath(directoryPath)
        if (normalizedPath.length === 0) {
            return false
        }

        const normalizedFilePath = filePath.toString()
        if (this.isGlobPattern(normalizedPath) === true) {
            return filePath.matchesGlob(normalizedPath)
        }

        if (normalizedFilePath === normalizedPath) {
            return true
        }

        return normalizedFilePath.startsWith(`${normalizedPath}/`)
    }

    /**
     * Checks whether directory pattern contains wildcards.
     *
     * @param path Pattern.
     * @returns True when wildcard tokens are present.
     */
    private isGlobPattern(path: string): boolean {
        return path.includes("*") || path.includes("?")
    }

    /**
     * Calculates pattern precedence for conflicting directory overrides.
     *
     * @param path Directory pattern.
     * @returns Numeric specificity score.
     */
    private calculateDirectorySpecificity(path: string): number {
        const normalizedPath = this.normalizeDirectoryPath(path)
        if (this.isGlobPattern(normalizedPath) === false) {
            return normalizedPath.length + 1000
        }

        return normalizedPath.length
    }

    /**
     * Normalizes directory rule path before matching.
     *
     * @param path Raw directory path.
     * @returns Normalized path.
     */
    private normalizeDirectoryPath(path: string): string {
        const normalized = path.trim().replaceAll("\\", "/")
        if (normalized.length === 0) {
            return ""
        }

        let result = normalized
        if (result.startsWith("./")) {
            result = result.slice(2)
        }

        while (result.startsWith("/")) {
            result = result.slice(1)
        }

        while (result.length > 1 && result.endsWith("/")) {
            result = result.slice(0, -1)
        }

        return result
    }

    /**
     * Creates typed diff file value object when source payload is complete.
     *
     * @param params Diff file components.
     * @returns Diff file or undefined.
     */
    private resolveDiffFile(params: {
        filePath: FilePath
        status: DiffFileStatus
        hunks: readonly string[]
        patch: string
        oldPathValue: FilePath | undefined
    }): DiffFile | undefined {
        try {
            return DiffFile.create({
                filePath: params.filePath,
                status: params.status,
                hunks: params.hunks,
                patch: params.patch,
                ...(params.oldPathValue === undefined ? {} : {oldPath: params.oldPathValue}),
            })
        } catch {
            return undefined
        }
    }

    /**
     * Resolves diff file status with safe default.
     *
     * @param rawStatus Raw status value.
     * @returns Normalized diff file status.
     */
    private resolveDiffFileStatus(rawStatus: unknown): DiffFileStatus {
        if (typeof rawStatus !== "string") {
            return DIFF_FILE_STATUS.MODIFIED
        }

        const normalized = rawStatus.trim()
        if (
            normalized !== "" &&
            Object.values(DIFF_FILE_STATUS).includes(normalized as DiffFileStatus)
        ) {
            return normalized as DiffFileStatus
        }

        return DIFF_FILE_STATUS.MODIFIED
    }

    /**
     * Resolves optional old file path for renamed files.
     *
     * @param rawOldPath Raw old path value.
     * @param status File diff status.
     * @returns File path for renamed files when valid.
     */
    private resolveOldPath(
        rawOldPath: unknown,
        status: DiffFileStatus,
    ): FilePath | undefined {
        if (status !== DIFF_FILE_STATUS.RENAMED) {
            return undefined
        }

        const oldPath = this.resolveString(rawOldPath)
        if (oldPath === undefined) {
            return undefined
        }

        try {
            return FilePath.create(oldPath)
        } catch {
            return undefined
        }
    }

    /**
     * Reads candidate full file content.
     *
     * @param file File payload.
     * @returns Full file content when present.
     */
    private resolveFullFileContent(
        file: PipelineCollectionItem,
    ): string | undefined {
        const fullFileContent = this.resolveString(file["fullFileContent"])
        if (fullFileContent !== undefined) {
            return fullFileContent
        }

        return this.resolveString(file["content"])
    }

    /**
     * Resolves diff hunks list.
     *
     * @param rawHunks Candidate hunks.
     * @returns Normalized hunks.
     */
    private resolveHunks(rawHunks: unknown): readonly string[] {
        if (!Array.isArray(rawHunks)) {
            return []
        }

        const hunks: string[] = []
        for (const rawHunk of rawHunks) {
            const hunk = this.resolveString(rawHunk)
            if (hunk === undefined) {
                continue
            }

            if (hunk.trim().length === 0) {
                continue
            }

            hunks.push(hunk)
        }

        return hunks
    }

    /**
     * Resolves template-based system prompt for review stage.
     *
     * @param mergeRequest Merge request payload.
     * @returns Rendered system prompt or undefined when unavailable.
     */
    private async resolveTemplateSystemPrompt(
        runId: string,
        definitionVersion: string,
        mergeRequest: Readonly<Record<string, unknown>>,
        config: Readonly<Record<string, unknown>>,
    ): Promise<Result<string, StageError>> {
        const organizationId = readStringField(mergeRequest, "organizationId")
        const teamId = readStringField(mergeRequest, "teamId")
        const rulesContextResult = await resolveRuleContext({
            organizationId,
            teamId,
            globalRuleIds: config["globalRuleIds"] as readonly string[] | undefined,
            organizationRuleIds: config["organizationRuleIds"] as readonly string[] | undefined,
            getEnabledRulesUseCase: this.getEnabledRulesUseCase,
            libraryRuleRepository: this.libraryRuleRepository,
            ruleContextFormatterService: this.ruleContextFormatterService,
        })
        if (rulesContextResult.isFail) {
            const reason = rulesContextResult.error.reason
            const message = reason === "enabled-rules"
                ? "Failed to resolve enabled rules for file review stage"
                : "Failed to resolve rules for file review stage"
            return Result.fail<string, StageError>(
                this.createStageError(
                    runId,
                    definitionVersion,
                    message,
                    reason !== "enabled-rules",
                    rulesContextResult.error.originalError,
                ),
            )
        }

        const runtimeVariables = appendRuleContext({}, rulesContextResult.value)
        const promptResult = await resolveSystemPrompt({
            generatePromptUseCase: this.generatePromptUseCase,
            promptName: this.defaults.systemPromptName,
            organizationId: organizationId ?? null,
            runtimeVariables,
        })
        if (promptResult.isFail) {
            const reason = promptResult.error.reason
            if (reason === "missing") {
                return Result.fail<string, StageError>(
                    this.createStageError(
                        runId,
                        definitionVersion,
                        `Missing prompt template '${this.defaults.systemPromptName}' for file review stage`,
                        false,
                        promptResult.error.originalError,
                    ),
                )
            }

            if (reason === "empty") {
                return Result.fail<string, StageError>(
                    this.createStageError(
                        runId,
                        definitionVersion,
                        `Empty prompt template '${this.defaults.systemPromptName}' for file review stage`,
                        false,
                    ),
                )
            }

            return Result.fail<string, StageError>(
                this.createStageError(
                    runId,
                    definitionVersion,
                    "Failed to resolve prompt template for file review stage",
                    true,
                    promptResult.error.originalError,
                ),
            )
        }

        return Result.ok<string, StageError>(promptResult.value)
    }

    /**
     * Builds per-file LLM chat request.
     *
     * @param params Request input.
     * @returns Chat request payload.
     */
    private buildFileChatRequest(
        params: IFileChatRequestInput,
    ): IChatRequestDTO {
        const systemPrompt = params.templateSystemPrompt
        const reviewerPrompt = this.defaults.reviewerPrompt

        return {
            model: this.model,
            maxTokens: this.defaults.maxTokens,
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: this.buildFileUserPrompt(
                        params.filePath,
                        params.patch,
                        reviewerPrompt,
                        params.mode,
                        params.fullFileContent,
                    ),
                },
            ],
        }
    }

    /**
     * Builds user payload with optional full file context.
     *
     * @param filePath File path.
     * @param patch File patch.
     * @param reviewerPrompt Reviewer prompt.
     * @param mode Review mode.
     * @param fullFileContent Optional full file content.
     * @returns Prompt content.
     */
    private buildFileUserPrompt(
        filePath: string,
        patch: string,
        reviewerPrompt: string,
        mode: ReviewDepthMode,
        fullFileContent: string | undefined,
    ): string {
        const truncatedPatch = patch.slice(0, FILE_CONTENT_LIMIT)

        if (mode === REVIEW_DEPTH_MODE.HEAVY && fullFileContent !== undefined) {
            return `${reviewerPrompt}\n\nFILE: ${filePath}\nPATCH:\n${truncatedPatch}\nFULL_FILE:\n${fullFileContent}`
        }

        return `${reviewerPrompt}\n\nFILE: ${filePath}\nPATCH:\n${truncatedPatch}`
    }


    /**
     * Builds a failed file analysis fallback result.
     *
     * @param filePath Raw file path.
     * @param reviewDepthStrategy Review depth strategy.
     * @param requestedMode Requested mode before fallbacks.
     * @param effectiveMode Final mode used.
     * @returns Failed file analysis result.
     */
    private createFailedAnalysisResult(
        filePath: string,
        reviewDepthStrategy: ReviewDepthStrategy,
        requestedMode: ReviewDepthMode,
        effectiveMode: ReviewDepthMode,
    ): IFileAnalysisResult {
        return {
            filePath,
            suggestions: [],
            timedOut: false,
            failed: true,
            requestedMode,
            effectiveMode,
            reviewDepthStrategy,
            fallbackToLight: false,
            hasFileContent: false,
        }
    }

    /**
     * Parses per-file suggestions from LLM response.
     *
     * @param filePath File path.
     * @param content LLM content.
     * @returns Suggestion list.
     */
    private parseFileSuggestions(
        filePath: string,
        content: string,
        toolCalls: readonly IToolCallDTO[] | undefined,
    ): readonly ISuggestionDTO[] {
        const parsed = parseSuggestions({
            content,
            toolCalls,
            toolNames: [SUGGESTION_TOOL],
        })
        if (parsed.length > 0) {
            const suggestions = this.mapParsedSuggestions(filePath, parsed)
            if (suggestions.length > 0) {
                return suggestions
            }
        }

        const trimmedContent = content.trim()
        if (trimmedContent.length === 0) {
            return []
        }

        return [
            {
                id: `file-${hash(`${filePath}|${trimmedContent}`)}`,
                filePath,
                lineStart: 1,
                lineEnd: 1,
                severity: "MEDIUM",
                category: "code_quality",
                message: trimmedContent,
                committable: true,
                rankScore: 50,
            },
        ]
    }

    /**
     * Maps parsed payload to per-file suggestions.
     *
     * @param filePath File path.
     * @param payload Parsed payload.
     * @returns Suggestion list.
     */
    private mapParsedSuggestions(filePath: string, payload: ParsedJsonPayload): readonly ISuggestionDTO[] {
        return enrichSuggestions(extractJsonArray(payload), {
            idPrefix: "file",
            idComponents: ["filePath", "lineStart", "lineEnd", "message"],
            defaultFilePath: filePath,
            defaultLineStart: 1,
            defaults: {
                category: "code_quality",
                severity: "MEDIUM",
                committable: true,
                rankScore: 50,
            },
        })
    }

    /**
     * Reads non-empty string field with fallback.
     *
     * @param value Candidate value.
     * @returns Normalized string or undefined.
     */
    private resolveString(value: unknown): string | undefined {
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
     * Executes promise with timeout guard.
     *
     * @template T Promise value type.
     * @param promise Source promise.
     * @param timeoutMs Timeout duration.
     * @returns Promise value.
     */
    private async runWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
        let timeoutHandle: ReturnType<typeof setTimeout> | undefined = undefined
        const timeoutPromise = new Promise<T>((_resolve, reject) => {
            timeoutHandle = setTimeout(() => {
                reject(new Error("TIMEOUT"))
            }, timeoutMs)
        })

        try {
            return await Promise.race([promise, timeoutPromise])
        } finally {
            if (timeoutHandle !== undefined) {
                clearTimeout(timeoutHandle)
            }
        }
    }

    /**
     * Reads timeout code from unknown error.
     *
     * @param error Unknown error value.
     * @returns True when error indicates timeout.
     */
    private readTimeoutCode(error: unknown): boolean {
        if (!(error instanceof Error)) {
            return false
        }

        return error.message === "TIMEOUT"
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
