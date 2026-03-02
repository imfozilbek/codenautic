/**
 * Supported severity levels for review findings.
 */
export const SEVERITY_LEVEL = {
    INFO: "INFO",
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
} as const

/**
 * Severity level literal type.
 */
export type SeverityLevel = (typeof SEVERITY_LEVEL)[keyof typeof SEVERITY_LEVEL]

const SEVERITY_WEIGHT: Readonly<Record<SeverityLevel, number>> = {
    [SEVERITY_LEVEL.INFO]: 0,
    [SEVERITY_LEVEL.LOW]: 10,
    [SEVERITY_LEVEL.MEDIUM]: 20,
    [SEVERITY_LEVEL.HIGH]: 30,
    [SEVERITY_LEVEL.CRITICAL]: 50,
}

/**
 * Immutable severity value object.
 */
export class Severity {
    private readonly level: SeverityLevel

    /**
     * Creates severity value object.
     *
     * @param level Severity level.
     */
    private constructor(level: SeverityLevel) {
        this.level = level
        Object.freeze(this)
    }

    /**
     * Creates severity from raw level.
     *
     * @param level Severity level.
     * @returns Immutable severity value object.
     * @throws Error When level is unknown.
     */
    public static create(level: string): Severity {
        const normalizedLevel = level.trim().toUpperCase()

        if (!isSeverityLevel(normalizedLevel)) {
            throw new Error(`Unknown severity level: ${level}`)
        }

        return new Severity(normalizedLevel)
    }

    /**
     * Numeric severity weight.
     *
     * @returns Severity weight.
     */
    public get weight(): number {
        return SEVERITY_WEIGHT[this.level]
    }

    /**
     * Compares severity by weight.
     *
     * @param other Other severity.
     * @returns Positive when current is higher, negative when lower, zero when equal.
     */
    public compareTo(other: Severity): number {
        return this.weight - other.weight
    }

    /**
     * Checks whether current severity is strictly higher.
     *
     * @param other Other severity.
     * @returns True when current severity is higher.
     */
    public isHigherThan(other: Severity): boolean {
        return this.compareTo(other) > 0
    }

    /**
     * Checks whether current severity is equal or higher.
     *
     * @param other Other severity.
     * @returns True when current severity is at least other severity.
     */
    public isAtLeast(other: Severity): boolean {
        return this.compareTo(other) >= 0
    }

    /**
     * String representation of severity level.
     *
     * @returns Severity level string.
     */
    public toString(): SeverityLevel {
        return this.level
    }
}

/**
 * Type guard for severity level string.
 *
 * @param value Candidate value.
 * @returns True when value is supported severity level.
 */
function isSeverityLevel(value: string): value is SeverityLevel {
    return Object.values(SEVERITY_LEVEL).includes(value as SeverityLevel)
}
