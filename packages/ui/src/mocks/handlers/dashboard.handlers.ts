import { http, HttpResponse, delay } from "msw"

import type { TDashboardDateRange } from "@/lib/api/endpoints/dashboard.endpoint"

import { getMockStore } from "../store/create-mock-store"
import { api } from "./handler-utils"

/**
 * Допустимые значения диапазона дат.
 */
const VALID_RANGES = new Set<string>(["1d", "7d", "30d", "90d"])

/**
 * Извлекает и валидирует параметр range из URL.
 *
 * @param request HTTP-запрос.
 * @returns Валидный диапазон дат (по умолчанию "7d").
 */
function extractRange(request: Request): TDashboardDateRange {
    const url = new URL(request.url)
    const raw = url.searchParams.get("range") ?? "7d"
    if (VALID_RANGES.has(raw)) {
        return raw as TDashboardDateRange
    }
    return "7d"
}

/**
 * MSW handlers для dashboard: метрики, распределения, активность,
 * flow-метрики, использование токенов, рабочая очередь, временная шкала.
 *
 * Используют DashboardCollection из mock store для хранения состояния.
 */
export const dashboardHandlers = [
    /**
     * GET /dashboard/metrics — возвращает KPI-метрики.
     */
    http.get(api("/dashboard/metrics"), async ({ request }) => {
        await delay(60)
        const store = getMockStore()
        const range = extractRange(request)
        const metrics = store.dashboard.getMetrics(range)

        return HttpResponse.json({ metrics })
    }),

    /**
     * GET /dashboard/status-distribution — возвращает распределение статусов.
     */
    http.get(api("/dashboard/status-distribution"), async ({ request }) => {
        await delay(60)
        const store = getMockStore()
        const range = extractRange(request)
        const points = store.dashboard.getStatusDistribution(range)

        return HttpResponse.json({ points })
    }),

    /**
     * GET /dashboard/team-activity — возвращает активность команды.
     */
    http.get(api("/dashboard/team-activity"), async ({ request }) => {
        await delay(60)
        const store = getMockStore()
        const range = extractRange(request)
        const points = store.dashboard.getTeamActivity(range)

        return HttpResponse.json({ points })
    }),

    /**
     * GET /dashboard/flow-metrics — возвращает flow-метрики.
     */
    http.get(api("/dashboard/flow-metrics"), async ({ request }) => {
        await delay(60)
        const store = getMockStore()
        const range = extractRange(request)
        const points = store.dashboard.getFlowMetrics(range)

        return HttpResponse.json({ points })
    }),

    /**
     * GET /dashboard/token-usage — возвращает использование токенов.
     */
    http.get(api("/dashboard/token-usage"), async ({ request }) => {
        await delay(60)
        const store = getMockStore()
        const range = extractRange(request)
        const byModel = store.dashboard.getTokenUsageByModel(range)
        const costTrend = store.dashboard.getTokenUsageTrend(range)

        return HttpResponse.json({ byModel, costTrend })
    }),

    /**
     * GET /dashboard/work-queue — возвращает записи рабочей очереди.
     */
    http.get(api("/dashboard/work-queue"), async () => {
        await delay(40)
        const store = getMockStore()
        const entries = store.dashboard.getWorkQueue()

        return HttpResponse.json({ entries })
    }),

    /**
     * GET /dashboard/timeline — возвращает записи временной шкалы.
     */
    http.get(api("/dashboard/timeline"), async () => {
        await delay(40)
        const store = getMockStore()
        const entries = store.dashboard.getTimeline()

        return HttpResponse.json({ entries })
    }),
]
