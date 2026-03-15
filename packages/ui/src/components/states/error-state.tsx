import { type ReactElement } from "react"

import { Button } from "@heroui/react"
import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Props for the ErrorState component.
 */
export interface IErrorStateProps {
    /** Error title. */
    readonly title?: string
    /** Error description or message. */
    readonly description: string
    /** Label for the retry button. */
    readonly retryLabel?: string
    /** Callback for retry action. */
    readonly onRetry?: () => void
    /** Additional CSS classes. */
    readonly className?: string
}

/**
 * Error state with danger styling and optional retry action.
 *
 * @param props Configuration.
 * @returns Centered error state UI.
 */
export function ErrorState(props: IErrorStateProps): ReactElement {
    return (
        <div
            className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-danger/20 bg-danger/5 py-10 text-center ${props.className ?? ""}`}
        >
            <div className="text-danger">
                <svg
                    aria-hidden="true"
                    className="h-10 w-10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                >
                    <path
                        d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            <h3 className={TYPOGRAPHY.subsectionTitle}>{props.title ?? "Something went wrong"}</h3>
            <p className="max-w-sm text-sm text-muted">{props.description}</p>
            {props.onRetry !== undefined ? (
                <Button className="mt-2" size="sm" variant="secondary" onPress={props.onRetry}>
                    {props.retryLabel ?? "Retry"}
                </Button>
            ) : null}
        </div>
    )
}
