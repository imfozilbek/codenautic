import {Result} from "../../../shared/result"
import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {IProjectRepository} from "../../ports/outbound/project-repository.port"
import type {ICache} from "../../ports/outbound/cache/cache.port"
import {RepositoryId} from "../../../domain/value-objects/repository-id.value-object"
import {
    PROJECT_SETTINGS_LIMIT,
    type ProjectSettingsLimitKey,
} from "../../../domain/value-objects/project-settings.value-object"
import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import type {
    IThrottleReviewInput,
    IThrottleReviewOutput,
} from "../../dto/review/throttle-review.dto"
import type {IReviewThrottleDefaults} from "../../dto/config/system-defaults.dto"

interface IThrottleReviewUseCaseDependencies {
    /**
     * Project repository.
     */
    readonly projectRepository: IProjectRepository

    /**
     * Cache for per-repo throttle buckets.
     */
    readonly cache: ICache

    /**
     * Defaults resolved from config-service.
     */
    readonly defaults: IReviewThrottleDefaults

    /**
     * Optional deterministic clock for tests.
     */
    readonly now?: () => Date
}

interface IThrottleState {
    /**
     * Epoch seconds when current window started.
     */
    readonly windowStart: number

    /**
     * Number of reviews already executed in current window.
     */
    readonly reviewCount: number
}

const THROTTLE_CACHE_PREFIX = "core.review.throttle"

/**
 * Use case that enforces review rate limits per repository.
 */
export class ThrottleReviewUseCase implements IUseCase<IThrottleReviewInput, IThrottleReviewOutput, ValidationError> {
    private readonly projectRepository: IProjectRepository
    private readonly cache: ICache
    private readonly nowProvider: () => Date
    private readonly defaults: IReviewThrottleDefaults

    /**
     * Creates throttle use case instance.
     *
     * @param dependencies Runtime dependencies.
     */
    public constructor(dependencies: IThrottleReviewUseCaseDependencies) {
        this.projectRepository = dependencies.projectRepository
        this.cache = dependencies.cache
        this.defaults = dependencies.defaults
        this.nowProvider = dependencies.now ?? (() => new Date())
    }

    /**
     * Evaluates repository throttling policy.
     *
     * @param input Request payload.
     * @returns Decision with optional retry delay.
     */
    public async execute(
        input: IThrottleReviewInput,
    ): Promise<Result<IThrottleReviewOutput, ValidationError>> {
        const validation = this.validateInput(input)
        if (validation.length > 0) {
            return Result.fail<IThrottleReviewOutput, ValidationError>(
                new ValidationError("Throttle review validation failed", validation),
            )
        }

        let repositoryId: RepositoryId
        try {
            repositoryId = RepositoryId.parse(input.repoId)
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Invalid repository identifier"
            return Result.fail<IThrottleReviewOutput, ValidationError>(
                new ValidationError("Throttle review validation failed", [
                    {
                        field: "repoId",
                        message,
                    },
                ]),
            )
        }

        const project = await this.projectRepository.findByRepositoryId(repositoryId)
        if (project === null) {
            return Result.fail<IThrottleReviewOutput, ValidationError>(
                new ValidationError("Throttle review validation failed", [
                    {
                        field: "repoId",
                        message: `Project for repository '${input.repoId}' not found`,
                    },
                ]),
            )
        }

        const maxReviews = this.readNumericLimit(
            project.settings.limits,
            PROJECT_SETTINGS_LIMIT.MAX_REVIEWS_PER_WINDOW,
            this.defaults.maxReviewsPerWindow,
        )
        const windowSeconds = this.readNumericLimit(
            project.settings.limits,
            PROJECT_SETTINGS_LIMIT.THROTTLE_WINDOW_SECONDS,
            this.defaults.windowSeconds,
        )

        const nowInSeconds = this.secondsFromNow()
        const cacheKey = this.buildCacheKey(repositoryId)
        const state = await this.loadThrottleState(cacheKey)
        const normalizedWindowStart = this.getWindowStart(nowInSeconds, windowSeconds)

        const nextState = this.advanceWindowState(state, nowInSeconds, windowSeconds, normalizedWindowStart)

        if (nextState.reviewCount < maxReviews) {
            const updatedState: IThrottleState = {
                windowStart: normalizedWindowStart,
                reviewCount: nextState.reviewCount + 1,
            }
            await this.cache.set(cacheKey, updatedState, windowSeconds)

            return Result.ok<IThrottleReviewOutput, ValidationError>({
                allowed: true,
            })
        }

        const retryAfter = Math.max(0, nextState.windowStart + windowSeconds - nowInSeconds)
        return Result.ok<IThrottleReviewOutput, ValidationError>({
            allowed: false,
            retryAfter,
        })
    }

    /**
     * Validates raw input.
     *
     * @param input Raw use-case input.
     * @returns Validation errors.
     */
    private validateInput(input: IThrottleReviewInput): IValidationErrorField[] {
        const fields: IValidationErrorField[] = []

        if (typeof input.repoId !== "string" || input.repoId.trim().length === 0) {
            fields.push({
                field: "repoId",
                message: "must be a non-empty string",
            })
        }

        return fields
    }

    /**
     * Reads integer throttle config value with safe fallback.
     *
     * @param limits Configured limits.
     * @param key Limit key.
     * @param fallback Default fallback.
     * @returns Positive integer threshold.
     */
    private readNumericLimit(
        limits: Record<string, number>,
        key: ProjectSettingsLimitKey,
        fallback: number,
    ): number {
        const value = limits[key]
        if (value !== undefined && Number.isInteger(value) && value > 0) {
            return value
        }

        return fallback
    }

    /**
     * Builds deterministic cache key.
     *
     * @param repositoryId Repository identifier.
     * @returns Cache key.
     */
    private buildCacheKey(repositoryId: RepositoryId): string {
        return `${THROTTLE_CACHE_PREFIX}:${repositoryId.toString()}`
    }

    /**
     * Loads throttle state from cache with robust fallback.
     *
     * @param cacheKey Cache key.
     * @returns Stored state or zeroed state.
     */
    private async loadThrottleState(cacheKey: string): Promise<IThrottleState> {
        const rawState = await this.cache.get<unknown>(cacheKey)
        if (this.isThrottleState(rawState)) {
            return rawState
        }

        return {
            windowStart: 0,
            reviewCount: 0,
        }
    }

    /**
     * Rebuilds window state and applies expiration.
     *
     * @param state Existing state.
     * @param nowInSeconds Current epoch seconds.
     * @param windowSeconds Configured window in seconds.
     * @param windowStart Computed window start for now.
     * @returns State for current logical window.
     */
    private advanceWindowState(
        state: IThrottleState,
        nowInSeconds: number,
        windowSeconds: number,
        windowStart: number,
    ): IThrottleState {
        if (state.windowStart < 0 || state.reviewCount < 0 || state.windowStart > nowInSeconds) {
            return {
                windowStart,
                reviewCount: 0,
            }
        }

        const currentWindowExpired = state.windowStart + windowSeconds <= nowInSeconds
        if (currentWindowExpired) {
            return {
                windowStart,
                reviewCount: 0,
            }
        }

        return {
            windowStart: state.windowStart,
            reviewCount: state.reviewCount,
        }
    }

    /**
     * Computes current window start from epoch seconds.
     *
     * @param nowInSeconds Now timestamp.
     * @param windowSeconds Window size.
     * @returns Window start in epoch seconds.
     */
    private getWindowStart(nowInSeconds: number, windowSeconds: number): number {
        return Math.floor(nowInSeconds / windowSeconds) * windowSeconds
    }

    /**
     * Returns seconds since unix epoch.
     *
     * @returns Current epoch seconds.
     */
    private secondsFromNow(): number {
        const now = this.nowProvider()
        return Math.floor(now.getTime() / 1000)
    }

    /**
     * Type guard for persisted throttle state.
     *
     * @param value Unknown cached value.
     * @returns True for a valid throttle state.
     */
    private isThrottleState(value: unknown): value is IThrottleState {
        if (typeof value !== "object" || value === null) {
            return false
        }

        const candidate = value as Partial<IThrottleState>
        const reviewCount = candidate.reviewCount
        const windowStart = candidate.windowStart
        return reviewCount !== undefined && Number.isInteger(reviewCount) && reviewCount >= 0
            && windowStart !== undefined && Number.isInteger(windowStart)
    }
}
