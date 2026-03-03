import type { ReactElement } from "react"
import {
    Checkbox as HeroUICheckbox,
    type CheckboxProps as HeroUICheckboxProps,
    type CheckboxGroupProps,
} from "@heroui/react"

/**
 * Свойства Checkbox с поддержкой legacy callback `onValueChange`.
 */
export interface ICheckboxProps extends Omit<HeroUICheckboxProps, "onChange"> {
    /** Legacy callback из старого слоя. */
    readonly onValueChange?: (isSelected: boolean) => void
    /** Legacy флаг ошибки валидации. */
    readonly isInvalid?: boolean
}

/**
 * Обертка Checkbox с поддержкой `onValueChange` для обратной совместимости.
 *
 * @param props Свойства компонента.
 * @returns HeroUI Checkbox.
 */
export function Checkbox(props: ICheckboxProps): ReactElement {
        const { children, isInvalid, onValueChange, ...checkboxProps } = props

    return (
        <HeroUICheckbox
            {...checkboxProps}
            isInvalid={isInvalid}
            onChange={onValueChange}
        >
            {children}
        </HeroUICheckbox>
    )
}

export type { ICheckboxProps as CheckboxProps }
export type { CheckboxGroupProps }
