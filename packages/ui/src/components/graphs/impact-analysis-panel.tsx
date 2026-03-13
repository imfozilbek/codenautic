import { useMemo, useState, type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Элемент impact seed для анализа blast radius.
 */
export interface IImpactAnalysisSeed {
    /** Уникальный id записи. */
    readonly id: string
    /** File id для синхронизации с CodeCity. */
    readonly fileId: string
    /** Человекочитаемая подпись файла. */
    readonly label: string
    /** Затронутые файлы. */
    readonly affectedFiles: ReadonlyArray<string>
    /** Затронутые тесты. */
    readonly affectedTests: ReadonlyArray<string>
    /** Затронутые consumer-модули. */
    readonly affectedConsumers: ReadonlyArray<string>
    /** Индивидуальный risk score. */
    readonly riskScore: number
}

/**
 * Payload выбранного impact-сценария.
 */
export interface IImpactAnalysisSelection {
    /** Выбранный primary file id. */
    readonly fileId: string
    /** Подпись primary файла. */
    readonly label: string
    /** Агрегированный risk score. */
    readonly riskScore: number
    /** Агрегированный blast radius. */
    readonly affectedFiles: ReadonlyArray<string>
}

/**
 * Пропсы impact analysis panel.
 */
export interface IImpactAnalysisPanelProps {
    /** Набор файлов для анализа impact. */
    readonly seeds: ReadonlyArray<IImpactAnalysisSeed>
    /** Callback применения impact-фокуса. */
    readonly onApplyImpact?: (selection: IImpactAnalysisSelection) => void
}

interface IImpactAggregate {
    /** Агрегированный список файлов. */
    readonly affectedFiles: ReadonlyArray<string>
    /** Агрегированный список тестов. */
    readonly affectedTests: ReadonlyArray<string>
    /** Агрегированный список consumer-ов. */
    readonly affectedConsumers: ReadonlyArray<string>
    /** Средний risk score. */
    readonly riskScore: number
}

/**
 * Объединяет blast radius по выбранным seed-элементам.
 *
 * @param selectedSeeds Выбранные seed-элементы.
 * @returns Агрегированный impact.
 */
function aggregateImpact(selectedSeeds: ReadonlyArray<IImpactAnalysisSeed>): IImpactAggregate {
    if (selectedSeeds.length === 0) {
        return {
            affectedConsumers: [],
            affectedFiles: [],
            affectedTests: [],
            riskScore: 0,
        }
    }

    const affectedFileSet = new Set<string>()
    const affectedTestSet = new Set<string>()
    const affectedConsumerSet = new Set<string>()

    selectedSeeds.forEach((seed): void => {
        seed.affectedFiles.forEach((file): void => {
            affectedFileSet.add(file)
        })
        seed.affectedTests.forEach((test): void => {
            affectedTestSet.add(test)
        })
        seed.affectedConsumers.forEach((consumer): void => {
            affectedConsumerSet.add(consumer)
        })
    })

    const averageRiskScore = Math.round(
        selectedSeeds.reduce((total, seed): number => total + seed.riskScore, 0) /
            selectedSeeds.length,
    )

    return {
        affectedConsumers: [...affectedConsumerSet],
        affectedFiles: [...affectedFileSet],
        affectedTests: [...affectedTestSet],
        riskScore: averageRiskScore,
    }
}

/**
 * Панель blast radius анализа для выбранных файлов.
 *
 * @param props Набор seed-элементов и callback.
 * @returns React-компонент impact panel.
 */
export function ImpactAnalysisPanel(props: IImpactAnalysisPanelProps): ReactElement {
    const { t } = useTranslation(["code-city"])
    const [selectedSeedIds, setSelectedSeedIds] = useState<ReadonlyArray<string>>([])

    const selectedSeeds = useMemo((): ReadonlyArray<IImpactAnalysisSeed> => {
        return props.seeds.filter((seed): boolean => selectedSeedIds.includes(seed.id))
    }, [props.seeds, selectedSeedIds])
    const aggregatedImpact = useMemo((): IImpactAggregate => {
        return aggregateImpact(selectedSeeds)
    }, [selectedSeeds])

    const toggleSeed = (seedId: string): void => {
        setSelectedSeedIds((currentIds): ReadonlyArray<string> => {
            if (currentIds.includes(seedId)) {
                return currentIds.filter((id): boolean => id !== seedId)
            }
            return [...currentIds, seedId]
        })
    }

    const primarySeed = selectedSeeds[0]

    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>{t("code-city:impactAnalysisComp.title")}</p>
            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                {t("code-city:impactAnalysisComp.description")}
            </p>

            <ul className="mt-3 space-y-2">
                {props.seeds.slice(0, 6).map(
                    (seed): ReactElement => (
                        <li
                            className="flex items-start gap-2 rounded border border-border bg-surface p-2"
                            key={seed.id}
                        >
                            <input
                                aria-label={t("code-city:impactAnalysisComp.ariaSelectFile", { label: seed.label })}
                                checked={selectedSeedIds.includes(seed.id)}
                                className="mt-0.5 h-4 w-4 rounded border-border"
                                onChange={(): void => {
                                    toggleSeed(seed.id)
                                }}
                                type="checkbox"
                            />
                            <div className="min-w-0">
                                <p className={TYPOGRAPHY.cardTitle}>
                                    {seed.label}
                                </p>
                                <p className={TYPOGRAPHY.captionMuted}>
                                    {t("code-city:impactAnalysisComp.individualRisk", { score: seed.riskScore })}
                                </p>
                            </div>
                        </li>
                    ),
                )}
            </ul>

            <div className="mt-3 rounded border border-primary/30 bg-primary/10 p-2">
                <p className={`${TYPOGRAPHY.overline} text-on-primary`}>
                    {t("code-city:impactAnalysisComp.aggregatedRiskScore")}
                </p>
                <p className="text-lg font-semibold text-on-primary">
                    {String(aggregatedImpact.riskScore)}
                </p>
                <p className="text-xs text-on-primary">
                    {t("code-city:impactAnalysisComp.selectedFiles", { count: selectedSeeds.length })}
                </p>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-3">
                <div className="rounded border border-border bg-surface p-2">
                    <p className={`${TYPOGRAPHY.micro} text-muted-foreground`}>{t("code-city:impactAnalysisComp.affectedFiles")}</p>
                    <p className="mt-1 text-xs text-foreground">
                        {aggregatedImpact.affectedFiles.length === 0
                            ? t("code-city:impactAnalysisComp.none")
                            : aggregatedImpact.affectedFiles.join(", ")}
                    </p>
                </div>
                <div className="rounded border border-border bg-surface p-2">
                    <p className={`${TYPOGRAPHY.micro} text-muted-foreground`}>{t("code-city:impactAnalysisComp.affectedTests")}</p>
                    <p className="mt-1 text-xs text-foreground">
                        {aggregatedImpact.affectedTests.length === 0
                            ? t("code-city:impactAnalysisComp.none")
                            : aggregatedImpact.affectedTests.join(", ")}
                    </p>
                </div>
                <div className="rounded border border-border bg-surface p-2">
                    <p className={`${TYPOGRAPHY.micro} text-muted-foreground`}>{t("code-city:impactAnalysisComp.consumers")}</p>
                    <p className="mt-1 text-xs text-foreground">
                        {aggregatedImpact.affectedConsumers.length === 0
                            ? t("code-city:impactAnalysisComp.none")
                            : aggregatedImpact.affectedConsumers.join(", ")}
                    </p>
                </div>
            </div>

            <button
                aria-label={t("code-city:impactAnalysisComp.ariaApplyFocus")}
                className="mt-3 rounded border border-primary/40 bg-primary/20 px-2 py-1 text-xs font-semibold text-on-primary hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={primarySeed === undefined}
                onClick={(): void => {
                    if (primarySeed === undefined) {
                        return
                    }
                    props.onApplyImpact?.({
                        affectedFiles: aggregatedImpact.affectedFiles,
                        fileId: primarySeed.fileId,
                        label: primarySeed.label,
                        riskScore: aggregatedImpact.riskScore,
                    })
                }}
                type="button"
            >
                {t("code-city:impactAnalysisComp.focusImpactRadius")}
            </button>
        </section>
    )
}
