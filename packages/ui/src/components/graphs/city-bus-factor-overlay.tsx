import type { ReactElement } from "react"

import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Дескриптор district bus factor overlay.
 */
export interface ICityBusFactorOverlayEntry {
    /** Идентификатор district (package path). */
    readonly districtId: string
    /** Подпись district. */
    readonly districtLabel: string
    /** Bus factor (кол-во ключевых контрибьюторов). */
    readonly busFactor: number
    /** Количество файлов в district. */
    readonly fileCount: number
    /** Файлы district для фокуса в city. */
    readonly fileIds: ReadonlyArray<string>
    /** Первый файл district для быстрого highlight. */
    readonly primaryFileId: string
}

/**
 * Пропсы bus factor overlay.
 */
export interface ICityBusFactorOverlayProps {
    /** Набор district entries. */
    readonly entries: ReadonlyArray<ICityBusFactorOverlayEntry>
    /** Активный district. */
    readonly activeDistrictId?: string
    /** Обработчик выбора district. */
    readonly onSelectEntry?: (entry: ICityBusFactorOverlayEntry) => void
}

function resolveBusFactorBadgeClassName(busFactor: number): string {
    if (busFactor <= 1) {
        return "border-danger/40 bg-danger/20 text-danger"
    }
    if (busFactor === 2) {
        return "border-warning/40 bg-warning/20 text-on-warning"
    }
    return "border-success/40 bg-success/20 text-success"
}

function resolveBusFactorRiskLabel(busFactor: number): string {
    if (busFactor <= 1) {
        return "Critical"
    }
    if (busFactor === 2) {
        return "Elevated"
    }
    return "Healthy"
}

function resolveEntryClassName(isActive: boolean): string {
    return [
        "w-full rounded-lg border p-2 text-left transition",
        isActive ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-border",
    ].join(" ")
}

/**
 * Overlay-панель bus factor для district-уровня CodeCity.
 *
 * @param props Набор district entries и callback выбора.
 * @returns React-компонент bus factor overlay.
 */
export function CityBusFactorOverlay(props: ICityBusFactorOverlayProps): ReactElement {
    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Bus factor overlay</p>
            <p className="mt-1 text-xs text-muted-foreground">
                District risk map: red means single owner, green means distributed ownership.
            </p>

            <ul aria-label="Bus factor districts" className="mt-3 grid gap-2 sm:grid-cols-2">
                {props.entries.map((entry): ReactElement => {
                    const riskLabel = resolveBusFactorRiskLabel(entry.busFactor)
                    const isActive = props.activeDistrictId === entry.districtId

                    return (
                        <li key={entry.districtId}>
                            <button
                                aria-label={`Inspect bus factor district ${entry.districtLabel}`}
                                className={resolveEntryClassName(isActive)}
                                type="button"
                                onClick={(): void => {
                                    props.onSelectEntry?.(entry)
                                }}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                            {entry.districtLabel}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Files: {String(entry.fileCount)} · Bus factor:{" "}
                                            {String(entry.busFactor)}
                                        </p>
                                    </div>
                                    <span
                                        className={`rounded border px-2 py-0.5 ${TYPOGRAPHY.micro} ${resolveBusFactorBadgeClassName(entry.busFactor)}`}
                                    >
                                        {riskLabel}
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
