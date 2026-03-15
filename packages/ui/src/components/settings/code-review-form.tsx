import { type ChangeEvent, type ReactElement } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller } from "react-hook-form"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"
import { Button, Input, ListBox, ListBoxItem, Select, Switch } from "@heroui/react"

import { type IFormSelectOption } from "@/components/forms"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import {
    CODE_REVIEW_CADENCE_OPTIONS,
    CODE_REVIEW_SEVERITY_OPTIONS,
    codeReviewFormSchema,
    type ICodeReviewFormValues,
} from "@/components/settings/settings-form-schemas"

/**
 * Параметры формы code-review.
 */
export interface ICodeReviewFormProps {
    /** Начальные значения. */
    readonly initialValues?: Partial<ICodeReviewFormValues>
    /** Сабмит формы. */
    readonly onSubmit: (values: ICodeReviewFormValues) => void
}

/**
 * Форма настроек code-review с RHF + Zod валидацией.
 *
 * @param props Конфигурация.
 * @returns Набор полей для конфигурации ревью.
 */
export function CodeReviewForm(props: ICodeReviewFormProps): ReactElement {
    const { t } = useTranslation(["settings"])

    const cadenceOptions: ReadonlyArray<IFormSelectOption> = CODE_REVIEW_CADENCE_OPTIONS.map(
        (item): IFormSelectOption => ({
            label: `${item.charAt(0).toUpperCase()}${item.slice(1)}`,
            value: item,
        }),
    )
    const severityOptions: ReadonlyArray<IFormSelectOption> = CODE_REVIEW_SEVERITY_OPTIONS.map(
        (item): IFormSelectOption => ({
            label: `${item.charAt(0).toUpperCase()}${item.slice(1)}`,
            value: item,
        }),
    )
    const form = useForm<z.input<typeof codeReviewFormSchema>, unknown, ICodeReviewFormValues>({
        defaultValues: {
            cadence: props.initialValues?.cadence ?? CODE_REVIEW_CADENCE_OPTIONS[0],
            enableDriftSignals: props.initialValues?.enableDriftSignals === true,
            severity: props.initialValues?.severity ?? CODE_REVIEW_SEVERITY_OPTIONS[1],
            suggestionsLimit: props.initialValues?.suggestionsLimit ?? 8,
        },
        resolver: zodResolver(codeReviewFormSchema),
    })
    const handleSubmit = (): void => {
        void form.handleSubmit((values: ICodeReviewFormValues): void => {
            props.onSubmit(values)
        })()
    }

    return (
        <form className="space-y-4" onSubmit={handleSubmit}>
            <Controller
                control={form.control}
                name="cadence"
                render={({ field, fieldState }): ReactElement => {
                    const errorMessage =
                        typeof fieldState.error?.message === "string"
                            ? fieldState.error.message
                            : undefined
                    const hasError = errorMessage !== undefined
                    const fieldId = "code-review-cadence"
                    const helperId = `${fieldId}-helper`
                    const selectedKey =
                        field.value === undefined ? null : String(field.value)
                    const label = t("settings:codeReviewForm.reviewCadence")

                    return (
                        <div className="flex flex-col gap-1.5">
                            <label className={TYPOGRAPHY.label} htmlFor={fieldId}>
                                {label}
                            </label>
                            <Select
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
                                        {cadenceOptions.map(
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
                                ) : null}
                            </span>
                        </div>
                    )
                }}
            />
            <Controller
                control={form.control}
                name="severity"
                render={({ field, fieldState }): ReactElement => {
                    const errorMessage =
                        typeof fieldState.error?.message === "string"
                            ? fieldState.error.message
                            : undefined
                    const hasError = errorMessage !== undefined
                    const fieldId = "code-review-severity"
                    const helperId = `${fieldId}-helper`
                    const selectedKey =
                        field.value === undefined ? null : String(field.value)
                    const label = t("settings:codeReviewForm.severityThreshold")

                    return (
                        <div className="flex flex-col gap-1.5">
                            <label className={TYPOGRAPHY.label} htmlFor={fieldId}>
                                {label}
                            </label>
                            <Select
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
                                        {severityOptions.map(
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
                                ) : null}
                            </span>
                        </div>
                    )
                }}
            />
            <Controller
                control={form.control}
                name="suggestionsLimit"
                render={({ field, fieldState }): ReactElement => {
                    const errorMessage =
                        typeof fieldState.error?.message === "string"
                            ? fieldState.error.message
                            : undefined
                    const hasError = errorMessage !== undefined
                    const fieldId = "code-review-suggestions-limit"
                    const helperId = `${fieldId}-helper`
                    const value =
                        field.value === undefined ? "" : `${field.value as number}`
                    const label = t("settings:codeReviewForm.suggestionsLimit")

                    return (
                        <div className="flex flex-col gap-1.5">
                            <label className={TYPOGRAPHY.label} htmlFor={fieldId}>
                                {label}
                            </label>
                            <Input
                                aria-describedby={hasError ? helperId : undefined}
                                aria-label={label}
                                aria-invalid={hasError}
                                id={fieldId}
                                inputMode="decimal"
                                min={1}
                                name={field.name}
                                placeholder={t(
                                    "settings:codeReviewForm.suggestionsLimitPlaceholder",
                                )}
                                type="number"
                                value={value}
                                onBlur={field.onBlur}
                                onChange={(
                                    event: ChangeEvent<HTMLInputElement>,
                                ): void => {
                                    const nextValue = event.target.value

                                    if (nextValue === "") {
                                        field.onChange(undefined)
                                        return
                                    }

                                    const parsedNumber = Number(nextValue)
                                    if (Number.isNaN(parsedNumber) === true) {
                                        field.onChange(undefined)
                                        return
                                    }

                                    field.onChange(parsedNumber)
                                }}
                            />
                            <span id={helperId}>
                                {hasError ? (
                                    <p className="text-xs text-danger" role="alert">
                                        {errorMessage}
                                    </p>
                                ) : null}
                            </span>
                        </div>
                    )
                }}
            />
            <Controller
                control={form.control}
                name="enableDriftSignals"
                render={({ field, fieldState }): ReactElement => {
                    const errorMessage =
                        typeof fieldState.error?.message === "string"
                            ? fieldState.error.message
                            : undefined
                    const hasError = errorMessage !== undefined
                    const helperId = "enableDriftSignals-helper"
                    const label = t("settings:codeReviewForm.enableDriftSignals")
                    const helperText = t(
                        "settings:codeReviewForm.enableDriftSignalsHelper",
                    )

                    return (
                        <div className="flex flex-col gap-1">
                            <Switch
                                aria-describedby={helperId}
                                aria-label={label}
                                aria-invalid={hasError}
                                name={field.name}
                                isSelected={field.value === true}
                                onChange={field.onChange}
                            >
                                {label}
                            </Switch>
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
            <Button
                aria-busy={form.formState.isSubmitting}
                isDisabled={form.formState.isSubmitting}
                type="submit"
            >
                {t("settings:codeReviewForm.saveReviewConfig")}
            </Button>
        </form>
    )
}
