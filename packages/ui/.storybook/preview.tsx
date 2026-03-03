import type {Preview} from "@storybook/react"
import {initializeI18n} from "@/lib/i18n/i18n"
import {ThemeProvider} from "@/lib/theme/theme-provider"
import {QueryClientProvider} from "@tanstack/react-query"
import type {ReactElement} from "react"

import {createQueryClient} from "../src/lib/query/query-client"
import "@/app/globals.css"

void initializeI18n()

const preview: Preview = {
    decorators: [
        (storyFn: () => ReactElement): ReactElement => {
            const queryClient = createQueryClient()

            return (
                <ThemeProvider>
                    <QueryClientProvider client={queryClient}>{storyFn()}</QueryClientProvider>
                </ThemeProvider>
            )
        },
    ],
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
