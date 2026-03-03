import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { GlobalErrorFallback, NotFoundFallback, RouteErrorFallback } from "@/app/error-fallback"
import { renderWithProviders } from "../utils/render"

class HttpError extends Error {
    public readonly statusCode: number

    public constructor(statusCode: number, message: string) {
        super(message)
        this.name = "HttpError"
        this.statusCode = statusCode
    }
}

describe("error fallback ui", (): void => {
    it("перенаправляет на страницу входа при ошибке 401", async (): Promise<void> => {
        const assignSpy = vi.spyOn(window.location, "assign").mockImplementation((): void => {})

        renderWithProviders(
            <GlobalErrorFallback
                error={new HttpError(401, "Unauthorized")}
                info={undefined}
                reset={vi.fn()}
            />,
        )

        await waitFor((): void => {
            expect(assignSpy).toHaveBeenCalledWith("/sign-in")
        })

        const pendingRedirect = screen.getByText(
            "Сессия истекла, перенаправляем на страницу входа...",
        )
        expect(pendingRedirect.textContent).toBe(
            "Сессия истекла, перенаправляем на страницу входа...",
        )

        assignSpy.mockRestore()
    })

    it("показывает 403 fallback с возвратом на главную", async (): Promise<void> => {
        const user = userEvent.setup()
        const assignSpy = vi.spyOn(window.location, "assign").mockImplementation((): void => {})

        renderWithProviders(
            <RouteErrorFallback
                error={new HttpError(403, "Forbidden")}
                info={undefined}
                reset={vi.fn()}
            />,
        )

        const message = screen.getByText("Доступ запрещён для текущего пользователя.")
        expect(message.textContent).toBe("Доступ запрещён для текущего пользователя.")

        const backButton = screen.getByRole("button", { name: "Вернуться на главную" })
        await user.click(backButton)

        expect(assignSpy).toHaveBeenCalledWith("/")

        assignSpy.mockRestore()
    })

    it("показывает retry для server error и вызывает reset", async (): Promise<void> => {
        const user = userEvent.setup()
        const resetMock = vi.fn()

        renderWithProviders(
            <RouteErrorFallback
                error={new HttpError(500, "Server exploded")}
                info={undefined}
                reset={resetMock}
            />,
        )

        const retryButton = screen.getByRole("button", { name: "Повторить" })
        await user.click(retryButton)

        expect(resetMock).toHaveBeenCalledTimes(1)
    })

    it("показывает not-found fallback", (): void => {
        renderWithProviders(<NotFoundFallback />)

        const heading = screen.getByRole("heading", { name: "Страница не найдена" })
        expect(heading.textContent).toBe("Страница не найдена")
    })

    it("использует fallback message для пустой Error.message", (): void => {
        renderWithProviders(
            <RouteErrorFallback error={new Error("   ")} info={undefined} reset={vi.fn()} />,
        )

        const fallbackMessage = screen.getByText("Не удалось обработать ошибку маршрута")
        expect(fallbackMessage.textContent).toBe("Не удалось обработать ошибку маршрута")
    })

    it("показывает message без retry для клиентской ошибки 429", (): void => {
        renderWithProviders(
            <RouteErrorFallback
                error={new HttpError(429, "Too many requests")}
                info={undefined}
                reset={vi.fn()}
            />,
        )

        const message = screen.getByText("Too many requests")
        expect(message.textContent).toBe("Too many requests")
        expect(screen.queryByRole("button", { name: "Повторить" })).toBeNull()
    })

    it("обрабатывает не-объектный error payload", (): void => {
        renderWithProviders(
            <GlobalErrorFallback error={42 as unknown as Error} info={undefined} reset={vi.fn()} />,
        )

        const fallbackMessage = screen.getByText("Не удалось обработать ошибку маршрута")
        expect(fallbackMessage.textContent).toBe("Не удалось обработать ошибку маршрута")
    })

    it("извлекает message из plain object со statusCode", (): void => {
        renderWithProviders(
            <RouteErrorFallback
                error={{ statusCode: 500, message: "Object-based error" } as unknown as Error}
                info={undefined}
                reset={vi.fn()}
            />,
        )

        const fallbackMessage = screen.getByText("Object-based error")
        expect(fallbackMessage.textContent).toBe("Object-based error")
    })
})
