import { type ReactElement } from "react"
import { type FieldPath, type FieldValues } from "react-hook-form"
import { ListBox, ListBoxItem, Select } from "@heroui/react"

import { FormField, type IFormFieldProps } from "./form-field"

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
 * Свойства select-поля.
 */
export interface IFormSelectFieldProps<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
> extends Omit<IFormFieldProps<TFormValues, TName>, "renderField" | "labelElement" | "gapClass"> {
    /** Список опций. */
    readonly options: ReadonlyArray<IFormSelectOption>
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
    const { options, ...fieldProps } = props

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
                const selectedKey = field.value === undefined ? null : String(field.value)

                return (
                    <Select
                        aria-describedby={ariaDescribedBy}
                        aria-label={accessibilityLabel}
                        aria-invalid={hasError}
                        name={field.name}
                        id={fieldId}
                        selectedKey={selectedKey}
                        onSelectionChange={(key): void => {
                            const nextValue = typeof key === "string" ? key : undefined
                            field.onChange(nextValue)
                        }}
                    >
                        <Select.Trigger>
                            <Select.Value />
                        </Select.Trigger>
                        <Select.Popover>
                            <ListBox>
                                {options.map((option): ReactElement => {
                                    return (
                                        <ListBoxItem
                                            key={option.value}
                                            id={option.value}
                                            textValue={option.label}
                                            isDisabled={option.isDisabled}
                                        >
                                            <div className="flex flex-col">
                                                <span>{option.label}</span>
                                                {option.description === undefined ? null : (
                                                    <span className="text-xs text-muted-foreground">
                                                        {option.description}
                                                    </span>
                                                )}
                                            </div>
                                        </ListBoxItem>
                                    )
                                })}
                            </ListBox>
                        </Select.Popover>
                    </Select>
                )
            }}
        />
    )
}
