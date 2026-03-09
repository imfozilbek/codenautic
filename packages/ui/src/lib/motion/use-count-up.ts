import { useEffect, useRef, useState } from "react"

import { useReducedMotion } from "@/lib/motion"

/**
 * Параметры хука анимации числового перехода.
 */
export interface IUseCountUpOptions {
    /** Целевое значение. */
    readonly target: number
    /** Длительность анимации в ms (по умолчанию 600). */
    readonly duration?: number
    /** Количество знаков после запятой (по умолчанию 0). */
    readonly decimals?: number
}

/**
 * Анимирует числовое значение от текущего до целевого с easing.
 * Автоматически отключается при `prefers-reduced-motion`.
 *
 * @param options Целевое значение и параметры анимации.
 * @returns Текущее анимированное значение.
 */
export function useCountUp(options: IUseCountUpOptions): number {
    const { target, duration = 600, decimals = 0 } = options
    const prefersReducedMotion = useReducedMotion()
    const [displayValue, setDisplayValue] = useState(target)
    const previousTargetRef = useRef(target)
    const rafRef = useRef<number | undefined>(undefined)

    useEffect((): (() => void) => {
        if (prefersReducedMotion) {
            setDisplayValue(target)
            previousTargetRef.current = target
            return (): void => undefined
        }

        const startValue = previousTargetRef.current
        const diff = target - startValue

        if (diff === 0) {
            return (): void => undefined
        }

        const startTime = performance.now()

        const animate = (currentTime: number): void => {
            const elapsed = currentTime - startTime
            const progress = Math.min(1, elapsed / duration)
            const eased = 1 - Math.pow(1 - progress, 3)
            const factor = Math.pow(10, decimals)
            const nextValue = Math.round((startValue + diff * eased) * factor) / factor

            setDisplayValue(nextValue)

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate)
            } else {
                previousTargetRef.current = target
            }
        }

        rafRef.current = requestAnimationFrame(animate)

        return (): void => {
            if (rafRef.current !== undefined) {
                cancelAnimationFrame(rafRef.current)
            }
            previousTargetRef.current = target
        }
    }, [target, duration, decimals, prefersReducedMotion])

    return displayValue
}
