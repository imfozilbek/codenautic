import { type ReactElement, type ReactNode } from "react"
import {
    ListBox,
    ListBoxItem,
    ListBoxSection,
    Select as HeroUISelect,
} from "@heroui/react"

type THeroUISelectProps = React.ComponentProps<typeof HeroUISelect>
type TSelection = Set<string> | "all"
type TSelectionChangeHandler = (keys: TSelection) => void

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
        defaultSelectedKeys,
        onSelectionChange,
        selectedKeys,
        ...selectProps
    } = props

    const selectedKey = getSelectedKey(selectedKeys)
    const defaultSelectedKey = getSelectedKey(defaultSelectedKeys)

    return (
        <HeroUISelect
            {...selectProps}
            defaultSelectedKey={defaultSelectedKey}
            selectedKey={selectedKey}
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

function getSelectedKey(keys: ReadonlySet<string> | "all" | undefined): string | undefined {
    if (keys === undefined || keys === "all") {
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
