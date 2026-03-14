/**
 * Safe JSON parsing utilities.
 * Prevents SyntaxError crashes from corrupted localStorage/API data.
 */

/**
 * Safely parses a JSON string, returning a fallback value on failure.
 *
 * @param raw - The raw JSON string to parse.
 * @param fallback - Value returned when parsing fails.
 * @returns Parsed value or the fallback.
 */
export function safeParseJson<T>(raw: string, fallback: T): T {
    try {
        return JSON.parse(raw) as T
    } catch {
        return fallback
    }
}

/**
 * Safely parses a JSON string, returning `undefined` on failure.
 *
 * @param raw - The raw JSON string to parse.
 * @returns Parsed value as `unknown` or `undefined` on failure.
 */
export function safeParseJsonUnknown(raw: string): unknown {
    try {
        return JSON.parse(raw) as unknown
    } catch {
        return undefined
    }
}
