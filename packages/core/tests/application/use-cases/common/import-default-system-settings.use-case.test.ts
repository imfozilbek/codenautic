import {describe, expect, test} from "bun:test"

import type {ISystemSettingsWriter} from "../../../../src/application/ports/outbound/common/system-settings-writer.port"
import {ImportDefaultSystemSettingsUseCase} from "../../../../src/application/use-cases/common/import-default-system-settings.use-case"
import {ValidationError} from "../../../../src/domain/errors/validation.error"
import type {IConfigSystemSettingItem} from "../../../../src/application/dto/config/system-setting-config.dto"

class InMemorySystemSettingsWriter implements ISystemSettingsWriter {
    private readonly storage: Map<string, unknown>

    public constructor(entries: Record<string, unknown> = {}) {
        this.storage = new Map<string, unknown>(Object.entries(entries))
    }

    public has(key: string): Promise<boolean> {
        return Promise.resolve(this.storage.has(key))
    }

    public save(setting: {readonly key: string; readonly value: unknown}): Promise<void> {
        this.storage.set(setting.key, setting.value)
        return Promise.resolve()
    }

    public get(key: string): unknown {
        return this.storage.get(key)
    }

    public size(): number {
        return this.storage.size
    }
}

describe("ImportDefaultSystemSettingsUseCase", () => {
    test("импортирует новые системные настройки", async () => {
        const writer = new InMemorySystemSettingsWriter()
        const useCase = new ImportDefaultSystemSettingsUseCase({
            systemSettingsWriter: writer,
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
        expect(writer.size()).toBe(2)
        expect(writer.get("review.blocking_severities")).toEqual(["CRITICAL", "HIGH"])
    })

    test("пропускает уже существующие ключи", async () => {
        const writer = new InMemorySystemSettingsWriter({
            "review.defaults": {maxSuggestionsPerCCR: 10},
        })
        const useCase = new ImportDefaultSystemSettingsUseCase({
            systemSettingsWriter: writer,
        })
        const input: readonly IConfigSystemSettingItem[] = [
            {
                key: "review.defaults",
                value: {maxSuggestionsPerCCR: 30},
            },
            {
                key: "review.blocking_severities",
                value: ["HIGH"],
            },
        ]

        const result = await useCase.execute(input)

        expect(result.isOk).toBe(true)
        expect(result.value.created).toBe(1)
        expect(result.value.skipped).toBe(1)
        expect(writer.size()).toBe(2)
    })

    test("возвращает ошибку при пустом ключе", async () => {
        const writer = new InMemorySystemSettingsWriter()
        const useCase = new ImportDefaultSystemSettingsUseCase({
            systemSettingsWriter: writer,
        })
        const input: readonly IConfigSystemSettingItem[] = [{
            key: "   ",
            value: {maxSuggestionsPerCCR: 30},
        }]

        const result = await useCase.execute(input)

        expect(result.isFail).toBe(true)
        expect(result.error).toBeInstanceOf(ValidationError)
        expect(result.error.fields[0]?.field).toBe("items")
    })

    test("возвращает ошибку при дублирующихся ключах", async () => {
        const writer = new InMemorySystemSettingsWriter()
        const useCase = new ImportDefaultSystemSettingsUseCase({
            systemSettingsWriter: writer,
        })
        const input: readonly IConfigSystemSettingItem[] = [
            {
                key: "review.defaults",
                value: {maxSuggestionsPerCCR: 30},
            },
            {
                key: "Review.Defaults",
                value: {maxSuggestionsPerCCR: 50},
            },
        ]

        const result = await useCase.execute(input)

        expect(result.isFail).toBe(true)
        expect(result.error).toBeInstanceOf(ValidationError)
        expect(result.error.fields[0]?.message).toContain("system setting")
    })

    test("обрабатывает пустой список", async () => {
        const writer = new InMemorySystemSettingsWriter()
        const useCase = new ImportDefaultSystemSettingsUseCase({
            systemSettingsWriter: writer,
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
