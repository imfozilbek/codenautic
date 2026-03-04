import type { ReactElement, ReactNode } from "react"
import {
    Radio as HeroUIRadio,
    RadioGroup as HeroUIRadioGroup,
    type RadioGroupProps as HeroUIRadioGroupProps,
    type RadioProps as HeroUIRadioProps,
} from "@heroui/react"

/**
 * Свойства группы радиокнопок.
 */
export interface IRadioGroupProps extends Omit<HeroUIRadioGroupProps, "onChange"> {
    /** Legacy callback для совместимости со старым API (`onValueChange`). */
    readonly onValueChange?: (value: string) => void
    /** Современный callback для совместимости. */
    readonly onChange?: (value: string) => void
}

/**
 * Свойства радиокнопки.
 */
export type RadioProps = HeroUIRadioProps
export type RadioGroupProps = IRadioGroupProps

/**
 * Обертка RadioGroup для совместимости onValueChange.
 *
 * @param props Свойства группы.
 * @returns HeroUI RadioGroup.
 */
export function RadioGroup(props: IRadioGroupProps): ReactElement {
    const { isInvalid, onValueChange, onChange, ...radioGroupProps } = props
    type TRadioValueChangeHandler = (value: string) => void
    const safeOnValueChange = (onChange ?? onValueChange) as
        | TRadioValueChangeHandler
        | undefined

    const handleValueChange = (value: string): void => {
        safeOnValueChange?.(value)
    }

    return (
        <HeroUIRadioGroup
            {...radioGroupProps}
            isInvalid={isInvalid}
            onChange={handleValueChange}
        />
    )
}

/**
 * Обертка отдельной Radio для единообразного экспорта.
 *
 * @param props Свойства пункта.
 * @returns HeroUI Radio.
 */
export function Radio(props: RadioProps): ReactElement {
    const { children, ...radioProps } = props as RadioProps & { readonly children?: ReactNode }

    return <HeroUIRadio {...radioProps}>{children}</HeroUIRadio>
}
