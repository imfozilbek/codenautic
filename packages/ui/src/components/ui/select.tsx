import { type ComponentProps, type ReactElement, type ReactNode } from "react"
import {
    ListBox,
    ListBoxItem,
    ListBoxSection,
    Select as HeroUISelect,
} from "@heroui/react"

type THeroUISelectProps = ComponentProps<typeof HeroUISelect>
type TSelection = Set<string> | "all"
type TSelectionChangeHandler = (keys: TSelection) => void
type TSelectSize = "sm" | "md" | "lg"

/**
 * Свойства совместимого select с поддержкой старого API (`selectedKeys`).
 */
export interface ISelectProps extends Omit<THeroUISelectProps, "selectedKey" | "defaultSelectedKey" | "onSelectionChange"> {
    /** Legacy API: legacy-набор строковых ключей для одного выбора. */
    readonly selectedKeys?: ReadonlySet<string> | "all"
    /** Legacy API: дефолтный набор ключей для одного выбора. */
    readonly defaultSelectedKeys?: ReadonlySet<string> | "all"
    /** Legacy API-обратный callback в формате `Set` для совместимости. */
    readonly onSelectionChange?: TSelectionChangeHandler
    /** Legacy размер селекта. */
    readonly size?: TSelectSize
}

export type SelectProps = ISelectProps

/**
 * Свойства пункта select.
 */
export interface ISelectItemProps {
    /** Идентификатор пункта для `selectedKey`. */
    readonly value?: string
    readonly id?: string
    readonly children?: ReactNode
    readonly isDisabled?: boolean
}

export type SelectItemProps = ISelectItemProps

/**
 * Свойства секции select.
 */
export interface ISelectSectionProps {
    readonly children: ReactNode
}

export type SelectSectionProps = ISelectSectionProps

/**
 * Select-компонент с совместимым API.
 */
export function Select(props: SelectProps): ReactElement {
    const {
        children,
        className,
        defaultSelectedKeys,
        onSelectionChange,
        selectedKeys,
        size,
        ...selectProps
    } = props

    const hasControlledSelection = selectedKeys !== undefined
    const hasDefaultSelection = defaultSelectedKeys !== undefined
    const selectedKey = hasControlledSelection ? getSelectedKey(selectedKeys) : undefined
    const defaultSelectedKey = hasDefaultSelection
        ? getDefaultSelectedKey(defaultSelectedKeys)
        : undefined

    const mergedClassName = mergeSelectClassName(className, size)

    return (
        <HeroUISelect
            {...selectProps}
            className={mergedClassName}
            {...(hasDefaultSelection ? { defaultSelectedKey } : {})}
            {...(hasControlledSelection ? { selectedKey } : {})}
            onSelectionChange={(keys): void => {
                if (onSelectionChange === undefined) {
                    return
                }

                const nextKey = resolveSelectionKey(keys)
                onSelectionChange(nextKey === undefined ? "all" : new Set([nextKey]))
            }}
        >
            <HeroUISelect.Trigger>
                <HeroUISelect.Value />
            </HeroUISelect.Trigger>
            <HeroUISelect.Popover>
                <ListBox>{children}</ListBox>
            </HeroUISelect.Popover>
        </HeroUISelect>
    )
}

/**
 * Пункт выборки в совместимом Select.
 */
export function SelectItem(props: SelectItemProps): ReactElement {
    const { id, value, children, isDisabled } = props
    const itemId = value ?? id

    return (
        <ListBoxItem id={itemId} textValue={itemId} isDisabled={isDisabled}>
            {children}
        </ListBoxItem>
    )
}

/**
 * Секция выборки в совместимом Select.
 */
export function SelectSection(props: SelectSectionProps): ReactElement {
    return <ListBoxSection>{props.children}</ListBoxSection>
}

function getSelectedKey(keys: ReadonlySet<string> | "all"): string | null {
    if (keys === "all") {
        return null
    }

    const next = keys.values().next()
    if (next.done === true) {
        return null
    }

    return String(next.value)
}

function getDefaultSelectedKey(keys: ReadonlySet<string> | "all"): string | undefined {
    if (keys === "all") {
        return undefined
    }

    const next = keys.values().next()
    if (next.done === true) {
        return undefined
    }

    return String(next.value)
}

function resolveSelectionKey(value: unknown): string | undefined {
    if (value instanceof Set === false) {
        if (typeof value === "string") {
            return value === "all" ? undefined : value
        }
        return undefined
    }

    const next = value.values().next()
    if (next.done === true) {
        return undefined
    }

    if (typeof next.value === "string") {
        return next.value
    }

    return undefined
}

function mergeSelectClassName(
    className: THeroUISelectProps["className"],
    size: TSelectSize | undefined,
): THeroUISelectProps["className"] {
    if (size === undefined) {
        return className
    }

    const sizeClassName = getSelectSizeClassName(size)
    if (sizeClassName.length === 0) {
        return className
    }

    if (typeof className === "function") {
        return className
    }

    if (typeof className === "string") {
        if (className.length === 0) {
            return sizeClassName
        }

        return `${className} ${sizeClassName}`
    }

    return sizeClassName
}

function getSelectSizeClassName(size: TSelectSize): string {
    if (size === "sm") {
        return "h-8"
    }

    if (size === "lg") {
        return "h-12"
    }

    return "h-10"
}
