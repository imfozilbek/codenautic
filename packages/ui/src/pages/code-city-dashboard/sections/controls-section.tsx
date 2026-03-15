import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { CausalOverlaySelector } from "@/components/codecity/overlays/causal-overlay-selector"
import { Card, CardContent, CardHeader } from "@heroui/react"
import { NATIVE_FORM } from "@/lib/constants/spacing"

import { CODE_CITY_DASHBOARD_METRICS } from "../code-city-dashboard-mock-data"
import type { ICodeCityDashboardState } from "../use-code-city-dashboard-state"

/**
 * Параметры секции контролов.
 */
export interface IControlsSectionProps {
    /** Состояние дашборда. */
    readonly state: ICodeCityDashboardState
}

/**
 * Секция контролов: фильтры репозитория/метрики + CausalOverlaySelector.
 *
 * @param props Конфигурация.
 * @returns Секция контролов.
 */
export function ControlsSection({ state }: IControlsSectionProps): ReactElement {
    const { t } = useTranslation(["code-city"])

    return (
        <Card className={state.resolveTourCardClassName("controls")}>
            <CardHeader>
                <p className="text-sm font-semibold text-foreground">
                    {t("code-city:controls.dashboardTitle")}
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-sm text-muted">{state.currentProfile.description}</p>
                <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1" htmlFor="dashboard-repository">
                        <span className="text-sm font-semibold text-foreground">
                            {t("code-city:controls.repositoryFilter")}
                        </span>
                        <select
                            aria-label={t("code-city:controls.repositoryAriaLabel")}
                            className={NATIVE_FORM.select}
                            id="dashboard-repository"
                            value={state.repositoryId}
                            onChange={state.handleRepositoryChange}
                        >
                            {state.repositoryOptions.map(
                                (entry): ReactElement => (
                                    <option key={entry} value={entry}>
                                        {entry}
                                    </option>
                                ),
                            )}
                        </select>
                    </label>
                    <label className="space-y-1" htmlFor="dashboard-metric">
                        <span className="text-sm font-semibold text-foreground">
                            {t("code-city:controls.metricSelector")}
                        </span>
                        <select
                            aria-label={t("code-city:controls.metricAriaLabel")}
                            className={NATIVE_FORM.select}
                            id="dashboard-metric"
                            value={state.metric}
                            onChange={state.handleMetricChange}
                        >
                            {CODE_CITY_DASHBOARD_METRICS.map(
                                (entry): ReactElement => (
                                    <option key={entry.value} value={entry.value}>
                                        {entry.label}
                                    </option>
                                ),
                            )}
                        </select>
                    </label>
                </div>
                <CausalOverlaySelector
                    value={state.overlayMode}
                    onChange={state.handleOverlayModeChange}
                />
            </CardContent>
        </Card>
    )
}
