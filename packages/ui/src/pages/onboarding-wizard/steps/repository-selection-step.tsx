import { useMemo, type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { Alert, Button, Checkbox } from "@/components/ui"
import { FormRadioGroupField, FormTextField, FormTextareaField } from "@/components/forms"
import type { IFormSelectOption } from "@/components/forms"

import type { IOnboardingWizardState } from "../use-onboarding-wizard-state"
import type { IOnboardingFormValues } from "../onboarding-wizard-types"
import { BULK_PROGRESS_PREVIEW_LABEL_LIMIT } from "../onboarding-wizard-types"

/**
 * Параметры компонента шага выбора репозитория.
 */
export interface IRepositorySelectionStepProps {
    /** Состояние визарда. */
    readonly state: IOnboardingWizardState
}

/**
 * Шаг 1: выбор репозитория (одиночный URL или bulk-режим с чекбоксами).
 *
 * @param props Конфигурация.
 * @returns Компонент шага выбора репозитория.
 */
export function RepositorySelectionStep({
    state,
}: IRepositorySelectionStepProps): ReactElement | null {
    const { t } = useTranslation(["onboarding"])

    const onboardingModeOptions: ReadonlyArray<IFormSelectOption> = useMemo(
        () => [
            {
                label: t("onboarding:repository.singleLabel"),
                value: "single",
            },
            {
                label: t("onboarding:repository.bulkLabel"),
                value: "bulk",
            },
        ],
        [t],
    )

    if (state.activeStep !== 1) {
        return null
    }

    return (
        <section className="space-y-3">
            <FormRadioGroupField<IOnboardingFormValues, "onboardingMode">
                control={state.form.control}
                helperText={t("onboarding:repository.modeHelper")}
                label={t("onboarding:repository.modeLabel")}
                name="onboardingMode"
                options={onboardingModeOptions}
            />

            {state.isSingleMode ? (
                <FormTextField<IOnboardingFormValues, "repositoryUrl">
                    control={state.form.control}
                    id="repository-url"
                    label={t("onboarding:repository.urlLabel")}
                    name="repositoryUrl"
                    helperText={t("onboarding:repository.urlHelper")}
                    inputProps={{
                        placeholder: t("onboarding:repository.urlPlaceholder"),
                        type: "url",
                    }}
                />
            ) : (
                <>
                    <FormTextareaField<IOnboardingFormValues, "repositoryUrlList">
                        control={state.form.control}
                        id="repository-url-list"
                        label={t("onboarding:repository.bulkListLabel")}
                        name="repositoryUrlList"
                        textareaProps={{
                            minRows: 6,
                            placeholder: `https://github.com/owner/repo-a
https://github.com/owner/repo-b`,
                        }}
                    />

                    <div className="flex items-center justify-between">
                        <p className="text-sm text-foreground">
                            {(t as unknown as (key: string, options: Record<string, string>) => string)(
                                "onboarding:repository.selectedCount",
                                {
                                    selected: String(state.selectedRepositoryUrls.length),
                                    total: String(state.parsedBulkList.repositories.length),
                                },
                            )}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                onPress={(): void => {
                                    state.selectAllRepositories()
                                }}
                                size="sm"
                                type="button"
                                variant="light"
                            >
                                {t("onboarding:repository.selectAll")}
                            </Button>
                            <Button
                                onPress={(): void => {
                                    state.clearAllRepositories()
                                }}
                                size="sm"
                                type="button"
                                variant="light"
                            >
                                {t("onboarding:repository.deselectAll")}
                            </Button>
                        </div>
                    </div>

                    <div className="max-h-60 space-y-2 overflow-auto rounded-md border border-border p-2">
                        {state.parsedBulkList.repositories.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {t("onboarding:repository.bulkEmptyHint")}
                            </p>
                        ) : null}

                        {state.parsedBulkList.repositories.map(
                            (repositoryUrl): ReactElement => (
                                <div
                                    className="rounded-md border border-border p-2"
                                    key={repositoryUrl}
                                >
                                    <Checkbox
                                        isSelected={state.selectedRepositoryUrls.includes(
                                            repositoryUrl,
                                        )}
                                        onValueChange={(): void => {
                                            state.toggleRepositorySelection(repositoryUrl)
                                        }}
                                    >
                                        {repositoryUrl}
                                    </Checkbox>
                                </div>
                            ),
                        )}
                    </div>

                    {state.parsedBulkList.invalidLines.length > 0 ? (
                        <Alert color="danger">
                            {t("onboarding:repository.invalidLines")}
                            <ul className="mt-1 list-disc space-y-1 pl-5">
                                {state.parsedBulkList.invalidLines.map(
                                    (line): ReactElement => (
                                        <li key={`invalid-line-${String(line.line)}`}>
                                            {line.line}: {line.value}
                                        </li>
                                    ),
                                )}
                            </ul>
                        </Alert>
                    ) : null}

                    {state.parsedBulkList.repositories.length >
                    BULK_PROGRESS_PREVIEW_LABEL_LIMIT ? (
                        <Alert color="primary">
                            {t("onboarding:repository.bulkTemplateNotice")}
                        </Alert>
                    ) : null}
                </>
            )}

            {state.isSingleMode || state.isStarted ? null : (
                <Alert color="primary">
                    {t("onboarding:repository.bulkInfoNotice")}
                </Alert>
            )}
        </section>
    )
}
