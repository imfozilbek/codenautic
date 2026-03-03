import type { Preview } from "@storybook/react"
import type { ReactElement, ReactNode } from "react"
import { useEffect } from "react"
import { initializeI18n } from "@/lib/i18n/i18n"
import { ThemeProvider } from "@/lib/theme/theme-provider"
import { QueryClientProvider } from "@tanstack/react-query"

import { createQueryClient } from "../src/lib/query/query-client"
import "@/app/globals.css"

void initializeI18n()

interface IPreviewContext {
    /** Глобальные значения из storybook toolbar. */
    readonly globals?: {
        /** Выбранный вариант темы. */
        readonly theme?: string
    }
}

function ThemeClassDecorator({
    children,
    theme,
}: {
    /** Контент, который нужно обернуть в тему. */
    readonly children: ReactNode
    /** Выбранная тема. */
    readonly theme: "dark" | "light"
}): ReactElement {
    useEffect((): void => {
        if (theme === "dark") {
            document.documentElement.classList.add("dark")
            return
        }

        document.documentElement.classList.remove("dark")
    }, [theme])

    return <>{children}</>
}

const withThemeClass = (storyFn: () => ReactElement, context: IPreviewContext): ReactElement => {
    const nextTheme = context.globals?.theme
    const resolvedTheme = nextTheme === "dark" ? "dark" : "light"

    return <ThemeClassDecorator theme={resolvedTheme}>{storyFn()}</ThemeClassDecorator>
}

const preview: Preview = {
    decorators: [
        withThemeClass,
        (storyFn: () => ReactElement): ReactElement => {
            const queryClient = createQueryClient()

            return (
                <ThemeProvider>
                    <QueryClientProvider client={queryClient}>{storyFn()}</QueryClientProvider>
                </ThemeProvider>
            )
        },
    ],
    globalTypes: {
        theme: {
            description: "Тема UI",
            defaultValue: "light",
            toolbar: {
                dynamicTitle: true,
                icon: "paintbrush",
                items: [
                    { value: "light", title: "Light" },
                    { value: "dark", title: "Dark" },
                ],
                showName: true,
            },
        },
    },
    parameters: {
        actions: {
            argTypesRegex: "^on[A-Z].*",
        },
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
    },
}

export default preview
