import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { App } from "@/app/app"
import "@/app/globals.css"
import { initializeI18n } from "@/lib/i18n/i18n"
import { syncHtmlLangAttribute } from "@/lib/i18n/use-locale"
import { initializeTheme } from "@/lib/theme/theme-provider"
import { initializeSentryBrowser } from "@/lib/monitoring/sentry"
import { initializeWebVitalsMonitoring } from "@/lib/monitoring/web-vitals"

initializeTheme()
const isSentryInitialized = initializeSentryBrowser(import.meta.env)
initializeWebVitalsMonitoring({
    enabled: isSentryInitialized,
})
void initializeI18n()
    .then((): void => {
        syncHtmlLangAttribute()
    })
    .catch((): void => {
        /* i18n init failure — app falls back to default locale */
    })

async function bootstrapApp(): Promise<void> {
    if (import.meta.env.DEV) {
        const { worker } = await import("@/mocks/browser")
        await worker.start({ onUnhandledRequest: "bypass" })
    }

    const rootElement = document.getElementById("root")
    if (rootElement === null) {
        throw new Error("Root element #root не найден")
    }

    createRoot(rootElement).render(
        <StrictMode>
            <App />
        </StrictMode>,
    )
}

void bootstrapApp()
