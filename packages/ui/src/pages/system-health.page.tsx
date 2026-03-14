import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { TYPOGRAPHY } from "@/lib/constants/typography"
import { PAGE_LAYOUT } from "@/lib/constants/spacing"
import type { SupportedLocale } from "@/lib/i18n/i18n"
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
    const { healthQuery } = useHealthQuery()
    const { featureFlagsQuery } = useFeatureFlagsQuery()
    const isPremiumDashboardEnabled = isFeatureFlagEnabled(
        featureFlagsQuery,
        FEATURE_FLAG_KEYS.premiumDashboard,
    )

    const isPending = healthQuery.isPending
    const hasError = healthQuery.error !== null && healthQuery.error !== undefined

    return (
        <section
            aria-busy={isPending === true ? "true" : undefined}
            className={PAGE_LAYOUT.centered}
        >
            <h1 className={TYPOGRAPHY.splash}>{t("common:appTitle")}</h1>
            <SystemHealthContent
                hasError={hasError}
                healthQuery={healthQuery}
                isPending={isPending}
                isPremiumDashboardEnabled={isPremiumDashboardEnabled}
                locale={locale}
                t={t as unknown as (key: string) => string}
            />
        </section>
    )
}

/**
 * Условный контент SystemHealthPage: загрузка, ошибка или результат.
 *
 * @param props Состояние запроса и локализация.
 * @returns Содержимое страницы под заголовком.
 */
function SystemHealthContent(props: {
    readonly isPending: boolean
    readonly hasError: boolean
    readonly healthQuery: ReturnType<typeof useHealthQuery>["healthQuery"]
    readonly isPremiumDashboardEnabled: boolean
    readonly locale: SupportedLocale
    readonly t: (key: string) => string
}): ReactElement {
    if (props.isPending === true) {
        return (
            <p className="mt-4 text-base text-muted-foreground">
                {props.t("common:loading")}
            </p>
        )
    }

    if (props.hasError === true) {
        return (
            <>
                <p
                    aria-live="assertive"
                    className="mt-4 text-base text-danger"
                    role="alert"
                >
                    {props.t("system:unavailable")}
                </p>
                <Button
                    className="mt-6 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition hover:bg-foreground/80"
                    onPress={(): void => {
                        void props.healthQuery.refetch()
                    }}
                >
                    {props.t("common:retry")}
                </Button>
            </>
        )
    }

    const healthData = props.healthQuery.data
    if (healthData === undefined) {
        return <p className="mt-4 text-base text-muted-foreground">—</p>
    }

    const localizedTimestamp = formatLocalizedDateTime(
        healthData.timestamp,
        props.locale,
    )

    return (
        <>
            <p className={`mt-3 ${TYPOGRAPHY.overline}`}>
                {props.t("system:healthStatus")}
            </p>
            <p className="mt-2 text-4xl font-bold text-success">
                {healthData.status}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
                {props.t("system:service")}:{" "}
                <span className="font-medium text-foreground">
                    {healthData.service}
                </span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
                {props.t("system:timestamp")}:{" "}
                <span className="font-medium text-foreground">
                    {localizedTimestamp}
                </span>
            </p>
            <section
                aria-label={props.t("system:premiumSectionTitle")}
                className="mt-8 w-full rounded-2xl border border-border bg-surface/80 p-5 text-left shadow-sm backdrop-blur"
            >
                <p className={TYPOGRAPHY.overline}>
                    {props.t("system:premiumSectionTitle")}
                </p>
                <p
                    className={`mt-2 text-base font-semibold ${
                        props.isPremiumDashboardEnabled === true
                            ? "text-success"
                            : "text-warning"
                    }`}
                >
                    {props.isPremiumDashboardEnabled === true
                        ? props.t("system:premiumEnabled")
                        : props.t("system:premiumDisabled")}
                </p>
                {props.isPremiumDashboardEnabled === true ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {props.t("system:premiumEnabledDescription")}
                    </p>
                ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {props.t("system:premiumDisabledDescription")}
                    </p>
                )}
            </section>
        </>
    )
}
