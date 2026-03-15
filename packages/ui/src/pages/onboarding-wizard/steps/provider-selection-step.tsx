import { useMemo, type ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { Controller } from "react-hook-form"

import { useDynamicTranslation } from "@/lib/i18n"
import { Alert, Button, Chip, ListBox, ListBoxItem, Select } from "@heroui/react"
import type { IFormSelectOption } from "@/components/forms"
import { TYPOGRAPHY } from "@/lib/constants/typography"

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
    const { td } = useDynamicTranslation(["onboarding"])

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
            <Controller<IOnboardingFormValues, "provider">
                control={state.form.control}
                name="provider"
                render={({ field, fieldState }): ReactElement => {
                    const errorMessage =
                        typeof fieldState.error?.message === "string"
                            ? fieldState.error.message
                            : undefined
                    const hasError = errorMessage !== undefined
                    const fieldId = "provider"
                    const helperId = `${fieldId}-helper`
                    const selectedKey =
                        field.value === undefined ? null : String(field.value)
                    const label = t("onboarding:provider.fieldLabel")
                    const helperText = t("onboarding:provider.fieldHelper")

                    return (
                        <div className="flex flex-col gap-1.5">
                            <label className={TYPOGRAPHY.label} htmlFor={fieldId}>
                                {label}
                            </label>
                            <Select
                                aria-describedby={helperId}
                                aria-label={label}
                                aria-invalid={hasError}
                                name={field.name}
                                id={fieldId}
                                selectedKey={selectedKey}
                                onSelectionChange={(key): void => {
                                    const nextValue =
                                        typeof key === "string" ? key : undefined
                                    field.onChange(nextValue)
                                }}
                            >
                                <Select.Trigger>
                                    <Select.Value />
                                </Select.Trigger>
                                <Select.Popover>
                                    <ListBox>
                                        {gitProviderSelectOptions.map(
                                            (option): ReactElement => (
                                                <ListBoxItem
                                                    key={option.value}
                                                    id={option.value}
                                                    textValue={option.label}
                                                    isDisabled={option.isDisabled}
                                                >
                                                    <div className="flex flex-col">
                                                        <span>{option.label}</span>
                                                        {option.description ===
                                                        undefined ? null : (
                                                            <span className="text-xs text-muted">
                                                                {option.description}
                                                            </span>
                                                        )}
                                                    </div>
                                                </ListBoxItem>
                                            ),
                                        )}
                                    </ListBox>
                                </Select.Popover>
                            </Select>
                            <span id={helperId}>
                                {hasError ? (
                                    <p className="text-xs text-danger" role="alert">
                                        {errorMessage}
                                    </p>
                                ) : (
                                    <p className="text-xs text-muted">{helperText}</p>
                                )}
                            </span>
                        </div>
                    )
                }}
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
                    variant="soft"
                >
                    {state.isProviderConnected
                        ? td("onboarding:provider.connected", {
                              provider: mapProviderLabel(state.values.provider),
                          })
                        : t("onboarding:provider.notConnected")}
                </Chip>
            </div>
            {state.providerConnectionError === undefined ? null : (
                <Alert status="danger">{state.providerConnectionError}</Alert>
            )}
        </section>
    )
}
