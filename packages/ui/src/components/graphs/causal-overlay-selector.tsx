import type { ReactElement } from "react"

import { NATIVE_FORM } from "@/lib/constants/spacing"

export type TCausalOverlayMode = "impact" | "temporal-coupling" | "root-cause"

interface ICausalOverlayOption {
    readonly value: TCausalOverlayMode
    readonly label: string
    readonly description: string
}

interface ICausalOverlaySelectorProps {
    /** Текущий выбранный causal overlay режим. */
    readonly value: TCausalOverlayMode
    /** Обработчик смены активного overlay-режима. */
    readonly onChange: (nextValue: TCausalOverlayMode) => void
}

const CAUSAL_OVERLAY_OPTIONS: ReadonlyArray<ICausalOverlayOption> = [
    {
        description: "Highlights changed and impacted files on the city map.",
        label: "Impact map",
        value: "impact",
    },
    {
        description: "Shows temporal coupling links between related files.",
        label: "Temporal coupling",
        value: "temporal-coupling",
    },
    {
        description: "Focuses on issue chains and root-cause drilldown.",
        label: "Root cause chain",
        value: "root-cause",
    },
] as const

const CAUSAL_OVERLAY_LABELS: Readonly<Record<TCausalOverlayMode, string>> = {
    impact: "Impact map",
    "root-cause": "Root cause chain",
    "temporal-coupling": "Temporal coupling",
} as const

function isCausalOverlayMode(value: string): value is TCausalOverlayMode {
    return value === "impact" || value === "temporal-coupling" || value === "root-cause"
}

function resolveOverlayButtonClass(
    currentValue: TCausalOverlayMode,
    optionValue: TCausalOverlayMode,
): string {
    const isActive = currentValue === optionValue
    return [
        "rounded-md border px-3 py-1.5 text-xs font-semibold transition",
        isActive
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-surface text-foreground hover:border-border",
    ].join(" ")
}

/**
 * Переключатель causal overlays: dropdown + toolbar с индикатором активного режима.
 *
 * @param props Значение режима и callback обновления.
 * @returns UI-элемент управления overlays.
 */
export function CausalOverlaySelector(props: ICausalOverlaySelectorProps): ReactElement {
    const activeLabel = CAUSAL_OVERLAY_LABELS[props.value]

    return (
        <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
            <div className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
                <label className="space-y-1" htmlFor="causal-overlay-selector">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Causal overlay
                    </span>
                    <select
                        aria-label="Causal overlay"
                        className={NATIVE_FORM.select}
                        id="causal-overlay-selector"
                        value={props.value}
                        onChange={(event): void => {
                            const nextValue = event.currentTarget.value
                            if (isCausalOverlayMode(nextValue)) {
                                props.onChange(nextValue)
                            }
                        }}
                    >
                        {CAUSAL_OVERLAY_OPTIONS.map(
                            (option): ReactElement => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ),
                        )}
                    </select>
                </label>
                <div
                    aria-label="Causal overlays toolbar"
                    className="flex flex-wrap items-center gap-2"
                    role="toolbar"
                >
                    {CAUSAL_OVERLAY_OPTIONS.map(
                        (option): ReactElement => (
                            <button
                                aria-label={`Switch to ${option.label} overlay`}
                                aria-pressed={props.value === option.value}
                                className={resolveOverlayButtonClass(props.value, option.value)}
                                key={option.value}
                                type="button"
                                onClick={(): void => {
                                    props.onChange(option.value)
                                }}
                            >
                                {option.label}
                            </button>
                        ),
                    )}
                </div>
            </div>
            <p aria-live="polite" className="text-xs text-muted-foreground">
                {`Active overlay: ${activeLabel}`}
            </p>
            <p className="text-xs text-muted-foreground">
                {
                    CAUSAL_OVERLAY_OPTIONS.find((option): boolean => option.value === props.value)
                        ?.description
                }
            </p>
        </div>
    )
}
