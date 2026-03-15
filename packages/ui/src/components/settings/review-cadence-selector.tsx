import { type ReactElement, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@heroui/react"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { REPO_REVIEW_MODE, type TRepoReviewMode } from "@/lib/api/endpoints/repo-config.endpoint"

interface IReviewCadenceOption {
    readonly description: string
    readonly key: TRepoReviewMode
    readonly label: string
}

interface IReviewCadenceSelectorProps {
    readonly isApplyDisabled: boolean
    readonly mode: TRepoReviewMode
    readonly onApply: () => void
    readonly onModeChange: (mode: TRepoReviewMode) => void
}

/**
 * Селектор cadence режима ревью с сохранением выбранного режима.
 *
 * @param props - текущий режим и callbacks.
 * @returns UI карточка переключения cadence modes.
 */
export function ReviewCadenceSelector(props: IReviewCadenceSelectorProps): ReactElement {
    const { t } = useTranslation(["settings"])

    const cadenceOptions: ReadonlyArray<IReviewCadenceOption> = useMemo(
        (): ReadonlyArray<IReviewCadenceOption> => [
            {
                key: REPO_REVIEW_MODE.manual,
                label: t("settings:reviewCadenceSelector.modeManual"),
                description: t("settings:reviewCadenceSelector.modeManualDescription"),
            },
            {
                key: REPO_REVIEW_MODE.auto,
                label: t("settings:reviewCadenceSelector.modeAuto"),
                description: t("settings:reviewCadenceSelector.modeAutoDescription"),
            },
            {
                key: REPO_REVIEW_MODE.autoPause,
                label: t("settings:reviewCadenceSelector.modeAutoPause"),
                description: t("settings:reviewCadenceSelector.modeAutoPauseDescription"),
            },
        ],
        [t],
    )

    const mapReviewModeToLabel = (mode: TRepoReviewMode): string => {
        const modeLabel = cadenceOptions.find((option): boolean => option.key === mode)?.label
        if (modeLabel === undefined) {
            return t("settings:reviewCadenceSelector.modeUnknown")
        }
        return modeLabel
    }

    return (
        <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
            <h2 className={TYPOGRAPHY.sectionTitle}>{t("settings:reviewCadenceSelector.title")}</h2>
            <p className="text-sm text-muted">{t("settings:reviewCadenceSelector.description")}</p>
            <fieldset
                aria-label={t("settings:reviewCadenceSelector.fieldsetAriaLabel")}
                className="space-y-2"
            >
                {cadenceOptions.map(
                    (option): ReactElement => (
                        <label
                            key={option.key}
                            className={`flex cursor-pointer items-start gap-2 rounded-md border border-border p-3 ${TYPOGRAPHY.body}`}
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
                                <span className={`block ${TYPOGRAPHY.captionMuted}`}>
                                    {option.description}
                                </span>
                            </span>
                        </label>
                    ),
                )}
            </fieldset>
            <p className={TYPOGRAPHY.captionMuted} data-testid="review-cadence-current">
                {t("settings:reviewCadenceSelector.currentMode", {
                    label: mapReviewModeToLabel(props.mode),
                    mode: props.mode,
                })}
            </p>
            <Button
                variant="primary"
                isDisabled={props.isApplyDisabled}
                type="button"
                onPress={props.onApply}
            >
                {t("settings:reviewCadenceSelector.applyCadenceMode")}
            </Button>
        </section>
    )
}
