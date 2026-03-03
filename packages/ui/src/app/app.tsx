import type { ReactElement } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { Toast } from "@heroui/react"

import { AnalyticsProvider } from "@/lib/analytics/analytics-context"
import { createQueryClient } from "@/lib/query/query-client"
import { ThemeProvider } from "@/lib/theme/theme-provider"
import { router } from "./router"

const queryClient = createQueryClient()

/**
 * Корневой UI-компонент с глобальными providers.
 *
 * @returns Приложение с Router и React Query контекстом.
 */
export function App(): ReactElement {
    return (
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <AnalyticsProvider>
                    <Toast.Provider />
                    <RouterProvider router={router} />
                </AnalyticsProvider>
            </QueryClientProvider>
        </ThemeProvider>
    )
}
