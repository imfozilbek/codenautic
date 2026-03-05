import type { ReactElement } from "react"
import { useMemo, useState } from "react"

/**
 * Период ранжирования leaderboard.
 */
export type TTeamLeaderboardPeriod = "sprint" | "month" | "quarter"

/**
 * Метрика сортировки leaderboard.
 */
export type TTeamLeaderboardMetric = "quality" | "velocity" | "ownership"

/**
 * Периодические score-значения.
 */
export interface ITeamLeaderboardPeriodScores {
    readonly sprint: number
    readonly month: number
    readonly quarter: number
}

/**
 * Модель строки leaderboard.
 */
export interface ITeamLeaderboardEntry {
    /** Owner id. */
    readonly ownerId: string
    /** Display name. */
    readonly ownerName: string
    /** Основной файл для быстрого фокуса. */
    readonly primaryFileId: string
    /** Цепочка файлов owner-а. */
    readonly fileIds: ReadonlyArray<string>
    /** Score по quality. */
    readonly quality: ITeamLeaderboardPeriodScores
    /** Score по velocity. */
    readonly velocity: ITeamLeaderboardPeriodScores
    /** Score по ownership. */
    readonly ownership: ITeamLeaderboardPeriodScores
}

/**
 * Пропсы team leaderboard.
 */
export interface ITeamLeaderboardProps {
    /** Участники leaderboard. */
    readonly entries: ReadonlyArray<ITeamLeaderboardEntry>
    /** Активный owner. */
    readonly activeOwnerId?: string
    /** Выбор owner-а из leaderboard. */
    readonly onSelectEntry?: (entry: ITeamLeaderboardEntry) => void
}

function resolveMetricButtonClassName(isActive: boolean): string {
    const baseClassName = isActive
        ? "border-cyan-400 bg-cyan-500/15 text-cyan-900"
        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
    return `rounded border px-2 py-1 text-xs font-semibold transition ${baseClassName}`
}

function resolvePeriodButtonClassName(isActive: boolean): string {
    const baseClassName = isActive
        ? "border-emerald-400 bg-emerald-500/15 text-emerald-900"
        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
    return `rounded border px-2 py-1 text-xs font-semibold uppercase transition ${baseClassName}`
}

function resolveRowClassName(isActive: boolean): string {
    const baseClassName = isActive
        ? "border-cyan-400 bg-cyan-50"
        : "border-slate-200 bg-slate-50 hover:border-slate-300"
    return `w-full rounded-lg border p-2 text-left transition ${baseClassName}`
}

function readScoreBySelection(
    entry: ITeamLeaderboardEntry,
    metric: TTeamLeaderboardMetric,
    period: TTeamLeaderboardPeriod,
): number {
    if (metric === "quality") {
        return entry.quality[period]
    }
    if (metric === "velocity") {
        return entry.velocity[period]
    }
    return entry.ownership[period]
}

/**
 * Team leaderboard widget: сортировка по метрике + переключение периодов sprint/month/quarter.
 *
 * @param props Входные leaderboard entries и callback выбора.
 * @returns React-компонент leaderboard.
 */
export function TeamLeaderboard(props: ITeamLeaderboardProps): ReactElement {
    const [activeMetric, setActiveMetric] = useState<TTeamLeaderboardMetric>("quality")
    const [activePeriod, setActivePeriod] = useState<TTeamLeaderboardPeriod>("sprint")

    const orderedEntries = useMemo((): ReadonlyArray<ITeamLeaderboardEntry> => {
        return [...props.entries].sort((leftEntry, rightEntry): number => {
            const rightScore = readScoreBySelection(rightEntry, activeMetric, activePeriod)
            const leftScore = readScoreBySelection(leftEntry, activeMetric, activePeriod)
            if (rightScore !== leftScore) {
                return rightScore - leftScore
            }
            return leftEntry.ownerName.localeCompare(rightEntry.ownerName)
        })
    }, [activeMetric, activePeriod, props.entries])

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Team leaderboard</p>
            <p className="mt-1 text-xs text-slate-500">
                Team quality ranking with metric sorting and sprint/month/quarter toggles.
            </p>

            <div aria-label="Leaderboard metric" className="mt-3 flex flex-wrap gap-2">
                <button
                    className={resolveMetricButtonClassName(activeMetric === "quality")}
                    onClick={(): void => {
                        setActiveMetric("quality")
                    }}
                    type="button"
                >
                    Metric quality
                </button>
                <button
                    className={resolveMetricButtonClassName(activeMetric === "velocity")}
                    onClick={(): void => {
                        setActiveMetric("velocity")
                    }}
                    type="button"
                >
                    Metric velocity
                </button>
                <button
                    className={resolveMetricButtonClassName(activeMetric === "ownership")}
                    onClick={(): void => {
                        setActiveMetric("ownership")
                    }}
                    type="button"
                >
                    Metric ownership
                </button>
            </div>

            <div aria-label="Leaderboard period" className="mt-2 flex flex-wrap gap-2">
                <button
                    className={resolvePeriodButtonClassName(activePeriod === "sprint")}
                    onClick={(): void => {
                        setActivePeriod("sprint")
                    }}
                    type="button"
                >
                    Sprint
                </button>
                <button
                    className={resolvePeriodButtonClassName(activePeriod === "month")}
                    onClick={(): void => {
                        setActivePeriod("month")
                    }}
                    type="button"
                >
                    Month
                </button>
                <button
                    className={resolvePeriodButtonClassName(activePeriod === "quarter")}
                    onClick={(): void => {
                        setActivePeriod("quarter")
                    }}
                    type="button"
                >
                    Quarter
                </button>
            </div>

            <ol aria-label="Team leaderboard ranking" className="mt-3 space-y-2">
                {orderedEntries.map((entry, index): ReactElement => {
                    const isActive = props.activeOwnerId === entry.ownerId
                    const score = readScoreBySelection(entry, activeMetric, activePeriod)
                    return (
                        <li key={entry.ownerId}>
                            <button
                                aria-label={`Inspect leaderboard contributor ${entry.ownerName}`}
                                className={resolveRowClassName(isActive)}
                                onClick={(): void => {
                                    props.onSelectEntry?.(entry)
                                }}
                                type="button"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-900">
                                            {String(index + 1)}. {entry.ownerName}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-600">
                                            Score {String(score)} · {entry.fileIds.length} files
                                        </p>
                                    </div>
                                    <span className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                                        {activeMetric}
                                    </span>
                                </div>
                            </button>
                        </li>
                    )
                })}
            </ol>
        </section>
    )
}
