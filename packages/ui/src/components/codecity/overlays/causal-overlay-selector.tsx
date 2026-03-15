import { useMemo, type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"

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

/**
 * Проверяет, является ли строка допустимым causal overlay режимом.
 *
 * @param value Строковое значение.
 * @returns True если значение является TCausalOverlayMode.
 */
function isCausalOverlayMode(value: string): value is TCausalOverlayMode {
    return value === "impact" || value === "temporal-coupling" || value === "root-cause"
}

/**
 * Возвращает CSS-класс кнопки overlay в зависимости от активности.
 *
 * @param currentValue Текущий выбранный режим.
 * @param optionValue Режим кнопки.
 * @returns Tailwind className.
 */
function resolveOverlayButtonClass(
    currentValue: TCausalOverlayMode,
    optionValue: TCausalOverlayMode,
): string {
    const isActive = currentValue === optionValue
    return [
        "rounded-md border px-3 py-1.5 text-xs font-semibold transition",
        isActive
            ? "border-accent/40 bg-accent/10 text-accent"
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
    const { t } = useTranslation(["code-city"])

    const causalOverlayOptions = useMemo(
        (): ReadonlyArray<ICausalOverlayOption> => [
            {
                description: t("code-city:causalOverlay.impactMapDescription"),
                label: t("code-city:causalOverlay.impactMapLabel"),
                value: "impact",
            },
            {
                description: t("code-city:causalOverlay.temporalCouplingDescription"),
                label: t("code-city:causalOverlay.temporalCouplingLabel"),
                value: "temporal-coupling",
            },
            {
                description: t("code-city:causalOverlay.rootCauseChainDescription"),
                label: t("code-city:causalOverlay.rootCauseChainLabel"),
                value: "root-cause",
            },
        ],
        [t],
    )

    const causalOverlayLabels = useMemo(
        (): Readonly<Record<TCausalOverlayMode, string>> => ({
            impact: t("code-city:causalOverlay.impactMapLabel"),
            "root-cause": t("code-city:causalOverlay.rootCauseChainLabel"),
            "temporal-coupling": t("code-city:causalOverlay.temporalCouplingLabel"),
        }),
        [t],
    )

    const activeLabel = causalOverlayLabels[props.value]

    return (
        <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
            <div className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
                <label className="space-y-1" htmlFor="causal-overlay-selector">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {t("code-city:causalOverlay.label")}
                    </span>
                    <select
                        aria-label={t("code-city:causalOverlay.ariaLabel")}
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
                        {causalOverlayOptions.map(
                            (option): ReactElement => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ),
                        )}
                    </select>
                </label>
                <div
                    aria-label={t("code-city:causalOverlay.toolbarAriaLabel")}
                    className="flex flex-wrap items-center gap-2"
                    role="toolbar"
                >
                    {causalOverlayOptions.map(
                        (option): ReactElement => (
                            <button
                                aria-label={t("code-city:causalOverlay.switchToOverlay", {
                                    label: option.label,
                                })}
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
            <p aria-live="polite" className={TYPOGRAPHY.captionMuted}>
                {t("code-city:causalOverlay.activeOverlay", { label: activeLabel })}
            </p>
            <p className={TYPOGRAPHY.captionMuted}>
                {
                    causalOverlayOptions.find((option): boolean => option.value === props.value)
                        ?.description
                }
            </p>
        </div>
    )
}
