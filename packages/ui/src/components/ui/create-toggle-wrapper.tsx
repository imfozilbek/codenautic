import { type ComponentType, type ReactElement } from "react"

/**
 * Базовые свойства для toggle-компонентов HeroUI (Checkbox, Switch).
 */
interface IToggleBaseProps {
    /** Legacy callback при изменении состояния toggle. */
    readonly onValueChange?: (isSelected: boolean) => void
    /** Legacy флаг ошибки валидации. */
    readonly isInvalid?: boolean
    /** Содержимое (label) toggle-компонента. */
    readonly children?: React.ReactNode
}

/**
 * Конфигурация для создания toggle wrapper.
 */
interface IToggleWrapperConfig<THeroProps> {
    /** Оригинальный HeroUI компонент. */
    readonly Component: ComponentType<THeroProps>
    /** Маппинг isInvalid в data-атрибут (для Switch). */
    readonly invalidAsDataAttr?: boolean
}

/**
 * Generic factory для создания HeroUI toggle wrappers (Checkbox, Switch).
 * Устраняет дублирование логики onValueChange → onChange и isInvalid bridging.
 *
 * @param config Конфигурация wrapper: HeroUI компонент и опции.
 * @returns Wrapper-компонент с поддержкой legacy props.
 */
export function createToggleWrapper<THeroProps extends object>(
    config: IToggleWrapperConfig<THeroProps>,
): (props: Omit<THeroProps, "onChange"> & IToggleBaseProps) => ReactElement {
    const { Component, invalidAsDataAttr = false } = config

    function ToggleWrapper(props: Omit<THeroProps, "onChange"> & IToggleBaseProps): ReactElement {
        const { children, isInvalid, onValueChange, ...restProps } = props

        const componentProps = {
            ...restProps,
            ...(invalidAsDataAttr
                ? { "data-invalid": isInvalid === true ? "true" : undefined }
                : { isInvalid }),
            onChange: onValueChange,
        } as unknown as THeroProps

        return <Component {...componentProps}>{children}</Component>
    }

    return ToggleWrapper
}
