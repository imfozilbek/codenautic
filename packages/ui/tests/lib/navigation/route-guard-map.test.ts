import { describe, expect, it } from "vitest"

import {
    getBreadcrumbs,
    isRouteAccessible,
    searchAccessibleRoutes,
} from "@/lib/navigation/route-guard-map"

describe("route guard map", (): void => {
    it("строит breadcrumbs для известных маршрутов", (): void => {
        expect(getBreadcrumbs("/my-work")).toEqual(["Dashboard", "My Work"])
        expect(getBreadcrumbs("/help-diagnostics")).toEqual(["Dashboard", "Help & diagnostics"])
        expect(getBreadcrumbs("/settings-adoption-analytics")).toEqual([
            "Settings",
            "Adoption analytics",
        ])
        expect(getBreadcrumbs("/settings-team")).toEqual(["Settings", "Team"])
        expect(getBreadcrumbs("/reviews/ccr-101")).toEqual(["Dashboard", "Reviews"])
    })

    it("блокирует route при tenant mismatch", (): void => {
        const canAccess = isRouteAccessible("/settings-team", {
            isAuthenticated: true,
            role: "admin",
            tenantId: "frontend-team",
        })

        expect(canAccess).toBe(false)
    })

    it("возвращает доступные маршруты для global search", (): void => {
        const routes = searchAccessibleRoutes("settings", {
            isAuthenticated: true,
            role: "developer",
            tenantId: "runtime-team",
        })

        expect(routes.length).toBeGreaterThan(0)
        expect(routes.some((route): boolean => route.path === "/settings-integrations")).toBe(true)
        expect(routes.some((route): boolean => route.path === "/settings-team")).toBe(false)
    })
})
