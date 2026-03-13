import { type ChangeEvent, type ReactElement } from "react"

import { TYPOGRAPHY } from "@/lib/constants/typography"

interface ISuggestionLimitConfigProps {
    readonly max?: number
    readonly min?: number
    readonly value: number
    readonly onChange: (value: number) => void
}

/**
 * Контрол для настройки лимита suggestions в CCR summary.
 *
 * @param props - текущее значение и границы лимита.
 * @returns Поле ввода number с нормализацией значения.
 */
export function SuggestionLimitConfig(props: ISuggestionLimitConfigProps): ReactElement {
    const minValue = props.min ?? 1
    const maxValue = props.max ?? 20

    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const parsedValue = Number(event.currentTarget.value)
        if (Number.isNaN(parsedValue) === true) {
            return
        }
        const normalizedValue = Math.min(maxValue, Math.max(minValue, parsedValue))
        props.onChange(normalizedValue)
    }

    return (
        <label className={`space-y-1 ${TYPOGRAPHY.body}`} htmlFor="ccr-summary-max-suggestions">
            <span className="block font-medium text-foreground">Max suggestions in summary</span>
            <input
                id="ccr-summary-max-suggestions"
                className="w-full rounded-md border border-border px-3 py-2"
                max={maxValue}
                min={minValue}
                type="number"
                value={props.value}
                onChange={handleChange}
            />
        </label>
    )
}
