import { describe, expect, it, vi } from "vitest"

import { createScopeChangeHandler } from "@/components/dashboard/scope-filter-utils"

describe("createScopeChangeHandler", (): void => {
    it("when selection contains a single key, then calls callback with that key", (): void => {
        const callback = vi.fn()
        const handler = createScopeChangeHandler<string>(callback)

        const keys = new Set(["repository"])
        handler(keys)

        expect(callback).toHaveBeenCalledTimes(1)
        expect(callback).toHaveBeenCalledWith("repository")
    })

    it("when selection is 'all', then does not call callback", (): void => {
        const callback = vi.fn()
        const handler = createScopeChangeHandler<string>(callback)

        handler("all")

        expect(callback).not.toHaveBeenCalled()
    })

    it("when selection is an empty set, then does not call callback", (): void => {
        const callback = vi.fn()
        const handler = createScopeChangeHandler<string>(callback)

        const keys = new Set<string>()
        handler(keys)

        expect(callback).not.toHaveBeenCalled()
    })

    it("when selection contains multiple keys, then calls callback with the first iterable key", (): void => {
        const callback = vi.fn()
        const handler = createScopeChangeHandler<string>(callback)

        const keys = new Set(["alpha", "beta"])
        handler(keys)

        expect(callback).toHaveBeenCalledTimes(1)
        expect(callback).toHaveBeenCalledWith("alpha")
    })

    it("when used with typed scope values, then preserves type narrowing", (): void => {
        type TScopeFilter = "org" | "repo" | "team"
        const callback = vi.fn()
        const handler = createScopeChangeHandler<TScopeFilter>(callback)

        const keys = new Set(["team"])
        handler(keys)

        expect(callback).toHaveBeenCalledWith("team")
    })
})
