import type { ReactElement } from "react"

/**
 * Элемент ripple overlay для CodeCity impact view.
 */
export interface ICityImpactOverlayEntry {
    /** Идентификатор файла/здания. */
    readonly fileId: string
    /** Подпись узла. */
    readonly label: string
    /** Интенсивность impact от 0 до 100. */
    readonly intensity: number
    /** Текстовое объяснение ripple эффекта. */
    readonly details: string
}

/**
 * Пропсы city impact overlay.
 */
export interface ICityImpactOverlayProps {
    /** Список overlay элементов. */
    readonly entries: ReadonlyArray<ICityImpactOverlayEntry>
    /** Callback выбора ripple узла. */
    readonly onSelectEntry?: (entry: ICityImpactOverlayEntry) => void
}

/**
 * Возвращает цвет ripple-индикатора по интенсивности.
 *
 * @param intensity Интенсивность impact.
 * @returns Tailwind className.
 */
function resolveIntensityClassName(intensity: number): string {
    if (intensity >= 75) {
        return "border-rose-300 bg-rose-500/20 text-rose-800"
    }
    if (intensity >= 45) {
        return "border-amber-300 bg-amber-500/20 text-amber-900"
    }
    return "border-emerald-300 bg-emerald-500/20 text-emerald-800"
}

/**
 * Overlay-панель ripple эффекта для CodeCity impact анализа.
 *
 * @param props Набор overlay entries и callback.
 * @returns React-компонент overlay.
 */
export function CityImpactOverlay(props: ICityImpactOverlayProps): ReactElement {
    return (
        <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">City impact overlay</p>
            <p className="mt-1 text-xs text-slate-500">
                Ripple view for impact propagation where color intensity represents blast radius.
            </p>

            <ul className="mt-3 space-y-2">
                {props.entries.map((entry): ReactElement => (
                    <li
                        className="rounded border border-slate-200 bg-slate-50 p-2"
                        key={entry.fileId}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900">{entry.label}</p>
                                <p className="mt-1 text-xs text-slate-600">{entry.details}</p>
                            </div>
                            <span
                                className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${resolveIntensityClassName(entry.intensity)}`}
                            >
                                {String(entry.intensity)}%
                            </span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-200">
                            <div
                                className="h-full rounded-full bg-cyan-500/70"
                                style={{
                                    width: `${String(entry.intensity)}%`,
                                }}
                            />
                        </div>
                        <button
                            aria-label={`Inspect city impact ${entry.label}`}
                            className="mt-2 rounded border border-cyan-300 bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-800 hover:border-cyan-400"
                            onClick={(): void => {
                                props.onSelectEntry?.(entry)
                            }}
                            type="button"
                        >
                            Show ripple in city
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    )
}
