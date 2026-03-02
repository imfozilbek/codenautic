const DATE_MARKER = "$date"
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

interface IDatePayload {
    readonly $date: string | Date
}

/**
 * Serializes value into JSON with Date support.
 *
 * @param value Value to serialize.
 * @returns JSON payload.
 */
export function serialize(value: unknown): string {
    return JSON.stringify(encodeDates(value))
}

/**
 * Deserializes JSON payload with Date restoration.
 *
 * @template TValue Target shape.
 * @param payload JSON payload.
 * @returns Parsed value.
 * @throws Error When payload is invalid JSON.
 */
export function deserialize<TValue>(payload: string): TValue {
    try {
        return JSON.parse(payload, (_key, candidate: unknown) => {
            if (isDatePayload(candidate)) {
                return new Date(candidate.$date)
            }

            if (typeof candidate === "string" && ISO_DATE_REGEX.test(candidate)) {
                return new Date(candidate)
            }

            return candidate
        }) as TValue
    } catch {
        throw new Error("Invalid JSON payload")
    }
}

/**
 * Detects serialized date payload wrapper.
 *
 * @param value Candidate value.
 * @returns True when wrapper contains date marker.
 */
function isDatePayload(value: unknown): value is IDatePayload {
    if (typeof value !== "object" || value === null) {
        return false
    }

    const record = value as Record<string, unknown>
    const dateValue = record[DATE_MARKER]
    return (
        Object.keys(record).length === 1 &&
        (typeof dateValue === "string" || dateValue instanceof Date)
    )
}

/**
 * Recursively converts Date instances into JSON-safe wrappers.
 *
 * @param value Candidate value.
 * @returns Value with Date wrappers.
 */
function encodeDates(value: unknown): unknown {
    if (value instanceof Date) {
        return {[DATE_MARKER]: value.toISOString()}
    }

    if (Array.isArray(value)) {
        return value.map((item) => encodeDates(item))
    }

    if (typeof value !== "object" || value === null) {
        return value
    }

    const result: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
        result[key] = encodeDates(item)
    }

    return result
}
