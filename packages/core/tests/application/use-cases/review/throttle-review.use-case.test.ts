import {describe, expect, test} from "bun:test"

import type {ICache} from "../../../../src/application/ports/outbound/cache/cache.port"
import {PROJECT_SETTINGS_LIMIT} from "../../../../src/domain/value-objects/project-settings.value-object"
import {ValidationError} from "../../../../src/domain/errors/validation.error"
import {ProjectFactory} from "../../../../src/domain/factories/project.factory"
import {InMemoryProjectRepository} from "../project/project-repository.test-helper"
import {ThrottleReviewUseCase} from "../../../../src/application/use-cases/review/throttle-review.use-case"

/**
 * In-memory cache for throttle tests.
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
 * Cache stub with always-corrupted payload.
 */
class BrokenCache extends InMemoryCache {
    public get<TValue>(): Promise<TValue | null> {
        return Promise.resolve("corrupted-state" as TValue)
    }
}

interface IThrottleReviewTestContext {
    readonly useCase: ThrottleReviewUseCase
    readonly cache: InMemoryCache
}

async function createUseCaseContext(
    limits: Record<string, number> = {},
    now: () => Date = () => new Date("2026-03-03T00:00:10.000Z"),
    cache = new InMemoryCache(),
): Promise<IThrottleReviewTestContext> {
    const repository = new InMemoryProjectRepository()
    const projectFactory = new ProjectFactory()
    await repository.save(
        projectFactory.create({
            repositoryId: "gh:repo-core",
            organizationId: "org-1",
            settings: {
                limits,
            },
        }),
    )

    return {
        useCase: new ThrottleReviewUseCase({
            projectRepository: repository,
            cache,
            now,
        }),
        cache,
    }
}

interface IThrottleState {
    readonly windowStart: number
    readonly reviewCount: number
}

function readState(storage: Map<string, unknown>): IThrottleState {
    return storage.get("core.review.throttle:gh:repo-core") as IThrottleState
}

describe("ThrottleReviewUseCase", () => {
    test("allows reviews within configured window limit and blocks the next one", async () => {
        const now = new Date("2026-03-03T10:00:10.000Z")
        const nowInSeconds = Math.floor(now.getTime() / 1000)
        const {useCase, cache} = await createUseCaseContext({
            [PROJECT_SETTINGS_LIMIT.MAX_REVIEWS_PER_WINDOW]: 2,
            [PROJECT_SETTINGS_LIMIT.THROTTLE_WINDOW_SECONDS]: 60,
        }, () => now)

        const first = await useCase.execute({
            repoId: "gh:repo-core",
        })
        const second = await useCase.execute({
            repoId: "gh:repo-core",
        })
        const third = await useCase.execute({
            repoId: "gh:repo-core",
        })
        const state = readState(cache.storage)

        expect(first.isOk).toBe(true)
        expect(first.value.allowed).toBe(true)
        expect(second.isOk).toBe(true)
        expect(second.value.allowed).toBe(true)
        expect(third.isOk).toBe(true)
        expect(third.value.allowed).toBe(false)
        expect(third.value.retryAfter).toBe(50)
        expect(state.reviewCount).toBe(2)
        expect(state.windowStart).toBe(Math.floor(nowInSeconds / 60) * 60)
    })

    test("resets window when previous window is expired", async () => {
        const repository = new InMemoryProjectRepository()
        const cache = new InMemoryCache()
        const projectFactory = new ProjectFactory()
        const expiredWindowNow = new Date("2026-03-03T10:00:16.000Z")
        const expiredWindowInSeconds = Math.floor(expiredWindowNow.getTime() / 1000)
        await repository.save(
            projectFactory.create({
                repositoryId: "gh:repo-core",
                organizationId: "org-1",
                settings: {
                    limits: {
                        [PROJECT_SETTINGS_LIMIT.MAX_REVIEWS_PER_WINDOW]: 1,
                        [PROJECT_SETTINGS_LIMIT.THROTTLE_WINDOW_SECONDS]: 10,
                    },
                },
            }),
        )

        const firstWindowUseCase = new ThrottleReviewUseCase({
            projectRepository: repository,
            cache,
            now: () => new Date("2026-03-03T10:00:05.000Z"),
        })
        const first = await firstWindowUseCase.execute({
            repoId: "gh:repo-core",
        })

        expect(first.isOk).toBe(true)
        expect(first.value.allowed).toBe(true)

        const secondWindowUseCase = new ThrottleReviewUseCase({
            projectRepository: repository,
            cache,
            now: () => new Date("2026-03-03T10:00:16.000Z"),
        })
        const second = await secondWindowUseCase.execute({
            repoId: "gh:repo-core",
        })

        expect(second.isOk).toBe(true)
        expect(second.value.allowed).toBe(true)
        const state = readState(cache.storage)
        expect(state.windowStart).toBe(Math.floor(expiredWindowInSeconds / 10) * 10)
        expect(state.reviewCount).toBe(1)
    })

    test("falls back to defaults when configured limits are invalid", async () => {
        const {useCase} = await createUseCaseContext({
            [PROJECT_SETTINGS_LIMIT.MAX_REVIEWS_PER_WINDOW]: -1,
            [PROJECT_SETTINGS_LIMIT.THROTTLE_WINDOW_SECONDS]: 0,
        }, () => new Date("2026-03-03T00:00:01.000Z"))

        let firstResult: Awaited<ReturnType<ThrottleReviewUseCase["execute"]>> | null = null
        let deniedResult: Awaited<ReturnType<ThrottleReviewUseCase["execute"]>> | null = null
        for (let i = 0; i < 11; i += 1) {
            const result = await useCase.execute({
                repoId: "gh:repo-core",
            })
            if (i === 0) {
                firstResult = result
            } else if (i === 10) {
                deniedResult = result
            }
        }
        expect(firstResult).not.toBeNull()
        expect(deniedResult).not.toBeNull()
        if (firstResult === null || deniedResult === null) {
            return
        }

        expect(firstResult.isOk).toBe(true)
        expect(firstResult.value.allowed).toBe(true)
        expect(deniedResult.isOk).toBe(true)
        expect(deniedResult.value.allowed).toBe(false)
        expect(deniedResult.value.retryAfter).toBe(3599)
    })

    test("treats malformed cache state as clean state", async () => {
        const project = new InMemoryProjectRepository()
        const projectFactory = new ProjectFactory()
        const cache = new BrokenCache()
        await project.save(
            projectFactory.create({
                repositoryId: "gh:repo-core",
                organizationId: "org-1",
                settings: {},
            }),
        )
        const useCase = new ThrottleReviewUseCase({
            projectRepository: project,
            cache,
        })

        const result = await useCase.execute({
            repoId: "gh:repo-core",
        })
        const state = cache.storage.get("core.review.throttle:gh:repo-core") as
            | {
                  windowStart: number
                  reviewCount: number
              }
            | undefined

        expect(result.isOk).toBe(true)
        expect(result.value.allowed).toBe(true)
        expect(state).toBeDefined()
        expect(state?.reviewCount).toBe(1)
    })

    test("returns validation failure for malformed input", async () => {
        const {useCase} = await createUseCaseContext()

        const byRepo = await useCase.execute({
            repoId: "bad-format",
        })
        const missingProject = await useCase.execute({
            repoId: "gh:repo-missing",
        })

        expect(byRepo.isFail).toBe(true)
        expect(byRepo.error.fields).toEqual([
            {
                field: "repoId",
                message: "RepositoryId must match format <platform>:<id>",
            },
        ])
        expect(byRepo.error).toBeInstanceOf(ValidationError)
        expect(missingProject.isFail).toBe(true)
        expect(missingProject.error.fields).toEqual([
            {
                field: "repoId",
                message: "Project for repository 'gh:repo-missing' not found",
            },
        ])
    })
})
