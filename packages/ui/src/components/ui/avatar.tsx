import type { ReactElement } from "react"
import {
    Avatar as HeroUIAvatar,
    AvatarFallback,
    AvatarImage,
    type AvatarProps as HeroUIAvatarProps,
} from "@heroui/react"

/**
 * Свойства Avatar с мягкой поддержкой fallback-текста.
 */
interface IAvatarProps extends HeroUIAvatarProps {
    /** Явный fallback текст, если нет изображения. */
    readonly fallback?: string
    /** Текст в placeholder. */
    readonly label?: string
    /** Legacy имя для fallback. */
    readonly name?: string
    /** Legacy поле изображения. */
    readonly src?: string
}

/**
 * Обертка Avatar с автогенерацией fallback по имени.
 *
 * @param props Свойства аватара.
 * @returns Компонент HeroUI Avatar.
 */
export function Avatar(props: IAvatarProps): ReactElement {
    const { fallback, label, name, src, ...avatarProps } = props
    const resolvedName = typeof name === "string" ? name : undefined
    const fallbackSeed = fallback ?? label ?? resolvedName
    const fallbackText = fallbackSeed === undefined ? undefined : fallbackSeed.slice(0, 2).toUpperCase()

    return (
        <HeroUIAvatar {...avatarProps}>
            {src === undefined ? null : <AvatarImage alt={resolvedName ?? fallbackText} src={src} />}
            {fallbackText === undefined ? null : <AvatarFallback>{fallbackText}</AvatarFallback>}
        </HeroUIAvatar>
    )
}

export type { IAvatarProps as AvatarProps }
