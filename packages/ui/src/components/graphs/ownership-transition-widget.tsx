import type { ReactElement } from "react"

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

function resolveHandoffLabel(severity: TOwnershipTransitionHandoffSeverity): string {
    if (severity === "critical") {
        return "Critical handoff"
    }
    if (severity === "watch") {
        return "Watch handoff"
    }
    return "Smooth handoff"
}

function resolveHandoffBadgeClassName(severity: TOwnershipTransitionHandoffSeverity): string {
    if (severity === "critical") {
        return "border-danger/40 bg-danger/15 text-danger"
    }
    if (severity === "watch") {
        return "border-amber-300 bg-warning/15 text-amber-900"
    }
    return "border-success/40 bg-success/15 text-emerald-900"
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
    return (
        <section className="rounded-lg border border-border bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Ownership transition widget</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Timeline of ownership handoffs for files and modules with risk indicators.
            </p>
            <ul aria-label="Ownership transitions" className="mt-3 space-y-2">
                {props.events.map((event): ReactElement => {
                    const isActive = props.activeEventId === event.id
                    const scopeLabel = event.scopeType === "module" ? "Module" : "File"

                    return (
                        <li
                            className={
                                isActive
                                    ? "rounded border border-cyan-300 bg-cyan-50 p-2"
                                    : "rounded border border-border bg-surface p-2"
                            }
                            key={event.id}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {scopeLabel}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {formatTransitionDate(event.changedAt)}
                                </span>
                            </div>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                                {event.scopeLabel}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {event.fromOwnerName} → {event.toOwnerName}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span
                                    className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${resolveHandoffBadgeClassName(event.handoffSeverity)}`}
                                >
                                    {resolveHandoffLabel(event.handoffSeverity)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {event.reason}
                                </span>
                            </div>
                            <button
                                aria-label={`Inspect ownership transition ${event.scopeLabel}`}
                                className="mt-2 rounded border border-cyan-300 bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-800 hover:border-cyan-400"
                                onClick={(): void => {
                                    props.onSelectEvent?.(event)
                                }}
                                type="button"
                            >
                                Focus handoff
                            </button>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
