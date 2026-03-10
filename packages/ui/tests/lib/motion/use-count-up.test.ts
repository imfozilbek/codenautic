import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useCountUp, type IUseCountUpOptions } from "@/lib/motion/use-count-up"

vi.mock("@/lib/motion", () => {
    return {
        useReducedMotion: vi.fn((): boolean => false),
    }
})

async function importMockedMotion(): Promise<{
    useReducedMotion: ReturnType<typeof vi.fn>
}> {
    const mod = await import("@/lib/motion")
    return mod as unknown as { useReducedMotion: ReturnType<typeof vi.fn> }
}

describe("useCountUp", (): void => {
    let rafCallbacks: Array<(time: number) => void>
    let rafIdCounter: number
    let cancelledRafs: Set<number>

    beforeEach((): void => {
        rafCallbacks = []
        rafIdCounter = 0
        cancelledRafs = new Set()

        vi.stubGlobal(
            "requestAnimationFrame",
            (callback: (time: number) => void): number => {
                rafIdCounter += 1
                const id = rafIdCounter
                rafCallbacks.push((time: number): void => {
                    if (cancelledRafs.has(id) !== true) {
                        callback(time)
                    }
                })
                return id
            },
        )

        vi.stubGlobal("cancelAnimationFrame", (id: number): void => {
            cancelledRafs.add(id)
        })

        vi.spyOn(performance, "now").mockReturnValue(0)
    })

    afterEach((): void => {
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    it("when prefersReducedMotion is true, then sets target immediately", async (): Promise<void> => {
        const motion = await importMockedMotion()
        motion.useReducedMotion.mockReturnValue(true)

        const { result } = renderHook(
            (props: IUseCountUpOptions): number => useCountUp(props),
            {
                initialProps: { target: 100 },
            },
        )

        expect(result.current).toBe(100)
    })

    it("when diff is zero, then returns target without animation", async (): Promise<void> => {
        const motion = await importMockedMotion()
        motion.useReducedMotion.mockReturnValue(false)

        const { result } = renderHook(
            (props: IUseCountUpOptions): number => useCountUp(props),
            {
                initialProps: { target: 50 },
            },
        )

        expect(result.current).toBe(50)
    })

    it("when target changes, then animates towards target", async (): Promise<void> => {
        const motion = await importMockedMotion()
        motion.useReducedMotion.mockReturnValue(false)

        const { result, rerender } = renderHook(
            (props: IUseCountUpOptions): number => useCountUp(props),
            {
                initialProps: { target: 0, duration: 600 },
            },
        )

        rerender({ target: 100, duration: 600 })

        act((): void => {
            for (const cb of rafCallbacks.splice(0)) {
                cb(300)
            }
        })

        expect(result.current).toBeGreaterThan(0)
        expect(result.current).toBeLessThan(100)
    })

    it("when animation completes, then sets previousTargetRef to target", async (): Promise<void> => {
        const motion = await importMockedMotion()
        motion.useReducedMotion.mockReturnValue(false)

        const { result, rerender } = renderHook(
            (props: IUseCountUpOptions): number => useCountUp(props),
            {
                initialProps: { target: 0, duration: 100 },
            },
        )

        rerender({ target: 50, duration: 100 })

        act((): void => {
            for (const cb of rafCallbacks.splice(0)) {
                cb(200)
            }
        })

        expect(result.current).toBe(50)
    })

    it("when cleanup runs during animation, then cancels animation frame", async (): Promise<void> => {
        const motion = await importMockedMotion()
        motion.useReducedMotion.mockReturnValue(false)

        const { rerender, unmount } = renderHook(
            (props: IUseCountUpOptions): number => useCountUp(props),
            {
                initialProps: { target: 0, duration: 600 },
            },
        )

        rerender({ target: 100, duration: 600 })

        act((): void => {
            for (const cb of rafCallbacks.splice(0)) {
                cb(100)
            }
        })

        expect(cancelledRafs.size).toBe(0)

        unmount()

        expect(cancelledRafs.size).toBeGreaterThan(0)
    })

    it("when decimals provided, then rounds to specified precision", async (): Promise<void> => {
        const motion = await importMockedMotion()
        motion.useReducedMotion.mockReturnValue(false)

        const { result, rerender } = renderHook(
            (props: IUseCountUpOptions): number => useCountUp(props),
            {
                initialProps: { target: 0, duration: 100, decimals: 2 },
            },
        )

        rerender({ target: 1.5, duration: 100, decimals: 2 })

        act((): void => {
            for (const cb of rafCallbacks.splice(0)) {
                cb(200)
            }
        })

        expect(result.current).toBe(1.5)
    })

    it("when prefersReducedMotion changes to true mid-animation, then snaps to target", async (): Promise<void> => {
        const motion = await importMockedMotion()
        motion.useReducedMotion.mockReturnValue(false)

        const { result, rerender } = renderHook(
            (props: IUseCountUpOptions): number => useCountUp(props),
            {
                initialProps: { target: 0, duration: 600 },
            },
        )

        rerender({ target: 100, duration: 600 })

        motion.useReducedMotion.mockReturnValue(true)

        rerender({ target: 100, duration: 600 })

        expect(result.current).toBe(100)
    })
})
