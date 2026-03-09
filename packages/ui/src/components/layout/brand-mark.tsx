import { type ReactElement } from "react"

/**
 * Свойства brand mark компонента.
 */
export interface IBrandMarkProps {
    /** Компактный режим (collapsed sidebar). */
    readonly isCompact?: boolean
}

/**
 * Animated brand mark для sidebar logo area.
 * Содержит CSS gradient animation и компактный/полный режимы.
 *
 * @param props Конфигурация brand mark.
 * @returns Brand mark с gradient animation.
 */
export function BrandMark(props: IBrandMarkProps): ReactElement {
    const isCompact = props.isCompact === true

    return (
        <div className="relative flex items-center gap-2 overflow-hidden px-1 py-1.5">
            <div className="brand-mark-logo relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary">
                <span className="text-xs font-bold text-primary-foreground">CN</span>
            </div>
            {isCompact !== true ? (
                <span className="font-display text-sm font-semibold tracking-tight text-foreground">
                    CN
                </span>
            ) : null}
        </div>
    )
}
