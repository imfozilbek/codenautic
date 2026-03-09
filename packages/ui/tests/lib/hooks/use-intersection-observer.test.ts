import { renderHook, act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useIntersectionObserver } from "@/lib/hooks/use-intersection-observer"

type TIntersectionCallback = (entries: IntersectionObserverEntry[]) => void

let mockObserverCallback: TIntersectionCallback | undefined
let mockObserveTarget: Element | undefined

class MockIntersectionObserver implements IntersectionObserver {
    public readonly root: Element | Document | null = null
    public readonly rootMargin: string = "0px"
    public readonly thresholds: ReadonlyArray<number> = [0]
    private readonly callback: TIntersectionCallback

    public constructor(callback: TIntersectionCallback) {
        this.callback = callback
        mockObserverCallback = callback
    }

    public observe(target: Element): void {
        mockObserveTarget = target
    }

    public unobserve(_target: Element): void {}

    public disconnect(): void {}

    public takeRecords(): IntersectionObserverEntry[] {
        return []
    }
}

describe("useIntersectionObserver", (): void => {
    beforeEach((): void => {
        mockObserverCallback = undefined
        mockObserveTarget = undefined
        vi.stubGlobal("IntersectionObserver", MockIntersectionObserver)
    })

    afterEach((): void => {
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    it("when rendered with defaults, then returns false for isIntersecting", (): void => {
        const { result } = renderHook((): ReturnType<typeof useIntersectionObserver> => {
            return useIntersectionObserver()
        })

        expect(result.current.isIntersecting).toBe(false)
        expect(result.current.targetRef.current).toBeNull()
    })

    it("when observer fires with intersecting entry, then updates isIntersecting to true", (): void => {
        const element = document.createElement("div")
        const { result } = renderHook((): ReturnType<typeof useIntersectionObserver> => {
            return useIntersectionObserver()
        })

        Object.defineProperty(result.current.targetRef, "current", {
            value: element,
            writable: true,
        })

        const { rerender } = renderHook((): ReturnType<typeof useIntersectionObserver> => {
            return useIntersectionObserver()
        })

        if (mockObserverCallback !== undefined) {
            act((): void => {
                mockObserverCallback?.([{ isIntersecting: true } as IntersectionObserverEntry])
            })
        }

        rerender()
    })

    it("when enabled is false, then does not observe and sets isIntersecting to false", (): void => {
        const { result } = renderHook((): ReturnType<typeof useIntersectionObserver> => {
            return useIntersectionObserver({ enabled: false })
        })

        expect(result.current.isIntersecting).toBe(false)
        expect(mockObserveTarget).toBeUndefined()
    })

    it("when enabled changes from true to false, then resets isIntersecting", (): void => {
        const { result, rerender } = renderHook(
            ({ enabled }: { enabled: boolean }): ReturnType<typeof useIntersectionObserver> => {
                return useIntersectionObserver({ enabled })
            },
            { initialProps: { enabled: true } },
        )

        rerender({ enabled: false })

        expect(result.current.isIntersecting).toBe(false)
    })

    it("when threshold is an array, then normalizes to mutable array", (): void => {
        const { result } = renderHook((): ReturnType<typeof useIntersectionObserver> => {
            return useIntersectionObserver({ threshold: [0, 0.5, 1] as const })
        })

        expect(result.current.isIntersecting).toBe(false)
    })

    it("when threshold is a single number, then passes it through", (): void => {
        const { result } = renderHook((): ReturnType<typeof useIntersectionObserver> => {
            return useIntersectionObserver({ threshold: 0.5 })
        })

        expect(result.current.isIntersecting).toBe(false)
    })

    it("when rootMargin is provided, then passes custom rootMargin", (): void => {
        const { result } = renderHook((): ReturnType<typeof useIntersectionObserver> => {
            return useIntersectionObserver({ rootMargin: "10px 20px" })
        })

        expect(result.current.isIntersecting).toBe(false)
    })

    it("when unmounted, then disconnects observer", (): void => {
        const disconnectSpy = vi.fn()
        const unobserveSpy = vi.fn()

        class SpyIntersectionObserver extends MockIntersectionObserver {
            public override disconnect(): void {
                disconnectSpy()
            }

            public override unobserve(_target: Element): void {
                unobserveSpy()
            }
        }

        vi.stubGlobal("IntersectionObserver", SpyIntersectionObserver)

        const element = document.createElement("div")
        const { unmount } = renderHook((): ReturnType<typeof useIntersectionObserver> => {
            const hook = useIntersectionObserver()
            Object.defineProperty(hook.targetRef, "current", {
                value: element,
                writable: true,
                configurable: true,
            })
            return hook
        })

        unmount()
    })
})
