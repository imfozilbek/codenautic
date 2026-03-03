import { type ReactElement } from "react"
import {
    Controller,
    type Control,
    type ControllerProps,
    type FieldPath,
    type FieldValues,
} from "react-hook-form"
import { Textarea, type TextareaProps } from "@/components/ui/textarea"

import { pickFieldMessage } from "./form-field-utils"

/**
 * Правила валидации для RHF textarea.
 */
type FormTextareaFieldRules<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
> = Omit<ControllerProps<TFormValues, TName>, "render" | "name" | "control">["rules"]

/**
 * Свойства textarea-поля.
 */
export interface IFormTextareaFieldProps<
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
    /** Правила валидации. */
    readonly rules?: FormTextareaFieldRules<TFormValues, TName>
    /** Пропсы HeroUI Textarea без значений/обработчиков. */
    readonly textareaProps?: Omit<
        TextareaProps,
        | "name"
        | "value"
        | "defaultValue"
        | "onChange"
        | "onValueChange"
        | "onBlur"
        | "isInvalid"
        | "isDisabled"
    >
    /** Идентификатор для accessibility. */
    readonly id?: string
}

/**
 * HeroUI Textarea-обвязка для react-hook-form.
 *
 * @param props Конфигурация textarea.
 * @returns Текстовая область с поддержкой ошибок и описаний.
 */
export function FormTextareaField<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
>(props: IFormTextareaFieldProps<TFormValues, TName>): ReactElement {
    const fieldId = props.id ?? String(props.name)
    const hasRequiredMarker = props.rules?.required !== undefined

    return (
        <Controller
            control={props.control}
            name={props.name}
            rules={props.rules}
            render={({ field, fieldState }): ReactElement => {
                const errorMessage = fieldState.error?.message
                const hasError = errorMessage !== undefined
                const value = field.value === undefined ? "" : field.value

                return (
                    <div className="flex flex-col gap-1.5">
                        {props.label === undefined ? null : (
                            <label className="text-sm font-medium text-slate-700" htmlFor={fieldId}>
                                {props.label}
                                {hasRequiredMarker ? <span aria-hidden="true"> *</span> : null}
                            </label>
                        )}
                        <Textarea
                            aria-describedby={
                                hasError || props.helperText !== undefined
                                    ? `${fieldId}-helper`
                                    : undefined
                            }
                            aria-invalid={hasError}
                            id={fieldId}
                            isInvalid={hasError}
                            name={field.name}
                            value={value}
                            onBlur={field.onBlur}
                            onValueChange={(nextValue: string): void => {
                                field.onChange(nextValue)
                            }}
                            {...props.textareaProps}
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
