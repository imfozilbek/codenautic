import { http, HttpResponse, delay } from "msw"

import { getMockStore } from "../store/create-mock-store"
import type { IUpdateLlmProviderData } from "../store/collections/llm-providers-collection"
import { api } from "./handler-utils"

/**
 * MSW handlers для LLM Providers API.
 *
 * Обрабатывают операции над конфигурациями LLM провайдеров:
 * получение списка, обновление конфигурации, тестирование соединения.
 */
export const llmProvidersHandlers = [
    /**
     * GET /llm-providers — возвращает список конфигураций LLM провайдеров.
     */
    http.get(api("/llm-providers"), async () => {
        await delay(80)
        const store = getMockStore()
        const providers = store.llmProviders.listProviders()

        return HttpResponse.json({
            providers,
            total: providers.length,
        })
    }),

    /**
     * PUT /llm-providers/:providerId — обновляет конфигурацию провайдера.
     */
    http.put(api("/llm-providers/:providerId"), async ({ params, request }) => {
        await delay(150)
        const store = getMockStore()
        const providerId = params["providerId"] as string
        const body = (await request.json()) as IUpdateLlmProviderData

        const updated = store.llmProviders.updateProvider(providerId, body)

        if (updated === undefined) {
            return HttpResponse.json(
                { error: "LLM provider not found", providerId },
                { status: 404 },
            )
        }

        return HttpResponse.json({ provider: updated })
    }),

    /**
     * POST /llm-providers/:providerId/test — тестирует соединение с провайдером.
     */
    http.post(api("/llm-providers/:providerId/test"), async ({ params }) => {
        await delay(300)
        const store = getMockStore()
        const providerId = params["providerId"] as string

        const result = store.llmProviders.testConnection(providerId)

        if (result === undefined) {
            return HttpResponse.json(
                { error: "LLM provider not found", providerId },
                { status: 404 },
            )
        }

        return HttpResponse.json({
            id: providerId,
            ok: result.ok,
            message: result.message,
            latencyMs: result.latencyMs,
        })
    }),
]
