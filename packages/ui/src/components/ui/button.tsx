import type { ReactElement, ReactNode } from "react"
import { Button as HeroUIButton, type ButtonProps as HeroUIButtonProps } from "@heroui/react"

type TButtonVariant = HeroUIButtonProps["variant"]

type TLegacyButtonVariant = TButtonVariant | "flat" | "light" | "solid" | "bordered"

type TLegacyButtonRadius = "sm" | "md" | "lg" | "full" | "none"

interface IInternalButtonProps extends Omit<
    HeroUIButtonProps,
    "onValueChange" | "radius" | "children" | "className" | "variant"
> {
    /** Legacy variant (legacy UI had `solid`/`light`). */
    readonly variant?: TLegacyButtonVariant
    /** Legacy loading flag from shadcn-уровня. */
    readonly isLoading?: boolean
    /** Legacy color prop, преобразуется в HeroUI variant. */
    readonly color?: "default" | "primary" | "secondary" | "danger" | "success" | "warning"
    /** Legacy radius prop. */
    readonly radius?: TLegacyButtonRadius
    /** Legacy leading content для кнопки. */
    readonly startContent?: ReactNode
    /** Legacy trailing content для кнопки. */
    readonly endContent?: ReactNode
    /** Контент кнопки. */
    readonly children?: ReactNode
    /** Собственный класс для кнопки. */
    readonly className?: string
    /**
     * @deprecated Используй `isDisabled`. Будет удалено в следующей major-версии.
     */
    readonly disabled?: boolean
}

function getClassName(
    radius: IInternalButtonProps["radius"],
    className: string | undefined,
): string {
    const normalizedClassName = className ?? ""
    if (radius !== "full") {
        return normalizedClassName
    }

    const radiusClassName = "rounded-full"
    if (normalizedClassName.length === 0) {
        return radiusClassName
    }

    return `${normalizedClassName} ${radiusClassName}`
}

function getButtonVariant(
    variant: TLegacyButtonVariant | undefined,
    color: IInternalButtonProps["color"],
): TButtonVariant | undefined {
    if (variant !== undefined) {
        if (variant === "solid") {
            return undefined
        }

        if (variant === "light") {
            return "ghost"
        }

        if (variant === "flat") {
            return "secondary"
        }

        if (variant === "bordered") {
            return "outline"
        }

        return variant
    }

    if (color === "secondary") {
        return "secondary"
    }

    if (color === "danger") {
        return "danger"
    }

    if (color === "success" || color === "warning") {
        return "tertiary"
    }

    if (color === "default") {
        return undefined
    }

    return "primary"
}

/**
 * Extended HeroUI Button wrapper.
 *
 * Value-add over raw HeroUI Button:
 * - Legacy variant mapping: `solid` → default, `light` → ghost, `flat` → secondary, `bordered` → outline.
 * - `disabled` → `isDisabled` bridge for legacy callsites.
 * - `isLoading` prop sets `aria-busy` and disables the button.
 * - `startContent` / `endContent` slots rendered via inline flex.
 * - `radius="full"` applied as className (HeroUI v3 removed radius prop).
 * - `color` mapped to HeroUI variant when explicit `variant` is not provided.
 *
 * @param props Свойства кнопки.
 * @returns HeroUI button с fallback-поддержкой.
 */
export function Button(props: IInternalButtonProps): ReactElement {
    const {
        children,
        endContent,
        isDisabled,
        isLoading,
        radius,
        startContent,
        variant,
        className,
        color,
        disabled,
        onPress,
        ...buttonProps
    } = props

    const mappedVariant = getButtonVariant(variant, color)
    const mappedChildren = (
        <span className="inline-flex items-center gap-2">
            {startContent === undefined ? null : <span>{startContent}</span>}
            {children}
            {endContent === undefined ? null : <span>{endContent}</span>}
        </span>
    )

    const isButtonDisabled = isLoading === true || isDisabled === true || disabled === true

    return (
        <HeroUIButton
            {...buttonProps}
            onPress={onPress}
            className={getClassName(radius, className)}
            {...(mappedVariant === undefined ? {} : { variant: mappedVariant })}
            isDisabled={isButtonDisabled}
            aria-busy={isLoading}
        >
            {isLoading === true ? (
                <span className="inline-flex items-center gap-2">{mappedChildren}</span>
            ) : (
                mappedChildren
            )}
        </HeroUIButton>
    )
}

export type ButtonProps = IInternalButtonProps
