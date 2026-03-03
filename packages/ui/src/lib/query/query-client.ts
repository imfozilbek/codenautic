import { QueryClient, type DefaultOptions } from "@tanstack/react-query"

/**
 * Базовые опции React Query для UI-приложения.
 */
export const UI_QUERY_DEFAULTS: DefaultOptions = {
    queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
    },
    mutations: {
        retry: 0,
    },
}

/**
 * Создаёт QueryClient с едиными настройками кэширования и retry-политики.
 *
 * @returns Готовый экземпляр QueryClient для App provider-слоя.
 */
export function createQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: UI_QUERY_DEFAULTS,
    })
}
