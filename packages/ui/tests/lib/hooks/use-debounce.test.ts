import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useDebounce, useDebounceWithOptions } from "@/lib/hooks/use-debounce"

describe("useDebounce", (): void => {
    beforeEach((): void => {
        vi.useFakeTimers()
    })

    afterEach((): void => {
        vi.useRealTimers()
    })

    it("when rendered with initial value, then returns initial value immediately", (): void => {
        const { result } = renderHook((): string => useDebounce("hello", 300))

        expect(result.current).toBe("hello")
    })

    it("when value changes, then does not update before delay", (): void => {
        const { result, rerender } = renderHook(
            ({ value }: { value: string }): string => useDebounce(value, 300),
            { initialProps: { value: "initial" } },
        )

        rerender({ value: "updated" })

        act((): void => {
            vi.advanceTimersByTime(200)
        })

        expect(result.current).toBe("initial")
    })

    it("when value changes and delay elapses, then returns updated value", (): void => {
        const { result, rerender } = renderHook(
            ({ value }: { value: string }): string => useDebounce(value, 300),
            { initialProps: { value: "initial" } },
        )

        rerender({ value: "updated" })

        act((): void => {
            vi.advanceTimersByTime(300)
        })

        expect(result.current).toBe("updated")
    })

    it("when value changes multiple times within delay, then only applies last value", (): void => {
        const { result, rerender } = renderHook(
            ({ value }: { value: string }): string => useDebounce(value, 300),
            { initialProps: { value: "first" } },
        )

        rerender({ value: "second" })
        act((): void => {
            vi.advanceTimersByTime(100)
        })

        rerender({ value: "third" })
        act((): void => {
            vi.advanceTimersByTime(100)
        })

        rerender({ value: "fourth" })
        act((): void => {
            vi.advanceTimersByTime(300)
        })

        expect(result.current).toBe("fourth")
    })

    it("when delay is not specified, then uses default 300ms", (): void => {
        const { result, rerender } = renderHook(
            ({ value }: { value: string }): string => useDebounce(value),
            { initialProps: { value: "initial" } },
        )

        rerender({ value: "updated" })

        act((): void => {
            vi.advanceTimersByTime(299)
        })
        expect(result.current).toBe("initial")

        act((): void => {
            vi.advanceTimersByTime(1)
        })
        expect(result.current).toBe("updated")
    })

    it("when used with number type, then debounces numbers correctly", (): void => {
        const { result, rerender } = renderHook(
            ({ value }: { value: number }): number => useDebounce(value, 200),
            { initialProps: { value: 0 } },
        )

        rerender({ value: 42 })

        act((): void => {
            vi.advanceTimersByTime(200)
        })

        expect(result.current).toBe(42)
    })

    it("when unmounted before delay, then clears timeout", (): void => {
        const clearTimeoutSpy = vi.spyOn(window, "clearTimeout")

        const { unmount, rerender } = renderHook(
            ({ value }: { value: string }): string => useDebounce(value, 300),
            { initialProps: { value: "initial" } },
        )

        rerender({ value: "updated" })
        unmount()

        expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(0)
    })
})

describe("useDebounceWithOptions", (): void => {
    beforeEach((): void => {
        vi.useFakeTimers()
    })

    afterEach((): void => {
        vi.useRealTimers()
    })

    it("when options provide delayMs, then uses that delay", (): void => {
        const { result, rerender } = renderHook(
            ({ value }: { value: string }): string => {
                return useDebounceWithOptions(value, { delayMs: 500 })
            },
            { initialProps: { value: "initial" } },
        )

        rerender({ value: "updated" })

        act((): void => {
            vi.advanceTimersByTime(499)
        })
        expect(result.current).toBe("initial")

        act((): void => {
            vi.advanceTimersByTime(1)
        })
        expect(result.current).toBe("updated")
    })

    it("when options are undefined, then uses default delay", (): void => {
        const { result, rerender } = renderHook(
            ({ value }: { value: string }): string => {
                return useDebounceWithOptions(value, undefined)
            },
            { initialProps: { value: "initial" } },
        )

        rerender({ value: "updated" })

        act((): void => {
            vi.advanceTimersByTime(300)
        })

        expect(result.current).toBe("updated")
    })
})
