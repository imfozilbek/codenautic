import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { TYPOGRAPHY } from "@/lib/constants/typography"

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
        return "border-warning/40 bg-warning/15 text-warning-foreground"
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
    const { t } = useTranslation(["code-city"])
    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>{t("code-city:cityRefactoring.title")}</p>
            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                {t("code-city:cityRefactoring.description")}
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
                                    <p className={TYPOGRAPHY.cardTitle}>{entry.label}</p>
                                    <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                                        {entry.details}
                                    </p>
                                </div>
                                <span
                                    className={`rounded border px-2 py-0.5 ${TYPOGRAPHY.micro} ${resolvePriorityClassName(entry.priority)}`}
                                >
                                    {entry.priority}
                                </span>
                            </div>
                            <button
                                aria-label={t("code-city:cityRefactoring.ariaLabelInspect", {
                                    label: entry.label,
                                })}
                                className="mt-2 rounded border border-accent/40 bg-accent/20 px-2 py-1 text-xs font-semibold text-accent-foreground hover:border-accent"
                                onClick={(): void => {
                                    props.onSelectEntry?.(entry)
                                }}
                                type="button"
                            >
                                {t("code-city:cityRefactoring.showInCity")}
                            </button>
                        </li>
                    ),
                )}
            </ul>
        </section>
    )
}
