import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { Card, CardBody, CardHeader } from "@/components/ui"
import { TYPOGRAPHY } from "@/lib/constants/typography"

import type { IOnboardingWizardPageProps } from "./onboarding-wizard-types"
import {
    BulkScanJobsMonitor,
    ProviderSelectionStep,
    RepositorySelectionStep,
    ScanConfigurationStep,
    WizardStepIndicator,
    WizardStepsNavigator,
} from "./steps"
import { useOnboardingWizardState } from "./use-onboarding-wizard-state"

/**
 * Экран multi-step мастера onboarding.
 *
 * @param props Колбек на запуск скана.
 * @returns Компонент wizard с расширенным bulk-режимом.
 */
export function OnboardingWizardPage(props: IOnboardingWizardPageProps): ReactElement {
    const { t } = useTranslation(["onboarding"])
    const state = useOnboardingWizardState(props)

    return (
        <section className="space-y-4">
            <h1 className={TYPOGRAPHY.pageTitle}>{t("onboarding:page.title")}</h1>
            <p className={TYPOGRAPHY.pageSubtitle}>{t("onboarding:page.subtitle")}</p>

            <Card>
                <CardHeader>
                    <WizardStepIndicator state={state} />
                </CardHeader>
                <CardBody>
                    <form
                        className="space-y-4"
                        onSubmit={(event): void => {
                            event.preventDefault()
                            void state.form.handleSubmit(state.handleSubmit)(event)
                        }}
                    >
                        <ProviderSelectionStep state={state} />
                        <RepositorySelectionStep state={state} />
                        <ScanConfigurationStep state={state} />
                        <BulkScanJobsMonitor state={state} />
                        <WizardStepsNavigator state={state} />
                    </form>
                </CardBody>
            </Card>
        </section>
    )
}
