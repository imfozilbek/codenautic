import { type ChangeEvent, type ReactElement } from "react"
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
 * Правила валидации для числового поля.
 */
type FormNumberFieldRules<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
> = Omit<ControllerProps<TFormValues, TName>, "render" | "name" | "control">["rules"]

/**
 * Свойства числового поля.
 */
export interface IFormNumberFieldProps<
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
    readonly rules?: FormNumberFieldRules<TFormValues, TName>
    /** Пропсы HeroUI Input без value/onChange. */
    readonly inputProps?: Omit<
        InputProps,
        "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "isInvalid" | "isDisabled"
    >
    /** Идентификатор для accessibility. */
    readonly id?: string
}

/**
 * HeroUI Input Number field через react-hook-form.
 *
 * @param props Конфигурация поля.
 * @returns Поле ввода числа с контролем ошибки.
 */
export function FormNumberField<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
>(props: IFormNumberFieldProps<TFormValues, TName>): ReactElement {
    const fieldId = props.id ?? String(props.name)

    return (
        <Controller
            control={props.control}
            name={props.name}
            rules={props.rules}
            render={({ field, fieldState }): ReactElement => {
                const errorMessage = fieldState.error?.message
                const hasError = errorMessage !== undefined
                const value = field.value === undefined ? "" : String(field.value)
                const accessibilityLabel = props.label ?? String(props.name)

                return (
                    <div className="flex flex-col gap-1.5">
                        {props.label === undefined ? null : (
                            <label
                                className="text-sm font-medium text-foreground"
                                htmlFor={fieldId}
                            >
                                {props.label}
                            </label>
                        )}
                        <Input
                            aria-describedby={
                                hasError || props.helperText !== undefined
                                    ? `${fieldId}-helper`
                                    : undefined
                            }
                            aria-label={accessibilityLabel}
                            aria-invalid={hasError}
                            id={fieldId}
                            isInvalid={hasError}
                            inputMode="decimal"
                            name={field.name}
                            placeholder="0"
                            type="number"
                            value={value}
                            onBlur={field.onBlur}
                            onChange={(event: ChangeEvent<HTMLInputElement>): void => {
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
