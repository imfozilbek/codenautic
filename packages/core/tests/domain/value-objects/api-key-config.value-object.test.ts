import {describe, expect, test} from "bun:test"

import {API_KEY_STATUS, APIKeyConfig} from "../../../src/domain/value-objects/api-key-config.value-object"

describe("APIKeyConfig", () => {
    test("creates key config with defaults", () => {
        const keyConfig = APIKeyConfig.create({
            provider: "openai",
            keyId: "key-1",
        })

        expect(keyConfig.provider).toBe("OPENAI")
        expect(keyConfig.keyId).toBe("key-1")
        expect(keyConfig.status).toBe(API_KEY_STATUS.ACTIVE)
        expect(keyConfig.isActive()).toBe(true)
    })

    test("normalizes fields and keeps timestamp", () => {
        const keyConfig = APIKeyConfig.create({
            provider: "  openai ",
            keyId: "  openai-key-1  ",
            status: API_KEY_STATUS.INACTIVE,
            createdAt: "2026-03-01T12:00:00.000Z",
        })

        expect(keyConfig.provider).toBe("OPENAI")
        expect(keyConfig.keyId).toBe("openai-key-1")
        expect(keyConfig.status).toBe(API_KEY_STATUS.INACTIVE)
        expect(keyConfig.toJSON().createdAt.toISOString()).toBe("2026-03-01T12:00:00.000Z")
    })

    test("throws on empty provider", () => {
        expect(() => {
            APIKeyConfig.create({
                provider: "   ",
                keyId: "k-1",
            })
        }).toThrow("API key provider cannot be empty")
    })

    test("throws on empty key id", () => {
        expect(() => {
            APIKeyConfig.create({
                provider: "openai",
                keyId: "   ",
            })
        }).toThrow("API key id cannot be empty")
    })

    test("throws on invalid createdAt", () => {
        expect(() => {
            APIKeyConfig.create({
                provider: "openai",
                keyId: "k-1",
                createdAt: "not-date",
            })
        }).toThrow("API key createdAt must be valid date")
    })

    test("поддерживает дату как объект и кастомный id", () => {
        const createdAt = new Date("2026-03-02T10:00:00.000Z")
        const keyConfig = APIKeyConfig.create({
            provider: "openai",
            keyId: "k-2",
            createdAt,
            id: "openai::k-2::custom",
        })

        expect(keyConfig.createdAt.toISOString()).toBe("2026-03-02T10:00:00.000Z")
        expect(keyConfig.id).toBe("openai::k-2::custom")
    })

    test("бросает ошибку для невалидного объекта даты", () => {
        expect(() => {
            APIKeyConfig.create({
                provider: "openai",
                keyId: "k-3",
                createdAt: new Date("invalid"),
            })
        }).toThrow("API key createdAt must be valid date")
    })
})
