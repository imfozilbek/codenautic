import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui"
import { FormSubmitButton } from "@/components/forms"

import type { IOnboardingWizardState } from "../use-onboarding-wizard-state"
import { WIZARD_STEPS } from "../onboarding-wizard-types"

/**
 * Параметры компонента навигации по шагам визарда.
 */
export interface IWizardStepsNavigatorProps {
    /** Состояние визарда. */
    readonly state: IOnboardingWizardState
}

/**
 * Step indicator (шапка) и кнопки "Назад"/"Далее"/"Запустить" для мастера onboarding.
 *
 * @param props Конфигурация.
 * @returns Компонент навигации.
 */
export function WizardStepsNavigator({ state }: IWizardStepsNavigatorProps): ReactElement {
    const { t } = useTranslation(["onboarding"])

    return (
        <div className="flex items-center justify-between gap-2">
            <Button
                isDisabled={state.activeStep === 0}
                onPress={(): void => {
                    state.goPrevStep()
                }}
                type="button"
                variant="light"
            >
                {t("onboarding:navigator.backButton")}
            </Button>
            {state.isFinalStep ? (
                <FormSubmitButton
                    buttonProps={{
                        isDisabled: state.isStarted,
                    }}
                    submittingText={t("onboarding:navigator.submittingButton")}
                >
                    {t("onboarding:navigator.submitButton")}
                </FormSubmitButton>
            ) : (
                <Button
                    onPress={(): void => {
                        void state.goNextStep()
                    }}
                    type="button"
                >
                    {t("onboarding:navigator.nextButton")}
                </Button>
            )}
        </div>
    )
}

/**
 * Параметры компонента индикатора шагов.
 */
export interface IWizardStepIndicatorProps {
    /** Состояние визарда. */
    readonly state: IOnboardingWizardState
}

/**
 * Горизонтальный индикатор шагов визарда.
 *
 * @param props Конфигурация.
 * @returns Компонент индикатора шагов.
 */
export function WizardStepIndicator({ state }: IWizardStepIndicatorProps): ReactElement {
    const { t } = useTranslation(["onboarding"])

    return (
        <div className="flex items-center justify-between gap-2">
            {WIZARD_STEPS.map((step, index): ReactElement => {
                const isActive = index === state.activeStep
                const isCompleted = index < state.activeStep
                const stepId = step.id

                return (
                    <button
                        className="rounded-md px-3 py-2 text-left text-xs leading-tight"
                        disabled={index > state.activeStep}
                        key={step.id}
                        onClick={(): void => {
                            if (index > state.activeStep) {
                                return
                            }

                            state.setActiveStep(index as 0 | 1 | 2)
                        }}
                        type="button"
                    >
                        <div
                            className={`rounded-md px-2 py-2 ${isActive ? "bg-foreground text-background" : isCompleted ? "bg-surface-muted text-foreground" : "bg-surface text-muted-foreground"}`}
                        >
                            <p className="text-xs font-semibold uppercase tracking-wider">
                                {(t as unknown as (key: string, options: Record<string, string>) => string)(
                                    "onboarding:steps.stepLabel",
                                    { number: String(index + 1) },
                                )}
                            </p>
                            <p className="text-sm font-semibold">
                                {t(`onboarding:steps.${stepId}.label`)}
                            </p>
                            <p className="text-xs">
                                {t(`onboarding:steps.${stepId}.description`)}
                            </p>
                        </div>
                    </button>
                )
            })}
        </div>
    )
}
