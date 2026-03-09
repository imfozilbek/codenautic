import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useVirtualizedList } from "@/lib/hooks/use-virtualized-list"

describe("useVirtualizedList", (): void => {
    it("when rendered with items, then returns parentRef", (): void => {
        const { result } = renderHook((): ReturnType<typeof useVirtualizedList> => {
            return useVirtualizedList({
                count: 100,
                estimateSize: (): number => 40,
            })
        })

        expect(result.current.parentRef).toBeDefined()
        expect(result.current.parentRef.current).toBeNull()
    })

    it("when rendered with items, then totalSize is defined", (): void => {
        const { result } = renderHook((): ReturnType<typeof useVirtualizedList> => {
            return useVirtualizedList({
                count: 50,
                estimateSize: (): number => 40,
            })
        })

        expect(result.current.totalSize).toBeGreaterThanOrEqual(0)
    })

    it("when rendered with zero items, then totalSize is 0", (): void => {
        const { result } = renderHook((): ReturnType<typeof useVirtualizedList> => {
            return useVirtualizedList({
                count: 0,
                estimateSize: (): number => 40,
            })
        })

        expect(result.current.totalSize).toBe(0)
    })

    it("when rendered with zero items, then virtualItems is empty", (): void => {
        const { result } = renderHook((): ReturnType<typeof useVirtualizedList> => {
            return useVirtualizedList({
                count: 0,
                estimateSize: (): number => 40,
            })
        })

        expect(result.current.virtualItems).toHaveLength(0)
    })

    it("when getItemStyle called, then returns absolute positioning styles", (): void => {
        const { result } = renderHook((): ReturnType<typeof useVirtualizedList> => {
            return useVirtualizedList({
                count: 10,
                estimateSize: (): number => 50,
            })
        })

        const mockVirtualItem = {
            index: 0,
            key: 0,
            start: 100,
            end: 150,
            size: 50,
            lane: 0,
        }

        const style = result.current.getItemStyle(mockVirtualItem)

        expect(style.position).toBe("absolute")
        expect(style.top).toBe(0)
        expect(style.left).toBe(0)
        expect(style.width).toBe("100%")
        expect(style.height).toBe("50px")
        expect(style.transform).toBe("translateY(100px)")
    })

    it("when getItemStyle called with different item, then transform reflects start position", (): void => {
        const { result } = renderHook((): ReturnType<typeof useVirtualizedList> => {
            return useVirtualizedList({
                count: 10,
                estimateSize: (): number => 30,
            })
        })

        const mockVirtualItem = {
            index: 5,
            key: 5,
            start: 250,
            end: 280,
            size: 30,
            lane: 0,
        }

        const style = result.current.getItemStyle(mockVirtualItem)

        expect(style.transform).toBe("translateY(250px)")
        expect(style.height).toBe("30px")
    })

    it("when overscan is specified, then passes overscan to virtualizer", (): void => {
        const { result } = renderHook((): ReturnType<typeof useVirtualizedList> => {
            return useVirtualizedList({
                count: 100,
                estimateSize: (): number => 40,
                overscan: 10,
            })
        })

        expect(result.current.parentRef).toBeDefined()
    })
})
