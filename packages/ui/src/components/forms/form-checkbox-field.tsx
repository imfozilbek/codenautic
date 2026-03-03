import { type ReactElement } from "react"
import {
    Controller,
    type Control,
    type ControllerProps,
    type FieldPath,
    type FieldValues,
} from "react-hook-form"
import { Checkbox } from "@/components/ui"

import { pickFieldMessage } from "./form-field-utils"

/**
 * Правила валидации для checkbox.
 */
type FormCheckboxFieldRules<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
> = Omit<ControllerProps<TFormValues, TName>, "render" | "name" | "control">["rules"]

/**
 * Свойства checkbox-поля.
 */
export interface IFormCheckboxFieldProps<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
> {
    /** Контроллер формы. */
    readonly control: Control<TFormValues>
    /** Имя поля в форме. */
    readonly name: TName
    /** Текст рядом с чекбоксом. */
    readonly label?: string
    /** Подсказка под полем. */
    readonly helperText?: string
    /** Правила валидации. */
    readonly rules?: FormCheckboxFieldRules<TFormValues, TName>
}

/**
 * HeroUI checkbox-field с RHF.
 *
 * @param props Конфигурация.
 * @returns Поле для булевого ввода.
 */
export function FormCheckboxField<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
>(props: IFormCheckboxFieldProps<TFormValues, TName>): ReactElement {
    return (
        <Controller
            control={props.control}
            name={props.name}
            rules={props.rules}
            render={({ field, fieldState }): ReactElement => {
                const errorMessage = fieldState.error?.message
                const hasError = errorMessage !== undefined
                const helperId = `${String(props.name)}-helper`

                return (
                    <div className="flex flex-col gap-1">
                        <Checkbox
                            aria-describedby={
                                hasError || props.helperText !== undefined ? helperId : undefined
                            }
                            aria-invalid={hasError}
                            isSelected={field.value === true}
                            name={field.name}
                            isInvalid={hasError}
                            onValueChange={field.onChange}
                        >
                            {props.label}
                        </Checkbox>
                        <span id={helperId}>
                            {pickFieldMessage(errorMessage, props.helperText)}
                        </span>
                    </div>
                )
            }}
        />
    )
}
