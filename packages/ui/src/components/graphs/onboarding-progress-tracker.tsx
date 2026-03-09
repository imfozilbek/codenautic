import type { ReactElement } from "react"

import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Дескриптор модуля для onboarding progress tracker.
 */
export interface IOnboardingProgressModuleDescriptor {
    /** Уникальный идентификатор модуля. */
    readonly id: string
    /** Название зоны/модуля. */
    readonly title: string
    /** Краткое описание, что значит завершение модуля. */
    readonly description: string
    /** Флаг завершения изучения модуля. */
    readonly isComplete: boolean
}

/**
 * Пропсы onboarding progress tracker.
 */
export interface IOnboardingProgressTrackerProps {
    /** Список модулей с completion-статусом. */
    readonly modules: ReadonlyArray<IOnboardingProgressModuleDescriptor>
}

/**
 * Вычисляет значение прогресса в процентах.
 *
 * @param completedCount Количество завершённых модулей.
 * @param totalCount Общее количество модулей.
 * @returns Целое значение прогресса от 0 до 100.
 */
function resolveProgressPercent(completedCount: number, totalCount: number): number {
    if (totalCount <= 0) {
        return 0
    }
    return Math.round((completedCount / totalCount) * 100)
}

/**
 * Возвращает css-классы badge в зависимости от статуса модуля.
 *
 * @param isComplete Признак завершения.
 * @returns Tailwind className.
 */
function resolveModuleBadgeClassName(isComplete: boolean): string {
    if (isComplete) {
        return "border-success/40 bg-success/15 text-success"
    }
    return "border-border bg-surface-muted text-foreground"
}

/**
 * Onboarding tracker для изучения ключевых зон dashboard.
 *
 * @param props Список модулей со статусами.
 * @returns React-компонент прогресса.
 */
export function OnboardingProgressTracker(props: IOnboardingProgressTrackerProps): ReactElement {
    const completedCount = props.modules.filter((module): boolean => module.isComplete).length
    const totalCount = props.modules.length
    const progressPercent = resolveProgressPercent(completedCount, totalCount)

    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Onboarding progress tracker</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Track explored dashboard areas and module completion.
            </p>
            <p className="mt-3 text-xs font-semibold text-foreground">
                Explored areas: {String(completedCount)} / {String(totalCount)}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                    aria-label="Onboarding progress"
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={progressPercent}
                    className="h-full rounded-full bg-primary transition-[width]"
                    role="progressbar"
                    style={{ width: `${String(progressPercent)}%` }}
                />
            </div>
            <ul className="mt-3 space-y-2">
                {props.modules.map(
                    (module): ReactElement => (
                        <li className="rounded border border-border bg-surface p-2" key={module.id}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground">
                                        {module.title}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {module.description}
                                    </p>
                                </div>
                                <span
                                    className={`rounded border px-2 py-0.5 ${TYPOGRAPHY.micro} ${resolveModuleBadgeClassName(module.isComplete)}`}
                                >
                                    {module.isComplete ? "Complete" : "Pending"}
                                </span>
                            </div>
                        </li>
                    ),
                )}
            </ul>
        </section>
    )
}
