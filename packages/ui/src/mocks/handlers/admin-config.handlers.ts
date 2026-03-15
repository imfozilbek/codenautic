import { http, HttpResponse, delay } from "msw"

import type { IAdminConfigValues } from "@/lib/api/endpoints/admin-config.endpoint"

import { getMockStore } from "../store/create-mock-store"
import { api } from "./handler-utils"

/**
 * MSW handlers для Admin Config API.
 *
 * Обрабатывают GET конфига с ETag и PUT с optimistic concurrency (If-Match).
 * Возвращает 409 при конфликте ETag.
 * Используют AdminConfigCollection из mock store для хранения состояния.
 */
export const adminConfigHandlers = [
    /**
     * GET /admin-config — возвращает текущий конфиг с ETag в заголовке.
     */
    http.get(api("/admin-config"), async () => {
        await delay(100)
        const store = getMockStore()
        const config = store.adminConfig.getConfig()

        return HttpResponse.json(
            { config },
            {
                headers: {
                    ETag: String(config.etag),
                },
            },
        )
    }),

    /**
     * PUT /admin-config — обновляет конфиг с проверкой If-Match.
     *
     * Возвращает 409 Conflict если ETag не совпадает.
     */
    http.put(api("/admin-config"), async ({ request }) => {
        await delay(150)
        const store = getMockStore()
        const ifMatchHeader = request.headers.get("If-Match")
        const body = (await request.json()) as { readonly values: IAdminConfigValues }

        if (ifMatchHeader === null) {
            return HttpResponse.json(
                { error: "If-Match header is required" },
                { status: 428 },
            )
        }

        const ifMatchEtag = Number(ifMatchHeader)
        if (Number.isNaN(ifMatchEtag)) {
            return HttpResponse.json(
                { error: "Invalid If-Match header value" },
                { status: 400 },
            )
        }

        const result = store.adminConfig.updateConfig(body.values, ifMatchEtag)

        if (result.success !== true) {
            return HttpResponse.json(
                {
                    conflict: true,
                    serverConfig: result.serverConfig,
                },
                {
                    status: 409,
                    headers: {
                        ETag: String(result.serverConfig.etag),
                    },
                },
            )
        }

        return HttpResponse.json(
            {
                conflict: false,
                config: result.config,
            },
            {
                headers: {
                    ETag: String(result.config.etag),
                },
            },
        )
    }),
]
