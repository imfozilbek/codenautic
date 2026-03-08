import { type ReactElement } from "react"

import { Skeleton } from "@/components/ui"

/**
 * Props for the LoadingState component.
 */
export interface ILoadingStateProps {
    /** Number of skeleton rows to display. */
    readonly rows?: number
    /** Additional CSS classes. */
    readonly className?: string
}

/**
 * Loading state with shimmer skeletons.
 *
 * @param props Configuration.
 * @returns Skeleton loading placeholder.
 */
export function LoadingState(props: ILoadingStateProps): ReactElement {
    const rows = props.rows ?? 3

    return (
        <div className={`space-y-3 ${props.className ?? ""}`}>
            {Array.from({ length: rows }).map(
                (_, index): ReactElement => (
                    <Skeleton
                        className="shimmer h-12 w-full rounded-lg"
                        key={`loading-row-${String(index)}`}
                    />
                ),
            )}
        </div>
    )
}
