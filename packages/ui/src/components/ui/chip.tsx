import type { ReactElement } from "react"
import { Chip as HeroUIChip, type ChipProps as HeroUIChipProps } from "@heroui/react"

type THeroUIChipColor = HeroUIChipProps["color"]
type THeroUIChipVariant = HeroUIChipProps["variant"]
type TLegacyChipColor = THeroUIChipColor | "primary" | "secondary"
type TLegacyChipVariant = THeroUIChipVariant | "flat" | "light" | "solid" | "bordered"

/**
 * Legacy-совместимые свойства Chip.
 */
export interface IChipProps extends Omit<HeroUIChipProps, "color" | "variant"> {
    /** Legacy color, нормализуется к HeroUI-палитре. */
    readonly color?: TLegacyChipColor
    /** Legacy variant, нормализуется к HeroUI-вариантам. */
    readonly variant?: TLegacyChipVariant
}

/**
 * Chip с обратной совместимостью legacy color/variant.
 *
 * @param props Свойства чипа.
 * @returns HeroUI Chip с нормализованными вариантами.
 */
export function Chip(props: IChipProps): ReactElement {
    const { color, variant, ...chipProps } = props
    const mappedColor = mapChipColor(color)
    const mappedVariant = mapChipVariant(variant)

    return (
        <HeroUIChip
            {...chipProps}
            color={mappedColor}
            variant={mappedVariant}
        />
    )
}

/**
 * Экспорт типа компонента Chip.
 */
export type ChipProps = IChipProps

function mapChipColor(color: TLegacyChipColor | undefined): THeroUIChipColor {
    if (color === undefined) {
        return undefined
    }

    if (color === "primary" || color === "secondary") {
        return "accent"
    }

    return color
}

function mapChipVariant(variant: TLegacyChipVariant | undefined): THeroUIChipVariant {
    if (variant === undefined) {
        return undefined
    }

    if (variant === "flat") {
        return "soft"
    }

    if (variant === "light") {
        return "tertiary"
    }

    if (variant === "solid") {
        return "primary"
    }

    if (variant === "bordered") {
        return "secondary"
    }

    return variant
}
