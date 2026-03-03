import { type ReactElement } from "react"
import {
    Controller,
    type Control,
    type ControllerProps,
    type FieldPath,
    type FieldValues,
} from "react-hook-form"

import { Input } from "@/components/ui"
import { type InputProps } from "@/components/ui/input"

import { pickFieldMessage } from "./form-field-utils"

/**
 * Правила валидации для form field.
 */
type FormTextFieldRules<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
> = Omit<ControllerProps<TFormValues, TName>, "render" | "name" | "control">["rules"]

/**
 * Свойства текстового RHF-поля.
 */
export interface IFormTextFieldProps<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
> {
    /** Контроллер формы. */
    readonly control: Control<TFormValues>
    /** Имя поля в форме. */
    readonly name: TName
    /** Заголовок поля. */
    readonly label?: string
    /** Подсказка под полем. */
    readonly helperText?: string
    /** Правила валидации для Controller. */
    readonly rules?: FormTextFieldRules<TFormValues, TName>
    /** Пропсы HeroUI Input без связанных с контролируемым значением полей. */
    readonly inputProps?: Omit<
        InputProps,
        "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "isInvalid"
    >
    /** Идентификатор для accessibility. */
    readonly id?: string
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
    const fieldId = props.id ?? String(props.name)
    const hasRequiredMarker = props.rules?.required !== undefined
    const isInputDisabled = props.inputProps?.disabled === true

    return (
        <Controller
            control={props.control}
            name={props.name}
            rules={props.rules}
            render={({ field, fieldState }): ReactElement => {
                const rawErrorMessage = fieldState.error?.message
                const errorMessage =
                    typeof rawErrorMessage === "string" ? rawErrorMessage : undefined
                const hasError = errorMessage !== undefined
                const value = typeof field.value === "string" ? field.value : ""

                return (
                    <div className="flex flex-col gap-1.5">
                        {props.label === undefined ? null : (
                            <label className="text-sm font-medium text-slate-700" htmlFor={fieldId}>
                                {props.label}
                                {hasRequiredMarker ? <span aria-hidden="true"> *</span> : null}
                            </label>
                        )}
                        <Input
                            aria-describedby={
                                hasError || props.helperText !== undefined
                                    ? `${fieldId}-helper`
                                    : undefined
                            }
                            aria-invalid={hasError}
                            id={fieldId}
                            disabled={isInputDisabled}
                            isInvalid={hasError}
                            name={field.name}
                            value={value}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            {...props.inputProps}
                        />
                        <span id={`${fieldId}-helper`}>
                            {pickFieldMessage(errorMessage, props.helperText)}
                        </span>
                    </div>
                )
            }}
        />
    )
}
