import { type ReactElement, type ReactNode } from "react"

import { Button } from "@heroui/react"
import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Props for the EmptyState component.
 */
export interface IEmptyStateProps {
    /** Icon element to display. */
    readonly icon?: ReactNode
    /** Empty state title. */
    readonly title: string
    /** Description text explaining the empty state. */
    readonly description?: string
    /** Optional action button label. */
    readonly actionLabel?: string
    /** Callback for the action button. */
    readonly onAction?: () => void
    /** Additional CSS classes. */
    readonly className?: string
}

/**
 * Empty state placeholder with icon, title, description, and optional CTA.
 *
 * @param props Configuration.
 * @returns Centered empty state UI.
 */
export function EmptyState(props: IEmptyStateProps): ReactElement {
    return (
        <div
            className={`flex flex-col items-center justify-center gap-3 py-12 text-center ${props.className ?? ""}`}
        >
            {props.icon !== undefined ? <div className="text-muted">{props.icon}</div> : null}
            <h3 className={TYPOGRAPHY.subsectionTitle}>{props.title}</h3>
            {props.description !== undefined ? (
                <p className="max-w-sm text-sm text-muted">{props.description}</p>
            ) : null}
            {props.actionLabel !== undefined && props.onAction !== undefined ? (
                <Button className="mt-2" size="sm" variant="secondary" onPress={props.onAction}>
                    {props.actionLabel}
                </Button>
            ) : null}
        </div>
    )
}
