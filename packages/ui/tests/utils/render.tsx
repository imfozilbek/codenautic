import type {ReactElement} from "react"
import {render, type RenderResult} from "@testing-library/react"
import {QueryClientProvider, type QueryClient} from "@tanstack/react-query"

import {createQueryClient} from "@/lib/query/query-client"
import {ThemeProvider, type ThemeMode} from "@/lib/theme/theme-provider"

/**
 * Расширенный результат рендера с доступом к QueryClient.
 */
export interface IRenderWithProvidersResult extends RenderResult {
    readonly queryClient: QueryClient
}

/**
 * Конфигурация helper-функции `renderWithProviders`.
 */
export interface IRenderWithProvidersOptions {
    readonly queryClient?: QueryClient
    readonly themeMode?: ThemeMode
    readonly defaultThemeMode?: ThemeMode
}

/**
 * Рендерит React-элемент с базовыми тестовыми провайдерами UI.
 *
 * @param element Тестируемый React-элемент.
 * @param options Дополнительная конфигурация тестового рендера.
 * @returns Результат рендера и активный QueryClient.
 */
export function renderWithProviders(
    element: ReactElement,
    options: IRenderWithProvidersOptions = {},
): IRenderWithProvidersResult {
    const queryClient = options.queryClient ?? createQueryClient()
    if (typeof window !== "undefined" && options.themeMode !== undefined) {
        window.localStorage.setItem("codenautic:ui:theme-mode", options.themeMode)
    }

    const renderResult = render(
        <ThemeProvider defaultMode={options.defaultThemeMode}>
            <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>
        </ThemeProvider>,
    )

    return {
        ...renderResult,
        queryClient,
    }
}
