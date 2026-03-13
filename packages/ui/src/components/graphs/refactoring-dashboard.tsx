import { useMemo, useState, type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"

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
        return "border-warning/40 bg-warning/15 text-on-warning"
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
    const { t } = useTranslation(["code-city"])
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

    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>{t("code-city:refactoringComp.title")}</p>
            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                {t("code-city:refactoringComp.description")}
            </p>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
                <label className="space-y-1" htmlFor="refactor-sort">
                    <span className={TYPOGRAPHY.overline}>
                        {t("code-city:refactoringComp.sortBy")}
                    </span>
                    <select
                        aria-label={t("code-city:refactoringComp.ariaSort")}
                        className={NATIVE_FORM.select}
                        id="refactor-sort"
                        value={sortKey}
                        onChange={(event): void => {
                            const nextSortKey = event.currentTarget.value
                            if (
                                nextSortKey === "roi" ||
                                nextSortKey === "risk" ||
                                nextSortKey === "effort"
                            ) {
                                setSortKey(nextSortKey)
                            }
                        }}
                    >
                        <option value="roi">{t("code-city:refactoringComp.sortOptions.roi")}</option>
                        <option value="risk">{t("code-city:refactoringComp.sortOptions.risk")}</option>
                        <option value="effort">{t("code-city:refactoringComp.sortOptions.effort")}</option>
                    </select>
                </label>

                <label className="space-y-1" htmlFor="refactor-module-filter">
                    <span className={TYPOGRAPHY.overline}>
                        {t("code-city:refactoringComp.moduleFilter")}
                    </span>
                    <select
                        aria-label={t("code-city:refactoringComp.ariaModuleFilter")}
                        className={NATIVE_FORM.select}
                        id="refactor-module-filter"
                        value={moduleFilter}
                        onChange={(event): void => {
                            setModuleFilter(event.currentTarget.value)
                        }}
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
                                    <p className={TYPOGRAPHY.cardTitle}>
                                        {target.title}
                                    </p>
                                    <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                                        {target.description}
                                    </p>
                                    <p className={`mt-1 ${TYPOGRAPHY.micro} text-muted-foreground`}>
                                        {t("code-city:refactoringComp.modulePrefix", { name: target.module })}
                                    </p>
                                </div>
                                <span
                                    className={`rounded border px-2 py-0.5 ${TYPOGRAPHY.micro} ${resolveRiskClassName(target.riskScore)}`}
                                >
                                    {t("code-city:refactoringComp.riskLabel", { score: target.riskScore })}
                                </span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-foreground">
                                <span className="rounded border border-border bg-surface px-2 py-0.5">
                                    {t("code-city:refactoringComp.roiLabel", { score: target.roiScore })}
                                </span>
                                <span className="rounded border border-border bg-surface px-2 py-0.5">
                                    {t("code-city:refactoringComp.effortLabel", { score: target.effortScore })}
                                </span>
                            </div>
                            <button
                                aria-label={t("code-city:refactoringComp.ariaInspectTarget", { title: target.title })}
                                className="mt-2 rounded border border-primary/40 bg-primary/20 px-2 py-1 text-xs font-semibold text-on-primary hover:border-primary"
                                onClick={(): void => {
                                    props.onSelectTarget?.(target)
                                }}
                                type="button"
                            >
                                {t("code-city:refactoringComp.inspectTarget")}
                            </button>
                        </li>
                    ),
                )}
            </ul>
        </section>
    )
}
