import { isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react"
import {
    Dropdown as HeroUIDropdown,
    DropdownItem as HeroUIDropdownItem,
    DropdownMenu as HeroUIDropdownMenu,
    DropdownPopover as HeroUIDropdownPopover,
    DropdownSection as HeroUIDropdownSection,
    DropdownTrigger as HeroUIDropdownTrigger,
    type DropdownItemProps as HeroUIDropdownItemProps,
    type DropdownMenuProps as HeroUIDropdownMenuProps,
    type DropdownProps as HeroUIDropdownProps,
    type DropdownSectionProps as HeroUIDropdownSectionProps,
} from "@heroui/react"
import type { ButtonProps } from "./button"
import { Button } from "./button"

/**
 * Legacy-совместимые props для DropdownItem.
 */
export type DropdownItemProps = Omit<HeroUIDropdownItemProps, "color"> & {
    /** Legacy color support (например, `danger` для logout). */
    readonly color?: "primary" | "secondary" | "default" | "danger"
}

type THeroUIDropdownTriggerProps = ComponentProps<typeof HeroUIDropdownTrigger>

/**
 * Legacy-совместимые свойства DropdownMenu.
 */
export type DropdownMenuProps<T extends object> = HeroUIDropdownMenuProps<T>

/**
 * Legacy-совместимые свойства DropdownTrigger.
 */
export interface IDropdownTriggerProps extends Omit<THeroUIDropdownTriggerProps, "children"> {
    readonly children: ReactNode
    readonly className?: string
    readonly color?: ButtonProps["color"]
    /**
     * @deprecated Используй `isDisabled`. Будет удалено в следующей major-версии.
     */
    readonly disabled?: boolean
    /** Отключает trigger. */
    readonly isDisabled?: boolean
    readonly radius?: ButtonProps["radius"]
    readonly size?: ButtonProps["size"]
    readonly variant?: ButtonProps["variant"]
}

/**
 * Типизированный guard для legacy-trigger с дочерним Button.
 *
 * @param value Узел React children.
 * @returns `true`, если children является нашим Button-компонентом.
 */
function isButtonElement(value: ReactNode): value is ReactElement<ButtonProps, typeof Button> {
    return isValidElement(value) && value.type === Button
}

/**
 * Нормализует legacy visual props trigger-а в className.
 *
 * @param params Свойства визуального оформления trigger-а.
 * @returns Склеенный className.
 */
function getTriggerClassName(params: {
    readonly className: string | undefined
    readonly color: ButtonProps["color"] | undefined
    readonly radius: ButtonProps["radius"] | undefined
    readonly size: ButtonProps["size"] | undefined
    readonly variant: ButtonProps["variant"] | undefined
}): string | undefined {
    const classNames: string[] = []

    if (params.className !== undefined && params.className.length > 0) {
        classNames.push(params.className)
    }

    if (params.radius === "full") {
        classNames.push("rounded-full")
    }

    if (params.size === "sm") {
        classNames.push("min-h-8")
    }

    if (params.size === "md") {
        classNames.push("min-h-10")
    }

    if (params.size === "lg") {
        classNames.push("min-h-12")
    }

    if (params.variant === "light") {
        classNames.push("bg-transparent")
    }

    if (params.color === "danger") {
        classNames.push("text-danger hover:text-danger")
    }

    if (classNames.length === 0) {
        return undefined
    }

    return classNames.join(" ")
}

/** Слой-обертка для Dropdown корня и структурных блоков. */
export const Dropdown = HeroUIDropdown
export const DropdownSection = HeroUIDropdownSection

/**
 * Legacy-совместимый DropdownMenu, автоматически помещающий menu в popover HeroUI v3.
 *
 * @param props Свойства menu-компонента.
 * @returns Popover + menu в одном legacy-компоненте.
 */
export function DropdownMenu<T extends object>(props: DropdownMenuProps<T>): ReactElement {
    return (
        <HeroUIDropdownPopover>
            <HeroUIDropdownMenu {...props} />
        </HeroUIDropdownPopover>
    )
}

/**
 * Trigger с поддержкой legacy-кнопочных props и Button-children без вложенных `<button>`.
 *
 * @param props Свойства trigger-компонента.
 * @returns DropdownTrigger с нормализованным содержимым.
 */
export function DropdownTrigger(props: IDropdownTriggerProps): ReactElement {
    const {
        children,
        className,
        color,
        disabled,
        isDisabled,
        radius,
        size,
        variant,
        ...triggerProps
    } = props

    const buttonChild = isButtonElement(children) ? children : undefined
    const buttonChildProps = buttonChild?.props
    const mergedDisabled = disabled ?? buttonChildProps?.disabled
    const mergedIsDisabled = isDisabled ?? buttonChildProps?.isDisabled
    const mergedClassName = getTriggerClassName({
        className: className ?? buttonChildProps?.className,
        color: color ?? buttonChildProps?.color,
        radius: radius ?? buttonChildProps?.radius,
        size: size ?? buttonChildProps?.size,
        variant: variant ?? buttonChildProps?.variant,
    })
    const triggerChild = buttonChild?.props.children ?? children

    return (
        <HeroUIDropdownTrigger
            {...triggerProps}
            className={mergedClassName}
            isDisabled={mergedDisabled === true || mergedIsDisabled === true}
        >
            {triggerChild}
        </HeroUIDropdownTrigger>
    )
}

/** Карточка DropdownItem с мягкой поддержкой legacy-`color`. */
export function DropdownItem(props: DropdownItemProps): ReactElement {
    const { color, className, ...dropdownItemProps } = props
    const mergedClassName =
        color === "danger" && className === undefined ? "text-danger hover:text-danger" : className

    return <HeroUIDropdownItem {...dropdownItemProps} className={mergedClassName} />
}

export type DropdownProps = HeroUIDropdownProps
export type DropdownSectionProps = HeroUIDropdownSectionProps
