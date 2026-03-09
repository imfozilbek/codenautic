import type { ReactElement } from "react"

import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Историческая точка риска для gauge виджета.
 */
export interface IChangeRiskGaugePoint {
    /** Подпись периода. */
    readonly label: string
    /** Значение риска. */
    readonly score: number
}

/**
 * Пропсы change risk gauge.
 */
export interface IChangeRiskGaugeProps {
    /** Текущий риск proposed change. */
    readonly currentScore: number
    /** Исторические значения риска. */
    readonly historicalPoints: ReadonlyArray<IChangeRiskGaugePoint>
    /** Callback выбора исторической точки. */
    readonly onSelectHistoricalPoint?: (point: IChangeRiskGaugePoint) => void
}

/**
 * Возвращает статус зоны риска.
 *
 * @param score Значение риска.
 * @returns Лейбл зоны.
 */
function resolveRiskZone(score: number): "green" | "red" | "yellow" {
    if (score >= 70) {
        return "red"
    }
    if (score >= 40) {
        return "yellow"
    }
    return "green"
}

/**
 * Виджет change risk gauge с historical comparison.
 *
 * @param props Текущий риск и история.
 * @returns React-компонент gauge.
 */
export function ChangeRiskGauge(props: IChangeRiskGaugeProps): ReactElement {
    const clampedScore = Math.max(0, Math.min(100, props.currentScore))
    const riskZone = resolveRiskZone(clampedScore)

    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Change risk gauge</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Green / yellow / red risk zones with historical comparison points.
            </p>

            <div className="mt-3 space-y-2">
                <div className="flex h-2 overflow-hidden rounded-full border border-border">
                    <div className="h-full w-2/5 bg-success/70" />
                    <div className="h-full w-[30%] bg-warning/70" />
                    <div className="h-full flex-1 bg-danger/70" />
                </div>
                <div
                    className={`flex items-center justify-between ${TYPOGRAPHY.micro} text-muted-foreground`}
                >
                    <span>Green</span>
                    <span>Yellow</span>
                    <span>Red</span>
                </div>
                <div className="rounded border border-primary/30 bg-primary/10 p-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-on-primary">
                        Current risk score
                    </p>
                    <p className="text-lg font-semibold text-on-primary">{String(clampedScore)}</p>
                    <p className="text-xs text-on-primary">Zone: {riskZone}</p>
                </div>
            </div>

            <ul className="mt-3 space-y-2">
                {props.historicalPoints.map((point): ReactElement => {
                    const delta = clampedScore - point.score
                    return (
                        <li
                            className="flex items-center justify-between gap-2 rounded border border-border bg-surface p-2"
                            key={point.label}
                        >
                            <div>
                                <p className="text-sm font-semibold text-foreground">
                                    {point.label}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Historical {String(point.score)} · Delta{" "}
                                    {delta > 0 ? `+${String(delta)}` : String(delta)}
                                </p>
                            </div>
                            <button
                                aria-label={`Inspect risk point ${point.label}`}
                                className="rounded border border-primary/40 bg-primary/20 px-2 py-1 text-xs font-semibold text-on-primary hover:border-primary"
                                onClick={(): void => {
                                    props.onSelectHistoricalPoint?.(point)
                                }}
                                type="button"
                            >
                                Inspect
                            </button>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
