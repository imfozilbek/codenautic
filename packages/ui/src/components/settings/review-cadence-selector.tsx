import { type ReactElement } from "react"

import { Button } from "@/components/ui"
import { REPO_REVIEW_MODE, type TRepoReviewMode } from "@/lib/api/endpoints/repo-config.endpoint"

interface IReviewCadenceOption {
    readonly description: string
    readonly key: TRepoReviewMode
    readonly label: string
}

const REVIEW_CADENCE_OPTIONS: ReadonlyArray<IReviewCadenceOption> = [
    {
        key: REPO_REVIEW_MODE.manual,
        label: "Manual",
        description: "Run code review only when explicitly triggered by developer.",
    },
    {
        key: REPO_REVIEW_MODE.auto,
        label: "Auto",
        description: "Run code review automatically for every repository update.",
    },
    {
        key: REPO_REVIEW_MODE.autoPause,
        label: "Auto-pause",
        description: "Auto review with safety pause when degradation signals are detected.",
    },
] as const

interface IReviewCadenceSelectorProps {
    readonly isApplyDisabled: boolean
    readonly mode: TRepoReviewMode
    readonly onApply: () => void
    readonly onModeChange: (mode: TRepoReviewMode) => void
}

function mapReviewModeToLabel(mode: TRepoReviewMode): string {
    const modeLabel = REVIEW_CADENCE_OPTIONS.find((option): boolean => option.key === mode)?.label
    if (modeLabel === undefined) {
        return "Unknown"
    }
    return modeLabel
}

/**
 * Селектор cadence режима ревью с сохранением выбранного режима.
 *
 * @param props - текущий режим и callbacks.
 * @returns UI карточка переключения cadence modes.
 */
export function ReviewCadenceSelector(props: IReviewCadenceSelectorProps): ReactElement {
    return (
        <section className="space-y-3 rounded-xl border border-border bg-white p-4">
            <h2 className="text-base font-semibold text-foreground">Review cadence settings</h2>
            <p className="text-sm text-muted-foreground">
                Choose how code review is executed for repository updates.
            </p>
            <fieldset aria-label="Review cadence mode" className="space-y-2">
                {REVIEW_CADENCE_OPTIONS.map(
                    (option): ReactElement => (
                        <label
                            key={option.key}
                            className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-3 text-sm text-foreground"
                        >
                            <input
                                checked={props.mode === option.key}
                                className="mt-1"
                                name="review-cadence-mode"
                                type="radio"
                                value={option.key}
                                onChange={(): void => {
                                    props.onModeChange(option.key)
                                }}
                            />
                            <span className="space-y-1">
                                <span className="block font-medium text-foreground">
                                    {option.label}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                    {option.description}
                                </span>
                            </span>
                        </label>
                    ),
                )}
            </fieldset>
            <p className="text-xs text-muted-foreground" data-testid="review-cadence-current">
                {`Current mode: ${mapReviewModeToLabel(props.mode)} (${props.mode})`}
            </p>
            <Button
                isDisabled={props.isApplyDisabled}
                type="button"
                variant="solid"
                onPress={props.onApply}
            >
                Apply cadence mode
            </Button>
        </section>
    )
}
