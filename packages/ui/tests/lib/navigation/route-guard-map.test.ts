import i18next from "i18next"
import { describe, expect, it } from "vitest"

import {
    getBreadcrumbs,
    getBreadcrumbsWithPaths,
    isRouteAccessible,
    searchAccessibleRoutes,
} from "@/lib/navigation/route-guard-map"

const t = i18next.getFixedT("ru", ["navigation"])

describe("route guard map", (): void => {
    it("строит breadcrumbs для известных маршрутов", (): void => {
        expect(getBreadcrumbs("/my-work", t)).toEqual(["Дашборд", "Мои задачи"])
        expect(getBreadcrumbs("/scan-error-recovery", t)).toEqual([
            "Дашборд",
            "Восстановление после ошибки сканирования",
        ])
        expect(getBreadcrumbs("/session-recovery", t)).toEqual(["Дашборд", "Восстановление сессии"])
        expect(getBreadcrumbs("/help-diagnostics", t)).toEqual(["Дашборд", "Помощь и диагностика"])
        expect(getBreadcrumbs("/settings-adoption-analytics", t)).toEqual([
            "Настройки",
            "Аналитика внедрения",
        ])
        expect(getBreadcrumbs("/settings-team", t)).toEqual(["Настройки", "Команда"])
        expect(getBreadcrumbs("/reviews/ccr-101", t)).toEqual(["Дашборд", "Ревью CCR"])
    })

    it("строит кликабельные breadcrumbs с путями для известных маршрутов", (): void => {
        expect(getBreadcrumbsWithPaths("/settings-team", t)).toEqual([
            { label: "Настройки", path: "/settings" },
            { label: "Команда" },
        ])
        expect(getBreadcrumbsWithPaths("/reviews/ccr-101", t)).toEqual([
            { label: "Дашборд", path: "/" },
            { label: "Ревью CCR" },
        ])
    })

    it("возвращает fallback breadcrumbs для неизвестного маршрута", (): void => {
        expect(getBreadcrumbsWithPaths("/unknown/path", t)).toEqual([
            { label: "Дашборд", path: "/" },
            { label: "Неизвестный маршрут" },
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
