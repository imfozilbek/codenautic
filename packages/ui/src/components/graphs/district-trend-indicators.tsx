import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { useDynamicTranslation } from "@/lib/i18n"
import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Направление district-тренда.
 */
export type TDistrictTrendDirection = "improving" | "degrading" | "stable"

/**
 * Элемент district trend indicators.
 */
export interface IDistrictTrendIndicatorEntry {
    /** Идентификатор district. */
    readonly districtId: string
    /** Название district для UI. */
    readonly districtLabel: string
    /** Направление тренда для district. */
    readonly trend: TDistrictTrendDirection
    /** Delta в процентах относительно baseline. */
    readonly deltaPercentage: number
    /** Количество файлов в district. */
    readonly fileCount: number
    /** Идентификатор ключевого файла district. */
    readonly primaryFileId: string
    /** Файлы district для navigation chain. */
    readonly affectedFileIds: ReadonlyArray<string>
}

/**
 * Пропсы district trend indicators.
 */
export interface IDistrictTrendIndicatorsProps {
    /** Набор district trend entries. */
    readonly entries: ReadonlyArray<IDistrictTrendIndicatorEntry>
    /** Активный district id. */
    readonly activeDistrictId?: string
    /** Callback выбора district. */
    readonly onSelectEntry?: (entry: IDistrictTrendIndicatorEntry) => void
}

function resolveTrendLabelKey(trend: TDistrictTrendDirection): string {
    if (trend === "improving") {
        return "code-city:districtTrendComp.improving"
    }
    if (trend === "degrading") {
        return "code-city:districtTrendComp.degrading"
    }
    return "code-city:districtTrendComp.stable"
}

function resolveTrendBadgeClassName(trend: TDistrictTrendDirection): string {
    if (trend === "improving") {
        return "border-success/40 bg-success/15 text-success"
    }
    if (trend === "degrading") {
        return "border-danger/40 bg-danger/15 text-danger"
    }
    return "border-border bg-surface-muted text-foreground"
}

function resolveRowClassName(isActive: boolean): string {
    const baseClassName = isActive
        ? "border-primary bg-primary/10"
        : "border-border bg-surface hover:border-border"
    return `w-full rounded-lg border p-2 text-left transition ${baseClassName}`
}

function resolveDeltaCopyKey(trend: TDistrictTrendDirection): string {
    if (trend === "improving") {
        return "code-city:districtTrendComp.better"
    }
    if (trend === "degrading") {
        return "code-city:districtTrendComp.worse"
    }
    return "code-city:districtTrendComp.shift"
}

function TrendDirectionIcon(props: { readonly trend: TDistrictTrendDirection }): ReactElement {
    if (props.trend === "improving") {
        return (
            <svg
                aria-hidden="true"
                className="h-3.5 w-3.5 text-success"
                fill="none"
                viewBox="0 0 24 24"
            >
                <path
                    d="M5 16L12 9L16 13L21 8"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                />
                <path
                    d="M15 8H21V14"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                />
            </svg>
        )
    }
    if (props.trend === "degrading") {
        return (
            <svg
                aria-hidden="true"
                className="h-3.5 w-3.5 text-danger"
                fill="none"
                viewBox="0 0 24 24"
            >
                <path
                    d="M5 8L12 15L16 11L21 16"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                />
                <path
                    d="M15 16H21V10"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                />
            </svg>
        )
    }
    return (
        <svg
            aria-hidden="true"
            className="h-3.5 w-3.5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
        >
            <path
                d="M4 12H20"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
            />
            <path
                d="M16 8L20 12L16 16"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
            />
        </svg>
    )
}

/**
 * District trend indicators: стрелки/иконки тренда (improvement/degradation) по районам CodeCity.
 *
 * @param props Данные district trends и callback выбора.
 * @returns React-компонент district indicators.
 */
export function DistrictTrendIndicators(props: IDistrictTrendIndicatorsProps): ReactElement {
    const { t } = useTranslation(["code-city"])
    const { td } = useDynamicTranslation(["code-city"])
    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>{t("code-city:districtTrendComp.title")}</p>
            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                {t("code-city:districtTrendComp.description")}
            </p>

            <ul aria-label={t("code-city:districtTrendComp.ariaList")} className="mt-3 space-y-2">
                {props.entries.map((entry): ReactElement => {
                    const isActive = props.activeDistrictId === entry.districtId
                    const trendLabel = td(resolveTrendLabelKey(entry.trend))
                    return (
                        <li key={entry.districtId}>
                            <button
                                aria-label={t("code-city:districtTrendComp.ariaInspect", {
                                    label: entry.districtLabel,
                                })}
                                className={resolveRowClassName(isActive)}
                                onClick={(): void => {
                                    props.onSelectEntry?.(entry)
                                }}
                                type="button"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className={`truncate ${TYPOGRAPHY.cardTitle}`}>
                                            {entry.districtLabel}
                                        </p>
                                        <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                                            {t("code-city:districtTrendComp.filesCount", {
                                                count: entry.fileCount,
                                            })}{" "}
                                            ·{" "}
                                            {td(resolveDeltaCopyKey(entry.trend), {
                                                value: Math.abs(entry.deltaPercentage),
                                            })}
                                        </p>
                                    </div>
                                    <span
                                        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 ${TYPOGRAPHY.micro} ${resolveTrendBadgeClassName(entry.trend)}`}
                                    >
                                        <TrendDirectionIcon trend={entry.trend} />
                                        {trendLabel}
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
