import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient } from "@tanstack/react-query"
import { delay, http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { SystemHealthPage } from "@/pages/system-health.page"
import { server } from "../mocks/server"
import { renderWithProviders } from "../utils/render"

describe("SystemHealthPage", (): void => {
    it("показывает загрузку и затем отрисовывает состояние API", async (): Promise<void> => {
        server.use(
            http.get("http://localhost:3000/api/v1/health", async () => {
                await delay(80)
                return HttpResponse.json({
                    status: "ok",
                    service: "api",
                    timestamp: "2026-03-02T10:00:00.000Z",
                })
            }),
        )

        renderWithProviders(<SystemHealthPage />)

        const pendingMessage = screen.getByText("Проверяем доступность API...")
        expect(pendingMessage.textContent).toBe("Проверяем доступность API...")

        const statusMessage = await screen.findByText("ok")
        expect(statusMessage.textContent).toBe("ok")

        const premiumEnabled = await screen.findByText("Premium функции включены")
        expect(premiumEnabled.textContent).toBe("Premium функции включены")
    })

    it("показывает ошибку и позволяет повторить запрос", async (): Promise<void> => {
        let requestCount = 0

        server.use(
            http.get("http://localhost:3000/api/v1/health", () => {
                requestCount += 1

                if (requestCount <= 3) {
                    return HttpResponse.json(
                        {
                            message: "temporarily unavailable",
                        },
                        {
                            status: 503,
                        },
                    )
                }

                return HttpResponse.json({
                    status: "ok",
                    service: "api",
                    timestamp: "2026-03-02T10:00:00.000Z",
                })
            }),
        )

        const user = userEvent.setup()
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        })
        renderWithProviders(<SystemHealthPage />, { queryClient })

        const alert = await screen.findByRole("alert")
        expect(alert.textContent).toBe("Не удалось получить статус API")

        const retryButton = screen.getByRole("button", { name: "Повторить проверку" })
        await user.click(retryButton)

        const statusMessage = await screen.findByText("ok")
        expect(statusMessage.textContent).toBe("ok")
        expect(requestCount).toBe(4)
    })

    it("держит premium функции выключенными при ошибке flags backend", async (): Promise<void> => {
        server.use(
            http.get("http://localhost:3000/api/v1/health", () => {
                return HttpResponse.json({
                    status: "ok",
                    service: "api",
                    timestamp: "2026-03-02T10:00:00.000Z",
                })
            }),
            http.get("http://localhost:3000/api/v1/feature-flags", () => {
                return HttpResponse.json(
                    {
                        message: "flags backend unavailable",
                    },
                    {
                        status: 503,
                    },
                )
            }),
        )

        renderWithProviders(<SystemHealthPage />)

        const premiumDisabled = await screen.findByText("Premium функции выключены")
        expect(premiumDisabled.textContent).toBe("Premium функции выключены")

        const premiumHint = screen.getByText(
            "Сервис feature flags недоступен или premium-доступ не выдан.",
        )
        expect(premiumHint.textContent).toBe(
            "Сервис feature flags недоступен или premium-доступ не выдан.",
        )
    })
})
