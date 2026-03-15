import { http, HttpResponse, delay } from "msw"

import { getMockStore } from "../store/create-mock-store"
import { api, generateId } from "./handler-utils"

/**
 * MSW handlers для Provider Status API.
 *
 * Обрабатывают запросы статуса провайдеров и очереди действий.
 */
export const providerStatusHandlers = [
    /**
     * GET /providers/status — возвращает состояние и очередь.
     */
    http.get(api("/providers/status"), async () => {
        await delay(80)
        const store = getMockStore()
        const data = store.providerStatus.getStatus()
        return HttpResponse.json(data)
    }),

    /**
     * POST /providers/status/actions — добавляет действие в очередь.
     */
    http.post(api("/providers/status/actions"), async ({ request }) => {
        await delay(80)
        const store = getMockStore()
        const body = (await request.json()) as { readonly description?: string }
        const description =
            typeof body.description === "string" ? body.description : "Unknown action"

        const action = {
            id: generateId("qact"),
            description,
            status: "queued" as const,
        }

        store.providerStatus.addQueuedAction(action)
        return HttpResponse.json(action, { status: 201 })
    }),
]
