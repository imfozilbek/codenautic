import type {Result as TResult} from "../../../shared/result"
import {Result} from "../../../shared/result"
import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {IProjectRepository} from "../../ports/outbound/project-repository.port"
import type {ICache} from "../../ports/outbound/cache/cache.port"
import {RepositoryId} from "../../../domain/value-objects/repository-id.value-object"
import {
    PROJECT_CADENCE,
    PROJECT_SETTINGS_LIMIT,
} from "../../../domain/value-objects/project-settings.value-object"
import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import {
    type IManageReviewCadenceInput,
    type IManageReviewCadenceOutput,
    type IReviewCadenceEvent,
    type IReviewCadenceResumeCommandEvent,
    REVIEW_CADENCE_EVENT_TYPE,
    type ReviewCadenceEventType,
} from "../../dto/review/manage-review-cadence.dto"
import type {IReviewCadenceDefaults} from "../../dto/config/system-defaults.dto"

interface IManageReviewCadenceUseCaseDependencies {
    /**
     * Project repository.
     */
    readonly projectRepository: IProjectRepository

    /**
     * Cache for auto-pause counters.
     */
    readonly cache: ICache

    /**
     * Defaults resolved from config-service.
     */
    readonly defaults: IReviewCadenceDefaults
}

interface IAutoPauseState {
    /**
     * Paused flag for current cadence session.
     */
    readonly paused: boolean

    /**
     * Accumulated suggestions count in current auto-pause bucket.
     */
    readonly suggestionCount: number
}

const AUTO_PAUSE_CACHE_PREFIX = "core.review.auto-pause"

/**
 * Use case that decides whether review should run based on project cadence policy.
 */
export class ManageReviewCadenceUseCase
    implements IUseCase<IManageReviewCadenceInput, IManageReviewCadenceOutput, ValidationError>
{
    private readonly projectRepository: IProjectRepository
    private readonly cache: ICache
    private readonly defaults: IReviewCadenceDefaults

    /**
     * Creates use case instance.
     *
     * @param dependencies Runtime dependencies.
     */
    public constructor(dependencies: IManageReviewCadenceUseCaseDependencies) {
        this.projectRepository = dependencies.projectRepository
        this.cache = dependencies.cache
        this.defaults = dependencies.defaults
    }

    /**
     * Computes cadence decision and mutates auto-pause state when needed.
     *
     * @param input Request payload.
     * @returns Decision payload.
     */
    public async execute(
        input: IManageReviewCadenceInput,
    ): Promise<Result<IManageReviewCadenceOutput, ValidationError>> {
        const validation = this.validateInput(input)
        if (validation.length > 0) {
            return Result.fail<IManageReviewCadenceOutput, ValidationError>(
                new ValidationError("Review cadence validation failed", validation),
            )
        }

        let repositoryId: RepositoryId
        try {
            repositoryId = RepositoryId.parse(input.repoId)
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Invalid repository identifier"
            return Result.fail<IManageReviewCadenceOutput, ValidationError>(
                new ValidationError("Review cadence validation failed", [
                    {
                        field: "repoId",
                        message: errorMessage,
                    },
                ]),
            )
        }

        const project = await this.projectRepository.findByRepositoryId(repositoryId)
        if (project === null) {
            return Result.fail<IManageReviewCadenceOutput, ValidationError>(
                new ValidationError("Review cadence validation failed", [
                    {
                        field: "repoId",
                        message: `Project for repository '${input.repoId}' not found`,
                    },
                ]),
            )
        }

        const cadence = project.settings.cadence
        if (cadence === PROJECT_CADENCE.AUTOMATIC) {
            return Result.ok<IManageReviewCadenceOutput, ValidationError>({
                shouldReview: true,
                reason: "Review cadence is automatic",
            })
        }

        if (cadence === PROJECT_CADENCE.MANUAL) {
            return this.decideManualMode(input.event)
        }

        const autoPauseThreshold = this.readAutoPauseThreshold(project.settings.limits)
        const cacheKey = this.buildCacheKey(repositoryId)
        const currentState = await this.loadAutoPauseState(cacheKey)
        const nextState = this.applyAutoPauseTransition(currentState, input.event, autoPauseThreshold)
        const decision = this.decideAutoPauseMode(input.event, nextState)
        await this.saveAutoPauseState(cacheKey, nextState)

        return decision
    }

    /**
     * Validates use-case input.
     *
     * @param input Raw payload.
     * @returns Validation errors.
     */
    private validateInput(input: IManageReviewCadenceInput): IValidationErrorField[] {
        const fields: IValidationErrorField[] = []
        if (typeof input.repoId !== "string" || input.repoId.trim().length === 0) {
            fields.push({
                field: "repoId",
                message: "must be a non-empty string",
            })
        }

        const eventValidation = this.validateEvent(input.event)
        if (eventValidation !== undefined) {
            fields.push(...eventValidation)
        }

        return fields
    }

    /**
     * Validates event object.
     *
     * @param event Input event.
     * @returns Errors when event is invalid.
     */
    private validateEvent(event: IReviewCadenceEvent): IValidationErrorField[] {
        const fields: IValidationErrorField[] = []

        if (!this.isReviewCadenceEventType(event.type)) {
            fields.push({
                field: "event.type",
                message: "must be one of auto-trigger/manual-trigger/resume-command",
            })
        }

        const suggestionCount = (
            event as {
                suggestionCount?: unknown
            }
        ).suggestionCount
        if (suggestionCount !== undefined && !this.isNonNegativeInteger(suggestionCount)) {
            fields.push({
                field: "event.suggestionCount",
                message: "must be a non-negative integer",
            })
        }

        return fields
    }

    /**
     * Manual mode decision.
     *
     * @param event Cadence event.
     * @returns Decision.
     */
    private decideManualMode(event: IReviewCadenceEvent): TResult<IManageReviewCadenceOutput, ValidationError> {
        const isAllowedTrigger = this.isManualAllowedEvent(event)
        if (isAllowedTrigger) {
            return Result.ok<IManageReviewCadenceOutput, ValidationError>({
                shouldReview: true,
                reason: "Review cadence is manual and trigger is @codenautic",
            })
        }

        return Result.fail<IManageReviewCadenceOutput, ValidationError>(
            new ValidationError("Review cadence validation failed", [
                {
                    field: "event.type",
                    message: "manual cadence requires manual trigger or resume command",
                },
            ]),
        )
    }

    /**
     * Decide review action for auto-pause mode.
     *
     * @param event Incoming event.
     * @param nextState Computed next auto-pause state.
     * @returns Decision and reason.
     */
    private decideAutoPauseMode(
        event: IReviewCadenceEvent,
        nextState: IAutoPauseState,
    ): TResult<IManageReviewCadenceOutput, ValidationError> {
        if (this.isResumeCommandEvent(event)) {
            return Result.ok<IManageReviewCadenceOutput, ValidationError>({
                shouldReview: true,
                reason: "Review cadence resumed by command",
            })
        }

        if (nextState.paused) {
            return Result.ok<IManageReviewCadenceOutput, ValidationError>({
                shouldReview: false,
                reason: "Review cadence auto-pause is active",
            })
        }

        return Result.ok<IManageReviewCadenceOutput, ValidationError>({
            shouldReview: true,
            reason: "Review cadence auto-pause allows current execution",
        })
    }

    /**
     * Applies auto-pause state transition.
     *
     * @param currentState Current state.
     * @param event Incoming event.
     * @param threshold Auto-pause threshold.
     * @returns Next state.
     */
    private applyAutoPauseTransition(
        currentState: IAutoPauseState,
        event: IReviewCadenceEvent,
        threshold: number,
    ): IAutoPauseState {
        if (this.isResumeCommandEvent(event)) {
            return {
                paused: false,
                suggestionCount: 0,
            }
        }

        if (event.type === REVIEW_CADENCE_EVENT_TYPE.MANUAL_TRIGGER) {
            const manualEvent = event
            const nextCount = currentState.suggestionCount + (manualEvent.suggestionCount ?? 0)
            const nextPaused = nextCount >= threshold
            return {
                paused: nextPaused,
                suggestionCount: nextCount,
            }
        }

        if (event.type === REVIEW_CADENCE_EVENT_TYPE.AUTO_TRIGGER) {
            const autoEvent = event
            const nextCount = currentState.suggestionCount + (autoEvent.suggestionCount ?? 0)
            const nextPaused = nextCount >= threshold
            return {
                paused: nextPaused,
                suggestionCount: nextCount,
            }
        }

        if (currentState.paused || currentState.suggestionCount >= threshold) {
            return {
                paused: true,
                suggestionCount: currentState.suggestionCount,
            }
        }

        return {
            paused: false,
            suggestionCount: currentState.suggestionCount,
        }
    }

    /**
     * Reads auto-pause limit from project settings.
     *
     * @param limits Configured limits map.
     * @returns Threshold value.
     */
    private readAutoPauseThreshold(limits: Record<string, number>): number {
        const rawValue = limits[PROJECT_SETTINGS_LIMIT.AUTO_PAUSE_THRESHOLD]
        if (!this.isPositiveInteger(rawValue)) {
            return this.defaults.autoPauseThreshold
        }

        return rawValue
    }

    /**
     * Builds cache key for repo.
     *
     * @param repositoryId Repository identifier.
     * @returns Cache key.
     */
    private buildCacheKey(repositoryId: RepositoryId): string {
        return `${AUTO_PAUSE_CACHE_PREFIX}:${repositoryId.toString()}`
    }

    /**
     * Loads auto-pause state from cache.
     *
     * @param cacheKey Cache key.
     * @returns Stored state or default state.
     */
    private async loadAutoPauseState(cacheKey: string): Promise<IAutoPauseState> {
        const state = await this.cache.get<unknown>(cacheKey)
        if (this.isAutoPauseState(state)) {
            return state
        }

        return {
            paused: false,
            suggestionCount: 0,
        }
    }

    /**
     * Persists auto-pause state.
     *
     * @param cacheKey Cache key.
     * @param state Next state.
     */
    private async saveAutoPauseState(cacheKey: string, state: IAutoPauseState): Promise<void> {
        await this.cache.set(cacheKey, state)
    }

    /**
     * Type guard for valid auto-pause event payload shape.
     *
     * @param value Arbitrary value.
     * @returns True for valid auto-pause state.
     */
    private isAutoPauseState(value: unknown): value is IAutoPauseState {
        if (typeof value !== "object" || value === null) {
            return false
        }

        const candidate = value as Partial<IAutoPauseState>
        if (typeof candidate.paused !== "boolean") {
            return false
        }

        return this.isNonNegativeInteger(candidate.suggestionCount)
    }

    /**
     * Checks if event type belongs to known cadence event union.
     *
     * @param type Raw event type.
     * @returns True when event type is supported.
     */
    private isReviewCadenceEventType(type: unknown): type is ReviewCadenceEventType {
        if (typeof type !== "string") {
            return false
        }

        return (
            type === REVIEW_CADENCE_EVENT_TYPE.AUTO_TRIGGER ||
            type === REVIEW_CADENCE_EVENT_TYPE.MANUAL_TRIGGER ||
            type === REVIEW_CADENCE_EVENT_TYPE.RESUME_COMMAND
        )
    }

    /**
     * Checks whether event should be treated as resume.
     *
     * @param event Event payload.
     * @returns True when resume command event.
     */
    private isResumeCommandEvent(event: IReviewCadenceEvent): event is IReviewCadenceResumeCommandEvent {
        return event.type === REVIEW_CADENCE_EVENT_TYPE.RESUME_COMMAND
    }

    /**
     * Checks whether event triggers manual cadence.
     *
     * @param event Event payload.
     * @returns True when manual command or resume.
     */
    private isManualAllowedEvent(event: IReviewCadenceEvent): boolean {
        return event.type === REVIEW_CADENCE_EVENT_TYPE.MANUAL_TRIGGER
            || event.type === REVIEW_CADENCE_EVENT_TYPE.RESUME_COMMAND
    }

    /**
     * Validates non-negative integer.
     *
     * @param value Raw value.
     * @returns True when valid.
     */
    private isNonNegativeInteger(value: unknown): value is number {
        return typeof value === "number" && Number.isInteger(value) && value >= 0
    }

    /**
     * Validates positive integer.
     *
     * @param value Raw value.
     * @returns True when valid.
     */
    private isPositiveInteger(value: unknown): value is number {
        return typeof value === "number" && Number.isInteger(value) && value > 0
    }
}
