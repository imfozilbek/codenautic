import { describe, expect, it } from "vitest"

import {
    getBreadcrumbs,
    getBreadcrumbsWithPaths,
    isRouteAccessible,
    searchAccessibleRoutes,
} from "@/lib/navigation/route-guard-map"

describe("route guard map", (): void => {
    it("строит breadcrumbs для известных маршрутов", (): void => {
        expect(getBreadcrumbs("/my-work")).toEqual(["Dashboard", "My Work"])
        expect(getBreadcrumbs("/scan-error-recovery")).toEqual(["Dashboard", "Scan error recovery"])
        expect(getBreadcrumbs("/session-recovery")).toEqual(["Dashboard", "Session recovery"])
        expect(getBreadcrumbs("/help-diagnostics")).toEqual(["Dashboard", "Help & diagnostics"])
        expect(getBreadcrumbs("/settings-adoption-analytics")).toEqual([
            "Settings",
            "Adoption analytics",
        ])
        expect(getBreadcrumbs("/settings-team")).toEqual(["Settings", "Team"])
        expect(getBreadcrumbs("/reviews/ccr-101")).toEqual(["Dashboard", "Reviews"])
    })

    it("строит кликабельные breadcrumbs с путями для известных маршрутов", (): void => {
        expect(getBreadcrumbsWithPaths("/settings-team")).toEqual([
            { label: "Settings", path: "/settings" },
            { label: "Team" },
        ])
        expect(getBreadcrumbsWithPaths("/reviews/ccr-101")).toEqual([
            { label: "Dashboard", path: "/" },
            { label: "Reviews" },
        ])
    })

    it("возвращает fallback breadcrumbs для неизвестного маршрута", (): void => {
        expect(getBreadcrumbsWithPaths("/unknown/path")).toEqual([
            { label: "Dashboard", path: "/" },
            { label: "Unknown route" },
        ])
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
