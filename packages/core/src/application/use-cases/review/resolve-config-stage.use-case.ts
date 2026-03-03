import {ConfigurationMergerUseCase} from "../configuration-merger.use-case"
import type {IReviewConfigDTO} from "../../dto/review/review-config.dto"
import type {IRepositoryConfigLoader} from "../../ports/outbound/review/repository-config-loader.port"
import type {
    IPipelineStageUseCase,
    IStageCommand,
    IStageTransition,
} from "../../types/review/pipeline-stage.contract"
import {StageError} from "../../../domain/errors/stage.error"
import {NotFoundError} from "../../../domain/errors/not-found.error"
import {Result} from "../../../shared/result"
import {INITIAL_STAGE_ATTEMPT, readStringField} from "./pipeline-stage-state.utils"

const DEFAULT_REVIEW_CONFIG: IReviewConfigDTO = {
    severityThreshold: "MEDIUM",
    ignorePaths: [],
    maxSuggestionsPerFile: 5,
    maxSuggestionsPerCCR: 30,
    cadence: "standard",
    customRuleIds: [],
}

interface IConfigResolutionContext {
    readonly repositoryId: string
    readonly organizationId: string
    readonly teamId: string
}

/**
 * Stage 3 use case. Resolves layered review configuration (default -> org -> repo).
 */
export class ResolveConfigStageUseCase implements IPipelineStageUseCase {
    public readonly stageId = "resolve-config"
    public readonly stageName = "Resolve Config"

    private readonly repositoryConfigLoader: IRepositoryConfigLoader
    private readonly configMerger: ConfigurationMergerUseCase

    /**
     * Creates resolve-config stage use case.
     *
     * @param repositoryConfigLoader Layered config loader dependency.
     */
    public constructor(
        repositoryConfigLoader: IRepositoryConfigLoader,
        configMerger: ConfigurationMergerUseCase = new ConfigurationMergerUseCase(),
    ) {
        this.repositoryConfigLoader = repositoryConfigLoader
        this.configMerger = configMerger
    }

    /**
     * Loads all config layers and merges them into pipeline context.
     *
     * @param input Stage execution input.
     * @returns Updated state transition or stage error.
     */
    public async execute(input: IStageCommand): Promise<Result<IStageTransition, StageError>> {
        const context = this.resolveContext(input)
        if (context.isFail) {
            return Result.fail<IStageTransition, StageError>(context.error)
        }

        return this.mergeAndResolveConfig(input.state, context.value)
    }

    /**
     * Resolves required identifiers from stage context.
     *
     * @param input Stage execution input.
     * @returns Resolved identifiers.
     */
    private resolveContext(
        input: IStageCommand,
    ): Result<
        IConfigResolutionContext,
        StageError
    > {
        const repositoryId = this.resolveRepositoryId(input)
        if (repositoryId.isFail) {
            return Result.fail<IConfigResolutionContext, StageError>(repositoryId.error)
        }

        const organizationId = this.resolveOrganizationId(input)
        if (organizationId.isFail) {
            return Result.fail<IConfigResolutionContext, StageError>(organizationId.error)
        }

        const teamId = this.resolveTeamId(input)
        if (teamId.isFail) {
            return Result.fail<IConfigResolutionContext, StageError>(teamId.error)
        }

        return Result.ok<IConfigResolutionContext, StageError>({
            repositoryId: repositoryId.value,
            organizationId: organizationId.value,
            teamId: teamId.value,
        })
    }

    /**
     * Loads config layers and merges them for resolved context.
     *
     * @param state Pipeline state.
     * @param context Resolved identifiers.
     * @returns State transition with merged config.
     */
    private async mergeAndResolveConfig(
        state: IStageTransition["state"],
        context: IConfigResolutionContext,
    ): Promise<Result<IStageTransition, StageError>> {
        try {
            const defaultLayer = await this.loadDefaultLayer()
            const organizationLayer = await this.loadOrganizationLayer(
                context.organizationId,
                context.teamId,
            )
            const repositoryLayer = await this.loadRepositoryLayer(context.repositoryId)

            const defaultMergedResult = await this.configMerger.execute({
                default: DEFAULT_REVIEW_CONFIG as unknown as Readonly<Record<string, unknown>>,
                org: defaultLayer ?? undefined,
                repo: undefined,
            })

            if (defaultMergedResult.isFail) {
                return Result.fail<IStageTransition, StageError>(
                    this.createStageError(
                        state.runId,
                        state.definitionVersion,
                        "Failed to resolve repository configuration layers",
                        true,
                        defaultMergedResult.error,
                    ),
                )
            }

            const mergedConfigResult = await this.configMerger.execute({
                default: defaultMergedResult.value,
                org: organizationLayer ?? undefined,
                repo: repositoryLayer ?? undefined,
            })

            if (mergedConfigResult.isFail) {
                return Result.fail<IStageTransition, StageError>(
                    this.createStageError(
                        state.runId,
                        state.definitionVersion,
                        "Failed to resolve repository configuration layers",
                        true,
                        mergedConfigResult.error,
                    ),
                )
            }

            return Result.ok<IStageTransition, StageError>({
                state: state.with({
                    config: mergedConfigResult.value,
                }),
                metadata: {
                    checkpointHint: "config:resolved",
                },
            })
        } catch (error: unknown) {
            return Result.fail<IStageTransition, StageError>(
                this.createStageError(
                    state.runId,
                    state.definitionVersion,
                    "Failed to resolve repository configuration layers",
                    true,
                    error instanceof Error ? error : undefined,
                ),
            )
        }
    }

    /**
     * Resolves repository id from merge request context.
     *
     * @param input Stage input payload.
     * @returns Repository id or stage error.
     */
    private resolveRepositoryId(input: IStageCommand): Result<string, StageError> {
        const repositoryId =
            readStringField(input.state.mergeRequest, "repositoryId") ??
            readStringField(input.state.mergeRequest, "projectId") ??
            readStringField(input.state.mergeRequest, "id")
        if (repositoryId === undefined) {
            return Result.fail<string, StageError>(
                this.createRequiredContextError(
                    input.state.runId,
                    input.state.definitionVersion,
                    new NotFoundError("Repository", "repositoryId"),
                    "Missing repository identifier in merge request context",
                ),
            )
        }

        return Result.ok<string, StageError>(repositoryId)
    }

    /**
     * Resolves organization id from merge request context.
     *
     * @param input Stage input payload.
     * @returns Organization id or stage error.
     */
    private resolveOrganizationId(input: IStageCommand): Result<string, StageError> {
        const organizationId = readStringField(input.state.mergeRequest, "organizationId")
        if (organizationId === undefined) {
            return Result.fail<string, StageError>(
                this.createRequiredContextError(
                    input.state.runId,
                    input.state.definitionVersion,
                    new NotFoundError("Organization", "organizationId"),
                    "Missing organization identifier in merge request context",
                ),
            )
        }

        return Result.ok<string, StageError>(organizationId)
    }

    /**
     * Resolves team id from merge request context.
     *
     * @param input Stage input payload.
     * @returns Team id or stage error.
     */
    private resolveTeamId(input: IStageCommand): Result<string, StageError> {
        const teamId = readStringField(input.state.mergeRequest, "teamId")
        if (teamId === undefined) {
            return Result.fail<string, StageError>(
                this.createRequiredContextError(
                    input.state.runId,
                    input.state.definitionVersion,
                    new NotFoundError("Team", "teamId"),
                    "Missing team identifier in merge request context",
                ),
            )
        }

        return Result.ok<string, StageError>(teamId)
    }

    /**
     * Loads repository-level configuration using the new primary method or legacy alias.
     *
     * @param repositoryId Repository identifier.
     * @returns Repository config layer or null.
     */
    private async loadRepositoryLayer(
        repositoryId: string,
    ): Promise<Partial<Record<string, unknown>> | null> {
        if (this.repositoryConfigLoader.loadConfig !== undefined) {
            return this.repositoryConfigLoader.loadConfig(repositoryId)
        }

        if (this.repositoryConfigLoader.loadRepository !== undefined) {
            return this.repositoryConfigLoader.loadRepository(repositoryId)
        }

        return null
    }

    /**
     * Loads default config layer when a loader method is available.
     *
     * @returns Default config layer or null.
     */
    private async loadDefaultLayer(): Promise<Partial<Record<string, unknown>> | null> {
        if (this.repositoryConfigLoader.loadDefault === undefined) {
            return null
        }

        return this.repositoryConfigLoader.loadDefault()
    }

    /**
     * Loads organization config layer when a loader method is available.
     *
     * @param organizationId Organization identifier.
     * @param teamId Team identifier.
     * @returns Organization config layer or null.
     */
    private async loadOrganizationLayer(
        organizationId: string,
        teamId: string,
    ): Promise<Partial<Record<string, unknown>> | null> {
        if (this.repositoryConfigLoader.loadOrganization === undefined) {
            return null
        }

        return this.repositoryConfigLoader.loadOrganization(organizationId, teamId)
    }

    /**
     * Creates deterministic stage error for missing context data.
     *
     * @param runId Pipeline run id.
     * @param definitionVersion Definition version.
     * @param originalError Wrapped domain error.
     * @param message Error message.
     * @returns Stage error.
     */
    private createRequiredContextError(
        runId: string,
        definitionVersion: string,
        originalError: Error,
        message: string,
    ): StageError {
        return this.createStageError(runId, definitionVersion, message, false, originalError)
    }

    /**
     * Creates normalized stage error payload.
     *
     * @param runId Pipeline run id.
     * @param definitionVersion Pinned definition version.
     * @param message Error message.
     * @param recoverable Recoverable failure flag.
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
