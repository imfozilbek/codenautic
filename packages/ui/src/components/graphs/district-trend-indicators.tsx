import type { ReactElement } from "react"

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

function resolveTrendLabel(trend: TDistrictTrendDirection): string {
    if (trend === "improving") {
        return "Improving"
    }
    if (trend === "degrading") {
        return "Degrading"
    }
    return "Stable"
}

function resolveTrendBadgeClassName(trend: TDistrictTrendDirection): string {
    if (trend === "improving") {
        return "border-emerald-300 bg-emerald-100 text-emerald-800"
    }
    if (trend === "degrading") {
        return "border-rose-300 bg-rose-100 text-rose-800"
    }
    return "border-slate-300 bg-slate-100 text-slate-700"
}

function resolveRowClassName(isActive: boolean): string {
    const baseClassName = isActive
        ? "border-cyan-400 bg-cyan-50"
        : "border-slate-200 bg-slate-50 hover:border-slate-300"
    return `w-full rounded-lg border p-2 text-left transition ${baseClassName}`
}

function resolveDeltaCopy(
    trend: TDistrictTrendDirection,
    deltaPercentage: number,
): string {
    const absoluteValue = Math.abs(deltaPercentage)
    if (trend === "improving") {
        return `${String(absoluteValue)}% better`
    }
    if (trend === "degrading") {
        return `${String(absoluteValue)}% worse`
    }
    return `${String(absoluteValue)}% shift`
}

function TrendDirectionIcon(props: { readonly trend: TDistrictTrendDirection }): ReactElement {
    if (props.trend === "improving") {
        return (
            <svg
                aria-hidden="true"
                className="h-3.5 w-3.5 text-emerald-700"
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
                className="h-3.5 w-3.5 text-rose-700"
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
            className="h-3.5 w-3.5 text-slate-600"
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
export function DistrictTrendIndicators(
    props: IDistrictTrendIndicatorsProps,
): ReactElement {
    return (
        <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">District trend indicators</p>
            <p className="mt-1 text-xs text-slate-500">
                CodeCity districts show improvement or degradation using trend arrows: green up and
                red down.
            </p>

            <ul aria-label="District trend indicators" className="mt-3 space-y-2">
                {props.entries.map((entry): ReactElement => {
                    const isActive = props.activeDistrictId === entry.districtId
                    const trendLabel = resolveTrendLabel(entry.trend)
                    return (
                        <li key={entry.districtId}>
                            <button
                                aria-label={`Inspect district trend ${entry.districtLabel}`}
                                className={resolveRowClassName(isActive)}
                                onClick={(): void => {
                                    props.onSelectEntry?.(entry)
                                }}
                                type="button"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-900">
                                            {entry.districtLabel}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-600">
                                            {String(entry.fileCount)} files ·{" "}
                                            {resolveDeltaCopy(entry.trend, entry.deltaPercentage)}
                                        </p>
                                    </div>
                                    <span
                                        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${resolveTrendBadgeClassName(entry.trend)}`}
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
