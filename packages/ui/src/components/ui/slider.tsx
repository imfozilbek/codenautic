import { type ReactElement } from "react"
import {
    SliderFill,
    SliderOutput,
    SliderRoot,
    SliderThumb,
    SliderTrack,
} from "@heroui/react"

/**
 * Свойства Slider-компонента.
 */
export interface ISliderProps {
    /** Accessibility label для слайдера. */
    readonly "aria-label": string
    /** Минимальное значение. */
    readonly minValue: number
    /** Максимальное значение. */
    readonly maxValue: number
    /** Шаг изменения значения. */
    readonly step?: number
    /** Текущее значение. */
    readonly value: number
    /** Callback при каждом изменении (визуальный feedback). */
    readonly onChange?: (value: number) => void
    /** Callback при завершении изменения (commit значения). */
    readonly onChangeEnd?: (value: number) => void
    /** CSS-класс для контейнера. */
    readonly className?: string
    /** Показывать текущее значение над слайдером. */
    readonly showOutput?: boolean
    /** Форматирование отображаемого значения. */
    readonly formatOutput?: (value: number) => string
    /** Отключить слайдер. */
    readonly isDisabled?: boolean
}

/**
 * Форматирует значение слайдера по умолчанию.
 *
 * @param value Числовое значение.
 * @returns Строковое представление.
 */
function defaultFormatOutput(value: number): string {
    return String(value)
}

/**
 * Slider-компонент на базе HeroUI с отображением текущего значения.
 *
 * @param props Свойства слайдера.
 * @returns HeroUI Slider с Output, Track, Fill и Thumb.
 */
export function Slider(props: ISliderProps): ReactElement {
    const {
        "aria-label": ariaLabel,
        className,
        formatOutput = defaultFormatOutput,
        isDisabled,
        maxValue,
        minValue,
        onChange,
        onChangeEnd,
        showOutput = false,
        step,
        value,
    } = props

    return (
        <SliderRoot
            aria-label={ariaLabel}
            className={className}
            isDisabled={isDisabled}
            maxValue={maxValue}
            minValue={minValue}
            onChange={onChange !== undefined ? (v: number | number[]): void => { onChange(Array.isArray(v) ? v[0] ?? 0 : v) } : undefined}
            onChangeEnd={onChangeEnd !== undefined ? (v: number | number[]): void => { onChangeEnd(Array.isArray(v) ? v[0] ?? 0 : v) } : undefined}
            step={step}
            value={value}
        >
            {showOutput ? (
                <SliderOutput className="text-xs text-text-secondary">
                    {(): string => formatOutput(value)}
                </SliderOutput>
            ) : null}
            <SliderTrack>
                <SliderFill />
                <SliderThumb />
            </SliderTrack>
        </SliderRoot>
    )
}
