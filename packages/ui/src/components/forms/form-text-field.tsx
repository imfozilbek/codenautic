import { type ReactElement } from "react"
import { type FieldPath, type FieldValues } from "react-hook-form"
import { Input, type InputProps } from "@heroui/react"

import { FormField, type IFormFieldProps } from "./form-field"

/**
 * Свойства текстового RHF-поля.
 */
export interface IFormTextFieldProps<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
> extends Omit<IFormFieldProps<TFormValues, TName>, "renderField" | "labelElement" | "gapClass"> {
    /** Пропсы HeroUI Input без связанных с контролируемым значением полей. */
    readonly inputProps?: Omit<
        InputProps,
        "name" | "value" | "defaultValue" | "onChange" | "onBlur"
    >
}

/**
 * HeroUI Input-обвязка для react-hook-form.
 *
 * @param props Конфигурация поля.
 * @returns Поле ввода с валидацией и helper-текстом.
 */
export function FormTextField<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
>(props: IFormTextFieldProps<TFormValues, TName>): ReactElement {
    const { inputProps, ...fieldProps } = props

    return (
        <FormField
            {...fieldProps}
            renderField={({
                field,
                hasError,
                fieldId,
                accessibilityLabel,
                ariaDescribedBy,
            }): ReactElement => {
                const value = typeof field.value === "string" ? field.value : ""
                const isInputDisabled = inputProps?.disabled === true

                return (
                    <Input
                        aria-describedby={ariaDescribedBy}
                        aria-label={accessibilityLabel}
                        aria-invalid={hasError}
                        id={fieldId}
                        disabled={isInputDisabled}
                        name={field.name}
                        value={value}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                        {...inputProps}
                    />
                )
            }}
        />
    )
}
