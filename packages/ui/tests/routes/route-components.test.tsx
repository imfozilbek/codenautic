import { screen } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { afterEach, describe, expect, it } from "vitest"

import { App } from "@/app/app"
import { server } from "../mocks/server"
import { renderWithProviders } from "../utils/render"

/**
 * Рендерит приложение на целевом route для route-level regression тестов.
 *
 * @param path Начальный URL route.
 */
function renderAppAtRoute(path: string): void {
    window.history.replaceState({}, "", path)
    renderWithProviders(<App />)
}

/**
 * Устанавливает MSW-обработчики для CCR workspace API,
 * необходимые для routes, использующих useCcrWorkspace.
 */
function installCcrWorkspaceHandlers(): void {
    server.use(
        http.get("http://localhost:7120/api/v1/reviews/workspace", () => {
            return HttpResponse.json({
                total: 0,
                ccrs: [],
            })
        }),
        http.get("http://localhost:7120/api/v1/reviews/:reviewId/workspace", ({ params }) => {
            return HttpResponse.json({
                ccr: {
                    id: String(params.reviewId),
                    title: `CCR ${String(params.reviewId)}`,
                    status: "completed",
                    severity: "medium",
                    repository: "test/repo",
                    team: "Test Team",
                    assignee: "Test User",
                    comments: 0,
                    attachedFiles: [],
                    updatedAt: "2026-03-01T00:00:00.000Z",
                },
            })
        }),
    )
}

/**
 * Параметризованный тест route-компонентов.
 *
 * Проверяет что каждый route-файл корректно рендерит AuthBoundary + DashboardLayout,
 * включая Suspense fallback для lazy-загрузки страницы. Валидирует полный стек рендера
 * от router до layout без проверки содержимого lazy page.
 */
describe("route components", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    /**
     * Dashboard routes без SettingsLayout.
     * Паттерн: AuthBoundary → DashboardLayout → Suspense → LazyPage.
     */
    const dashboardRoutes = [
        { path: "/", label: "index (dashboard)" },
        { path: "/dashboard/code-city", label: "code city dashboard" },
        { path: "/help-diagnostics", label: "help diagnostics" },
        { path: "/issues", label: "issues tracking" },
        { path: "/my-work", label: "my work / triage" },
        { path: "/onboarding", label: "onboarding wizard" },
        { path: "/reports", label: "reports list" },
        { path: "/reports/generate", label: "report generator" },
        { path: "/reports/viewer", label: "report viewer" },
        { path: "/repositories", label: "repositories list" },
        { path: "/scan-error-recovery", label: "scan error recovery" },
        { path: "/scan-progress", label: "scan progress" },
        { path: "/session-recovery", label: "session recovery" },
        { path: "/system-health", label: "system health" },
    ] as const

    /**
     * Settings routes с SettingsLayout.
     * Паттерн: AuthBoundary → DashboardLayout → SettingsLayout → Suspense → LazyPage.
     */
    const settingsRoutes = [
        { path: "/settings", label: "settings overview" },
        { path: "/settings-adoption-analytics", label: "settings adoption analytics" },
        { path: "/settings-appearance", label: "settings appearance" },
        { path: "/settings-audit-logs", label: "settings audit logs" },
        { path: "/settings-billing", label: "settings billing" },
        { path: "/settings-byok", label: "settings BYOK" },
        { path: "/settings-code-review", label: "settings code review" },
        { path: "/settings-concurrency", label: "settings concurrency" },
        { path: "/settings-contract-validation", label: "settings contract validation" },
        { path: "/settings-git-providers", label: "settings git providers" },
        { path: "/settings-integrations", label: "settings integrations" },
        { path: "/settings-jobs", label: "settings jobs" },
        { path: "/settings-llm-providers", label: "settings LLM providers" },
        { path: "/settings-notifications", label: "settings notifications" },
        { path: "/settings-organization", label: "settings organization" },
        { path: "/settings-privacy-redaction", label: "settings privacy redaction" },
        { path: "/settings-provider-degradation", label: "settings provider degradation" },
        { path: "/settings-rules-library", label: "settings rules library" },
        { path: "/settings-sso", label: "settings SSO" },
        { path: "/settings-team", label: "settings team" },
        { path: "/settings-token-usage", label: "settings token usage" },
        { path: "/settings-webhooks", label: "settings webhooks" },
    ] as const

    /**
     * Routes с динамическими параметрами.
     * Требуют дополнительных MSW-обработчиков для API-вызовов в route component.
     */
    const paramRoutes = [
        {
            path: "/repositories/test-org%2Ftest-repo",
            label: "repository overview ($repositoryId)",
        },
        {
            path: "/reviews/review-123",
            label: "review detail ($reviewId)",
            setupHandlers: installCcrWorkspaceHandlers,
        },
    ] as const

    const allRoutes = [...dashboardRoutes, ...settingsRoutes, ...paramRoutes]

    it.each(allRoutes)(
        "when navigating to $label ($path), then renders main navigation layout",
        async (route): Promise<void> => {
            if ("setupHandlers" in route && route.setupHandlers !== undefined) {
                route.setupHandlers()
            }

            renderAppAtRoute(route.path)

            const navElements = await screen.findAllByRole("navigation", {
                name: "Main navigation",
            })
            expect(navElements.length).toBeGreaterThan(0)
        },
    )

    /**
     * Reviews route с search-параметрами.
     * Проверяет что route корректно работает с query-string.
     */
    it("when navigating to reviews with search params, then renders main navigation layout", async (): Promise<void> => {
        renderAppAtRoute("/reviews?q=test&status=open")

        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })

    /**
     * Scan progress route с search-параметрами.
     * Проверяет что route принимает jobId и repositoryId через query-string.
     */
    it("when navigating to scan-progress with search params, then renders main navigation layout", async (): Promise<void> => {
        renderAppAtRoute("/scan-progress?jobId=scan-123&repositoryId=org/repo")

        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})
