import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { FEATURE_FLAG_KEYS } from "@/lib/feature-flags/feature-flags"
import { isFeatureFlagEnabled, useFeatureFlagsQuery, useHealthQuery } from "@/lib/hooks/queries"
import { formatLocalizedDateTime, getCurrentLocale } from "@/lib/i18n/i18n"
import { Button } from "@/components/ui"

/**
 * Первый системный экран foundation-этапа: статус runtime/api.
 *
 * @returns Визуальное состояние health-check запроса.
 */
export function SystemHealthPage(): ReactElement {
    const { t, i18n } = useTranslation(["common", "system"])
    const locale = getCurrentLocale(i18n)
    const healthQuery = useHealthQuery()
    const featureFlagsQuery = useFeatureFlagsQuery()
    const isPremiumDashboardEnabled = isFeatureFlagEnabled(
        featureFlagsQuery,
        FEATURE_FLAG_KEYS.premiumDashboard,
    )

    const isPending = healthQuery.isPending
    if (isPending === true) {
        return (
            <section
                aria-busy="true"
                className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-8"
            >
                <h1 className="text-3xl font-semibold tracking-tight">{t("common:appTitle")}</h1>
                <p className="mt-4 text-base text-muted-foreground">{t("common:loading")}</p>
            </section>
        )
    }

    if (healthQuery.error !== null && healthQuery.error !== undefined) {
        return (
            <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-8">
                <h1 className="text-3xl font-semibold tracking-tight">{t("common:appTitle")}</h1>
                <p aria-live="assertive" className="mt-4 text-base text-danger" role="alert">
                    {t("system:unavailable")}
                </p>
                <Button
                    className="mt-6 rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                    onPress={(): void => {
                        void healthQuery.refetch()
                    }}
                >
                    {t("common:retry")}
                </Button>
            </section>
        )
    }

    const healthData = healthQuery.data

    const localizedTimestamp = formatLocalizedDateTime(healthData.timestamp, locale)

    return (
        <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-8">
            <h1 className="text-3xl font-semibold tracking-tight">{t("common:appTitle")}</h1>
            <p className="mt-3 text-sm uppercase tracking-[0.2em] text-muted-foreground">
                {t("system:healthStatus")}
            </p>
            <p className="mt-2 text-4xl font-bold text-success">{healthData.status}</p>
            <p className="mt-4 text-sm text-muted-foreground">
                {t("system:service")}:{" "}
                <span className="font-medium text-foreground">{healthData.service}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
                {t("system:timestamp")}:{" "}
                <span className="font-medium text-foreground">{localizedTimestamp}</span>
            </p>
            <section
                aria-label={t("system:premiumSectionTitle")}
                className="mt-8 w-full rounded-2xl border border-border bg-white/80 p-5 text-left shadow-sm backdrop-blur"
            >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {t("system:premiumSectionTitle")}
                </p>
                <p
                    className={`mt-2 text-base font-semibold ${
                        isPremiumDashboardEnabled === true ? "text-success" : "text-warning"
                    }`}
                >
                    {isPremiumDashboardEnabled === true
                        ? t("system:premiumEnabled")
                        : t("system:premiumDisabled")}
                </p>
                {isPremiumDashboardEnabled === true ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t("system:premiumEnabledDescription")}
                    </p>
                ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t("system:premiumDisabledDescription")}
                    </p>
                )}
            </section>
        </section>
    )
}
