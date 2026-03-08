import type { ReactElement } from "react"

/**
 * Элемент панели knowledge silo.
 */
export interface IKnowledgeSiloPanelEntry {
    /** Идентификатор silo (обычно package/district). */
    readonly siloId: string
    /** Отображаемый label silo. */
    readonly siloLabel: string
    /** Суммарный риск score по silo (0..100). */
    readonly riskScore: number
    /** Количество контрибьюторов в silo. */
    readonly contributorCount: number
    /** Количество файлов в silo. */
    readonly fileCount: number
    /** Набор file ids для фокуса в city. */
    readonly fileIds: ReadonlyArray<string>
    /** Файл для первичного highlight. */
    readonly primaryFileId: string
}

/**
 * Пропсы knowledge silo панели.
 */
export interface IKnowledgeSiloPanelProps {
    /** Список silo entries. */
    readonly entries: ReadonlyArray<IKnowledgeSiloPanelEntry>
    /** Активный silo. */
    readonly activeSiloId?: string
    /** Колбэк выбора silo. */
    readonly onSelectEntry?: (entry: IKnowledgeSiloPanelEntry) => void
}

function resolveRiskClassName(riskScore: number): string {
    if (riskScore >= 75) {
        return "border-danger/40 bg-danger/20 text-danger"
    }
    if (riskScore >= 45) {
        return "border-amber-300 bg-warning/20 text-amber-900"
    }
    return "border-success/40 bg-success/20 text-success"
}

function resolveEntryClassName(isActive: boolean): string {
    return [
        "w-full rounded-lg border p-2 text-left transition",
        isActive ? "border-cyan-400 bg-cyan-50" : "border-border bg-surface hover:border-border",
    ].join(" ")
}

/**
 * Панель knowledge silo: список рисковых зон владения с переходом в CodeCity.
 *
 * @param props Набор silo entries и callback выбора.
 * @returns React-компонент knowledge silo панели.
 */
export function KnowledgeSiloPanel(props: IKnowledgeSiloPanelProps): ReactElement {
    return (
        <section className="rounded-lg border border-border bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Knowledge silo panel</p>
            <p className="mt-1 text-xs text-muted-foreground">
                High-risk ownership silos. Select a silo to focus related files in CodeCity.
            </p>

            <ul aria-label="Knowledge silos" className="mt-3 space-y-2">
                {props.entries.map((entry): ReactElement => {
                    const isActive = props.activeSiloId === entry.siloId

                    return (
                        <li key={entry.siloId}>
                            <button
                                aria-label={`Inspect knowledge silo ${entry.siloLabel}`}
                                className={resolveEntryClassName(isActive)}
                                type="button"
                                onClick={(): void => {
                                    props.onSelectEntry?.(entry)
                                }}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                            {entry.siloLabel}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Contributors: {String(entry.contributorCount)} · Files:{" "}
                                            {String(entry.fileCount)}
                                        </p>
                                    </div>
                                    <span
                                        className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${resolveRiskClassName(entry.riskScore)}`}
                                    >
                                        Risk {String(entry.riskScore)}
                                    </span>
                                </div>
                            </button>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
