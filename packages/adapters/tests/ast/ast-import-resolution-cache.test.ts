import {describe, expect, test} from "bun:test"

import {AstImportResolutionCache} from "../../src/ast"

interface IDeferred<TValue> {
    readonly promise: Promise<TValue>
    resolve(value: TValue): void
}

/**
 * Creates deferred fixture.
 *
 * @returns Deferred fixture.
 */
function createDeferred<TValue>(): IDeferred<TValue> {
    let resolvePromise: ((value: TValue) => void) | undefined
    const promise = new Promise<TValue>((resolve) => {
        resolvePromise = resolve
    })

    return {
        promise,
        resolve(value: TValue): void {
            if (resolvePromise !== undefined) {
                resolvePromise(value)
            }
        },
    }
}

describe("AstImportResolutionCache", () => {
    test("resolves explicit idempotency cache key when provided", () => {
        const cache = new AstImportResolutionCache<string>(10)
        const cacheKey = cache.resolveCacheKey({
            sourceFilePath: "src/main.ts",
            importSource: "./feature",
            idempotencyKey: "same-key",
        })

        expect(cacheKey).toBe("same-key")
    })

    test("resolves deterministic cache key from source file and import source", () => {
        const cache = new AstImportResolutionCache<string>(10)
        const cacheKey = cache.resolveCacheKey({
            sourceFilePath: "src/main.ts",
            importSource: "./feature",
        })

        expect(cacheKey).toBe("src/main.ts::./feature")
    })

    test("tracks and clears in-flight entries when promise settles", async () => {
        const cache = new AstImportResolutionCache<string>(10)
        const deferred = createDeferred<string>()
        const cacheKey = "source::import"

        cache.trackInFlight(cacheKey, deferred.promise)
        expect(cache.findInFlight(cacheKey)).toBe(deferred.promise)

        deferred.resolve("ok")
        await deferred.promise
        await Promise.resolve()

        expect(cache.findInFlight(cacheKey)).toBeUndefined()
    })

    test("stores resolved entries in bounded cache and evicts oldest keys", () => {
        const cache = new AstImportResolutionCache<string>(2)

        cache.cacheResolved("a", "first")
        cache.cacheResolved("b", "second")
        cache.cacheResolved("c", "third")

        expect(cache.findResolved("a")).toBeUndefined()
        expect(cache.findResolved("b")).toBe("second")
        expect(cache.findResolved("c")).toBe("third")
    })

    test("clears resolved and in-flight cache entries", async () => {
        const cache = new AstImportResolutionCache<string>(2)
        const deferred = createDeferred<string>()

        cache.cacheResolved("resolved", "value")
        cache.trackInFlight("in-flight", deferred.promise)

        expect(cache.findResolved("resolved")).toBe("value")
        expect(cache.findInFlight("in-flight")).toBe(deferred.promise)

        cache.clear()

        expect(cache.findResolved("resolved")).toBeUndefined()
        expect(cache.findInFlight("in-flight")).toBeUndefined()

        deferred.resolve("done")
        await deferred.promise
    })
})
