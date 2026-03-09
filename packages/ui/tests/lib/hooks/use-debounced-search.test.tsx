import { renderHook, waitFor } from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createQueryClient } from "@/lib/query/query-client"
import { useDebouncedSearch } from "@/lib/hooks/use-debounced-search"

/**
 * Обёртка с QueryClient для рендера хуков.
 *
 * @returns Provider wrapper function.
 */
function createWrapper(): (props: { children: ReactNode }) => ReactElement {
    const queryClient = createQueryClient()

    return function Wrapper(props: { children: ReactNode }): ReactElement {
        return <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
    }
}

describe("useDebouncedSearch", (): void => {
    afterEach((): void => {
        vi.restoreAllMocks()
    })

    it("when rendered with empty search and allowEmpty false, then query is not called", (): void => {
        const queryFn = vi.fn().mockResolvedValue([])

        const { result } = renderHook(
            (): ReturnType<typeof useDebouncedSearch<string[]>> => {
                return useDebouncedSearch<string[]>({
                    search: "",
                    queryKey: ["test-search-empty"],
                    queryFn,
                    allowEmpty: false,
                })
            },
            { wrapper: createWrapper() },
        )

        expect(result.current.search).toBe("")
        expect(result.current.debouncedSearch).toBe("")
        expect(queryFn).not.toHaveBeenCalled()
    })

    it("when rendered with empty search and allowEmpty true, then query is enabled", async (): Promise<void> => {
        const queryFn = vi.fn().mockResolvedValue(["result"])

        renderHook(
            (): ReturnType<typeof useDebouncedSearch<string[]>> => {
                return useDebouncedSearch<string[]>({
                    search: "",
                    queryKey: ["test-search-allow-empty"],
                    queryFn,
                    allowEmpty: true,
                })
            },
            { wrapper: createWrapper() },
        )

        await waitFor((): void => {
            expect(queryFn).toHaveBeenCalled()
        })
    })

    it("when rendered, then search reflects original input value", (): void => {
        const queryFn = vi.fn().mockResolvedValue([])

        const { result } = renderHook(
            (): ReturnType<typeof useDebouncedSearch<string[]>> => {
                return useDebouncedSearch<string[]>({
                    search: "original",
                    queryKey: ["test-original-value"],
                    queryFn,
                })
            },
            { wrapper: createWrapper() },
        )

        expect(result.current.search).toBe("original")
    })

    it("when search is provided with non-empty value, then debouncedSearch eventually matches", async (): Promise<void> => {
        const queryFn = vi.fn().mockResolvedValue(["match"])

        const { result } = renderHook(
            (): ReturnType<typeof useDebouncedSearch<string[]>> => {
                return useDebouncedSearch<string[]>({
                    search: "test query",
                    queryKey: ["test-debounce-match"],
                    queryFn,
                    delayMs: 50,
                })
            },
            { wrapper: createWrapper() },
        )

        await waitFor((): void => {
            expect(result.current.debouncedSearch).toBe("test query")
        })
    })

    it("when allowEmpty is not set, then defaults to disabling on empty search", (): void => {
        const queryFn = vi.fn().mockResolvedValue([])

        const { result } = renderHook(
            (): ReturnType<typeof useDebouncedSearch<string[]>> => {
                return useDebouncedSearch<string[]>({
                    search: "",
                    queryKey: ["test-default-allow-empty"],
                    queryFn,
                })
            },
            { wrapper: createWrapper() },
        )

        expect(result.current.search).toBe("")
        expect(queryFn).not.toHaveBeenCalled()
    })

    it("when queryFn resolves, then data is available in result", async (): Promise<void> => {
        const queryFn = vi.fn().mockResolvedValue(["item-a", "item-b"])

        const { result } = renderHook(
            (): ReturnType<typeof useDebouncedSearch<string[]>> => {
                return useDebouncedSearch<string[]>({
                    search: "query",
                    queryKey: ["test-data-result"],
                    queryFn,
                    delayMs: 10,
                })
            },
            { wrapper: createWrapper() },
        )

        await waitFor((): void => {
            expect(result.current.data).toEqual(["item-a", "item-b"])
        })
    })
})
