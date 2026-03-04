import type { ComponentProps, ReactElement, ReactNode } from "react"
import {
    Dropdown,
    DropdownItem as HeroUIDropdownItem,
    DropdownMenu,
    DropdownSection,
    DropdownTrigger as HeroUIDropdownTrigger,
    type DropdownItemProps as HeroUIDropdownItemProps,
} from "@heroui/react"
import type { ButtonProps } from "./button"

/**
 * Legacy-совместимые props для DropdownItem.
 */
export type DropdownItemProps = Omit<HeroUIDropdownItemProps, "color"> & {
    /** Legacy color support (например, `danger` для logout). */
    readonly color?: "primary" | "secondary" | "default" | "danger"
}

type THeroUIDropdownTriggerProps = ComponentProps<typeof HeroUIDropdownTrigger>

/**
 * Legacy-совместимые свойства DropdownTrigger.
 */
export interface IDropdownTriggerProps extends Omit<THeroUIDropdownTriggerProps, "children"> {
    readonly children: ReactNode
    readonly className?: string
    readonly color?: ButtonProps["color"]
    readonly disabled?: boolean
    readonly isDisabled?: boolean
    readonly radius?: ButtonProps["radius"]
    readonly size?: ButtonProps["size"]
    readonly variant?: ButtonProps["variant"]
}

/** Слой-обертка для Dropdown корня и структурных блоков. */
export { Dropdown, DropdownMenu, DropdownSection }

/**
 * Trigger с поддержкой legacy-кнопочных props (`radius/size/variant`).
 *
 * @param props Свойства trigger-компонента.
 * @returns DropdownTrigger с условной оберткой через Button.
 */
export function DropdownTrigger(props: IDropdownTriggerProps): ReactElement {
    const {
        children,
        className: _className,
        color: _color,
        disabled: _disabled,
        isDisabled: _isDisabled,
        radius: _radius,
        size: _size,
        variant: _variant,
        ...triggerProps
    } = props

    return <HeroUIDropdownTrigger {...triggerProps}>{children}</HeroUIDropdownTrigger>
}

/** Карточка DropdownItem с мягкой поддержкой legacy-`color`. */
export function DropdownItem(props: DropdownItemProps): ReactElement {
    const { color, className, ...dropdownItemProps } = props
    const mergedClassName =
        color === "danger" && className === undefined ? "text-red-600 hover:text-red-700" : className

    return <HeroUIDropdownItem {...dropdownItemProps} className={mergedClassName} />
}

export type { DropdownProps, DropdownMenuProps, DropdownSectionProps } from "@heroui/react"
