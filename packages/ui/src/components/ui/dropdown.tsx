import type { ReactElement } from "react"
import {
    Dropdown,
    DropdownItem as HeroUIDropdownItem,
    DropdownMenu,
    DropdownSection,
    DropdownTrigger,
    type DropdownItemProps as HeroUIDropdownItemProps,
} from "@heroui/react"

/**
 * Legacy-совместимые props для DropdownItem.
 */
export type DropdownItemProps = Omit<HeroUIDropdownItemProps, "color"> & {
    /** Legacy color support (например, `danger` для logout). */
    readonly color?: "primary" | "secondary" | "default" | "danger"
}

/** Слой-обертка для Dropdown корня. */
export { Dropdown, DropdownTrigger, DropdownMenu, DropdownSection }

/** Карточка DropdownItem с мягкой поддержкой legacy-`color`. */
export function DropdownItem(props: DropdownItemProps): ReactElement {
    const { color, className, ...dropdownItemProps } = props
    const mergedClassName =
        color === "danger" && className === undefined ? "text-red-600 hover:text-red-700" : className

    return <HeroUIDropdownItem {...dropdownItemProps} className={mergedClassName} />
}

export type { DropdownProps, DropdownMenuProps, DropdownSectionProps } from "@heroui/react"
