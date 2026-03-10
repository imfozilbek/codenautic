import { useMemo, type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { Alert, Button, Chip } from "@/components/ui"
import { FormSelectField } from "@/components/forms"
import type { IFormSelectOption } from "@/components/forms"

import type { IOnboardingWizardState } from "../use-onboarding-wizard-state"
import type { IOnboardingFormValues } from "../onboarding-wizard-types"
import { mapProviderLabel } from "../onboarding-templates"

/**
 * Параметры компонента шага выбора провайдера.
 */
export interface IProviderSelectionStepProps {
    /** Состояние визарда. */
    readonly state: IOnboardingWizardState
}

/**
 * Шаг 0: выбор Git-провайдера и подтверждение подключения.
 *
 * @param props Конфигурация.
 * @returns Компонент шага выбора провайдера.
 */
export function ProviderSelectionStep({ state }: IProviderSelectionStepProps): ReactElement | null {
    const { t } = useTranslation(["onboarding"])

    const gitProviderSelectOptions: ReadonlyArray<IFormSelectOption> = useMemo(
        () => [
            {
                description: t("onboarding:provider.githubDescription"),
                label: t("onboarding:provider.github"),
                value: "github",
            },
            {
                description: t("onboarding:provider.gitlabDescription"),
                label: t("onboarding:provider.gitlab"),
                value: "gitlab",
            },
            {
                description: t("onboarding:provider.bitbucketDescription"),
                label: t("onboarding:provider.bitbucket"),
                value: "bitbucket",
            },
        ],
        [t],
    )

    if (state.activeStep !== 0) {
        return null
    }

    return (
        <section className="space-y-3">
            <FormSelectField<IOnboardingFormValues, "provider">
                control={state.form.control}
                id="provider"
                label={t("onboarding:provider.fieldLabel")}
                name="provider"
                options={gitProviderSelectOptions}
                helperText={t("onboarding:provider.fieldHelper")}
            />
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    onPress={(): void => {
                        state.handleConnectProvider()
                    }}
                    type="button"
                >
                    {t("onboarding:provider.connectButton")}
                </Button>
                <Chip
                    color={state.isProviderConnected ? "success" : "warning"}
                    size="sm"
                    variant="flat"
                >
                    {state.isProviderConnected
                        ? (t as unknown as (key: string, options: Record<string, string>) => string)(
                              "onboarding:provider.connected",
                              { provider: mapProviderLabel(state.values.provider) },
                          )
                        : t("onboarding:provider.notConnected")}
                </Chip>
            </div>
            {state.providerConnectionError === undefined ? null : (
                <Alert color="danger">{state.providerConnectionError}</Alert>
            )}
        </section>
    )
}
