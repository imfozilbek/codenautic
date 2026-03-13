import { useMemo, useState, type ChangeEvent, type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import type { IRefactoringTargetDescriptor } from "@/components/graphs/refactoring-dashboard"
import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Пропсы ROI calculator widget.
 */
export interface IROICalculatorWidgetProps {
    /** Набор таргетов для моделирования ROI. */
    readonly targets: ReadonlyArray<IRefactoringTargetDescriptor>
    /** Callback применения выбранного сценария. */
    readonly onApplyScenario?: (fileIds: ReadonlyArray<string>) => void
}

/**
 * Рассчитывает агрегированный ROI score для выбранного сценария.
 *
 * @param selectedTargets Выбранные таргеты.
 * @param riskWeight Вес риска в процентах.
 * @param effortWeight Вес effort в процентах.
 * @returns Округлённый ROI score.
 */
function calculateScenarioRoiScore(
    selectedTargets: ReadonlyArray<IRefactoringTargetDescriptor>,
    riskWeight: number,
    effortWeight: number,
): number {
    if (selectedTargets.length === 0) {
        return 0
    }

    const weightedScore = selectedTargets.reduce((score, target): number => {
        const riskImpact = target.riskScore * (riskWeight / 100)
        const effortPenalty = target.effortScore * (effortWeight / 100) * 4
        return score + target.roiScore + riskImpact - effortPenalty
    }, 0)

    return Math.round(weightedScore / selectedTargets.length)
}

/**
 * ROI calculator для сценариев рефакторинга.
 *
 * @param props Набор таргетов и callback применения.
 * @returns React-компонент калькулятора.
 */
export function ROICalculatorWidget(props: IROICalculatorWidgetProps): ReactElement {
    const { t } = useTranslation(["code-city"])
    const [selectedTargetIds, setSelectedTargetIds] = useState<ReadonlyArray<string>>([])
    const [riskWeight, setRiskWeight] = useState<number>(50)
    const [effortWeight, setEffortWeight] = useState<number>(50)

    const selectedTargets = useMemo((): ReadonlyArray<IRefactoringTargetDescriptor> => {
        return props.targets.filter((target): boolean => {
            return selectedTargetIds.includes(target.id)
        })
    }, [props.targets, selectedTargetIds])

    const scenarioRoiScore = useMemo((): number => {
        return calculateScenarioRoiScore(selectedTargets, riskWeight, effortWeight)
    }, [effortWeight, riskWeight, selectedTargets])

    const toggleTargetSelection = (targetId: string): void => {
        setSelectedTargetIds((currentIds): ReadonlyArray<string> => {
            if (currentIds.includes(targetId)) {
                return currentIds.filter((id): boolean => id !== targetId)
            }
            return [...currentIds, targetId]
        })
    }

    const handleRiskWeightChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setRiskWeight(Number(event.currentTarget.value))
    }

    const handleEffortWeightChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setEffortWeight(Number(event.currentTarget.value))
    }

    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>{t("code-city:roiCalculator.title")}</p>
            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                {t("code-city:roiCalculator.description")}
            </p>

            <ul className="mt-3 space-y-2">
                {props.targets.slice(0, 6).map(
                    (target): ReactElement => (
                        <li
                            className="flex items-start gap-2 rounded border border-border bg-surface p-2"
                            key={target.id}
                        >
                            <input
                                aria-label={t("code-city:roiCalculator.ariaLabelSelectTarget", { title: target.title })}
                                checked={selectedTargetIds.includes(target.id)}
                                className="mt-0.5 h-4 w-4 rounded border-border"
                                onChange={(): void => {
                                    toggleTargetSelection(target.id)
                                }}
                                type="checkbox"
                            />
                            <div className="min-w-0">
                                <p className={TYPOGRAPHY.cardTitle}>
                                    {target.title}
                                </p>
                                <p className={TYPOGRAPHY.captionMuted}>
                                    {t("code-city:roiCalculator.targetMeta", { roi: String(target.roiScore), risk: String(target.riskScore), effort: String(target.effortScore) })}
                                </p>
                            </div>
                        </li>
                    ),
                )}
            </ul>

            <label className="mt-3 block space-y-1" htmlFor="roi-risk-weight">
                <span className={TYPOGRAPHY.overline}>
                    {t("code-city:roiCalculator.riskWeight", { value: String(riskWeight) })}
                </span>
                <input
                    aria-label={t("code-city:roiCalculator.ariaLabelRiskWeight")}
                    id="roi-risk-weight"
                    max={100}
                    min={0}
                    onChange={handleRiskWeightChange}
                    type="range"
                    value={riskWeight}
                />
            </label>

            <label className="mt-2 block space-y-1" htmlFor="roi-effort-weight">
                <span className={TYPOGRAPHY.overline}>
                    {t("code-city:roiCalculator.effortWeight", { value: String(effortWeight) })}
                </span>
                <input
                    aria-label={t("code-city:roiCalculator.ariaLabelEffortWeight")}
                    id="roi-effort-weight"
                    max={100}
                    min={0}
                    onChange={handleEffortWeightChange}
                    type="range"
                    value={effortWeight}
                />
            </label>

            <div className="mt-3 rounded border border-primary/30 bg-primary/10 p-2">
                <p className={`${TYPOGRAPHY.overline} text-on-primary`}>
                    {t("code-city:roiCalculator.estimatedRoiScore")}
                </p>
                <p className="text-lg font-semibold text-on-primary">{String(scenarioRoiScore)}</p>
                <p className="text-xs text-on-primary">
                    {t("code-city:roiCalculator.selectedFiles", { count: selectedTargets.length })}
                </p>
            </div>

            <button
                aria-label={t("code-city:roiCalculator.ariaLabelApply")}
                className="mt-2 rounded border border-primary/40 bg-primary/20 px-2 py-1 text-xs font-semibold text-on-primary hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={selectedTargets.length === 0}
                onClick={(): void => {
                    props.onApplyScenario?.(selectedTargets.map((target): string => target.fileId))
                }}
                type="button"
            >
                {t("code-city:roiCalculator.applyScenario")}
            </button>
        </section>
    )
}
