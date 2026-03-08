import type { ReactElement } from "react"

/**
 * Уровень приоритета refactoring overlay.
 */
export type TCityRefactoringPriority = "critical" | "high" | "medium"

/**
 * Элемент city refactoring overlay.
 */
export interface ICityRefactoringOverlayEntry {
    /** Идентификатор файла/здания. */
    readonly fileId: string
    /** Человекочитаемое имя файла/зоны. */
    readonly label: string
    /** Приоритет рефакторинга. */
    readonly priority: TCityRefactoringPriority
    /** Краткие детали причины приоритета. */
    readonly details: string
}

/**
 * Пропсы city refactoring overlay.
 */
export interface ICityRefactoringOverlayProps {
    /** Набор приоритетных зданий. */
    readonly entries: ReadonlyArray<ICityRefactoringOverlayEntry>
    /** Callback выбора элемента. */
    readonly onSelectEntry?: (entry: ICityRefactoringOverlayEntry) => void
}

/**
 * Возвращает css-класс для приоритета overlay.
 *
 * @param priority Уровень приоритета.
 * @returns Tailwind className.
 */
function resolvePriorityClassName(priority: TCityRefactoringPriority): string {
    if (priority === "critical") {
        return "border-danger/40 bg-danger/15 text-danger"
    }
    if (priority === "high") {
        return "border-amber-300 bg-warning/15 text-amber-900"
    }
    return "border-sky-300 bg-sky-500/15 text-sky-800"
}

/**
 * Overlay-панель для приоритета рефакторинга по зданиям CodeCity.
 *
 * @param props Набор зданий и callback.
 * @returns React-компонент overlay.
 */
export function CityRefactoringOverlay(props: ICityRefactoringOverlayProps): ReactElement {
    return (
        <section className="rounded-lg border border-border bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">City refactoring overlay</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Buildings prioritized by refactoring score. Click entry to inspect details.
            </p>

            <ul className="mt-3 space-y-2">
                {props.entries.map(
                    (entry): ReactElement => (
                        <li
                            className="rounded border border-border bg-surface p-2"
                            key={entry.fileId}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        {entry.label}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {entry.details}
                                    </p>
                                </div>
                                <span
                                    className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${resolvePriorityClassName(entry.priority)}`}
                                >
                                    {entry.priority}
                                </span>
                            </div>
                            <button
                                aria-label={`Inspect refactoring overlay ${entry.label}`}
                                className="mt-2 rounded border border-cyan-300 bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-800 hover:border-cyan-400"
                                onClick={(): void => {
                                    props.onSelectEntry?.(entry)
                                }}
                                type="button"
                            >
                                Show in city
                            </button>
                        </li>
                    ),
                )}
            </ul>
        </section>
    )
}
