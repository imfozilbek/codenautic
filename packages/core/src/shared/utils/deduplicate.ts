/**
 * Removes duplicate items by extracted key while preserving first occurrence order.
 *
 * @template TItem Item type.
 * @template TKey Key type.
 * @param items Source items.
 * @param getKey Key extractor.
 * @returns Deduplicated items.
 */
export function deduplicate<TItem, TKey>(
    items: readonly TItem[],
    getKey: (item: TItem) => TKey,
): TItem[] {
    const seenKeys = new Set<TKey>()
    const result: TItem[] = []

    for (const item of items) {
        const key = getKey(item)
        if (seenKeys.has(key)) {
            continue
        }

        seenKeys.add(key)
        result.push(item)
    }

    return result
}
