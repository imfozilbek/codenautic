import { type ReactElement, type ReactNode } from "react"

import { TYPOGRAPHY } from "@/lib/constants/typography"
import { SPACING, GAP } from "@/lib/constants/spacing"

/**
 * Свойства полноразмерного layout формы.
 */
export interface IFormLayoutProps {
    /** Заголовок страницы формы. */
    readonly title: string
    /** Описание формы (опционально). */
    readonly description?: string
    /** Содержимое формы (секции и группы). */
    readonly children: ReactNode
    /** Кнопки действий (Save, Cancel и т.д.). */
    readonly actions?: ReactNode
}

/**
 * Full-page form layout с заголовком, описанием и actions bar.
 *
 * @param props Конфигурация layout.
 * @returns Layout страницы с формой.
 */
export function FormLayout(props: IFormLayoutProps): ReactElement {
    return (
        <div className={`${SPACING.section} mx-auto max-w-[1400px]`}>
            <div className={SPACING.tight}>
                <h1 className={TYPOGRAPHY.pageTitle}>{props.title}</h1>
                {props.description !== undefined ? (
                    <p className={TYPOGRAPHY.bodyMuted}>{props.description}</p>
                ) : null}
            </div>
            <div className={SPACING.section}>{props.children}</div>
            {props.actions !== undefined ? (
                <div className={`flex items-center ${GAP.card} border-t border-border pt-4`}>
                    {props.actions}
                </div>
            ) : null}
        </div>
    )
}
