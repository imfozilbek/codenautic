import { http, HttpResponse, delay } from "msw"

import { getMockStore } from "../store/create-mock-store"
import { api, paginate } from "./handler-utils"

/**
 * MSW handlers для Audit Logs API.
 *
 * Обрабатывают запросы аудит-логов с фильтрацией и пагинацией.
 */
export const auditLogsHandlers = [
    /**
     * GET /audit-logs — возвращает пагинированный фильтрованный список.
     */
    http.get(api("/audit-logs"), async ({ request }) => {
        await delay(80)
        const store = getMockStore()
        const url = new URL(request.url)

        const actor = url.searchParams.get("actor") ?? undefined
        const action = url.searchParams.get("action") ?? undefined
        const dateFrom = url.searchParams.get("dateFrom") ?? undefined
        const dateTo = url.searchParams.get("dateTo") ?? undefined
        const page = Number(url.searchParams.get("page") ?? "1")
        const limit = Number(url.searchParams.get("limit") ?? "20")

        const filtered = store.auditLogs.getFiltered(actor, action, dateFrom, dateTo)
        const result = paginate(filtered, page, limit)

        return HttpResponse.json(result)
    }),
]
