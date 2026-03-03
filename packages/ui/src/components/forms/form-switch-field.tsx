import { type ReactElement } from "react"
import {
    Controller,
    type Control,
    type ControllerProps,
    type FieldPath,
    type FieldValues,
} from "react-hook-form"
import { Switch } from "@/components/ui"

import { pickFieldMessage } from "./form-field-utils"

/**
 * Правила валидации для switch.
 */
type FormSwitchFieldRules<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
> = Omit<ControllerProps<TFormValues, TName>, "render" | "name" | "control">["rules"]

/**
 * Свойства switch-поля.
 */
export interface IFormSwitchFieldProps<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
> {
    /** Контроллер формы. */
    readonly control: Control<TFormValues>
    /** Имя поля в форме. */
    readonly name: TName
    /** Заголовок switch. */
    readonly label?: string
    /** Подсказка под полем. */
    readonly helperText?: string
    /** Правила валидации. */
    readonly rules?: FormSwitchFieldRules<TFormValues, TName>
}

/**
 * HeroUI switch-field с RHF.
 *
 * @param props Конфигурация.
 * @returns Поле переключателя.
 */
export function FormSwitchField<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
>(props: IFormSwitchFieldProps<TFormValues, TName>): ReactElement {
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
                        <Switch
                            aria-describedby={
                                hasError || props.helperText !== undefined ? helperId : undefined
                            }
                            aria-invalid={hasError}
                            name={field.name}
                            isInvalid={hasError}
                            isSelected={field.value === true}
                            onValueChange={field.onChange}
                        >
                            {props.label}
                        </Switch>
                        <span id={helperId}>
                            {pickFieldMessage(errorMessage, props.helperText)}
                        </span>
                    </div>
                )
            }}
        />
    )
}
