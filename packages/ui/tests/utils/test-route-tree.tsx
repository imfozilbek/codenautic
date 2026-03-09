import { createRootRoute, createRoute } from "@tanstack/react-router"

/**
 * Минимальное route tree для тестов.
 *
 * Заменяет `routeTree.gen.ts` (915 строк, 40+ sync imports) чтобы
 * `renderWithProviders()` не тянул все страницы и их зависимости
 * (three.js, recharts, shiki и т.д.) при каждом вызове.
 */
const rootRoute = createRootRoute()

const indexRoute = createRoute({
    getParentRoute: (): typeof rootRoute => rootRoute,
    path: "/",
})

export const testRouteTree = rootRoute.addChildren([indexRoute])
