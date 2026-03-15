import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { GuidedTourOverlay } from "@/components/codecity/guided-tour-overlay"
import { TourCustomizer } from "@/components/codecity/tour-customizer"
import { Card, CardContent, CardHeader } from "@heroui/react"

import type { ICodeCityDashboardState } from "../use-code-city-dashboard-state"

/**
 * Параметры секции тура.
 */
export interface ITourSectionProps {
    /** Состояние дашборда. */
    readonly state: ICodeCityDashboardState
}

/**
 * Секция тура: GuidedTourOverlay + TourCustomizer.
 *
 * @param props Конфигурация.
 * @returns Секция тура.
 */
export function TourSection({ state }: ITourSectionProps): ReactElement {
    const { t } = useTranslation(["code-city"])

    return (
        <>
            <GuidedTourOverlay
                currentStepIndex={state.guidedTourStepIndex}
                isActive={state.isGuidedTourActive}
                onNext={state.handleTourNext}
                onPrevious={state.handleTourPrevious}
                onSkip={state.handleTourSkip}
                steps={state.guidedTourSteps}
            />
            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">
                        {t("code-city:tour.tourCustomizer")}
                    </p>
                </CardHeader>
                <CardContent>
                    <TourCustomizer
                        isAdmin={true}
                        onStepsChange={state.handleTourStepsChange}
                        steps={state.guidedTourSteps}
                    />
                </CardContent>
            </Card>
        </>
    )
}
