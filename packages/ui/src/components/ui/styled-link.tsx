import { type ReactElement, type ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"

/**
 * Свойства StyledLink — TanStack Link с единообразным стилем underline.
 */
export interface IStyledLinkProps extends Omit<LinkProps, "children"> {
    /** Содержимое ссылки. */
    readonly children: ReactNode
    /** Дополнительные CSS-классы (добавляются к базовым). */
    readonly className?: string
}

/**
 * Базовые CSS-классы для consistent link styling.
 */
const BASE_LINK_CLASSES =
    "underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"

/**
 * Обёртка над TanStack Router Link с consistent underline styling.
 * Устраняет дублирование `underline underline-offset-4` в 11+ файлах.
 *
 * @param props Свойства TanStack Link с className.
 * @returns Стилизованная ссылка.
 */
export function StyledLink(props: IStyledLinkProps): ReactElement {
    const { children, className, ...linkProps } = props
    const combinedClassName =
        className !== undefined ? `${BASE_LINK_CLASSES} ${className}` : BASE_LINK_CLASSES

    return (
        <Link {...linkProps} className={combinedClassName}>
            {children}
        </Link>
    )
}
