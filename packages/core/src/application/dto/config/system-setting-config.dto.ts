/**
 * System setting config payload item.
 */
export interface ISystemSettingConfigData {
    readonly key: string
    readonly value: unknown
}

/**
 * System setting config item alias for import payloads.
 */
export type IConfigSystemSettingItem = ISystemSettingConfigData

/**
 * Parses system setting config payload.
 *
 * @param value Raw payload.
 * @returns Normalized system setting items or undefined when invalid.
 */
export function parseSystemSettingConfigList(
    value: unknown,
): readonly ISystemSettingConfigData[] | undefined {
    const root = readObject(value)
    if (root === undefined) {
        return undefined
    }

    const items = root["items"]
    if (!Array.isArray(items)) {
        return undefined
    }

    const seenKeys = new Set<string>()
    const normalized: ISystemSettingConfigData[] = []

    for (const item of items) {
        const parsed = parseSystemSettingItem(item)
        if (parsed === undefined) {
            return undefined
        }

        const key = parsed.key.toLowerCase()
        if (seenKeys.has(key)) {
            return undefined
        }

        seenKeys.add(key)
        normalized.push(parsed)
    }

    return Object.freeze(normalized)
}

/**
 * Parses one system setting item.
 *
 * @param value Raw item value.
 * @returns Parsed item or undefined.
 */
function parseSystemSettingItem(value: unknown): ISystemSettingConfigData | undefined {
    const raw = readObject(value) ?? {}
    const key = readNonEmptyText(raw["key"])
    if (key === undefined) {
        return undefined
    }

    if (raw["value"] === undefined) {
        return undefined
    }

    return {
        key,
        value: raw["value"],
    }
}

/**
 * Reads non-empty text value.
 *
 * @param value Raw value.
 * @returns Trimmed string or undefined.
 */
function readNonEmptyText(value: unknown): string | undefined {
    const normalized = typeof value === "string" ? value.trim() : ""
    return normalized.length > 0 ? normalized : undefined
}

/**
 * Reads record from raw value.
 *
 * @param value Raw value.
 * @returns Record when value is plain object.
 */
function readObject(value: unknown): Record<string, unknown> | undefined {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return undefined
    }

    return value as Record<string, unknown>
}
