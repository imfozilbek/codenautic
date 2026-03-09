import type { ReactElement } from "react"

import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Тип achievement badge.
 */
export type TAchievementBadge = "gold" | "silver" | "bronze"

/**
 * Описание sprint-achievement.
 */
export interface IAchievementPanelEntry {
    /** Уникальный идентификатор achievement. */
    readonly id: string
    /** Заголовок achievement. */
    readonly title: string
    /** Дополнительный контекст достижения. */
    readonly summary: string
    /** Ключевая метрика улучшения в процентах. */
    readonly improvementPercent: number
    /** Тип badge. */
    readonly badge: TAchievementBadge
    /** Файл-фокус для навигации в CodeCity. */
    readonly fileId: string
    /** Навигационная цепочка для CodeCity 3D. */
    readonly relatedFileIds: ReadonlyArray<string>
}

/**
 * Пропсы achievements panel.
 */
export interface IAchievementsPanelProps {
    /** Список sprint achievements. */
    readonly achievements: ReadonlyArray<IAchievementPanelEntry>
    /** Активный achievement. */
    readonly activeAchievementId?: string
    /** Callback выбора achievement. */
    readonly onSelectAchievement?: (entry: IAchievementPanelEntry) => void
}

function resolveBadgeClassName(badge: TAchievementBadge): string {
    if (badge === "gold") {
        return "border-warning/40 bg-warning/15 text-on-warning"
    }
    if (badge === "silver") {
        return "border-border bg-surface-muted text-foreground"
    }
    return "border-orange-300 bg-orange-100 text-orange-900"
}

function resolveBadgeLabel(badge: TAchievementBadge): string {
    if (badge === "gold") {
        return "Gold badge"
    }
    if (badge === "silver") {
        return "Silver badge"
    }
    return "Bronze badge"
}

function resolveRowClassName(isActive: boolean): string {
    const baseClassName = isActive
        ? "border-primary bg-primary/10"
        : "border-border bg-surface hover:border-border"
    return `w-full rounded-lg border p-2 text-left transition ${baseClassName}`
}

function BadgeIcon(props: { readonly badge: TAchievementBadge }): ReactElement {
    const iconColor =
        props.badge === "gold"
            ? "text-warning"
            : props.badge === "silver"
              ? "text-foreground"
              : "text-orange-700"

    return (
        <svg
            aria-hidden="true"
            className={`h-3.5 w-3.5 ${iconColor}`}
            fill="none"
            viewBox="0 0 24 24"
        >
            <path
                d="M12 3L14.8 8.7L21 9.6L16.5 14L17.6 20.2L12 17.2L6.4 20.2L7.5 14L3 9.6L9.2 8.7Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
            />
        </svg>
    )
}

/**
 * Sprint achievements panel для отображения ключевых улучшений по модулям.
 *
 * @param props Список достижений и callback выбора.
 * @returns React-компонент achievements panel.
 */
export function AchievementsPanel(props: IAchievementsPanelProps): ReactElement {
    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Achievements panel</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Sprint achievements show key improvements and badge icons for top wins.
            </p>

            <ul aria-label="Sprint achievements" className="mt-3 space-y-2">
                {props.achievements.map((entry): ReactElement => {
                    const isActive = props.activeAchievementId === entry.id
                    const badgeLabel = resolveBadgeLabel(entry.badge)
                    return (
                        <li key={entry.id}>
                            <button
                                aria-label={`Inspect sprint achievement ${entry.title}`}
                                className={resolveRowClassName(isActive)}
                                onClick={(): void => {
                                    props.onSelectAchievement?.(entry)
                                }}
                                type="button"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                            {entry.title}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {entry.summary}
                                        </p>
                                        <p className="mt-1 text-xs font-semibold text-success">
                                            Improvement {String(entry.improvementPercent)}%
                                        </p>
                                    </div>
                                    <span
                                        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 ${TYPOGRAPHY.micro} ${resolveBadgeClassName(entry.badge)}`}
                                    >
                                        <BadgeIcon badge={entry.badge} />
                                        {badgeLabel}
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
