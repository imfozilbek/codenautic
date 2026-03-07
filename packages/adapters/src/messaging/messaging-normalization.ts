/**
 * Normalizes external message key.
 *
 * @param value Raw message key.
 * @returns Non-empty normalized key.
 */
export function normalizeMessageKey(value: string): string {
    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error("messageKey cannot be empty")
    }

    return normalized
}

/**
 * Normalizes external event type.
 *
 * @param value Raw event type.
 * @returns Non-empty normalized event type.
 */
export function normalizeEventType(value: string): string {
    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error("eventType cannot be empty")
    }

    return normalized
}
