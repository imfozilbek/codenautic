import {describe, expect, test} from "bun:test"

import type {ICache} from "../../../../src/application/ports/outbound/cache/cache.port"
import {PROJECT_SETTINGS_LIMIT} from "../../../../src/domain/value-objects/project-settings.value-object"
import {ValidationError} from "../../../../src/domain/errors/validation.error"
import {ProjectFactory} from "../../../../src/domain/factories/project.factory"
import {
    type IManageReviewCadenceInput,
    REVIEW_CADENCE_EVENT_TYPE,
    type IReviewCadenceEvent,
} from "../../../../src/application/dto/review/manage-review-cadence.dto"
import {ManageReviewCadenceUseCase} from "../../../../src/application/use-cases/review/manage-review-cadence.use-case"
import {InMemoryProjectRepository} from "../project/project-repository.test-helper"
import {PROJECT_CADENCE} from "../../../../src/domain/value-objects/project-settings.value-object"
import type {IReviewCadenceDefaults} from "../../../../src/application/dto/config/system-defaults.dto"

const cadenceDefaults: IReviewCadenceDefaults = {
    autoPauseThreshold: 20,
}

/**
 * In-memory cache for cadence state tests.
 */
class InMemoryCache implements ICache {
    public readonly storage: Map<string, unknown>

    public constructor() {
        this.storage = new Map<string, unknown>()
    }

    public get<TValue>(key: string): Promise<TValue | null> {
        const value = this.storage.get(key)
        if (value === undefined) {
            return Promise.resolve(null)
        }

        return Promise.resolve(value as TValue)
    }

    public set<TValue>(key: string, value: TValue, _ttl?: number): Promise<void> {
        this.storage.set(key, value)
        return Promise.resolve()
    }

    public delete(key: string): Promise<void> {
        this.storage.delete(key)
        return Promise.resolve()
    }

    public has(key: string): Promise<boolean> {
        return Promise.resolve(this.storage.has(key))
    }
}

/**
 * Cache stub that always returns broken state payload.
 */
class BrokenCache extends InMemoryCache {
    public get<TValue>(): Promise<TValue | null> {
        return Promise.resolve("corrupted-state" as TValue)
    }
}

interface IReviewCadenceTestContext {
    readonly useCase: ManageReviewCadenceUseCase
    readonly cache: InMemoryCache
}

async function createUseCaseContext(
    cadence: string,
    limits: Record<string, number> = {},
): Promise<IReviewCadenceTestContext> {
    const repository = new InMemoryProjectRepository()
    const projectFactory = new ProjectFactory()
    const cache = new InMemoryCache()
    await repository.save(
        projectFactory.create({
            repositoryId: "gh:repo-core",
            organizationId: "org-1",
            settings: {
                cadence,
                limits,
            },
        }),
    )

    return {
        useCase: new ManageReviewCadenceUseCase({
            projectRepository: repository,
            cache,
            defaults: cadenceDefaults,
        }),
        cache,
    }
}

function buildEvent(type: string, suggestionCount?: number): IReviewCadenceEvent {
    if (suggestionCount === undefined) {
        return {
            type,
        } as IReviewCadenceEvent
    }

    return {
        type,
        suggestionCount,
    } as IReviewCadenceEvent
}

describe("ManageReviewCadenceUseCase", () => {
    test("always evaluates automatic mode as review required", async () => {
        const {useCase, cache} = await createUseCaseContext(PROJECT_CADENCE.AUTOMATIC)
        const result = await useCase.execute({
            repoId: "gh:repo-core",
            event: buildEvent(REVIEW_CADENCE_EVENT_TYPE.AUTO_TRIGGER, 10),
        })

        expect(result.isOk).toBe(true)
        expect(result.value.shouldReview).toBe(true)
        expect(result.value.reason).toBe("Review cadence is automatic")
        expect(cache.storage.size).toBe(0)
    })

    test("allows manual cadence only for manual/ resume events", async () => {
        const {useCase} = await createUseCaseContext(PROJECT_CADENCE.MANUAL)

        const manualOk = await useCase.execute({
            repoId: "gh:repo-core",
            event: buildEvent(REVIEW_CADENCE_EVENT_TYPE.MANUAL_TRIGGER),
        })
        const manualResume = await useCase.execute({
            repoId: "gh:repo-core",
            event: buildEvent(REVIEW_CADENCE_EVENT_TYPE.RESUME_COMMAND),
        })
        const autoRejected = await useCase.execute({
            repoId: "gh:repo-core",
            event: buildEvent(REVIEW_CADENCE_EVENT_TYPE.AUTO_TRIGGER),
        })

        expect(manualOk.isOk).toBe(true)
        expect(manualOk.value.shouldReview).toBe(true)
        expect(manualResume.isOk).toBe(true)
        expect(manualResume.value.shouldReview).toBe(true)
        expect(autoRejected.isFail).toBe(true)
        expect(autoRejected.error).toBeInstanceOf(ValidationError)
        expect(autoRejected.error.fields).toEqual([
            {
                field: "event.type",
                message: "manual cadence requires manual trigger or resume command",
            },
        ])
    })

    test("stops review when auto-pause threshold is reached and resumes by command", async () => {
        const {useCase, cache} = await createUseCaseContext(PROJECT_CADENCE.AUTO_PAUSE, {
            [PROJECT_SETTINGS_LIMIT.AUTO_PAUSE_THRESHOLD]: 20,
        })

        const first = await useCase.execute({
            repoId: "gh:repo-core",
            event: buildEvent(REVIEW_CADENCE_EVENT_TYPE.AUTO_TRIGGER, 10),
        })
        const second = await useCase.execute({
            repoId: "gh:repo-core",
            event: buildEvent(REVIEW_CADENCE_EVENT_TYPE.AUTO_TRIGGER, 10),
        })
        const whenPaused = await useCase.execute({
            repoId: "gh:repo-core",
            event: buildEvent(REVIEW_CADENCE_EVENT_TYPE.AUTO_TRIGGER),
        })
        const resumed = await useCase.execute({
            repoId: "gh:repo-core",
            event: buildEvent(REVIEW_CADENCE_EVENT_TYPE.RESUME_COMMAND),
        })
        const afterResume = await useCase.execute({
            repoId: "gh:repo-core",
            event: buildEvent(REVIEW_CADENCE_EVENT_TYPE.MANUAL_TRIGGER, 3),
        })

        expect(first.isOk).toBe(true)
        expect(first.value.shouldReview).toBe(true)
        expect(second.isOk).toBe(true)
        expect(second.value.shouldReview).toBe(false)
        expect(second.value.reason).toBe("Review cadence auto-pause is active")
        expect(whenPaused.isOk).toBe(true)
        expect(whenPaused.value.shouldReview).toBe(false)
        expect(resumed.isOk).toBe(true)
        expect(resumed.value.shouldReview).toBe(true)
        expect(afterResume.isOk).toBe(true)
        expect(afterResume.value.shouldReview).toBe(true)

        const state = cache.storage.get("core.review.auto-pause:gh:repo-core") as {
            paused: boolean
            suggestionCount: number
        }
        expect(state.paused).toBe(false)
        expect(state.suggestionCount).toBe(3)
    })

    test("falls back to default auto-pause threshold when configured value is invalid", async () => {
        const {useCase} = await createUseCaseContext(PROJECT_CADENCE.AUTO_PAUSE, {
            [PROJECT_SETTINGS_LIMIT.AUTO_PAUSE_THRESHOLD]: -5,
        })

        const first = await useCase.execute({
            repoId: "gh:repo-core",
            event: buildEvent(REVIEW_CADENCE_EVENT_TYPE.AUTO_TRIGGER, 10),
        })
        const second = await useCase.execute({
            repoId: "gh:repo-core",
            event: buildEvent(REVIEW_CADENCE_EVENT_TYPE.AUTO_TRIGGER, 0),
        })
        const third = await useCase.execute({
            repoId: "gh:repo-core",
            event: buildEvent(REVIEW_CADENCE_EVENT_TYPE.AUTO_TRIGGER, 10),
        })

        expect(first.isOk).toBe(true)
        expect(first.value.shouldReview).toBe(true)
        expect(second.isOk).toBe(true)
        expect(second.value.shouldReview).toBe(true)
        expect(third.isOk).toBe(true)
        expect(third.value.shouldReview).toBe(false)
    })

    test("treats malformed cache state as fresh zero state", async () => {
        const repository = new InMemoryProjectRepository()
        const projectFactory = new ProjectFactory()
        const cache = new BrokenCache()
        await repository.save(
            projectFactory.create({
                repositoryId: "gh:repo-core",
                organizationId: "org-1",
                settings: {
                    cadence: PROJECT_CADENCE.AUTO_PAUSE,
                },
            }),
        )
        const useCase = new ManageReviewCadenceUseCase({
            projectRepository: repository,
            cache,
            defaults: cadenceDefaults,
        })

        const result = await useCase.execute({
            repoId: "gh:repo-core",
            event: buildEvent(REVIEW_CADENCE_EVENT_TYPE.AUTO_TRIGGER, 5),
        })

        expect(result.isOk).toBe(true)
        expect(result.value.shouldReview).toBe(true)
        expect(cache.has("core.review.auto-pause:gh:repo-core")).resolves.toBe(true)
    })

    test("validates malformed input", async () => {
        const {useCase} = await createUseCaseContext(PROJECT_CADENCE.AUTOMATIC)

        const byRepo = await useCase.execute({
            repoId: "bad-format",
            event: buildEvent(REVIEW_CADENCE_EVENT_TYPE.AUTO_TRIGGER),
        })
        const byEvent = await useCase.execute({
            repoId: "gh:repo-core",
            event: {
                type: "unknown-event",
                suggestionCount: -1,
            } as unknown as IManageReviewCadenceInput["event"],
        })
        const missingRepo = await createUseCaseContext(PROJECT_CADENCE.AUTOMATIC).then(({useCase: missing}) => {
            return missing.execute({
                repoId: "gh:repo-missing",
                event: buildEvent(REVIEW_CADENCE_EVENT_TYPE.AUTO_TRIGGER),
            })
        })

        expect(byRepo.isFail).toBe(true)
        expect(byRepo.error.fields).toEqual([
            {
                field: "repoId",
                message: "RepositoryId must match format <platform>:<id>",
            },
        ])
        expect(byEvent.isFail).toBe(true)
        expect(byEvent.error.fields).toEqual([
            {
                field: "event.type",
                message: "must be one of auto-trigger/manual-trigger/resume-command",
            },
            {
                field: "event.suggestionCount",
                message: "must be a non-negative integer",
            },
        ])
        expect(missingRepo.isFail).toBe(true)
        expect(missingRepo.error.fields).toEqual([
            {
                field: "repoId",
                message: "Project for repository 'gh:repo-missing' not found",
            },
        ])
    })
})
