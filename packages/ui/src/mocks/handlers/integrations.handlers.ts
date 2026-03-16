import { http, HttpResponse, delay } from "msw"

import { getMockStore } from "../store/create-mock-store"
import type { IUpdateIntegrationConfigData } from "../store/collections/integrations-collection"
import { api } from "./handler-utils"

/**
 * MSW handlers для Integrations API.
 *
 * Обрабатывают операции над интеграциями (Jira, Linear, Sentry, Slack):
 * получение списка, подключение/отключение, обновление конфигурации, тест.
 */
export const integrationsHandlers = [
    /**
     * GET /integrations — возвращает список интеграций.
     */
    http.get(api("/integrations"), async () => {
        await delay(80)
        const store = getMockStore()
        const integrations = store.integrations.listIntegrations()

        return HttpResponse.json({
            integrations,
            total: integrations.length,
        })
    }),

    /**
     * PUT /integrations/:integrationId/connection — подключает/отключает интеграцию.
     */
    http.put(api("/integrations/:integrationId/connection"), async ({ params, request }) => {
        await delay(150)
        const store = getMockStore()
        const integrationId = params["integrationId"] as string
        const body = (await request.json()) as { readonly connected?: boolean }

        const connected = body.connected === true
        const updated = store.integrations.toggleConnection(integrationId, connected)

        if (updated === undefined) {
            return HttpResponse.json(
                { error: "Integration not found", integrationId },
                { status: 404 },
            )
        }

        return HttpResponse.json({ integration: updated })
    }),

    /**
     * PUT /integrations/:integrationId/config — обновляет конфигурацию интеграции.
     */
    http.put(api("/integrations/:integrationId/config"), async ({ params, request }) => {
        await delay(100)
        const store = getMockStore()
        const integrationId = params["integrationId"] as string
        const body = (await request.json()) as IUpdateIntegrationConfigData

        const updated = store.integrations.updateConfig(integrationId, body)

        if (updated === undefined) {
            return HttpResponse.json(
                { error: "Integration not found", integrationId },
                { status: 404 },
            )
        }

        return HttpResponse.json({ integration: updated })
    }),

    /**
     * POST /integrations/:integrationId/test — тестирует соединение с интеграцией.
     */
    http.post(api("/integrations/:integrationId/test"), async ({ params }) => {
        await delay(300)
        const store = getMockStore()
        const integrationId = params["integrationId"] as string

        const result = store.integrations.testConnection(integrationId)

        if (result === undefined) {
            return HttpResponse.json(
                { error: "Integration not found", integrationId },
                { status: 404 },
            )
        }

        return HttpResponse.json({
            id: integrationId,
            ok: result.ok,
            message: result.message,
        })
    }),
]
