import { useMemo, type ReactElement } from "react"

import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Задача refactoring timeline.
 */
export interface IRefactoringTimelineTask {
    /** Уникальный идентификатор timeline задачи. */
    readonly id: string
    /** Идентификатор файла для синхронизации с CodeCity. */
    readonly fileId: string
    /** Заголовок задачи. */
    readonly title: string
    /** Номер стартовой недели. */
    readonly startWeek: number
    /** Оценка длительности в неделях. */
    readonly durationWeeks: number
    /** Список зависимостей задачи. */
    readonly dependencies: ReadonlyArray<string>
}

/**
 * Пропсы refactoring timeline.
 */
export interface IRefactoringTimelineProps {
    /** Набор задач рефакторинга. */
    readonly tasks: ReadonlyArray<IRefactoringTimelineTask>
    /** Callback выбора задачи в timeline. */
    readonly onSelectTask?: (task: IRefactoringTimelineTask) => void
}

/**
 * Рассчитывает правую границу timeline в неделях.
 *
 * @param tasks Список задач.
 * @returns Максимальная неделя плана.
 */
function resolveTimelineEndWeek(tasks: ReadonlyArray<IRefactoringTimelineTask>): number {
    const maxEndWeek = tasks.reduce((maxValue, task): number => {
        return Math.max(maxValue, task.startWeek + task.durationWeeks - 1)
    }, 1)
    return Math.max(1, maxEndWeek)
}

/**
 * Refactoring timeline в формате gantt-подобного плана.
 *
 * @param props Набор задач и callback фокуса.
 * @returns React-компонент timeline.
 */
export function RefactoringTimeline(props: IRefactoringTimelineProps): ReactElement {
    const timelineEndWeek = useMemo((): number => {
        return resolveTimelineEndWeek(props.tasks)
    }, [props.tasks])

    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>Refactoring timeline</p>
            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                Gantt-like plan for refactoring waves with explicit dependency links.
            </p>

            <ul className="mt-3 space-y-2">
                {props.tasks.map((task): ReactElement => {
                    const startOffsetPercent = ((task.startWeek - 1) / timelineEndWeek) * 100
                    const widthPercent = (task.durationWeeks / timelineEndWeek) * 100
                    return (
                        <li className="rounded border border-border bg-surface p-2" key={task.id}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className={TYPOGRAPHY.cardTitle}>
                                        {task.title}
                                    </p>
                                    <p className={TYPOGRAPHY.captionMuted}>
                                        Weeks {String(task.startWeek)}–
                                        {String(task.startWeek + task.durationWeeks - 1)}
                                    </p>
                                </div>
                                <span
                                    className={`rounded border border-primary/40 bg-primary/15 px-2 py-0.5 ${TYPOGRAPHY.micro} text-on-primary`}
                                >
                                    {String(task.durationWeeks)}w
                                </span>
                            </div>

                            <div className="relative mt-2 h-6 rounded border border-border bg-surface">
                                <div
                                    className="absolute bottom-1 top-1 rounded bg-primary/35"
                                    style={{
                                        left: `${String(startOffsetPercent)}%`,
                                        width: `${String(widthPercent)}%`,
                                    }}
                                />
                            </div>

                            <p className={`mt-2 ${TYPOGRAPHY.microMuted}`}>
                                Dependencies:{" "}
                                {task.dependencies.length === 0
                                    ? "none"
                                    : task.dependencies.join(", ")}
                            </p>

                            <button
                                aria-label={`Inspect timeline task ${task.title}`}
                                className="mt-2 rounded border border-primary/40 bg-primary/20 px-2 py-1 text-xs font-semibold text-on-primary hover:border-primary"
                                onClick={(): void => {
                                    props.onSelectTask?.(task)
                                }}
                                type="button"
                            >
                                Focus task
                            </button>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
