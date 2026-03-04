import type { ReactElement, ReactNode } from "react"
import { Alert as HeroUIAlert, type AlertProps as HeroUIAlertProps } from "@heroui/react"

type THeroUIAlertStatus = HeroUIAlertProps["status"]
type THeroUIAlertClassName = HeroUIAlertProps["className"]
type TLegacyAlertColor = "default" | "primary" | "secondary" | "danger" | "success" | "warning"
type TLegacyAlertVariant = "solid" | "flat" | "light" | "bordered"

/**
 * Legacy-совместимые свойства Alert.
 */
export interface IAlertProps extends Omit<HeroUIAlertProps, "title"> {
    /** Заголовок alert-блока в контенте компонента. */
    readonly title?: ReactNode
    /** Legacy-цвет. */
    readonly color?: TLegacyAlertColor
    /** Legacy-variant для визуального режима. */
    readonly variant?: TLegacyAlertVariant
}

/**
 * Совместимый Alert-слой поверх HeroUI v3.
 *
 * @param props Свойства alert-блока.
 * @returns Alert с legacy-поддержкой `color`, `variant` и `title`.
 */
export function Alert(props: IAlertProps): ReactElement {
    const {
        children,
        className,
        color,
        status,
        title,
        variant,
        ...alertProps
    } = props

    const mappedStatus = mapAlertStatus(status, color)
    const mergedClassName = mergeAlertClassName(className, variant)

    return (
        <HeroUIAlert
            {...alertProps}
            className={mergedClassName}
            status={mappedStatus}
        >
            {title === undefined ? (
                children
            ) : (
                <>
                    <HeroUIAlert.Title>{title}</HeroUIAlert.Title>
                    {children === undefined ? null : (
                        <HeroUIAlert.Description>{children}</HeroUIAlert.Description>
                    )}
                </>
            )}
        </HeroUIAlert>
    )
}

/**
 * Экспорт совместимого типа.
 */
export type AlertProps = IAlertProps

function mapAlertStatus(
    status: THeroUIAlertStatus,
    color: TLegacyAlertColor | undefined,
): THeroUIAlertStatus {
    if (status !== undefined) {
        return status
    }

    if (color === "danger" || color === "success" || color === "warning") {
        return color
    }

    if (color === "primary" || color === "secondary") {
        return "accent"
    }

    return "default"
}

function mergeAlertClassName(
    className: THeroUIAlertClassName,
    variant: TLegacyAlertVariant | undefined,
): THeroUIAlertClassName {
    if (variant === undefined) {
        return className
    }

    const variantClassName = getAlertVariantClassName(variant)
    if (variantClassName.length === 0) {
        return className
    }

    if (typeof className === "string") {
        if (className.length === 0) {
            return variantClassName
        }

        return `${className} ${variantClassName}`
    }

    if (className === undefined) {
        return variantClassName
    }

    return className
}

function getAlertVariantClassName(variant: TLegacyAlertVariant): string {
    if (variant === "solid") {
        return "shadow-sm"
    }

    if (variant === "light") {
        return "opacity-90"
    }

    if (variant === "bordered") {
        return "border"
    }

    return ""
}
