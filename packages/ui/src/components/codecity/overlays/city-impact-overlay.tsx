import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { TYPOGRAPHY } from "@/lib/constants/typography"

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
        return "border-danger/40 bg-danger/20 text-danger"
    }
    if (intensity >= 45) {
        return "border-warning/40 bg-warning/20 text-warning-foreground"
    }
    return "border-success/40 bg-success/20 text-success"
}

/**
 * Overlay-панель ripple эффекта для CodeCity impact анализа.
 *
 * @param props Набор overlay entries и callback.
 * @returns React-компонент overlay.
 */
export function CityImpactOverlay(props: ICityImpactOverlayProps): ReactElement {
    const { t } = useTranslation(["code-city"])
    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>{t("code-city:cityImpact.title")}</p>
            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                {t("code-city:cityImpact.description")}
            </p>

            <ul className="mt-3 space-y-2">
                {props.entries.map(
                    (entry): ReactElement => (
                        <li
                            className="rounded border border-border bg-surface p-2"
                            key={entry.fileId}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className={TYPOGRAPHY.cardTitle}>{entry.label}</p>
                                    <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                                        {entry.details}
                                    </p>
                                </div>
                                <span
                                    className={`rounded border px-2 py-0.5 ${TYPOGRAPHY.micro} ${resolveIntensityClassName(entry.intensity)}`}
                                >
                                    {String(entry.intensity)}%
                                </span>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-surface-secondary">
                                <div
                                    className="h-full rounded-full bg-accent/70"
                                    style={{
                                        width: `${String(entry.intensity)}%`,
                                    }}
                                />
                            </div>
                            <button
                                aria-label={t("code-city:cityImpact.ariaLabelInspect", {
                                    label: entry.label,
                                })}
                                className="mt-2 rounded border border-accent/40 bg-accent/20 px-2 py-1 text-xs font-semibold text-accent-foreground hover:border-accent"
                                onClick={(): void => {
                                    props.onSelectEntry?.(entry)
                                }}
                                type="button"
                            >
                                {t("code-city:cityImpact.showRipple")}
                            </button>
                        </li>
                    ),
                )}
            </ul>
        </section>
    )
}
