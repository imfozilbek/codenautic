import {describe, expect, test} from "bun:test"

import type {ISystemSettingsRepository} from "../../../../src/application/ports/outbound/common/system-settings-repository.port"
import {ImportSystemSettingsUseCase} from "../../../../src/application/use-cases/common/import-system-settings.use-case"
import type {IConfigSystemSettingItem} from "../../../../src/application/dto/config/system-setting-config.dto"
import {ValidationError} from "../../../../src/domain/errors/validation.error"

class InMemorySystemSettingsRepository implements ISystemSettingsRepository {
    private readonly storage: Map<string, unknown>

    public constructor(entries: Record<string, unknown> = {}) {
        this.storage = new Map<string, unknown>(Object.entries(entries))
    }

    public findByKey(key: string): Promise<{key: string; value: unknown} | null> {
        if (!this.storage.has(key)) {
            return Promise.resolve(null)
        }

        return Promise.resolve({
            key,
            value: this.storage.get(key),
        })
    }

    public findAll(): Promise<readonly {key: string; value: unknown}[]> {
        return Promise.resolve(
            [...this.storage.entries()].map(([key, value]) => {
                return {key, value}
            }),
        )
    }

    public upsert(setting: {key: string; value: unknown}): Promise<void> {
        this.storage.set(setting.key, setting.value)
        return Promise.resolve()
    }

    public deleteByKey(key: string): Promise<void> {
        this.storage.delete(key)
        return Promise.resolve()
    }

    public getValue(key: string): unknown {
        return this.storage.get(key)
    }

    public size(): number {
        return this.storage.size
    }
}

describe("ImportSystemSettingsUseCase", () => {
    test("импортирует новые системные настройки", async () => {
        const repository = new InMemorySystemSettingsRepository()
        const useCase = new ImportSystemSettingsUseCase({
            systemSettingsRepository: repository,
        })
        const input: readonly IConfigSystemSettingItem[] = [
            {
                key: "review.defaults",
                value: {maxSuggestionsPerCCR: 30},
            },
            {
                key: "review.blocking_severities",
                value: ["CRITICAL", "HIGH"],
            },
        ]

        const result = await useCase.execute(input)

        expect(result.isOk).toBe(true)
        expect(result.value).toEqual({
            total: 2,
            created: 2,
            updated: 0,
            skipped: 0,
            failed: 0,
        })
        expect(repository.size()).toBe(2)
        expect(repository.getValue("review.blocking_severities")).toEqual(["CRITICAL", "HIGH"])
    })

    test("обновляет существующее значение", async () => {
        const repository = new InMemorySystemSettingsRepository({
            "review.defaults": {maxSuggestionsPerCCR: 10},
        })
        const useCase = new ImportSystemSettingsUseCase({
            systemSettingsRepository: repository,
        })
        const input: readonly IConfigSystemSettingItem[] = [{
            key: "review.defaults",
            value: {maxSuggestionsPerCCR: 30},
        }]

        const result = await useCase.execute(input)

        expect(result.isOk).toBe(true)
        expect(result.value.updated).toBe(1)
        expect(repository.getValue("review.defaults")).toEqual({maxSuggestionsPerCCR: 30})
    })

    test("пропускает неизмененные значения", async () => {
        const repository = new InMemorySystemSettingsRepository({
            "review.defaults": {maxSuggestionsPerCCR: 30},
        })
        const useCase = new ImportSystemSettingsUseCase({
            systemSettingsRepository: repository,
        })
        const input: readonly IConfigSystemSettingItem[] = [{
            key: "review.defaults",
            value: {maxSuggestionsPerCCR: 30},
        }]

        const result = await useCase.execute(input)

        expect(result.isOk).toBe(true)
        expect(result.value.skipped).toBe(1)
    })

    test("возвращает ошибку при невалидном payload", async () => {
        const repository = new InMemorySystemSettingsRepository()
        const useCase = new ImportSystemSettingsUseCase({
            systemSettingsRepository: repository,
        })

        const result = await useCase.execute({} as unknown as IConfigSystemSettingItem[])

        expect(result.isFail).toBe(true)
        expect(result.error).toBeInstanceOf(ValidationError)
    })

    test("обрабатывает пустой список", async () => {
        const repository = new InMemorySystemSettingsRepository()
        const useCase = new ImportSystemSettingsUseCase({
            systemSettingsRepository: repository,
        })

        const result = await useCase.execute([])

        expect(result.isOk).toBe(true)
        expect(result.value).toEqual({
            total: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            failed: 0,
        })
    })
})
