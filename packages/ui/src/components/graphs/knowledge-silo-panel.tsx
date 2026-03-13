import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Элемент панели knowledge silo.
 */
export interface IKnowledgeSiloPanelEntry {
    /** Идентификатор silo (обычно package/district). */
    readonly siloId: string
    /** Отображаемый label silo. */
    readonly siloLabel: string
    /** Суммарный риск score по silo (0..100). */
    readonly riskScore: number
    /** Количество контрибьюторов в silo. */
    readonly contributorCount: number
    /** Количество файлов в silo. */
    readonly fileCount: number
    /** Набор file ids для фокуса в city. */
    readonly fileIds: ReadonlyArray<string>
    /** Файл для первичного highlight. */
    readonly primaryFileId: string
}

/**
 * Пропсы knowledge silo панели.
 */
export interface IKnowledgeSiloPanelProps {
    /** Список silo entries. */
    readonly entries: ReadonlyArray<IKnowledgeSiloPanelEntry>
    /** Активный silo. */
    readonly activeSiloId?: string
    /** Колбэк выбора silo. */
    readonly onSelectEntry?: (entry: IKnowledgeSiloPanelEntry) => void
}

function resolveRiskClassName(riskScore: number): string {
    if (riskScore >= 75) {
        return "border-danger/40 bg-danger/20 text-danger"
    }
    if (riskScore >= 45) {
        return "border-warning/40 bg-warning/20 text-on-warning"
    }
    return "border-success/40 bg-success/20 text-success"
}

function resolveEntryClassName(isActive: boolean): string {
    return [
        "w-full rounded-lg border p-2 text-left transition",
        isActive ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-border",
    ].join(" ")
}

/**
 * Панель knowledge silo: список рисковых зон владения с переходом в CodeCity.
 *
 * @param props Набор silo entries и callback выбора.
 * @returns React-компонент knowledge silo панели.
 */
export function KnowledgeSiloPanel(props: IKnowledgeSiloPanelProps): ReactElement {
    const { t } = useTranslation(["code-city"])
    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>{t("code-city:knowledgeSiloComp.title")}</p>
            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                {t("code-city:knowledgeSiloComp.description")}
            </p>

            <ul aria-label={t("code-city:knowledgeSiloComp.ariaList")} className="mt-3 space-y-2">
                {props.entries.map((entry): ReactElement => {
                    const isActive = props.activeSiloId === entry.siloId

                    return (
                        <li key={entry.siloId}>
                            <button
                                aria-label={t("code-city:knowledgeSiloComp.ariaInspect", { label: entry.siloLabel })}
                                className={resolveEntryClassName(isActive)}
                                type="button"
                                onClick={(): void => {
                                    props.onSelectEntry?.(entry)
                                }}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className={`truncate ${TYPOGRAPHY.cardTitle}`}>
                                            {entry.siloLabel}
                                        </p>
                                        <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                                            {t("code-city:knowledgeSiloComp.contributorsFiles", { contributors: entry.contributorCount, files: entry.fileCount })}
                                        </p>
                                    </div>
                                    <span
                                        className={`rounded border px-2 py-0.5 ${TYPOGRAPHY.micro} ${resolveRiskClassName(entry.riskScore)}`}
                                    >
                                        {t("code-city:knowledgeSiloComp.riskLabel", { score: entry.riskScore })}
                                    </span>
                                </div>
                            </button>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
