import { type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { useDynamicTranslation } from "@/lib/i18n"
import { Alert, Button, Card, CardContent, CardHeader, Chip, Spinner } from "@heroui/react"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { useAdoptionAnalytics } from "@/lib/hooks/queries/use-adoption-analytics"
import type {
    IFunnelStage,
    IWorkflowHealth,
    TAnalyticsRange,
    TFunnelStageId,
} from "@/lib/api/endpoints/adoption-analytics.endpoint"

const FUNNEL_STAGE_KEYS: Record<TFunnelStageId, string> = {
    connect_provider: "connectProvider",
    add_repo: "addRepository",
    first_scan: "firstScan",
    first_insights: "firstInsights",
    first_ccr_reviewed: "firstCcrReviewed",
}

const WORKFLOW_STAGE_KEYS: Record<string, string> = {
    "Provider setup": "providerSetup",
    "First scan": "firstScan",
    "First CCR reviewed": "firstCcrReviewed",
}

const HEALTH_KEYS: Record<IWorkflowHealth["health"], string> = {
    healthy: "healthy",
    needs_attention: "needsAttention",
    at_risk: "atRisk",
}

/**
 * Маппит уровень здоровья в цвет Chip.
 *
 * @param health - Уровень здоровья.
 * @returns Цвет для Chip компонента.
 */
function mapHealthColor(health: IWorkflowHealth["health"]): "danger" | "success" | "warning" {
    if (health === "healthy") {
        return "success"
    }
    if (health === "needs_attention") {
        return "warning"
    }
    return "danger"
}

/**
 * Страница usage/adoption аналитики для org admin.
 *
 * @returns Funnel внедрения, drop-offs, активность и workflow health.
 */
export function SettingsAdoptionAnalyticsPage(): ReactElement {
    const { t } = useTranslation(["settings"])
    const { td } = useDynamicTranslation(["settings"])
    const [range, setRange] = useState<TAnalyticsRange>("30d")

    const { analyticsQuery } = useAdoptionAnalytics({ range })
    const data = analyticsQuery.data

    const funnelStages = useMemo(
        (): ReadonlyArray<IFunnelStage> => data?.funnelStages ?? [],
        [data?.funnelStages],
    )
    const workflowHealth = useMemo(
        (): ReadonlyArray<IWorkflowHealth> => data?.workflowHealth ?? [],
        [data?.workflowHealth],
    )
    const activeUsers = data?.activeUsers ?? 0
    const timeToFirstValue = data?.timeToFirstValue ?? "—"

    return (
        <div className="space-y-6 mx-auto max-w-[1400px]"><div className="space-y-1.5"><h1 className={TYPOGRAPHY.pageTitle}>{t("settings:adoptionAnalytics.pageTitle")}</h1><p className={TYPOGRAPHY.bodyMuted}>{t("settings:adoptionAnalytics.pageSubtitle")}</p></div><div className="space-y-6">
            <div className="flex flex-wrap gap-2">
                {(["7d", "30d", "90d"] as const).map(
                    (option): ReactElement => (
                        <Button
                            key={option}
                            size="sm"
                            variant={range === option ? "primary" : "secondary"}
                            onPress={(): void => {
                                setRange(option)
                            }}
                        >
                            {option}
                        </Button>
                    ),
                )}
            </div>

            {analyticsQuery.isLoading ? (
                <div className="flex justify-center py-8">
                    <Spinner size="lg" />
                </div>
            ) : null}

            {analyticsQuery.isError ? (
                <Alert status="danger">
                    <Alert.Description>
                        {analyticsQuery.error.message}
                    </Alert.Description>
                </Alert>
            ) : null}

            {data !== undefined ? (
                <>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <p className={TYPOGRAPHY.sectionTitle}>
                                    {t("settings:adoptionAnalytics.valueRealizationKpis")}
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p className="text-sm text-foreground">
                                    {t("settings:adoptionAnalytics.activeUsers")}{" "}
                                    <strong>{activeUsers}</strong>
                                </p>
                                <p className="text-sm text-foreground">
                                    {t("settings:adoptionAnalytics.medianTimeToFirstValue")}{" "}
                                    <strong>{timeToFirstValue}</strong>
                                </p>
                                <p className="text-xs text-muted">
                                    {t("settings:adoptionAnalytics.firstValueDefinition")}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <p className={TYPOGRAPHY.sectionTitle}>
                                    {t("settings:adoptionAnalytics.workflowHealth")}
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <ul
                                    aria-label={t("settings:adoptionAnalytics.workflowHealthListAriaLabel")}
                                    className="space-y-2"
                                >
                                    {workflowHealth.map(
                                        (item): ReactElement => (
                                            <li
                                                className="rounded-lg border border-border bg-surface p-3"
                                                key={item.stage}
                                            >
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-sm font-semibold text-foreground">
                                                        {td(
                                                            `settings:adoptionAnalytics.workflowStage.${WORKFLOW_STAGE_KEYS[item.stage] ?? item.stage}`,
                                                        )}
                                                    </p>
                                                    <Chip
                                                        color={mapHealthColor(item.health)}
                                                        size="sm"
                                                        variant="soft"
                                                    >
                                                        {td(
                                                            `settings:adoptionAnalytics.health.${HEALTH_KEYS[item.health]}`,
                                                        )}
                                                    </Chip>
                                                </div>
                                                <p className="text-xs text-muted">{item.summary}</p>
                                            </li>
                                        ),
                                    )}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <p className={TYPOGRAPHY.sectionTitle}>
                                {t("settings:adoptionAnalytics.adoptionFunnel")}
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <ul
                                aria-label={t("settings:adoptionAnalytics.adoptionFunnelListAriaLabel")}
                                className="space-y-2"
                            >
                                {funnelStages.map((stage, index): ReactElement => {
                                    const previous =
                                        index === 0
                                            ? stage.count
                                            : (funnelStages[index - 1]?.count ?? stage.count)
                                    const dropOff = previous - stage.count
                                    const conversion =
                                        previous === 0 ? 0 : Math.round((stage.count / previous) * 100)

                                    return (
                                        <li
                                            className="rounded-lg border border-border bg-surface p-3"
                                            key={stage.id}
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-foreground">
                                                    {td(
                                                        `settings:adoptionAnalytics.funnelStage.${FUNNEL_STAGE_KEYS[stage.id]}`,
                                                    )}
                                                </p>
                                                <Chip size="sm" variant="soft">
                                                    {stage.count}
                                                </Chip>
                                            </div>
                                            <p className="text-xs text-muted">
                                                {td("settings:adoptionAnalytics.conversionDropOff", {
                                                    conversion: String(conversion),
                                                    dropOff: String(dropOff),
                                                })}
                                            </p>
                                        </li>
                                    )
                                })}
                            </ul>
                        </CardContent>
                    </Card>
                </>
            ) : null}

            <Alert status="warning">
                <Alert.Title>{t("settings:adoptionAnalytics.privacyBoundaryTitle")}</Alert.Title>
                <Alert.Description>
                    {t("settings:adoptionAnalytics.privacyBoundaryDescription")}
                </Alert.Description>
            </Alert>
        </div></div>
    )
}
