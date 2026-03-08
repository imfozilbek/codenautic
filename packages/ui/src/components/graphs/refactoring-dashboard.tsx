import { useMemo, useState, type ChangeEvent, type ReactElement } from "react"

/**
 * Сортировка таргетов refactoring dashboard.
 */
export type TRefactoringDashboardSortKey = "effort" | "risk" | "roi"

/**
 * Таргет рефакторинга для dashboard.
 */
export interface IRefactoringTargetDescriptor {
    /** Уникальный идентификатор таргета. */
    readonly id: string
    /** Идентификатор файла, связанного с таргетом. */
    readonly fileId: string
    /** Название/путь таргета. */
    readonly title: string
    /** Модуль для фильтрации. */
    readonly module: string
    /** Краткое объяснение приоритета. */
    readonly description: string
    /** ROI score (чем выше, тем лучше эффект). */
    readonly roiScore: number
    /** Risk score (чем выше, тем рискованнее). */
    readonly riskScore: number
    /** Effort score (чем ниже, тем быстрее). */
    readonly effortScore: number
}

/**
 * Пропсы refactoring dashboard.
 */
export interface IRefactoringDashboardProps {
    /** Набор таргетов для приоритизации. */
    readonly targets: ReadonlyArray<IRefactoringTargetDescriptor>
    /** Callback выбора таргета. */
    readonly onSelectTarget?: (target: IRefactoringTargetDescriptor) => void
}

/**
 * Возвращает сортированный список таргетов согласно выбранному ключу.
 *
 * @param targets Набор таргетов.
 * @param sortKey Выбранный ключ сортировки.
 * @returns Отсортированный массив.
 */
function sortTargets(
    targets: ReadonlyArray<IRefactoringTargetDescriptor>,
    sortKey: TRefactoringDashboardSortKey,
): ReadonlyArray<IRefactoringTargetDescriptor> {
    const sortedTargets = [...targets]

    if (sortKey === "roi") {
        sortedTargets.sort((leftTarget, rightTarget): number => {
            return rightTarget.roiScore - leftTarget.roiScore
        })
        return sortedTargets
    }

    if (sortKey === "risk") {
        sortedTargets.sort((leftTarget, rightTarget): number => {
            return rightTarget.riskScore - leftTarget.riskScore
        })
        return sortedTargets
    }

    sortedTargets.sort((leftTarget, rightTarget): number => {
        return leftTarget.effortScore - rightTarget.effortScore
    })
    return sortedTargets
}

/**
 * Определяет цвет риска.
 *
 * @param riskScore Числовой risk score.
 * @returns Tailwind className.
 */
function resolveRiskClassName(riskScore: number): string {
    if (riskScore >= 75) {
        return "border-danger/40 bg-danger/15 text-danger"
    }
    if (riskScore >= 50) {
        return "border-amber-300 bg-warning/15 text-amber-900"
    }
    return "border-success/40 bg-success/15 text-success"
}

/**
 * Refactoring dashboard с приоритизацией и фильтрами.
 *
 * @param props Набор таргетов и callback выбора.
 * @returns React-компонент dashboard.
 */
export function RefactoringDashboard(props: IRefactoringDashboardProps): ReactElement {
    const [sortKey, setSortKey] = useState<TRefactoringDashboardSortKey>("roi")
    const [moduleFilter, setModuleFilter] = useState<string>("all")

    const moduleOptions = useMemo((): ReadonlyArray<string> => {
        const moduleSet = new Set<string>(["all"])
        props.targets.forEach((target): void => {
            moduleSet.add(target.module)
        })
        return [...moduleSet]
    }, [props.targets])

    const filteredTargets = useMemo((): ReadonlyArray<IRefactoringTargetDescriptor> => {
        if (moduleFilter === "all") {
            return props.targets
        }
        return props.targets.filter((target): boolean => target.module === moduleFilter)
    }, [moduleFilter, props.targets])

    const prioritizedTargets = useMemo((): ReadonlyArray<IRefactoringTargetDescriptor> => {
        return sortTargets(filteredTargets, sortKey)
    }, [filteredTargets, sortKey])

    const handleSortChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        const nextSortKey = event.currentTarget.value
        if (nextSortKey === "roi" || nextSortKey === "risk" || nextSortKey === "effort") {
            setSortKey(nextSortKey)
        }
    }

    const handleModuleFilterChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        setModuleFilter(event.currentTarget.value)
    }

    return (
        <section className="rounded-lg border border-border bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Refactoring dashboard</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Prioritized targets sorted by ROI, risk, or effort with module filtering.
            </p>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
                <label className="space-y-1" htmlFor="refactor-sort">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Sort by
                    </span>
                    <select
                        aria-label="Refactoring sort"
                        className="w-full rounded-lg border border-border px-2 py-1.5 text-sm"
                        id="refactor-sort"
                        onChange={handleSortChange}
                        value={sortKey}
                    >
                        <option value="roi">ROI</option>
                        <option value="risk">Risk</option>
                        <option value="effort">Effort</option>
                    </select>
                </label>

                <label className="space-y-1" htmlFor="refactor-module-filter">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Module filter
                    </span>
                    <select
                        aria-label="Refactoring module filter"
                        className="w-full rounded-lg border border-border px-2 py-1.5 text-sm"
                        id="refactor-module-filter"
                        onChange={handleModuleFilterChange}
                        value={moduleFilter}
                    >
                        {moduleOptions.map(
                            (module): ReactElement => (
                                <option key={module} value={module}>
                                    {module}
                                </option>
                            ),
                        )}
                    </select>
                </label>
            </div>

            <ul className="mt-3 space-y-2">
                {prioritizedTargets.map(
                    (target): ReactElement => (
                        <li className="rounded border border-border bg-surface p-2" key={target.id}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        {target.title}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {target.description}
                                    </p>
                                    <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                                        Module: {target.module}
                                    </p>
                                </div>
                                <span
                                    className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${resolveRiskClassName(target.riskScore)}`}
                                >
                                    Risk {String(target.riskScore)}
                                </span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-foreground">
                                <span className="rounded border border-border bg-white px-2 py-0.5">
                                    ROI {String(target.roiScore)}
                                </span>
                                <span className="rounded border border-border bg-white px-2 py-0.5">
                                    Effort {String(target.effortScore)}
                                </span>
                            </div>
                            <button
                                aria-label={`Inspect refactoring target ${target.title}`}
                                className="mt-2 rounded border border-cyan-300 bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-800 hover:border-cyan-400"
                                onClick={(): void => {
                                    props.onSelectTarget?.(target)
                                }}
                                type="button"
                            >
                                Inspect target
                            </button>
                        </li>
                    ),
                )}
            </ul>
        </section>
    )
}
