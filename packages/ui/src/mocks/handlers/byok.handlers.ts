import { http, HttpResponse, delay } from "msw"

import type { IByokKeyEntry, TByokProvider } from "@/lib/api/endpoints/byok.endpoint"

import { getMockStore } from "../store/create-mock-store"
import { api, generateId } from "./handler-utils"

/**
 * Количество видимых символов в начале маскированного секрета.
 */
const SECRET_PREFIX_LENGTH = 4

/**
 * Маскирует секрет: показывает начало и конец, скрывая середину.
 *
 * @param value - Исходный секрет.
 * @returns Маскированная строка.
 */
function maskSecret(value: string): string {
    const normalized = value.trim()
    const prefix = normalized.slice(0, SECRET_PREFIX_LENGTH)
    const suffix = normalized.slice(-3)
    if (normalized.length < 7) {
        return "****"
    }

    return `${prefix}****${suffix}`
}

/**
 * MSW handlers для BYOK API.
 *
 * Обрабатывают операции над BYOK ключами: list, create, delete, rotate, toggle.
 * Используют ByokCollection из mock store для хранения состояния.
 */
export const byokHandlers = [
    /**
     * GET /byok — возвращает список всех BYOK ключей.
     */
    http.get(api("/byok"), async () => {
        await delay(80)
        const store = getMockStore()
        const keys = store.byok.list()

        return HttpResponse.json({
            keys,
            total: keys.length,
        })
    }),

    /**
     * POST /byok — создаёт новый BYOK ключ.
     */
    http.post(api("/byok"), async ({ request }) => {
        await delay(100)
        const store = getMockStore()
        const body = (await request.json()) as {
            readonly provider: TByokProvider
            readonly label: string
            readonly secret: string
        }

        const key: IByokKeyEntry = {
            id: generateId("byok"),
            provider: body.provider,
            label: body.label,
            maskedSecret: maskSecret(body.secret),
            isActive: true,
            rotationCount: 1,
            usageRequests: 0,
            usageTokens: 0,
            lastUsedAt: new Date().toISOString(),
        }

        store.byok.create(key)

        return HttpResponse.json({ key }, { status: 201 })
    }),

    /**
     * DELETE /byok/:keyId — удаляет BYOK ключ.
     */
    http.delete(api("/byok/:keyId"), async ({ params }) => {
        await delay(60)
        const store = getMockStore()
        const keyId = params["keyId"] as string

        const removed = store.byok.remove(keyId)

        if (removed !== true) {
            return HttpResponse.json(
                { error: "Key not found", keyId },
                { status: 404 },
            )
        }

        return HttpResponse.json({ removed: true })
    }),

    /**
     * POST /byok/:keyId/rotate — ротирует секрет ключа.
     */
    http.post(api("/byok/:keyId/rotate"), async ({ params }) => {
        await delay(100)
        const store = getMockStore()
        const keyId = params["keyId"] as string

        const existing = store.byok.getById(keyId)
        if (existing === undefined) {
            return HttpResponse.json(
                { error: "Key not found", keyId },
                { status: 404 },
            )
        }

        const syntheticSecret = `${existing.provider}-${Date.now().toString(36)}-rot`
        const key = store.byok.rotate(keyId, maskSecret(syntheticSecret))

        if (key === undefined) {
            return HttpResponse.json(
                { error: "Key not found", keyId },
                { status: 404 },
            )
        }

        return HttpResponse.json({ key })
    }),

    /**
     * PATCH /byok/:keyId/toggle — переключает активность ключа.
     */
    http.patch(api("/byok/:keyId/toggle"), async ({ params, request }) => {
        await delay(60)
        const store = getMockStore()
        const keyId = params["keyId"] as string
        const body = (await request.json()) as { readonly isActive: boolean }

        const key = store.byok.toggle(keyId, body.isActive)

        if (key === undefined) {
            return HttpResponse.json(
                { error: "Key not found", keyId },
                { status: 404 },
            )
        }

        return HttpResponse.json({ key })
    }),
]
