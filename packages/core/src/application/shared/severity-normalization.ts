import type {ILogger} from "../ports/outbound/common/logger.port"
import {SEVERITY_LEVEL, type SeverityLevel} from "../../domain/value-objects/severity.value-object"

/**
 * Options for severity normalization.
 */
export interface ISeverityNormalizationOptions {
    /**
     * Fallback severity when input is invalid.
     */
    readonly fallback?: SeverityLevel

    /**
     * Optional logger for invalid severity warnings.
     */
    readonly logger?: ILogger

    /**
     * Optional structured context for warnings.
     */
    readonly context?: Record<string, unknown>
}

const INVALID_SEVERITY_MESSAGE = "Unknown severity level"

/**
 * Normalizes severity to canonical level and logs invalid values.
 *
 * @param value Raw severity string.
 * @param options Normalization options.
 * @returns Normalized severity or fallback.
 */
export function normalizeSeverity(
    value: string,
    options: ISeverityNormalizationOptions = {},
): SeverityLevel | undefined {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
        return handleInvalidSeverity(value, "", options)
    }

    const normalized = trimmed.toUpperCase()
    if (Object.values(SEVERITY_LEVEL).includes(normalized as SeverityLevel)) {
        return normalized as SeverityLevel
    }

    return handleInvalidSeverity(value, normalized, options)
}

/**
 * Handles invalid severity values and emits warning log.
 *
 * @param rawSeverity Raw input value.
 * @param normalizedSeverity Normalized candidate.
 * @param options Normalization options.
 * @returns Fallback severity if provided.
 */
function handleInvalidSeverity(
    rawSeverity: string,
    normalizedSeverity: string,
    options: ISeverityNormalizationOptions,
): SeverityLevel | undefined {
    if (options.logger !== undefined) {
        void options.logger.warn(INVALID_SEVERITY_MESSAGE, {
            rawSeverity,
            normalizedSeverity,
            ...options.context,
        })
    }

    return options.fallback
}
