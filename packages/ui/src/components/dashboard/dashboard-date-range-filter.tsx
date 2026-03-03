import type { ReactElement } from "react"

import { Button } from "@/components/ui"

/**
 * Варианты диапазона дат.
 */
export type TDashboardDateRange = "1d" | "7d" | "30d" | "90d"

/**
 * Параметры фильтра диапазона.
 */
export interface IDashboardDateRangeFilterProps {
    /** Активный диапазон. */
    readonly value: TDashboardDateRange
    /** Изменение диапазона. */
    readonly onChange: (value: TDashboardDateRange) => void
}

/**
 * Переключатель диапазона времени для mission control.
 */
const DATE_RANGES: ReadonlyArray<{ readonly value: TDashboardDateRange; readonly label: string }> =
    [
        { value: "1d", label: "24h" },
        { value: "7d", label: "7d" },
        { value: "30d", label: "30d" },
        { value: "90d", label: "90d" },
    ]

/**
 * Диапазонный фильтр для графиков/таблиц.
 *
 * @param props Состояние и handler.
 * @returns Группа кнопок с диапазоном.
 */
export function DashboardDateRangeFilter(props: IDashboardDateRangeFilterProps): ReactElement {
    return (
        <div
            aria-label="Dashboard date range"
            className="inline-flex rounded-lg border border-slate-200 bg-white p-1"
            role="group"
        >
            {DATE_RANGES.map((range): ReactElement => {
                const isSelected = props.value === range.value

                return (
                    <Button
                        key={range.value}
                        size="sm"
                        variant={isSelected ? "solid" : "light"}
                        onPress={(): void => {
                            props.onChange(range.value)
                        }}
                    >
                        {range.label}
                    </Button>
                )
            })}
        </div>
    )
}
