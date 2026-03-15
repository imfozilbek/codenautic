/**
 * Input used to resolve deterministic import resolution cache key.
 */
export interface IAstImportResolutionCacheKeyInput {
    /**
     * Normalized repository-relative source file path.
     */
    readonly sourceFilePath: string

    /**
     * Normalized import source.
     */
    readonly importSource: string

    /**
     * Optional explicit idempotency key.
     */
    readonly idempotencyKey?: string
}

/**
 * Bounded in-memory cache for import-resolution results and in-flight requests.
 */
export class AstImportResolutionCache<TValue> {
    private readonly cacheSize: number
    private readonly inFlightByCacheKey = new Map<string, Promise<TValue>>()
    private readonly resolvedByCacheKey = new Map<string, TValue>()
    private readonly cacheKeyOrder: string[] = []

    /**
     * Creates import-resolution cache.
     *
     * @param cacheSize Maximum number of cached resolved entries.
     */
    public constructor(cacheSize: number) {
        this.cacheSize = cacheSize
    }

    /**
     * Resolves deterministic cache key for one import-resolution input.
     *
     * @param input Normalized cache-key input.
     * @returns Cache key used for in-flight and resolved caches.
     */
    public resolveCacheKey(input: IAstImportResolutionCacheKeyInput): string {
        if (input.idempotencyKey !== undefined) {
            return input.idempotencyKey
        }

        return `${input.sourceFilePath}::${input.importSource}`
    }

    /**
     * Returns cached resolved value by cache key.
     *
     * @param cacheKey Cache key.
     * @returns Cached resolved value when present.
     */
    public findResolved(cacheKey: string): TValue | undefined {
        return this.resolvedByCacheKey.get(cacheKey)
    }

    /**
     * Returns in-flight value promise by cache key.
     *
     * @param cacheKey Cache key.
     * @returns In-flight promise when present.
     */
    public findInFlight(cacheKey: string): Promise<TValue> | undefined {
        return this.inFlightByCacheKey.get(cacheKey)
    }

    /**
     * Tracks one in-flight cache key until promise settles.
     *
     * @param cacheKey Cache key.
     * @param promise In-flight promise.
     */
    public trackInFlight(cacheKey: string, promise: Promise<TValue>): void {
        this.inFlightByCacheKey.set(cacheKey, promise)
        void promise.then(
            () => {
                this.inFlightByCacheKey.delete(cacheKey)
            },
            () => {
                this.inFlightByCacheKey.delete(cacheKey)
            },
        )
    }

    /**
     * Stores one resolved value in bounded cache.
     *
     * @param cacheKey Cache key.
     * @param value Resolved value.
     */
    public cacheResolved(cacheKey: string, value: TValue): void {
        if (this.resolvedByCacheKey.has(cacheKey)) {
            return
        }

        this.resolvedByCacheKey.set(cacheKey, value)
        this.cacheKeyOrder.push(cacheKey)

        while (this.cacheKeyOrder.length > this.cacheSize) {
            const oldestCacheKey = this.cacheKeyOrder.shift()

            if (oldestCacheKey !== undefined) {
                this.resolvedByCacheKey.delete(oldestCacheKey)
            }
        }
    }

    /**
     * Clears all in-flight and resolved cache entries.
     */
    public clear(): void {
        this.inFlightByCacheKey.clear()
        this.resolvedByCacheKey.clear()
        this.cacheKeyOrder.length = 0
    }
}
