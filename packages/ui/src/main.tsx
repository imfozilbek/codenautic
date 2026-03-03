import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { App } from "@/app/app"
import "@/app/globals.css"
import { initializeI18n } from "@/lib/i18n/i18n"
import { initializeTheme } from "@/lib/theme/theme-provider"
import { initializeSentryBrowser } from "@/lib/monitoring/sentry"
import { initializeWebVitalsMonitoring } from "@/lib/monitoring/web-vitals"

initializeTheme()
const isSentryInitialized = initializeSentryBrowser(import.meta.env)
void initializeWebVitalsMonitoring({
    enabled: isSentryInitialized,
})
void initializeI18n()

const rootElement = document.getElementById("root")
if (rootElement === null) {
    throw new Error("Root element #root не найден")
}

createRoot(rootElement).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
