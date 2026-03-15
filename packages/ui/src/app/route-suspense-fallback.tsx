import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Fallback для route-level Suspense границ во время lazy загрузки экрана.
 *
 * @returns Временное состояние загрузки экрана.
 */
export function RouteSuspenseFallback(): ReactElement {
    const { t } = useTranslation(["common"])

    return (
        <section
            aria-busy="true"
            className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-8"
        >
            <h1 className={TYPOGRAPHY.splash}>{t("common:appTitle")}</h1>
            <p className="mt-4 text-base text-muted">{t("common:loading")}</p>
        </section>
    )
}
