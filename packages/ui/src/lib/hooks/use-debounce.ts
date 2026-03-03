import {useEffect, useState} from "react"

/**
 * Параметры debounce-хука.
 */
export interface IUseDebounceOptions {
    /** Длительность debounce в миллисекундах. */
    readonly delayMs?: number
}

/**
 * Универсальный debounce-хук для любых значений.
 *
 * @param value Исходное значение.
 * @param delayMs Интервал debounce.
 * @returns Значение после выдержки debounce.
 */
export function useDebounce<TValue>(value: TValue, delayMs = 300): TValue {
    const [debouncedValue, setDebouncedValue] = useState<TValue>(value)

    useEffect((): (() => void) => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedValue(value)
        }, delayMs)

        return (): void => {
            window.clearTimeout(timeoutId)
        }
    }, [delayMs, value])

    return debouncedValue
}

/**
 * Debounce-хук со строгой типизацией опций.
 *
 * @param value Исходное значение.
 * @param options Конфигурация.
 * @returns Значение после задержки.
 */
export function useDebounceWithOptions<TValue>(
    value: TValue,
    options?: IUseDebounceOptions,
): TValue {
    return useDebounce(value, options?.delayMs)
}
