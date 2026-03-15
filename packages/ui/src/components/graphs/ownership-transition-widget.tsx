import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { useDynamicTranslation } from "@/lib/i18n"
import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Тип handoff индикатора для transition timeline.
 */
export type TOwnershipTransitionHandoffSeverity = "smooth" | "watch" | "critical"

/**
 * Событие передачи владения файлом/модулем.
 */
export interface IOwnershipTransitionEvent {
    /** Уникальный идентификатор события. */
    readonly id: string
    /** Целевой file id для фокуса в CodeCity. */
    readonly fileId: string
    /** Тип области, в которой произошла передача. */
    readonly scopeType: "file" | "module"
    /** Текстовая подпись file/module. */
    readonly scopeLabel: string
    /** ISO-дата передачи владения. */
    readonly changedAt: string
    /** Предыдущий владелец. */
    readonly fromOwnerName: string
    /** Новый владелец. */
    readonly toOwnerName: string
    /** Идентификатор нового владельца для синхронизации overlay. */
    readonly toOwnerId: string
    /** Индикатор риска передачи знаний. */
    readonly handoffSeverity: TOwnershipTransitionHandoffSeverity
    /** Контекст handoff (причина/комментарий). */
    readonly reason: string
}

/**
 * Пропсы ownership transition widget.
 */
export interface IOwnershipTransitionWidgetProps {
    /** Список событий ownership handoff. */
    readonly events: ReadonlyArray<IOwnershipTransitionEvent>
    /** Активное событие для визуального фокуса. */
    readonly activeEventId?: string
    /** Callback выбора события. */
    readonly onSelectEvent?: (event: IOwnershipTransitionEvent) => void
}

function resolveHandoffLabelKey(severity: TOwnershipTransitionHandoffSeverity): string {
    if (severity === "critical") {
        return "code-city:ownershipTransition.criticalHandoff"
    }
    if (severity === "watch") {
        return "code-city:ownershipTransition.watchHandoff"
    }
    return "code-city:ownershipTransition.smoothHandoff"
}

function resolveHandoffBadgeClassName(severity: TOwnershipTransitionHandoffSeverity): string {
    if (severity === "critical") {
        return "border-danger/40 bg-danger/15 text-danger"
    }
    if (severity === "watch") {
        return "border-warning/40 bg-warning/15 text-warning-foreground"
    }
    return "border-success/40 bg-success/15 text-success-foreground"
}

function formatTransitionDate(changedAt: string): string {
    const date = new Date(changedAt)
    if (Number.isNaN(date.getTime())) {
        return changedAt
    }

    return new Intl.DateTimeFormat("en", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date)
}

/**
 * Виджет ownership transitions с handoff индикаторами.
 *
 * @param props Набор переходов владения и callback фокуса.
 * @returns React-компонент timeline.
 */
export function OwnershipTransitionWidget(props: IOwnershipTransitionWidgetProps): ReactElement {
    const { t } = useTranslation(["code-city"])
    const { td } = useDynamicTranslation(["code-city"])
    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>{t("code-city:ownershipTransition.title")}</p>
            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                {t("code-city:ownershipTransition.description")}
            </p>
            <ul
                aria-label={t("code-city:ownershipTransition.ariaLabelTransitions")}
                className="mt-3 space-y-2"
            >
                {props.events.map((event): ReactElement => {
                    const isActive = props.activeEventId === event.id
                    const scopeLabel =
                        event.scopeType === "module"
                            ? t("code-city:ownershipTransition.scopeModule")
                            : t("code-city:ownershipTransition.scopeFile")

                    return (
                        <li
                            className={
                                isActive
                                    ? "rounded border border-accent/40 bg-accent/10 p-2"
                                    : "rounded border border-border bg-surface p-2"
                            }
                            key={event.id}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className={TYPOGRAPHY.overline}>{scopeLabel}</span>
                                <span className={TYPOGRAPHY.captionMuted}>
                                    {formatTransitionDate(event.changedAt)}
                                </span>
                            </div>
                            <p className={`mt-1 ${TYPOGRAPHY.cardTitle}`}>{event.scopeLabel}</p>
                            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                                {event.fromOwnerName} → {event.toOwnerName}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span
                                    className={`rounded border px-2 py-0.5 ${TYPOGRAPHY.micro} ${resolveHandoffBadgeClassName(event.handoffSeverity)}`}
                                >
                                    {td(resolveHandoffLabelKey(event.handoffSeverity))}
                                </span>
                                <span className={TYPOGRAPHY.captionMuted}>{event.reason}</span>
                            </div>
                            <button
                                aria-label={t("code-city:ownershipTransition.ariaLabelInspect", {
                                    scopeLabel: event.scopeLabel,
                                })}
                                className="mt-2 rounded border border-accent/40 bg-accent/20 px-2 py-1 text-xs font-semibold text-accent-foreground hover:border-accent"
                                onClick={(): void => {
                                    props.onSelectEvent?.(event)
                                }}
                                type="button"
                            >
                                {t("code-city:ownershipTransition.focusHandoff")}
                            </button>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
