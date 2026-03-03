import { useEffect, useRef, useState } from "react"

/**
 * Параметры observer-хука.
 */
export interface IUseIntersectionObserverOptions {
    /** Корневой элемент для проверки пересечения. */
    readonly root?: Element | Document | null
    /** Отключить наблюдение без снятия ref. */
    readonly enabled?: boolean
    /** Отступы root окна наблюдения. */
    readonly rootMargin?: string
    /** Порог пересечения в диапазоне 0..1. */
    readonly threshold?: number | readonly number[]
}

/**
 * Результат IntersectionObserver хука.
 */
export interface IUseIntersectionObserverResult {
    /** Ref sentinel-элемента. */
    readonly targetRef: React.RefObject<HTMLElement | null>
    /** Признак видимости sentinel. */
    readonly isIntersecting: boolean
}

/**
 * Хук для наблюдения пересечения элемента через IntersectionObserver.
 *
 * @param options Конфигурация observer.
 * @returns Ref элемента и флаг пересечения.
 */
export function useIntersectionObserver(
    options: IUseIntersectionObserverOptions = {},
): IUseIntersectionObserverResult {
    const { enabled = true, root = null, rootMargin = "0px", threshold = 0 } = options
    const normalizedThreshold = normalizeThreshold(threshold)
    const targetRef = useRef<HTMLElement | null>(null)
    const [isIntersecting, setIsIntersecting] = useState<boolean>(false)

    useEffect((): (() => void) => {
        if (enabled !== true) {
            setIsIntersecting(false)
            return (): void => undefined
        }

        const target = targetRef.current
        if (
            target === null ||
            typeof window === "undefined" ||
            "IntersectionObserver" in window === false
        ) {
            setIsIntersecting(false)
            return (): void => undefined
        }

        const observer = new IntersectionObserver(
            (entries): void => {
                const entry = entries[0]
                setIsIntersecting(entry?.isIntersecting === true)
            },
            {
                root,
                rootMargin,
                threshold: normalizedThreshold,
            },
        )
        observer.observe(target)

        return (): void => {
            observer.unobserve(target)
            observer.disconnect()
        }
    }, [enabled, root, rootMargin, normalizedThreshold])

    return {
        targetRef,
        isIntersecting,
    }
}

function normalizeThreshold(
    threshold: number | readonly number[] | undefined,
): number | number[] {
    if (threshold === undefined) {
        return 0
    }

    if (isReadOnlyNumberArray(threshold)) {
        return [...threshold]
    }

    return threshold
}

function isReadOnlyNumberArray(
    value: unknown,
): value is readonly number[] {
    if (Array.isArray(value) === false) {
        return false
    }

    for (const threshold of value) {
        if (typeof threshold !== "number") {
            return false
        }
    }

    return true
}
