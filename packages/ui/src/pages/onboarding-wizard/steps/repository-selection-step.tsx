import { useMemo, type ChangeEvent, type ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { Controller } from "react-hook-form"

import { useDynamicTranslation } from "@/lib/i18n"
import {
    Alert,
    Button,
    Checkbox,
    Input,
    Radio,
    RadioGroup,
    TextArea as Textarea,
} from "@heroui/react"
import type { IFormSelectOption } from "@/components/forms"
import { TYPOGRAPHY } from "@/lib/constants/typography"

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
    const { td } = useDynamicTranslation(["onboarding"])

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
            <Controller<IOnboardingFormValues, "onboardingMode">
                control={state.form.control}
                name="onboardingMode"
                render={({ field, fieldState }): ReactElement => {
                    const errorMessage =
                        typeof fieldState.error?.message === "string"
                            ? fieldState.error.message
                            : undefined
                    const hasError = errorMessage !== undefined
                    const helperId = "onboardingMode-helper"
                    const label = t("onboarding:repository.modeLabel")
                    const helperText = t("onboarding:repository.modeHelper")

                    return (
                        <div className="flex flex-col gap-1.5">
                            <span className={TYPOGRAPHY.label}>{label}</span>
                            <RadioGroup
                                aria-describedby={helperId}
                                aria-label={label}
                                aria-invalid={hasError}
                                name={field.name}
                                value={field.value ?? ""}
                                onChange={(value: string): void => {
                                    field.onChange(value)
                                }}
                            >
                                {onboardingModeOptions.map(
                                    (option): ReactElement => (
                                        <Radio
                                            key={option.value}
                                            isDisabled={option.isDisabled}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </Radio>
                                    ),
                                )}
                            </RadioGroup>
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

            {state.isSingleMode ? (
                <Controller<IOnboardingFormValues, "repositoryUrl">
                    control={state.form.control}
                    name="repositoryUrl"
                    render={({ field, fieldState }): ReactElement => {
                        const errorMessage =
                            typeof fieldState.error?.message === "string"
                                ? fieldState.error.message
                                : undefined
                        const hasError = errorMessage !== undefined
                        const fieldId = "repository-url"
                        const helperId = `${fieldId}-helper`
                        const value = typeof field.value === "string" ? field.value : ""
                        const label = t("onboarding:repository.urlLabel")
                        const helperText = t("onboarding:repository.urlHelper")

                        return (
                            <div className="flex flex-col gap-1.5">
                                <label className={TYPOGRAPHY.label} htmlFor={fieldId}>
                                    {label}
                                </label>
                                <Input
                                    aria-describedby={helperId}
                                    aria-label={label}
                                    aria-invalid={hasError}
                                    id={fieldId}
                                    name={field.name}
                                    placeholder={t(
                                        "onboarding:repository.urlPlaceholder",
                                    )}
                                    type="url"
                                    value={value}
                                    onBlur={field.onBlur}
                                    onChange={field.onChange}
                                />
                                <span id={helperId}>
                                    {hasError ? (
                                        <p className="text-xs text-danger" role="alert">
                                            {errorMessage}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-muted">
                                            {helperText}
                                        </p>
                                    )}
                                </span>
                            </div>
                        )
                    }}
                />
            ) : (
                <>
                    <Controller<IOnboardingFormValues, "repositoryUrlList">
                        control={state.form.control}
                        name="repositoryUrlList"
                        render={({ field, fieldState }): ReactElement => {
                            const errorMessage =
                                typeof fieldState.error?.message === "string"
                                    ? fieldState.error.message
                                    : undefined
                            const hasError = errorMessage !== undefined
                            const fieldId = "repository-url-list"
                            const helperId = `${fieldId}-helper`
                            const value =
                                field.value === undefined ? "" : field.value
                            const label = t("onboarding:repository.bulkListLabel")

                            return (
                                <div className="flex flex-col gap-1.5">
                                    <label
                                        className={TYPOGRAPHY.label}
                                        htmlFor={fieldId}
                                    >
                                        {label}
                                    </label>
                                    <Textarea
                                        aria-describedby={
                                            hasError ? helperId : undefined
                                        }
                                        aria-label={label}
                                        aria-invalid={hasError}
                                        className="min-h-[150px]"
                                        id={fieldId}
                                        name={field.name}
                                        placeholder={`https://github.com/owner/repo-a
https://github.com/owner/repo-b`}
                                        value={value}
                                        onBlur={field.onBlur}
                                        onChange={(
                                            event: ChangeEvent<HTMLTextAreaElement>,
                                        ): void => {
                                            field.onChange(event.target.value)
                                        }}
                                    />
                                    <span id={helperId}>
                                        {hasError ? (
                                            <p
                                                className="text-xs text-danger"
                                                role="alert"
                                            >
                                                {errorMessage}
                                            </p>
                                        ) : null}
                                    </span>
                                </div>
                            )
                        }}
                    />

                    <div className="flex items-center justify-between">
                        <p className="text-sm text-foreground">
                            {td("onboarding:repository.selectedCount", {
                                selected: String(state.selectedRepositoryUrls.length),
                                total: String(state.parsedBulkList.repositories.length),
                            })}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                onPress={(): void => {
                                    state.selectAllRepositories()
                                }}
                                size="sm"
                                type="button"
                                variant="ghost"
                            >
                                {t("onboarding:repository.selectAll")}
                            </Button>
                            <Button
                                onPress={(): void => {
                                    state.clearAllRepositories()
                                }}
                                size="sm"
                                type="button"
                                variant="ghost"
                            >
                                {t("onboarding:repository.deselectAll")}
                            </Button>
                        </div>
                    </div>

                    <div className="max-h-60 space-y-2 overflow-auto rounded-md border border-border p-2">
                        {state.parsedBulkList.repositories.length === 0 ? (
                            <p className="text-sm text-muted">
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
                                        onChange={(): void => {
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
                        <Alert status="danger">
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
                        <Alert status="accent">
                            {t("onboarding:repository.bulkTemplateNotice")}
                        </Alert>
                    ) : null}
                </>
            )}

            {state.isSingleMode || state.isStarted ? null : (
                <Alert status="accent">{t("onboarding:repository.bulkInfoNotice")}</Alert>
            )}
        </section>
    )
}
