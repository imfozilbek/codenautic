import { type ReactElement } from "react"
import {
    Controller,
    type Control,
    type ControllerProps,
    type FieldPath,
    type FieldValues,
} from "react-hook-form"
import { Select, SelectItem } from "@heroui/react"

import { pickFieldMessage } from "./form-field-utils"

/**
 * Опция для form-select-field.
 */
export interface IFormSelectOption {
    /** Значение опции. */
    readonly value: string
    /** Лейбл опции. */
    readonly label: string
    /** Дополнительный подпоясняющий текст. */
    readonly description?: string
    /** Блокирован ли выбор пункта. */
    readonly isDisabled?: boolean
}

/**
 * Правила валидации для select.
 */
type FormSelectFieldRules<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
> = Omit<ControllerProps<TFormValues, TName>, "render" | "name" | "control">["rules"]

/**
 * Свойства select-поля.
 */
export interface IFormSelectFieldProps<
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
    readonly rules?: FormSelectFieldRules<TFormValues, TName>
    /** Список опций. */
    readonly options: ReadonlyArray<IFormSelectOption>
    /** Идентификатор для accessibility. */
    readonly id?: string
}

/**
 * HeroUI select-field с RHF.
 *
 * @param props Конфигурация поля.
 * @returns Выпадающий список с отображением ошибки/подсказки.
 */
export function FormSelectField<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
>(props: IFormSelectFieldProps<TFormValues, TName>): ReactElement {
    const fieldId = props.id ?? String(props.name)

    return (
        <Controller
            control={props.control}
            name={props.name}
            rules={props.rules}
            render={({ field, fieldState }): ReactElement => {
                const errorMessage = fieldState.error?.message
                const hasError = errorMessage !== undefined
                const selectedKey = field.value === undefined ? undefined : String(field.value)
                const selectedKeys =
                    selectedKey === undefined ? new Set<string>() : new Set([selectedKey])
                const hasRequiredMarker = props.rules?.required !== undefined

                return (
                    <div className="flex flex-col gap-1.5">
                        {props.label === undefined ? null : (
                            <label className="text-sm font-medium text-slate-700" htmlFor={fieldId}>
                                {props.label}
                                {hasRequiredMarker ? <span aria-hidden="true"> *</span> : null}
                            </label>
                        )}
                        <Select
                            aria-describedby={
                                hasError || props.helperText !== undefined
                                    ? `${fieldId}-helper`
                                    : undefined
                            }
                            aria-invalid={hasError}
                            name={field.name}
                            id={fieldId}
                            isInvalid={hasError}
                            selectedKeys={selectedKeys}
                            onSelectionChange={(keys: unknown): void => {
                                if (keys instanceof Set === false) {
                                    field.onChange(undefined)
                                    return
                                }

                                if (keys.size === 0) {
                                    field.onChange(undefined)
                                    return
                                }

                                const nextValue = [...keys][0]
                                if (typeof nextValue !== "string") {
                                    field.onChange(undefined)
                                    return
                                }

                                field.onChange(nextValue)
                            }}
                        >
                            {props.options.map((option): ReactElement => {
                                return (
                                    <SelectItem
                                        key={option.value}
                                        isDisabled={option.isDisabled}
                                        value={option.value}
                                    >
                                        <div className="flex flex-col">
                                            <span>{option.label}</span>
                                            {option.description === undefined ? null : (
                                                <span className="text-xs text-slate-500">
                                                    {option.description}
                                                </span>
                                            )}
                                        </div>
                                    </SelectItem>
                                )
                            })}
                        </Select>
                        <span id={`${fieldId}-helper`}>
                            {pickFieldMessage(errorMessage, props.helperText)}
                        </span>
                    </div>
                )
            }}
        />
    )
}
