import { type ReactElement } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import {
    FormNumberField,
    FormSelectField,
    FormSubmitButton,
    FormSwitchField,
    type IFormSelectOption,
} from "@/components/forms"
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
    const cadenceOptions: ReadonlyArray<IFormSelectOption> = CODE_REVIEW_CADENCE_OPTIONS.map(
        (item): IFormSelectOption => ({
            label: item[0].toUpperCase() + item.slice(1),
            value: item,
        }),
    )
    const severityOptions: ReadonlyArray<IFormSelectOption> = CODE_REVIEW_SEVERITY_OPTIONS.map(
        (item): IFormSelectOption => ({
            label: item[0].toUpperCase() + item.slice(1),
            value: item,
        }),
    )
    const form = useForm<ICodeReviewFormValues>({
        defaultValues: {
            cadence: props.initialValues?.cadence ?? CODE_REVIEW_CADENCE_OPTIONS[0],
            enableDriftSignals: props.initialValues?.enableDriftSignals === true,
            severity: props.initialValues?.severity ?? CODE_REVIEW_SEVERITY_OPTIONS[1],
            suggestionsLimit: props.initialValues?.suggestionsLimit ?? 8,
        },
        resolver: zodResolver(codeReviewFormSchema),
    })

    return (
        <form className="space-y-4" onSubmit={form.handleSubmit(props.onSubmit)}>
            <FormSelectField
                control={form.control}
                id="code-review-cadence"
                label="Review cadence"
                name="cadence"
                options={cadenceOptions}
            />
            <FormSelectField
                control={form.control}
                id="code-review-severity"
                label="Severity threshold"
                name="severity"
                options={severityOptions}
            />
            <FormNumberField
                control={form.control}
                id="code-review-suggestions-limit"
                inputProps={{
                    min: 1,
                    placeholder: "1..99",
                }}
                label="Suggestions limit"
                name="suggestionsLimit"
            />
            <FormSwitchField
                control={form.control}
                helperText="Enable additional insights for drift-related code patterns."
                label="Enable drift signals"
                name="enableDriftSignals"
            />
            <FormSubmitButton isSubmitting={form.formState.isSubmitting}>
                Save review config
            </FormSubmitButton>
        </form>
    )
}
