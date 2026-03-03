import type { ReactElement } from "react"
import {
    Switch as HeroUISwitch,
    type SwitchProps as HeroUISwitchProps,
} from "@heroui/react"

/**
 * Свойства Switch с поддержкой legacy callback `onValueChange`.
 */
interface ISwitchProps extends HeroUISwitchProps {
    /** Legacy callback для изменения состояния. */
    readonly onValueChange?: (isSelected: boolean) => void
    /** Legacy флаг ошибки валидации. */
    readonly isInvalid?: boolean
}

/**
 * Обертка Switch с обратной совместимостью `onValueChange`.
 *
 * @param props Свойства переключателя.
 * @returns HeroUI Switch.
 */
export function Switch(props: ISwitchProps): ReactElement {
    const { children, isInvalid, onValueChange, ...switchProps } = props
    const validationState = isInvalid === true ? "invalid" : isInvalid === false ? "valid" : undefined

    return (
        <HeroUISwitch
            {...switchProps}
            validationState={validationState}
            onValueChange={onValueChange}
        >
            {children}
        </HeroUISwitch>
    )
}

export type { ISwitchProps as SwitchProps }
