import { beforeEach, describe, expect, it } from "vitest"

import {
    buildSearchFromRoute,
    REVIEWS_FILTER_PERSISTENCE_KEY,
    sanitizeForRouter,
} from "@/routes/reviews"

describe("reviews route filters", (): void => {
    beforeEach((): void => {
        localStorage.removeItem(REVIEWS_FILTER_PERSISTENCE_KEY)
    })

    it("восстанавливает persisted filters, когда URL-параметры не заданы", (): void => {
        localStorage.setItem(
            REVIEWS_FILTER_PERSISTENCE_KEY,
            JSON.stringify({
                repository: "frontend-team/ui-dashboard",
                search: "risk",
                status: "in_progress",
                team: "frontend",
            }),
        )

        const actual = buildSearchFromRoute({})

        expect(actual).toEqual({
            repository: "frontend-team/ui-dashboard",
            search: "risk",
            status: "in_progress",
            team: "frontend",
        })
    })

    it("приоритетно использует URL-параметры, если они заданы", (): void => {
        localStorage.setItem(
            REVIEWS_FILTER_PERSISTENCE_KEY,
            JSON.stringify({
                repository: "frontend-team/ui-dashboard",
                search: "stale",
                status: "rejected",
                team: "frontend",
            }),
        )

        const actual = buildSearchFromRoute({
            q: "approved",
            repo: "platform-team/api-gateway",
            status: "approved",
            team: "platform",
        })

        expect(actual).toEqual({
            repository: "platform-team/api-gateway",
            search: "approved",
            status: "approved",
            team: "platform",
        })
    })

    it("очищает дефолтные значения при сериализации фильтров в URL", (): void => {
        const actual = sanitizeForRouter({
            repository: "all",
            search: "",
            status: "all",
            team: "all",
        })

        expect(actual).toEqual({
            q: undefined,
            repo: undefined,
            status: undefined,
            team: undefined,
        })
    })

    it("синхронизирует фильтры через URL и поддерживает shareable round-trip", (): void => {
        const originalFilters = {
            repository: "platform-team/api-gateway",
            search: "security regression",
            status: "in_progress",
            team: "platform",
        } as const

        const routeSearch = sanitizeForRouter(originalFilters)
        const restored = buildSearchFromRoute(routeSearch)

        expect(routeSearch).toEqual({
            q: "security regression",
            repo: "platform-team/api-gateway",
            status: "in_progress",
            team: "platform",
        })

        expect(restored).toEqual(originalFilters)
    })
})
