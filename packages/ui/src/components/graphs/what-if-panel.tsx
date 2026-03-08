import { useMemo, useState, type ReactElement } from "react"

/**
 * Опция файла для what-if сценария.
 */
export interface IWhatIfOption {
    /** Уникальный id опции. */
    readonly id: string
    /** File id для синхронизации с City. */
    readonly fileId: string
    /** Подпись файла. */
    readonly label: string
    /** Индивидуальный impact score. */
    readonly impactScore: number
    /** Количество затронутых сущностей. */
    readonly affectedCount: number
}

/**
 * Результат what-if анализа.
 */
export interface IWhatIfSelection {
    /** Выбранные file ids. */
    readonly fileIds: ReadonlyArray<string>
    /** Агрегированный score сценария. */
    readonly aggregatedScore: number
    /** Суммарный affected count. */
    readonly totalAffectedCount: number
}

/**
 * Пропсы what-if панели.
 */
export interface IWhatIfPanelProps {
    /** Набор what-if опций. */
    readonly options: ReadonlyArray<IWhatIfOption>
    /** Callback запуска сценария. */
    readonly onRunScenario?: (selection: IWhatIfSelection) => void
}

/**
 * What-if панель для многосценарного impact анализа.
 *
 * @param props Опции сценария и callback.
 * @returns React-компонент what-if panel.
 */
export function WhatIfPanel(props: IWhatIfPanelProps): ReactElement {
    const [selectedOptionIds, setSelectedOptionIds] = useState<ReadonlyArray<string>>([])

    const selectedOptions = useMemo((): ReadonlyArray<IWhatIfOption> => {
        return props.options.filter((option): boolean => selectedOptionIds.includes(option.id))
    }, [props.options, selectedOptionIds])

    const aggregatedScenario = useMemo((): IWhatIfSelection => {
        if (selectedOptions.length === 0) {
            return {
                aggregatedScore: 0,
                fileIds: [],
                totalAffectedCount: 0,
            }
        }

        return {
            aggregatedScore: Math.round(
                selectedOptions.reduce((total, option): number => total + option.impactScore, 0) /
                    selectedOptions.length,
            ),
            fileIds: selectedOptions.map((option): string => option.fileId),
            totalAffectedCount: selectedOptions.reduce((total, option): number => {
                return total + option.affectedCount
            }, 0),
        }
    }, [selectedOptions])

    const toggleOption = (optionId: string): void => {
        setSelectedOptionIds((currentIds): ReadonlyArray<string> => {
            if (currentIds.includes(optionId)) {
                return currentIds.filter((id): boolean => id !== optionId)
            }
            return [...currentIds, optionId]
        })
    }

    return (
        <section className="rounded-lg border border-border bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">What-if panel</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Select multiple files to simulate aggregated impact and blast radius before applying
                changes.
            </p>

            <ul className="mt-3 space-y-2">
                {props.options.slice(0, 6).map(
                    (option): ReactElement => (
                        <li
                            className="flex items-start gap-2 rounded border border-border bg-surface p-2"
                            key={option.id}
                        >
                            <input
                                aria-label={`Select what-if option ${option.label}`}
                                checked={selectedOptionIds.includes(option.id)}
                                className="mt-0.5 h-4 w-4 rounded border-border"
                                onChange={(): void => {
                                    toggleOption(option.id)
                                }}
                                type="checkbox"
                            />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">
                                    {option.label}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Impact {String(option.impactScore)} · Affected{" "}
                                    {String(option.affectedCount)}
                                </p>
                            </div>
                        </li>
                    ),
                )}
            </ul>

            <div className="mt-3 rounded border border-cyan-200 bg-cyan-500/10 p-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-900">
                    Aggregated scenario
                </p>
                <p className="text-xs text-cyan-800">
                    Files: {String(aggregatedScenario.fileIds.length)} · Impact score:{" "}
                    {String(aggregatedScenario.aggregatedScore)} · Total affected:{" "}
                    {String(aggregatedScenario.totalAffectedCount)}
                </p>
            </div>

            <button
                aria-label="Run what-if scenario"
                className="mt-3 rounded border border-cyan-300 bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-800 hover:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={aggregatedScenario.fileIds.length === 0}
                onClick={(): void => {
                    props.onRunScenario?.(aggregatedScenario)
                }}
                type="button"
            >
                Run scenario
            </button>
        </section>
    )
}
