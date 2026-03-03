import type { CSSProperties, RefObject } from "react"
import { useRef } from "react"
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"

/**
 * Опции virtual-сетка.
 */
export interface IUseVirtualizedListOptions {
    /** Количество элементов в списке. */
    readonly count: number
    /** Высота элемента по умолчанию. */
    readonly estimateSize: (index: number) => number
    /** Количество "подгружаемых" запасных элементов. */
    readonly overscan?: number
}

/**
 * Результат работы virtual-хука.
 */
export interface IUseVirtualizedListResult {
    /** Ref контейнера со scroll. */
    readonly parentRef: RefObject<HTMLDivElement | null>
    /** Полный размер прокручиваемой зоны. */
    readonly totalSize: number
    /** Отрисовываемые виртуальные элементы. */
    readonly virtualItems: Array<VirtualItem>
    /** Сбор стилей для позиционирования элемента. */
    getItemStyle: (virtualItem: VirtualItem) => CSSProperties
}

/**
 * Универсальный hook для virtual-скроллинга.
 *
 * @param options Параметры.
 * @returns Состояние virtualizer.
 */
export function useVirtualizedList(options: IUseVirtualizedListOptions): IUseVirtualizedListResult {
    const parentRef = useRef<HTMLDivElement>(null)

    const virtualizer = useVirtualizer({
        count: options.count,
        getScrollElement: () => parentRef.current,
        estimateSize: options.estimateSize,
        overscan: options.overscan,
    })

    return {
        parentRef,
        totalSize: virtualizer.getTotalSize(),
        virtualItems: virtualizer.getVirtualItems(),
        getItemStyle: (virtualItem: VirtualItem): CSSProperties => ({
            position: "absolute",
            top: 0,
            left: 0,
            transform: `translateY(${virtualItem.start}px)`,
            width: "100%",
            height: `${virtualItem.size}px`,
        }),
    }
}
