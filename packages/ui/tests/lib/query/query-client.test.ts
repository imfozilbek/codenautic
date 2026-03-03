import { describe, expect, it } from "vitest"

import { UI_QUERY_DEFAULTS, createQueryClient } from "@/lib/query/query-client"

describe("query-client", (): void => {
    it("создаёт QueryClient с ожидаемыми default options", (): void => {
        const queryClient = createQueryClient()
        const defaults = queryClient.getDefaultOptions()
        const queryDefaults = defaults.queries
        if (queryDefaults === undefined) {
            throw new Error("Query defaults должны быть определены")
        }

        expect(queryDefaults.staleTime).toBe(UI_QUERY_DEFAULTS.queries?.staleTime)
        expect(queryDefaults.gcTime).toBe(UI_QUERY_DEFAULTS.queries?.gcTime)
        expect(queryDefaults.refetchOnWindowFocus).toBe(
            UI_QUERY_DEFAULTS.queries?.refetchOnWindowFocus,
        )
        expect(queryDefaults.retry).toBe(UI_QUERY_DEFAULTS.queries?.retry)
        expect(defaults.mutations?.retry).toBe(UI_QUERY_DEFAULTS.mutations?.retry)
    })
})
