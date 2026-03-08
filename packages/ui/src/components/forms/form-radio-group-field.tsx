import { type ReactElement } from "react"
import {
    Controller,
    type Control,
    type ControllerProps,
    type FieldPath,
    type FieldValues,
} from "react-hook-form"
import { Radio, RadioGroup } from "@/components/ui"

import { pickFieldMessage } from "./form-field-utils"

/**
 * Опция для radio-group.
 */
export interface IFormRadioOption {
    /** Значение радиокнопки. */
    readonly value: string
    /** Отображаемый текст. */
    readonly label: string
    /** Отключена ли опция. */
    readonly isDisabled?: boolean
}

/**
 * Правила валидации для radio group.
 */
type FormRadioGroupFieldRules<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
> = Omit<ControllerProps<TFormValues, TName>, "render" | "name" | "control">["rules"]

/**
 * Свойства radio-group поля.
 */
export interface IFormRadioGroupFieldProps<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
> {
    /** Контроллер формы. */
    readonly control: Control<TFormValues>
    /** Имя поля в форме. */
    readonly name: TName
    /** Заголовок группы. */
    readonly label?: string
    /** Подсказка под полем. */
    readonly helperText?: string
    /** Правила валидации. */
    readonly rules?: FormRadioGroupFieldRules<TFormValues, TName>
    /** Набор опций. */
    readonly options: ReadonlyArray<IFormRadioOption>
}

/**
 * HeroUI radio-group field с RHF.
 *
 * @param props Конфигурация.
 * @returns Переключатель опций.
 */
export function FormRadioGroupField<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
>(props: IFormRadioGroupFieldProps<TFormValues, TName>): ReactElement {
    return (
        <Controller
            control={props.control}
            name={props.name}
            rules={props.rules}
            render={({ field, fieldState }): ReactElement => {
                const errorMessage = fieldState.error?.message
                const hasError = errorMessage !== undefined
                const helperId = `${String(props.name)}-helper`
                const hasRequiredMarker = props.rules?.required !== undefined
                const accessibilityLabel = props.label ?? String(props.name)

                return (
                    <div className="flex flex-col gap-1.5">
                        {props.label === undefined ? null : (
                            <span className="text-sm font-medium text-foreground">
                                {props.label}
                                {hasRequiredMarker ? <span aria-hidden="true"> *</span> : null}
                            </span>
                        )}
                        <RadioGroup
                            aria-describedby={
                                hasError || props.helperText !== undefined ? helperId : undefined
                            }
                            aria-label={accessibilityLabel}
                            aria-invalid={hasError}
                            isInvalid={hasError}
                            name={field.name}
                            value={field.value ?? ""}
                            onValueChange={(value: string): void => {
                                field.onChange(value)
                            }}
                        >
                            {props.options.map((option): ReactElement => {
                                return (
                                    <Radio
                                        key={option.value}
                                        isDisabled={option.isDisabled}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </Radio>
                                )
                            })}
                        </RadioGroup>
                        <span id={helperId}>
                            {pickFieldMessage(errorMessage, props.helperText)}
                        </span>
                    </div>
                )
            }}
        />
    )
}
