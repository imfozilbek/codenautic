import { type ReactElement, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import {
    Controller,
    type Control,
    type ControllerProps,
    type FieldPath,
    type FieldValues,
} from "react-hook-form"
import { Button, Input } from "@/components/ui"

import { pickFieldMessage } from "./form-field-utils"

/**
 * Правила валидации для password field.
 */
type FormPasswordFieldRules<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
> = Omit<ControllerProps<TFormValues, TName>, "render" | "name" | "control">["rules"]

/**
 * Свойства password-поля.
 */
export interface IFormPasswordFieldProps<
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
    readonly rules?: FormPasswordFieldRules<TFormValues, TName>
    /** Идентификатор для accessibility. */
    readonly id?: string
}

/**
 * HeroUI password field с локальным переключением видимости.
 *
 * @param props Конфигурация поля.
 * @returns Поле для ввода пароля.
 */
export function FormPasswordField<
    TFormValues extends FieldValues,
    TName extends FieldPath<TFormValues>,
>(props: IFormPasswordFieldProps<TFormValues, TName>): ReactElement {
    const fieldId = props.id ?? String(props.name)
    const [isPasswordVisible, setIsPasswordVisible] = useState(false)

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
                            </label>
                        )}
                        <Input
                            aria-describedby={
                                hasError || props.helperText !== undefined
                                    ? `${fieldId}-helper`
                                    : undefined
                            }
                            aria-invalid={hasError}
                            endContent={
                                <Button
                                    aria-label={
                                        isPasswordVisible
                                            ? "Hide password text"
                                            : "Show password text"
                                    }
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    onPress={(): void => {
                                        setIsPasswordVisible(
                                            (previousValue: boolean): boolean => !previousValue,
                                        )
                                    }}
                                >
                                    {isPasswordVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                                </Button>
                            }
                            id={fieldId}
                            isInvalid={hasError}
                            minLength={8}
                            name={field.name}
                            placeholder="••••••••"
                            type={isPasswordVisible ? "text" : "password"}
                            value={value}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
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
