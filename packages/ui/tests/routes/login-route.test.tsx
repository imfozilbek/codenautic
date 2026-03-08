import { screen, waitFor } from "@testing-library/react"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { afterEach, describe, expect, it, vi } from "vitest"
import { http, HttpResponse } from "msw"

import { routeTree } from "@/routeTree.gen"
import {
    resolveAuthStatusHint,
    resolveLoginDestination,
    validateLoginRouteSearch,
} from "@/routes/login"
import { server } from "../mocks/server"
import { renderWithProviders } from "../utils/render"

/**
 * Рендерит приложение с новым router и QueryClient для изолированных route-тестов.
 *
 * @param path Начальный path браузера.
 */
function renderRoute(path: string): void {
    window.history.replaceState({}, "", path)
    const router = createRouter({
        routeTree,
        defaultPreload: "intent",
        defaultPreloadStaleTime: 0,
    })

    renderWithProviders(<RouterProvider router={router} />)
}

describe("login route helpers", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("валидирует search-параметры login route", (): void => {
        const validated = validateLoginRouteSearch({
            next: "/dashboard",
            reason: "401",
            ignored: 123,
        })
        const numericReason = validateLoginRouteSearch({
            reason: 403,
        })
        const fallback = validateLoginRouteSearch({
            next: 123,
            reason: false,
        })

        expect(validated.next).toBe("/dashboard")
        expect(validated.reason).toBe("401")
        expect(numericReason.reason).toBe("403")
        expect(fallback.next).toBeUndefined()
        expect(fallback.reason).toBeUndefined()
    })

    it("нормализует intended destination для login redirect", (): void => {
        expect(resolveLoginDestination(undefined)).toBe("/")
        expect(resolveLoginDestination("   ")).toBe("/")
        expect(resolveLoginDestination("/login?next=/dashboard")).toBe("/")
        expect(resolveLoginDestination("/dashboard?tab=active")).toBe("/dashboard?tab=active")
        expect(resolveLoginDestination("//evil.example/phishing")).toBe("/")
        expect(resolveLoginDestination("https://evil.example/phishing")).toBe("/")
    })

    it("разбирает auth reason в status hint", (): void => {
        expect(resolveAuthStatusHint("401")).toBe(401)
        expect(resolveAuthStatusHint("403")).toBe(403)
        expect(resolveAuthStatusHint("500")).toBeUndefined()
        expect(resolveAuthStatusHint(undefined)).toBeUndefined()
    })
})

describe("login route", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
        vi.restoreAllMocks()
    })

    it("показывает login panel и явное 403 состояние", async (): Promise<void> => {
        server.use(
            http.get("http://localhost:3000/api/v1/auth/session", () => {
                return HttpResponse.json({
                    session: null,
                })
            }),
        )

        renderRoute("/login?next=%2Freports&reason=403")

        const loginTitle = await screen.findByText("Войдите, чтобы открыть dashboard")
        expect(loginTitle.textContent).toBe("Войдите, чтобы открыть dashboard")

        const statusText = screen.getByRole("status")
        expect(statusText.textContent).toBe(
            "Доступ запрещён (403). У аккаунта нет прав на этот ресурс.",
        )
    })

    it("редиректит авторизованного пользователя на intended destination", async (): Promise<void> => {
        const assignSpy = vi
            .spyOn(window.location, "assign")
            .mockImplementation((_url: string | URL): void => undefined)

        try {
            server.use(
                http.get("http://localhost:3000/api/v1/auth/session", () => {
                    return HttpResponse.json({
                        session: {
                            provider: "github",
                            expiresAt: "2030-01-01T00:00:00.000Z",
                            user: {
                                id: "u-login-route",
                                email: "login-route@example.com",
                                displayName: "Login Route User",
                            },
                        },
                    })
                }),
            )

            renderRoute("/login?next=%2Freports")

            await waitFor((): void => {
                expect(assignSpy).toHaveBeenCalledWith("/reports")
            })
        } finally {
            assignSpy.mockRestore()
        }
    })
})
