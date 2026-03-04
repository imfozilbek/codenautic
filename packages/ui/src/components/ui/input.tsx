import { useId, type ChangeEvent, type ReactElement, type ReactNode } from "react"
import {
    Input as HeroUIInput,
    type InputProps as HeroUIInputProps,
} from "@heroui/react"

/**
 * Свойства `Input` с поддержкой legacy-свойств.
 */
export interface IInputProps extends Omit<HeroUIInputProps, "onChange"> {
    /** Legacy callback из старого слоя при изменении строки значения. */
    readonly onValueChange?: (value: string) => void
    readonly onChange?: (event: ChangeEvent<HTMLInputElement>) => void
    /** Legacy label prop (обертка-лейбл на месте внутреннего лэйаута). */
    readonly label?: string
    /** Legacy префикс для поля ввода. */
    readonly startContent?: ReactNode
    /** Legacy суффикс для поля ввода. */
    readonly endContent?: ReactNode
    /** Legacy флаг ошибки валидации. */
    readonly isInvalid?: boolean
    /** Legacy алиас для disabled. */
    readonly isDisabled?: boolean
}

/**
 * Алиас для совместимости внешних импортов старого имени типа.
 */
export type InputProps = IInputProps

/**
 * Input с обратной совместимостью `onValueChange`.
 *
 * @param props Свойства поля ввода.
 * @returns Поле ввода HeroUI с нормализованным callback.
 */
export function Input(props: InputProps): ReactElement {
    const {
        className,
        endContent,
        disabled,
        isDisabled,
        label,
        onChange,
        onValueChange,
        onBlur,
        isInvalid,
        startContent,
        ...inputProps
    } = props

    const inputClassName = buildInputClassName(
        className ?? "",
        startContent !== undefined,
        endContent !== undefined,
    )
    const fallbackId = useId()
    const inputId = typeof inputProps.id === "string" ? inputProps.id : fallbackId

    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
        if (onChange !== undefined) {
            onChange(event)
        }

        if (onValueChange !== undefined) {
            const target = event.target as HTMLInputElement
            onValueChange(target.value)
        }
    }

    const mappedDisabled = isDisabled ?? disabled

    const input = (
        <HeroUIInput
            {...inputProps}
            id={inputId}
            disabled={mappedDisabled}
            className={inputClassName}
            data-invalid={isInvalid === true ? "true" : undefined}
            onBlur={onBlur}
            onChange={handleChange}
        />
    )

    if (startContent === undefined && endContent === undefined && label === undefined) {
        return input
    }

    return (
        <div className="flex flex-col gap-1">
            {label === undefined ? null : (
                <label className="text-sm font-medium" htmlFor={inputId}>
                    {label}
                </label>
            )}
            <div className="relative">
                {startContent === undefined ? null : (
                    <span className="pointer-events-none absolute left-2 top-1/2 inline-flex -translate-y-1/2 text-slate-500">
                        {startContent}
                    </span>
                )}
                {input}
                {endContent === undefined ? null : (
                    <span className="pointer-events-none absolute right-2 top-1/2 inline-flex -translate-y-1/2 text-slate-500">
                        {endContent}
                    </span>
                )}
            </div>
        </div>
    )
}

function buildInputClassName(
    className: IInputProps["className"],
    hasStartContent: boolean,
    hasEndContent: boolean,
): HeroUIInputProps["className"] {
    if (typeof className === "function") {
        return className
    }

    const suffixClassName = buildSpacingClassName(hasStartContent, hasEndContent)

    if (typeof className === "string") {
        const entries = [className, suffixClassName]
        return entries.filter((entry): boolean => entry.length > 0).join(" ")
    }

    if (className === undefined) {
        return suffixClassName.length > 0 ? suffixClassName : undefined
    }

    return undefined
}

function buildSpacingClassName(hasStartContent: boolean, hasEndContent: boolean): string {
    const entries: string[] = []
    if (hasStartContent === true) {
        entries.push("pl-9")
    }
    if (hasEndContent === true) {
        entries.push("pr-9")
    }

    return entries.filter((entry): boolean => entry.length > 0).join(" ")
}
