import { http, HttpResponse, delay } from "msw"

import { api } from "./handler-utils"

/**
 * MSW handlers для системных эндпоинтов: health, feature-flags, permissions.
 */
export const systemHandlers = [
    /**
     * GET /health — проверка состояния API.
     */
    http.get(api("/health"), async () => {
        await delay(30)
        return HttpResponse.json({
            status: "ok",
            service: "api",
            timestamp: new Date().toISOString(),
            version: "0.1.0-mock",
        })
    }),

    /**
     * GET /feature-flags — доступные feature flags.
     */
    http.get(api("/feature-flags"), async () => {
        await delay(50)
        return HttpResponse.json({
            flags: {
                premium_dashboard: true,
                code_city_3d: true,
                ccr_summary: true,
                adoption_analytics: true,
                contract_validation: true,
                report_generator: true,
            },
        })
    }),

    /**
     * GET /permissions — список разрешений текущего пользователя.
     */
    http.get(api("/permissions"), async () => {
        await delay(50)
        return HttpResponse.json({
            permissions: [
                "review:read",
                "review:write",
                "review:decision",
                "review:finish",
                "settings:read",
                "settings:write",
                "admin:read",
                "admin:write",
                "repository:read",
                "repository:write",
                "repository:scan",
                "report:read",
                "report:write",
                "report:generate",
                "team:read",
                "team:write",
                "billing:read",
                "billing:write",
            ],
        })
    }),
]
