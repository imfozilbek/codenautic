import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiHttpError, type IAuthApi } from "@/lib/api"
import { AuthBoundary } from "@/lib/auth/auth-boundary"
import type { IAuthSession, IAuthSessionEnvelope } from "@/lib/auth/types"
import { renderWithProviders } from "../../utils/render"

/**
 * Создаёт test auth session.
 *
 * @param expiresAt ISO-строка времени истечения.
 * @param displayName Отображаемое имя пользователя.
 * @returns Auth session для тестов.
 */
function createSession(expiresAt: string, displayName = "Dev User"): IAuthSession {
    return {
        provider: "github",
        expiresAt,
        user: {
            id: "u-1",
            email: "dev@example.com",
            displayName,
        },
    }
}

/**
 * Создаёт mock-реализацию IAuthApi.
 *
 * @param overrides Partial override методов auth API.
 * @returns Полноценный auth API mock.
 */
function createAuthApiMock(overrides: Partial<IAuthApi> = {}): IAuthApi {
    return {
        getSession: (): Promise<IAuthSessionEnvelope> => {
            return Promise.resolve({
                session: null,
            })
        },
        startOAuth: () => {
            return Promise.resolve({
                provider: "github" as const,
                authorizationUrl: "https://auth.example/github",
                state: "state-1",
            })
        },
        refreshSession: (): Promise<IAuthSessionEnvelope> => {
            return Promise.resolve({
                session: null,
            })
        },
        logout: () => {
            return Promise.resolve({
                loggedOut: true,
            })
        },
        ...overrides,
    }
}

describe("AuthBoundary", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("рендерит защищённый контент для авторизованного пользователя", async (): Promise<void> => {
        const getSession = vi.fn((): Promise<IAuthSessionEnvelope> => {
            return Promise.resolve({
                session: createSession("2030-01-01T00:00:00.000Z"),
            })
        })
        const api = createAuthApiMock({
            getSession,
        })

        renderWithProviders(
            <AuthBoundary authApi={api}>
                <div>Private dashboard</div>
            </AuthBoundary>,
        )

        const dashboardLabel = await screen.findByText("Private dashboard")
        const logoutButton = screen.getByRole("button", { name: "Выйти" })
        const userName = screen.getByText("Dev User")

        expect(dashboardLabel.textContent).toBe("Private dashboard")
        expect(logoutButton.textContent).toBe("Выйти")
        expect(userName.textContent).toBe("Dev User")
        expect(getSession).toHaveBeenCalledTimes(1)
    })

    it("показывает login panel и запускает OAuth redirect", async (): Promise<void> => {
        const startOAuth = vi.fn(() => {
            return Promise.resolve({
                provider: "github" as const,
                authorizationUrl: "https://auth.example/github",
                state: "state-2",
            })
        })
        const api = createAuthApiMock({
            startOAuth,
        })
        const onRedirect = vi.fn()
        const user = userEvent.setup()

        renderWithProviders(
            <AuthBoundary authApi={api} onRedirect={onRedirect}>
                <div>Private dashboard</div>
            </AuthBoundary>,
        )

        const loginTitle = await screen.findByText("Войдите, чтобы открыть dashboard")
        expect(loginTitle.textContent).toBe("Войдите, чтобы открыть dashboard")

        const githubButton = screen.getByRole("button", { name: "GitHub" })
        await user.click(githubButton)

        expect(startOAuth).toHaveBeenCalledTimes(1)
        expect(startOAuth).toHaveBeenCalledWith({
            provider: "github",
            redirectUri: "http://localhost:3000/",
        })
        expect(onRedirect).toHaveBeenCalledWith("https://auth.example/github")
    })

    it("сохраняет intended destination в redirectUri при старте OAuth", async (): Promise<void> => {
        const startOAuth = vi.fn(() => {
            return Promise.resolve({
                provider: "github" as const,
                authorizationUrl: "https://auth.example/github",
                state: "state-preserve-next",
            })
        })
        const api = createAuthApiMock({
            startOAuth,
        })
        const user = userEvent.setup()
        const onRedirect = vi.fn()

        renderWithProviders(
            <AuthBoundary
                authApi={api}
                intendedDestination="/reviews?tab=open#details"
                onRedirect={onRedirect}
            >
                <div>Private dashboard</div>
            </AuthBoundary>,
        )

        const githubButton = await screen.findByRole("button", { name: "GitHub" })
        await user.click(githubButton)

        expect(startOAuth).toHaveBeenCalledWith({
            provider: "github",
            redirectUri: "http://localhost:3000/reviews?tab=open#details",
        })
    })

    it("нормализует пустой intended destination до корня", async (): Promise<void> => {
        const startOAuth = vi.fn(() => {
            return Promise.resolve({
                provider: "github" as const,
                authorizationUrl: "https://auth.example/github",
                state: "state-empty-next",
            })
        })
        const api = createAuthApiMock({
            startOAuth,
        })
        const user = userEvent.setup()

        renderWithProviders(
            <AuthBoundary authApi={api} intendedDestination="   " onRedirect={vi.fn()}>
                <div>Private dashboard</div>
            </AuthBoundary>,
        )

        const githubButton = await screen.findByRole("button", { name: "GitHub" })
        await user.click(githubButton)

        expect(startOAuth).toHaveBeenCalledWith({
            provider: "github",
            redirectUri: "http://localhost:3000/",
        })
    })

    it("игнорирует внешний absolute intended destination", async (): Promise<void> => {
        const startOAuth = vi.fn(() => {
            return Promise.resolve({
                provider: "github" as const,
                authorizationUrl: "https://auth.example/github",
                state: "state-external-next",
            })
        })
        const api = createAuthApiMock({
            startOAuth,
        })
        const user = userEvent.setup()

        renderWithProviders(
            <AuthBoundary
                authApi={api}
                intendedDestination="https://evil.example/phishing"
                onRedirect={vi.fn()}
            >
                <div>Private dashboard</div>
            </AuthBoundary>,
        )

        const githubButton = await screen.findByRole("button", { name: "GitHub" })
        await user.click(githubButton)

        expect(startOAuth).toHaveBeenCalledWith({
            provider: "github",
            redirectUri: "http://localhost:3000/",
        })
    })

    it("переходит к корню при синтаксически невалидном intended destination", async (): Promise<void> => {
        const startOAuth = vi.fn(() => {
            return Promise.resolve({
                provider: "github" as const,
                authorizationUrl: "https://auth.example/github",
                state: "state-invalid-next",
            })
        })
        const api = createAuthApiMock({
            startOAuth,
        })
        const user = userEvent.setup()

        renderWithProviders(
            <AuthBoundary authApi={api} intendedDestination="http://[::1" onRedirect={vi.fn()}>
                <div>Private dashboard</div>
            </AuthBoundary>,
        )

        const githubButton = await screen.findByRole("button", { name: "GitHub" })
        await user.click(githubButton)

        expect(startOAuth).toHaveBeenCalledWith({
            provider: "github",
            redirectUri: "http://localhost:3000/",
        })
    })

    it("поддерживает same-origin absolute intended destination", async (): Promise<void> => {
        const startOAuth = vi.fn(() => {
            return Promise.resolve({
                provider: "github" as const,
                authorizationUrl: "https://auth.example/github",
                state: "state-origin-next",
            })
        })
        const api = createAuthApiMock({
            startOAuth,
        })
        const user = userEvent.setup()

        renderWithProviders(
            <AuthBoundary
                authApi={api}
                intendedDestination="http://localhost:3000/reviews?tab=active#panel"
                onRedirect={vi.fn()}
            >
                <div>Private dashboard</div>
            </AuthBoundary>,
        )

        const githubButton = await screen.findByRole("button", { name: "GitHub" })
        await user.click(githubButton)

        expect(startOAuth).toHaveBeenCalledWith({
            provider: "github",
            redirectUri: "http://localhost:3000/reviews?tab=active#panel",
        })
    })

    it("редиректит неавторизованного пользователя на login route", async (): Promise<void> => {
        const onNavigateToLogin = vi.fn()
        const api = createAuthApiMock({
            getSession: (): Promise<IAuthSessionEnvelope> => {
                return Promise.resolve({
                    session: null,
                })
            },
        })

        renderWithProviders(
            <AuthBoundary authApi={api} loginPath="/login" onNavigateToLogin={onNavigateToLogin}>
                <div>Private dashboard</div>
            </AuthBoundary>,
        )

        await waitFor((): void => {
            expect(onNavigateToLogin).toHaveBeenCalledWith("/login?next=%2F&reason=401")
        })
    })

    it("использует window.location.assign для login redirect по умолчанию", async (): Promise<void> => {
        const assignSpy = vi
            .spyOn(window.location, "assign")
            .mockImplementation((_url: string | URL): void => undefined)

        try {
            const api = createAuthApiMock({
                getSession: (): Promise<IAuthSessionEnvelope> => {
                    return Promise.resolve({
                        session: null,
                    })
                },
            })

            renderWithProviders(
                <AuthBoundary authApi={api} loginPath="/login">
                    <div>Private dashboard</div>
                </AuthBoundary>,
            )

            await waitFor((): void => {
                expect(assignSpy).toHaveBeenCalledWith("/login?next=%2F&reason=401")
            })
        } finally {
            assignSpy.mockRestore()
        }
    })

    it("не выполняет login redirect при не-HTTP ошибке session запроса", async (): Promise<void> => {
        const onNavigateToLogin = vi.fn()
        const api = createAuthApiMock({
            getSession: (): Promise<IAuthSessionEnvelope> => {
                return Promise.reject(new Error("Unexpected auth failure"))
            },
        })

        renderWithProviders(
            <AuthBoundary authApi={api} loginPath="/login" onNavigateToLogin={onNavigateToLogin}>
                <div>Private dashboard</div>
            </AuthBoundary>,
        )

        const loginTitle = await screen.findByText("Войдите, чтобы открыть dashboard")
        expect(loginTitle.textContent).toBe("Войдите, чтобы открыть dashboard")
        expect(onNavigateToLogin).not.toHaveBeenCalled()
    })

    it("не выполняет login redirect при HTTP ошибке вне 401/403", async (): Promise<void> => {
        const onNavigateToLogin = vi.fn()
        const api = createAuthApiMock({
            getSession: (): Promise<IAuthSessionEnvelope> => {
                return Promise.reject(
                    new ApiHttpError(
                        500,
                        "/api/v1/auth/session",
                        "HTTP 500 for /api/v1/auth/session",
                    ),
                )
            },
        })

        renderWithProviders(
            <AuthBoundary authApi={api} loginPath="/login" onNavigateToLogin={onNavigateToLogin}>
                <div>Private dashboard</div>
            </AuthBoundary>,
        )

        const loginTitle = await screen.findByText("Войдите, чтобы открыть dashboard")
        expect(loginTitle.textContent).toBe("Войдите, чтобы открыть dashboard")
        expect(onNavigateToLogin).not.toHaveBeenCalled()
    })

    it("не делает redirect, если пользователь уже находится на login route", async (): Promise<void> => {
        window.history.replaceState({}, "", "/login")

        const onNavigateToLogin = vi.fn()
        const api = createAuthApiMock({
            getSession: (): Promise<IAuthSessionEnvelope> => {
                return Promise.resolve({
                    session: null,
                })
            },
        })

        renderWithProviders(
            <AuthBoundary authApi={api} loginPath="/login" onNavigateToLogin={onNavigateToLogin}>
                <div>Private dashboard</div>
            </AuthBoundary>,
        )

        const loginTitle = await screen.findByText("Войдите, чтобы открыть dashboard")
        expect(loginTitle.textContent).toBe("Войдите, чтобы открыть dashboard")
        expect(onNavigateToLogin).not.toHaveBeenCalled()
    })

    it("использует window.location.assign, если onRedirect не передан", async (): Promise<void> => {
        const startOAuth = vi.fn(() => {
            return Promise.resolve({
                provider: "github" as const,
                authorizationUrl: "https://auth.example/default-redirect",
                state: "state-3",
            })
        })
        const api = createAuthApiMock({
            startOAuth,
        })
        const user = userEvent.setup()
        const assignSpy = vi
            .spyOn(window.location, "assign")
            .mockImplementation((_url: string | URL): void => undefined)

        try {
            renderWithProviders(
                <AuthBoundary authApi={api}>
                    <div>Private dashboard</div>
                </AuthBoundary>,
            )

            const githubButton = await screen.findByRole("button", { name: "GitHub" })
            await user.click(githubButton)

            expect(assignSpy).toHaveBeenCalledWith("https://auth.example/default-redirect")
        } finally {
            assignSpy.mockRestore()
        }
    })

    it("использует сохранённый session snapshot как initial state", async (): Promise<void> => {
        sessionStorage.setItem(
            "codenautic.ui.auth.session",
            JSON.stringify({
                provider: "github",
                expiresAt: "2030-01-01T00:00:00.000Z",
                user: {
                    id: "u-cached",
                    email: "cached@example.com",
                    displayName: "Cached User",
                },
            }),
        )

        const unresolvedSessionPromise = new Promise<IAuthSessionEnvelope>(() => undefined)
        const getSession = vi.fn((): Promise<IAuthSessionEnvelope> => unresolvedSessionPromise)
        const api = createAuthApiMock({
            getSession,
        })

        renderWithProviders(
            <AuthBoundary authApi={api}>
                <div>Private dashboard</div>
            </AuthBoundary>,
        )

        const cachedUser = await screen.findByText("Cached User")
        expect(cachedUser.textContent).toBe("Cached User")
    })

    it("выполняет refresh для сессии с близким истечением", async (): Promise<void> => {
        const nearExpiry = new Date(Date.now() + 30_000).toISOString()
        const refreshedExpiry = new Date(Date.now() + 3_600_000).toISOString()

        const getSession = vi.fn((): Promise<IAuthSessionEnvelope> => {
            return Promise.resolve({
                session: createSession(nearExpiry),
            })
        })
        const refreshSession = vi.fn((): Promise<IAuthSessionEnvelope> => {
            return Promise.resolve({
                session: createSession(refreshedExpiry, "Refreshed User"),
            })
        })

        const api = createAuthApiMock({
            getSession,
            refreshSession,
        })

        renderWithProviders(
            <AuthBoundary authApi={api}>
                <div>Private dashboard</div>
            </AuthBoundary>,
        )

        const dashboardLabel = await screen.findByText("Private dashboard")
        expect(dashboardLabel.textContent).toBe("Private dashboard")

        await waitFor((): void => {
            expect(refreshSession).toHaveBeenCalledTimes(1)
        })

        const refreshedUser = await screen.findByText("Refreshed User")
        expect(refreshedUser.textContent).toBe("Refreshed User")
    })

    it("не выполняет повторный refresh для того же expiresAt", async (): Promise<void> => {
        const nearExpiry = new Date(Date.now() + 20_000).toISOString()

        const getSession = vi.fn((): Promise<IAuthSessionEnvelope> => {
            return Promise.resolve({
                session: createSession(nearExpiry),
            })
        })
        const refreshSession = vi.fn((): Promise<IAuthSessionEnvelope> => {
            return Promise.resolve({
                session: createSession(nearExpiry),
            })
        })

        const api = createAuthApiMock({
            getSession,
            refreshSession,
        })

        renderWithProviders(
            <AuthBoundary authApi={api}>
                <div>Private dashboard</div>
            </AuthBoundary>,
        )

        await screen.findByText("Private dashboard")

        await waitFor((): void => {
            expect(refreshSession).toHaveBeenCalledTimes(1)
        })
    })

    it("сбрасывает сессию при ошибке refresh flow", async (): Promise<void> => {
        const nearExpiry = new Date(Date.now() + 20_000).toISOString()

        const getSession = vi.fn((): Promise<IAuthSessionEnvelope> => {
            return Promise.resolve({
                session: createSession(nearExpiry),
            })
        })
        const refreshSession = vi.fn((): Promise<IAuthSessionEnvelope> => {
            return Promise.reject(new Error("Refresh failed"))
        })

        const api = createAuthApiMock({
            getSession,
            refreshSession,
        })

        renderWithProviders(
            <AuthBoundary authApi={api}>
                <div>Private dashboard</div>
            </AuthBoundary>,
        )

        await screen.findByText("Private dashboard")
        const loginTitle = await screen.findByText("Войдите, чтобы открыть dashboard")
        expect(loginTitle.textContent).toBe("Войдите, чтобы открыть dashboard")
    })

    it("выполняет logout и возвращает пользователя на login panel", async (): Promise<void> => {
        const getSession = vi.fn((): Promise<IAuthSessionEnvelope> => {
            return Promise.resolve({
                session: createSession("2030-01-01T00:00:00.000Z"),
            })
        })
        const logout = vi.fn(() => {
            return Promise.resolve({
                loggedOut: true,
            })
        })
        const api = createAuthApiMock({
            getSession,
            logout,
        })
        const user = userEvent.setup()

        renderWithProviders(
            <AuthBoundary authApi={api}>
                <div>Private dashboard</div>
            </AuthBoundary>,
        )

        const logoutButton = await screen.findByRole("button", { name: "Выйти" })
        await user.click(logoutButton)

        expect(logout).toHaveBeenCalledTimes(1)

        const loginTitle = await screen.findByText("Войдите, чтобы открыть dashboard")
        expect(loginTitle.textContent).toBe("Войдите, чтобы открыть dashboard")
    })

    it("показывает ошибку, если logout endpoint недоступен", async (): Promise<void> => {
        const getSession = vi.fn((): Promise<IAuthSessionEnvelope> => {
            return Promise.resolve({
                session: createSession("2030-01-01T00:00:00.000Z"),
            })
        })
        const logout = vi.fn((): Promise<never> => {
            return Promise.reject(new Error("Logout failed"))
        })
        const api = createAuthApiMock({
            getSession,
            logout,
        })
        const user = userEvent.setup()

        renderWithProviders(
            <AuthBoundary authApi={api}>
                <div>Private dashboard</div>
            </AuthBoundary>,
        )

        const logoutButton = await screen.findByRole("button", { name: "Выйти" })
        await user.click(logoutButton)

        const errorAlert = await screen.findByRole("alert")
        expect(errorAlert.textContent).toBe("Не удалось завершить сессию. Повторите попытку.")
        expect(logout).toHaveBeenCalledTimes(1)
    })

    it("показывает ошибку входа, если OAuth endpoint недоступен", async (): Promise<void> => {
        const startOAuth = vi.fn((): Promise<never> => {
            return Promise.reject(new Error("OAuth unavailable"))
        })
        const api = createAuthApiMock({
            startOAuth,
        })
        const user = userEvent.setup()

        renderWithProviders(
            <AuthBoundary authApi={api}>
                <div>Private dashboard</div>
            </AuthBoundary>,
        )

        const gitlabButton = await screen.findByRole("button", { name: "GitLab" })
        await user.click(gitlabButton)

        const errorAlert = await screen.findByRole("alert")
        expect(errorAlert.textContent).toBe(
            "Не удалось начать OAuth авторизацию. Повторите попытку.",
        )
    })

    it("явно отображает состояние 403 при отсутствии доступа", async (): Promise<void> => {
        const api = createAuthApiMock({
            getSession: (): Promise<IAuthSessionEnvelope> => {
                return Promise.reject(
                    new ApiHttpError(
                        403,
                        "/api/v1/auth/session",
                        "HTTP 403 for /api/v1/auth/session",
                    ),
                )
            },
        })

        renderWithProviders(
            <AuthBoundary authApi={api}>
                <div>Private dashboard</div>
            </AuthBoundary>,
        )

        const status = await screen.findByRole("status")
        expect(status.textContent).toBe(
            "Доступ запрещён (403). У аккаунта нет прав на этот ресурс.",
        )
    })
})
