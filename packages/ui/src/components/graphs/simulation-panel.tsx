import { useMemo, useState, type ReactElement } from "react"

import type { IRefactoringTargetDescriptor } from "@/components/graphs/refactoring-dashboard"
import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Режим визуализации для панели симуляции.
 */
export type TRefactoringSimulationMode = "before" | "after"

/**
 * Сценарий предпросмотра симуляции рефакторинга.
 */
export interface IRefactoringSimulationScenario {
    /** Режим предпросмотра before/after. */
    readonly mode: TRefactoringSimulationMode
    /** Цепочка file ids для фокуса в CodeCity. */
    readonly fileIds: ReadonlyArray<string>
}

interface IRefactoringSimulationMetrics {
    /** Агрегированная оценка сложности. */
    readonly complexity: number
    /** Агрегированная оценка риска. */
    readonly risk: number
    /** Оценка поддерживаемости. */
    readonly maintainability: number
}

/**
 * Пропсы simulation panel.
 */
export interface ISimulationPanelProps {
    /** Список приоритизированных targets. */
    readonly targets: ReadonlyArray<IRefactoringTargetDescriptor>
    /** Callback предпросмотра сценария. */
    readonly onPreviewScenario?: (scenario: IRefactoringSimulationScenario) => void
}

/**
 * Рассчитывает агрегированные метрики симуляции.
 *
 * @param targets Выбранные таргеты.
 * @param mode Режим симуляции.
 * @returns Сводные метрики before/after.
 */
function resolveSimulationMetrics(
    targets: ReadonlyArray<IRefactoringTargetDescriptor>,
    mode: TRefactoringSimulationMode,
): IRefactoringSimulationMetrics {
    if (targets.length === 0) {
        return {
            complexity: 0,
            maintainability: 0,
            risk: 0,
        }
    }

    const baseComplexity = Math.round(
        targets.reduce((total, target): number => {
            return total + target.effortScore * 4 + Math.round(target.riskScore * 0.5)
        }, 0) / targets.length,
    )
    const baseRisk = Math.round(
        targets.reduce((total, target): number => total + target.riskScore, 0) / targets.length,
    )
    const baseMaintainability = Math.max(
        1,
        Math.round(100 - baseComplexity * 0.45 - baseRisk * 0.3),
    )

    if (mode === "before") {
        return {
            complexity: baseComplexity,
            maintainability: baseMaintainability,
            risk: baseRisk,
        }
    }

    return {
        complexity: Math.max(1, Math.round(baseComplexity * 0.72)),
        maintainability: Math.min(99, Math.round(baseMaintainability + 22)),
        risk: Math.max(1, Math.round(baseRisk * 0.66)),
    }
}

/**
 * Возвращает префикс delta для метрик.
 *
 * @param value Значение delta.
 * @returns Значение с префиксом.
 */
function formatDelta(value: number): string {
    if (value > 0) {
        return `+${String(value)}`
    }
    return String(value)
}

/**
 * Панель before/after симуляции для refactoring сценариев.
 *
 * @param props Набор таргетов и callback предпросмотра.
 * @returns React-компонент simulation panel.
 */
export function SimulationPanel(props: ISimulationPanelProps): ReactElement {
    const [mode, setMode] = useState<TRefactoringSimulationMode>("before")
    const [selectedTargetIds, setSelectedTargetIds] = useState<ReadonlyArray<string>>(() => {
        return props.targets.slice(0, 2).map((target): string => target.id)
    })

    const selectedTargets = useMemo((): ReadonlyArray<IRefactoringTargetDescriptor> => {
        return props.targets.filter((target): boolean => selectedTargetIds.includes(target.id))
    }, [props.targets, selectedTargetIds])

    const beforeMetrics = useMemo((): IRefactoringSimulationMetrics => {
        return resolveSimulationMetrics(selectedTargets, "before")
    }, [selectedTargets])
    const afterMetrics = useMemo((): IRefactoringSimulationMetrics => {
        return resolveSimulationMetrics(selectedTargets, "after")
    }, [selectedTargets])
    const activeMetrics = mode === "before" ? beforeMetrics : afterMetrics

    const toggleTarget = (targetId: string): void => {
        setSelectedTargetIds((currentIds): ReadonlyArray<string> => {
            if (currentIds.includes(targetId)) {
                return currentIds.filter((id): boolean => id !== targetId)
            }
            return [...currentIds, targetId]
        })
    }

    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Simulation panel</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Toggle before/after state and compare projected CodeCity metrics for selected
                refactoring targets.
            </p>

            <div className="mt-3 inline-flex rounded-lg border border-border bg-surface p-1">
                <button
                    aria-pressed={mode === "before"}
                    className={`rounded px-2 py-1 text-xs font-semibold ${mode === "before" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"}`}
                    onClick={(): void => {
                        setMode("before")
                    }}
                    type="button"
                >
                    Before
                </button>
                <button
                    aria-pressed={mode === "after"}
                    className={`rounded px-2 py-1 text-xs font-semibold ${mode === "after" ? "bg-primary/20 text-on-primary shadow-sm" : "text-muted-foreground"}`}
                    onClick={(): void => {
                        setMode("after")
                    }}
                    type="button"
                >
                    After
                </button>
            </div>

            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Simulation mode: {mode}
            </p>

            <ul className="mt-3 space-y-2">
                {props.targets.slice(0, 5).map(
                    (target): ReactElement => (
                        <li
                            className="flex items-start gap-2 rounded border border-border bg-surface p-2"
                            key={target.id}
                        >
                            <input
                                aria-label={`Select simulation target ${target.title}`}
                                checked={selectedTargetIds.includes(target.id)}
                                className="mt-0.5 h-4 w-4 rounded border-border"
                                onChange={(): void => {
                                    toggleTarget(target.id)
                                }}
                                type="checkbox"
                            />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">
                                    {target.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    ROI {String(target.roiScore)} · Risk {String(target.riskScore)}{" "}
                                    · Effort {String(target.effortScore)}
                                </p>
                            </div>
                        </li>
                    ),
                )}
            </ul>

            <div className="mt-3 grid gap-2 md:grid-cols-3">
                <div className="rounded border border-border bg-surface p-2">
                    <p className={`${TYPOGRAPHY.micro} text-muted-foreground`}>Complexity</p>
                    <p className="text-base font-semibold text-foreground">
                        {String(activeMetrics.complexity)}
                    </p>
                    <p className={TYPOGRAPHY.microMuted}>
                        Delta {formatDelta(afterMetrics.complexity - beforeMetrics.complexity)}
                    </p>
                </div>
                <div className="rounded border border-border bg-surface p-2">
                    <p className={`${TYPOGRAPHY.micro} text-muted-foreground`}>Risk</p>
                    <p className="text-base font-semibold text-foreground">
                        {String(activeMetrics.risk)}
                    </p>
                    <p className={TYPOGRAPHY.microMuted}>
                        Delta {formatDelta(afterMetrics.risk - beforeMetrics.risk)}
                    </p>
                </div>
                <div className="rounded border border-border bg-surface p-2">
                    <p className={`${TYPOGRAPHY.micro} text-muted-foreground`}>Maintainability</p>
                    <p className="text-base font-semibold text-foreground">
                        {String(activeMetrics.maintainability)}
                    </p>
                    <p className={TYPOGRAPHY.microMuted}>
                        Delta{" "}
                        {formatDelta(afterMetrics.maintainability - beforeMetrics.maintainability)}
                    </p>
                </div>
            </div>

            <button
                aria-label="Preview refactoring simulation"
                className="mt-3 rounded border border-primary/40 bg-primary/20 px-2 py-1 text-xs font-semibold text-on-primary hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={selectedTargets.length === 0}
                onClick={(): void => {
                    props.onPreviewScenario?.({
                        fileIds: selectedTargets.map((target): string => target.fileId),
                        mode,
                    })
                }}
                type="button"
            >
                Preview in city
            </button>
        </section>
    )
}
