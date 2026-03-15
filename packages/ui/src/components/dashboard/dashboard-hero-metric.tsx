import { type ReactElement, useId } from "react"

import { Card, CardContent } from "@heroui/react"
import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Свойства hero-метрики dashboard.
 */
export interface IDashboardHeroMetricProps {
    /** Название метрики. */
    readonly label: string
    /** Текущее значение. */
    readonly value: number
    /** Максимальное значение для gauge (по умолчанию 100). */
    readonly max?: number
    /** Цвет gauge (CSS variable или hex). */
    readonly color?: string
    /** Подпись снизу. */
    readonly subtitle?: string
}

/**
 * Определяет severity-цвет по значению gauge.
 *
 * @param percentage Процент заполнения (0-1).
 * @returns CSS цвет severity.
 */
function resolveSeverityColor(percentage: number): string {
    if (percentage >= 0.8) {
        return "var(--success)"
    }
    if (percentage >= 0.6) {
        return "var(--warning)"
    }
    return "var(--danger)"
}

/**
 * Вычисляет SVG arc path для radial gauge.
 *
 * @param percentage Процент заполнения (0-1).
 * @param radius Радиус дуги.
 * @param cx Центр X.
 * @param cy Центр Y.
 * @returns SVG path string.
 */
function describeArc(percentage: number, radius: number, cx: number, cy: number): string {
    const startAngle = -225
    const endAngle = startAngle + percentage * 270
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    const x1 = cx + radius * Math.cos(startRad)
    const y1 = cy + radius * Math.sin(startRad)
    const x2 = cx + radius * Math.cos(endRad)
    const y2 = cy + radius * Math.sin(endRad)
    const largeArc = percentage > 0.5 ? 1 : 0

    return `M ${String(x1)} ${String(y1)} A ${String(radius)} ${String(radius)} 0 ${String(largeArc)} 1 ${String(x2)} ${String(y2)}`
}

/**
 * Large hero metric card с radial gauge визуализацией,
 * glow-эффектом и severity-цветом.
 * Gauge arc использует CSS transition для плавной анимации значения.
 *
 * @param props Конфигурация метрики.
 * @returns Hero metric card с animated gauge.
 */
export function DashboardHeroMetric(props: IDashboardHeroMetricProps): ReactElement {
    const max = props.max ?? 100
    const percentage = Math.min(1, Math.max(0, props.value / max))
    const severityColor = props.color ?? resolveSeverityColor(percentage)
    const radius = 42
    const cx = 55
    const cy = 55
    const filterId = useId()
    const gradientId = useId()

    return (
        <Card
            className={[
                "relative overflow-hidden",
                "bg-gradient-to-b from-surface to-surface-secondary/50",
                "border border-border/60",
                "shadow-lg",
            ].join(" ")}
        >
            {/* Ambient glow behind gauge */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-15 blur-3xl"
                style={{
                    background: `radial-gradient(circle at 50% 40%, ${severityColor}, transparent 70%)`,
                }}
            />

            <CardContent className="relative flex flex-col items-center gap-3 py-8 px-6">
                <svg
                    aria-label={`${props.label}: ${String(props.value)}`}
                    className="h-36 w-36"
                    viewBox="0 0 110 110"
                >
                    <defs>
                        <filter id={filterId}>
                            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                        </filter>
                        <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
                            <stop offset="0%" stopColor={severityColor} stopOpacity="1" />
                            <stop offset="100%" stopColor={severityColor} stopOpacity="0.5" />
                        </linearGradient>
                    </defs>

                    {/* Background track */}
                    <path
                        d={describeArc(1, radius, cx, cy)}
                        fill="none"
                        stroke="var(--border)"
                        strokeLinecap="round"
                        strokeOpacity="0.4"
                        strokeWidth="8"
                    />

                    {/* Glow layer */}
                    <path
                        d={describeArc(percentage, radius, cx, cy)}
                        fill="none"
                        filter={`url(#${filterId})`}
                        stroke={severityColor}
                        strokeLinecap="round"
                        strokeOpacity="0.6"
                        strokeWidth="12"
                    />

                    {/* Active arc with gradient */}
                    <path
                        className="transition-all duration-700 ease-out"
                        d={describeArc(percentage, radius, cx, cy)}
                        fill="none"
                        stroke={`url(#${gradientId})`}
                        strokeLinecap="round"
                        strokeWidth="8"
                    />

                    {/* Center value */}
                    <text
                        className="font-display text-[28px] font-bold"
                        dominantBaseline="central"
                        fill="currentColor"
                        textAnchor="middle"
                        x={cx}
                        y={cy - 2}
                    >
                        {String(props.value)}
                    </text>

                    {/* Score label under value */}
                    <text
                        className="text-[9px] font-medium uppercase tracking-[0.15em]"
                        dominantBaseline="hanging"
                        fill="var(--muted)"
                        textAnchor="middle"
                        x={cx}
                        y={cy + 16}
                    >
                        / {String(max)}
                    </text>
                </svg>

                <div className="text-center">
                    <p className={`${TYPOGRAPHY.sectionTitle} tracking-tight`}>{props.label}</p>
                    {props.subtitle !== undefined ? (
                        <p className={`mt-1 ${TYPOGRAPHY.bodyMuted}`}>{props.subtitle}</p>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    )
}
